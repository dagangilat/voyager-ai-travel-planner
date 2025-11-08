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

    const places = data.results.map((place) => {
      // For airports, format as "City, Country [CODE]"
      let displayName = place.name;
      const isAirport = place.types?.includes('airport');
      
      if (isAirport) {
        // Extract airport code from name (e.g., "(TLV)" or "[TLV]")
        const codeMatch = place.name.match(/\(([A-Z]{3})\)|\[([A-Z]{3})\]/);
        const airportCode = codeMatch ? (codeMatch[1] || codeMatch[2]) : null;
        
        // Try multiple sources for city and country
        let city = null;
        let country = null;
        
        // Method 1: Parse formatted_address if available
        if (place.formatted_address) {
          const addressParts = place.formatted_address.split(',').map(p => p.trim());
          country = addressParts[addressParts.length - 1];
          
          // Look for city in address parts (skip airport names)
          for (let i = 0; i < addressParts.length - 1; i++) {
            const part = addressParts[i];
            const partLower = part.toLowerCase();
            if (!partLower.includes('airport') && 
                !partLower.includes('international') &&
                part !== country) {
              city = part;
              break;
            }
          }
        }
        
        // Method 2: Try to extract city from airport name if still not found
        if (!city) {
          const airportNameLower = place.name.toLowerCase();
          
          // Common patterns: "City Airport", "City International Airport", "Name Airport"
          if (airportNameLower.includes('airport')) {
            // Get the part before "airport" or "international"
            const beforeAirport = place.name.split(/\s+(international\s+)?airport/i)[0].trim();
            // Remove any codes in parentheses or brackets
            city = beforeAirport.replace(/\s*\([A-Z]{3}\)\s*|\s*\[[A-Z]{3}\]\s*/g, '').trim();
          }
        }
        
        // Method 3: Use vicinity if available (Google Places API sometimes provides this)
        if (!city && place.vicinity) {
          const vicinityParts = place.vicinity.split(',').map(p => p.trim());
          city = vicinityParts[0];
        }
        
        // Build display name
        if (city && country && city !== country) {
          displayName = airportCode 
            ? `${city}, ${country} [${airportCode}]`
            : `${city}, ${country}`;
        } else if (city && airportCode) {
          displayName = `${city} [${airportCode}]`;
        } else if (airportCode) {
          // Fallback: just clean up the airport name and add code
          const cleanName = place.name.replace(/\s*\([A-Z]{3}\)\s*|\s*\[[A-Z]{3}\]\s*/g, '').trim();
          displayName = `${cleanName} [${airportCode}]`;
        }
        
        // Log for debugging
        functions.logger.debug('Airport formatting', {
          original: place.name,
          formatted: place.formatted_address,
          city,
          country,
          code: airportCode,
          result: displayName
        });
      }
      
      return {
        id: place.place_id,
        name: displayName,
        original_name: place.name,
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
      };
    });

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