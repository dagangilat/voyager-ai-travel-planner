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

exports.searchAmadeusFlights = functions.region('europe-west1').https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { originLocationCode, destinationLocationCode, departureDate, returnDate, adults, travelClass } = req.query;
  if (!originLocationCode || !destinationLocationCode || !departureDate) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  try {
    const token = await getAmadeusToken();
    const url = new URL(`${AMADEUS_API_URL}/shopping/flight-offers`);
    url.searchParams.append('originLocationCode', originLocationCode);
    url.searchParams.append('destinationLocationCode', destinationLocationCode);
    url.searchParams.append('departureDate', departureDate);
    url.searchParams.append('adults', adults || '1');
    if (returnDate) url.searchParams.append('returnDate', returnDate);
    if (travelClass) url.searchParams.append('travelClass', travelClass);

    functions.logger.info('Amadeus flights request', { url: url.toString() });
    const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    const text = await resp.text();
    let data; try { data = JSON.parse(text); } catch (e) {
      functions.logger.error('Non-JSON response from Amadeus flights', { status: resp.status, body: text.slice(0, 500) });
      return res.status(502).json({ error: 'Bad response from Amadeus Flights API', status: resp.status });
    }
    if (!resp.ok) {
      functions.logger.error('Amadeus flights API error', { status: resp.status, data });
      return res.status(resp.status).json({ error: 'Failed to fetch flight offers', details: data });
    }
    res.status(200).json(data);
  } catch (error) {
    functions.logger.error('Error searching flights', error);
    res.status(500).json({ error: error.message });
  }
});