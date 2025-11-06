const functions = require('firebase-functions');
const fetch = require('node-fetch');
require('dotenv').config();

const AMADEUS_TOKEN_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_API_URL = 'https://test.api.amadeus.com/v2';

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

exports.searchAmadeusHotels = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { cityCode, checkInDate, checkOutDate, adults, radius, ratings, priceRange } = req.query;
  if (!cityCode || !checkInDate || !checkOutDate) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  try {
    const token = await getAmadeusToken();
    const url = new URL(`${AMADEUS_API_URL}/shopping/hotel-offers`);
    url.searchParams.append('cityCode', cityCode);
    url.searchParams.append('checkInDate', checkInDate);
    url.searchParams.append('checkOutDate', checkOutDate);
    url.searchParams.append('adults', adults || '1');
    if (radius) url.searchParams.append('radius', radius);
    if (ratings) url.searchParams.append('ratings', ratings);
    if (priceRange) url.searchParams.append('priceRange', priceRange);

    functions.logger.info('Amadeus hotels request', { url: url.toString() });
    const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    const text = await resp.text();
    let data; try { data = JSON.parse(text); } catch (e) {
      functions.logger.error('Non-JSON response from Amadeus hotels', { status: resp.status, body: text.slice(0, 500) });
      return res.status(502).json({ error: 'Bad response from Amadeus Hotels API', status: resp.status });
    }
    if (!resp.ok) {
      functions.logger.error('Amadeus hotels API error', { status: resp.status, data });
      return res.status(resp.status).json({ error: 'Failed to fetch hotel offers', details: data });
    }
    res.status(200).json(data);
  } catch (error) {
    functions.logger.error('Error searching hotels', error);
    res.status(500).json({ error: error.message });
  }
});