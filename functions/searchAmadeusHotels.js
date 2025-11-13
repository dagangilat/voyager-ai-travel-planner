const functions = require('firebase-functions');
const fetch = require('node-fetch');
require('dotenv').config();

const AMADEUS_TOKEN_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_API_V1 = 'https://test.api.amadeus.com/v1';
const AMADEUS_API_V3 = 'https://test.api.amadeus.com/v3';

function getAmadeusCredentials() {
  const cfg = functions.config?.() || {};
  const id = cfg.amadeus?.api_key || process.env.AMADEUS_API_KEY;
  const secret = cfg.amadeus?.api_secret || process.env.AMADEUS_API_SECRET;
  return { id, secret };
}

async function getAmadeusToken() {
  const { id, secret } = getAmadeusCredentials();
  if (!id || !secret) throw new Error('Amadeus API credentials missing (env or functions.config().amadeus)');
  const resp = await fetch(AMADEUS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: id,
      client_secret: secret,
    }),
  });
  const text = await resp.text();
  let data; try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }
  if (!resp.ok) {
    functions.logger.error('Amadeus token error', { status: resp.status, data });
    throw new Error(`Failed to obtain Amadeus token: ${resp.status}`);
  }
  return data.access_token;
}

exports.searchAmadeusHotels = functions.region('europe-west1').https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { cityCode, checkInDate, checkOutDate, adults, radius, ratings } = req.query;
  if (!cityCode || !checkInDate || !checkOutDate) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  try {
    const token = await getAmadeusToken();
    
    // Step 1: Get list of hotels in the city using Hotel List API
    const hotelListUrl = new URL(`${AMADEUS_API_V1}/reference-data/locations/hotels/by-city`);
    hotelListUrl.searchParams.append('cityCode', cityCode);
    hotelListUrl.searchParams.append('radius', radius || '10'); // Increased from 5 to 10 km
    hotelListUrl.searchParams.append('radiusUnit', 'KM');
    if (ratings) hotelListUrl.searchParams.append('ratings', ratings);
    
    functions.logger.info('Amadeus hotel list request', { url: hotelListUrl.toString() });
    const listResp = await fetch(hotelListUrl.toString(), { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    const listText = await listResp.text();
    let listData; 
    try { listData = JSON.parse(listText); } catch (e) {
      functions.logger.error('Non-JSON response from Amadeus hotel list', { status: listResp.status, body: listText.slice(0, 500) });
      return res.status(502).json({ error: 'Bad response from Amadeus Hotel List API', status: listResp.status });
    }
    
    if (!listResp.ok) {
      functions.logger.error('Amadeus hotel list API error', { status: listResp.status, data: listData });
      return res.status(listResp.status).json({ error: 'Failed to fetch hotel list', details: listData });
    }
    
    if (!listData.data || listData.data.length === 0) {
      functions.logger.info('No hotels found in city', { cityCode });
      return res.status(200).json({ data: [] });
    }
    
    // Get up to 50 hotel IDs to increase chances of finding available rooms
    const hotelIds = listData.data.slice(0, 50).map(hotel => hotel.hotelId).join(',');
    functions.logger.info('Found hotels', { count: listData.data.length, fetching: hotelIds.split(',').length });
    
    // Step 2: Get offers for these hotels using Hotel Search API v3
    const offersUrl = new URL(`${AMADEUS_API_V3}/shopping/hotel-offers`);
    offersUrl.searchParams.append('hotelIds', hotelIds);
    offersUrl.searchParams.append('checkInDate', checkInDate);
    offersUrl.searchParams.append('checkOutDate', checkOutDate);
    offersUrl.searchParams.append('adults', adults || '1');
    
    functions.logger.info('Amadeus hotel offers request', { url: offersUrl.toString() });
    const offersResp = await fetch(offersUrl.toString(), { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    const offersText = await offersResp.text();
    let offersData;
    try { offersData = JSON.parse(offersText); } catch (e) {
      functions.logger.error('Non-JSON response from Amadeus hotel offers', { status: offersResp.status, body: offersText.slice(0, 500) });
      return res.status(502).json({ error: 'Bad response from Amadeus Hotel Offers API', status: offersResp.status });
    }
    
    if (!offersResp.ok) {
      functions.logger.error('Amadeus hotel offers API error', { status: offersResp.status, data: offersData });
      return res.status(offersResp.status).json({ error: 'Failed to fetch hotel offers', details: offersData });
    }
    
    res.status(200).json(offersData);
  } catch (error) {
    functions.logger.error('Error searching hotels', error);
    res.status(500).json({ error: error.message });
  }
});