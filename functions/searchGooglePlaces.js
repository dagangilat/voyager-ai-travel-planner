const functions = require('firebase-functions');
const fetch = require('node-fetch');
require('dotenv').config();

function getPlacesApiKey() {
  // Prefer runtime config if available, else fall back to env var
  const cfg = functions.config?.() || {};
  const fromConfig = cfg.google?.places_api_key || cfg.google?.placesapikey;
  return fromConfig || process.env.GOOGLE_PLACES_API_KEY;
}

exports.searchGooglePlaces = functions.https.onRequest(async (req, res) => {
  // Basic CORS support for browser clients
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { query, type } = req.query;
  if (!query) {
    res.status(400).json({ error: 'Missing search query' });
    return;
  }

  try {
    const apiKey = getPlacesApiKey();
    if (!apiKey) {
      functions.logger.error('GOOGLE_PLACES_API_KEY missing (env or functions.config().google.places_api_key)');
      return res.status(500).json({ error: 'Server is not configured with Google Places API key' });
    }
    const encodedQuery = encodeURIComponent(query);
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodedQuery}&key=${apiKey}`;
    if (type) url += `&type=${encodeURIComponent(type)}`;

    // Log safe request details (mask API key)
    const maskedKey = apiKey.replace(/.(?=.{4})/g, '*');
    functions.logger.info('Google Places textsearch request', {
      query,
      type: type || null,
      url: url.replace(apiKey, maskedKey),
    });

    const response = await fetch(url);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      functions.logger.error('Non-JSON response from Google Places', { status: response.status, body: text.slice(0, 500) });
      return res.status(502).json({ error: 'Bad response from Google Places API', status: response.status });
    }
    if (!response.ok) {
      functions.logger.error('Google Places API error', { status: response.status, data: data?.error_message || data });
      return res.status(response.status).json({ error: data?.error_message || 'Failed to fetch from Google Places API', status: data?.status });
    }

    const places = data.results.map((place) => ({
      id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address,
      location: place.geometry.location,
      types: place.types,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      photos: place.photos?.map((photo) => ({
        photo_reference: photo.photo_reference,
        height: photo.height,
        width: photo.width,
        html_attributions: photo.html_attributions,
      })) || [],
    }));

    // Surface API status for debugging if results are empty
    if (!places.length) {
      functions.logger.warn('Google Places returned no results', { status: data.status, error_message: data.error_message });
    }

    res.status(200).json({ places, next_page_token: data.next_page_token, status: data.status, error_message: data.error_message });
  } catch (error) {
    functions.logger.error('Error searching places', error);
    res.status(500).json({ error: error.message });
  }
});