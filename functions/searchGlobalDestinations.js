const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
require('dotenv').config();

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function getPlacesApiKey() {
  const cfg = functions.config?.() || {};
  const fromConfig = cfg.google?.places_api_key || cfg.google?.placesapikey;
  return fromConfig || process.env.GOOGLE_PLACES_API_KEY;
}

// Search global destinations with fuzzy matching
async function searchLocalDestinations(query, limit = 10) {
  const queryLower = query.toLowerCase().trim();
  
  try {
    // Query Firestore with multiple strategies
    const results = [];
    
    // Strategy 1: Exact prefix match on city name (case-insensitive)
    const cityQuery = await db.collection('GlobalDestinations')
      .where('search_terms', 'array-contains', queryLower)
      .orderBy('popularity', 'desc')
      .limit(limit)
      .get();
    
    cityQuery.forEach(doc => {
      const data = doc.data();
      results.push({
        id: data.id || doc.id,
        place_id: data.place_id || doc.id,
        name: data.name,
        city: data.city,
        country: data.country,
        code: data.code,
        type: data.type,
        popularity: data.popularity || 0,
        source: 'local'
      });
    });
    
    // If we have few results, try partial matching
    if (results.length < 5) {
      const allDocs = await db.collection('GlobalDestinations')
        .orderBy('popularity', 'desc')
        .limit(200)
        .get();
      
      allDocs.forEach(doc => {
        const data = doc.data();
        const alreadyIncluded = results.some(r => r.id === (data.id || doc.id));
        
        if (!alreadyIncluded) {
          // Check if query matches any part of the destination
          const cityMatch = data.city?.toLowerCase().includes(queryLower);
          const countryMatch = data.country?.toLowerCase().includes(queryLower);
          const codeMatch = data.code?.toLowerCase().includes(queryLower);
          const nameMatch = data.name?.toLowerCase().includes(queryLower);
          
          if (cityMatch || countryMatch || codeMatch || nameMatch) {
            results.push({
              id: data.id || doc.id,
              place_id: data.place_id || doc.id,
              name: data.name,
              city: data.city,
              country: data.country,
              code: data.code,
              type: data.type,
              popularity: data.popularity || 0,
              source: 'local'
            });
          }
        }
      });
    }
    
    // Sort by popularity and limit
    return results
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
    
  } catch (error) {
    functions.logger.error('Error searching local destinations', error);
    return [];
  }
}

// Search Google Places (fallback)
async function searchGooglePlaces(query, type) {
  const apiKey = getPlacesApiKey();
  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }
  
  const encodedQuery = encodeURIComponent(query);
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodedQuery}&key=${apiKey}`;
  if (type) url += `&type=${encodeURIComponent(type)}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data?.error_message || 'Failed to fetch from Google Places API');
  }
  
  return data.results.map((place) => {
    let displayName = place.name;
    const isAirport = place.types?.includes('airport');
    
    if (isAirport) {
      const codeMatch = place.name.match(/\(([A-Z]{3})\)|\[([A-Z]{3})\]/);
      const airportCode = codeMatch ? (codeMatch[1] || codeMatch[2]) : null;
      
      let city = null;
      let country = null;
      
      if (place.formatted_address) {
        const addressParts = place.formatted_address.split(',').map(p => p.trim());
        country = addressParts[addressParts.length - 1];
        
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
      
      if (!city) {
        const airportNameLower = place.name.toLowerCase();
        if (airportNameLower.includes('airport')) {
          const beforeAirport = place.name.split(/\s+(international\s+)?airport/i)[0].trim();
          city = beforeAirport.replace(/\s*\([A-Z]{3}\)\s*|\s*\[[A-Z]{3}\]\s*/g, '').trim();
        }
      }
      
      if (!city && place.vicinity) {
        const vicinityParts = place.vicinity.split(',').map(p => p.trim());
        city = vicinityParts[0];
      }
      
      if (city && country && city !== country) {
        displayName = airportCode 
          ? `${city}, ${country} [${airportCode}]`
          : `${city}, ${country}`;
      } else if (city && airportCode) {
        displayName = `${city} [${airportCode}]`;
      } else if (airportCode) {
        const cleanName = place.name.replace(/\s*\([A-Z]{3}\)\s*|\s*\[[A-Z]{3}\]\s*/g, '').trim();
        displayName = `${cleanName} [${airportCode}]`;
      }
      
      return {
        id: place.place_id,
        place_id: place.place_id,
        name: displayName,
        code: airportCode,
        formatted_address: place.formatted_address,
        location: place.geometry.location,
        types: place.types,
        source: 'google'
      };
    }
    
    return {
      id: place.place_id,
      place_id: place.place_id,
      name: displayName,
      formatted_address: place.formatted_address,
      location: place.geometry.location,
      types: place.types,
      source: 'google'
    };
  });
}

// Main search function
exports.searchGlobalDestinations = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  
  // Accept both GET and POST
  let query, type, limit;
  
  if (req.method === 'GET') {
    ({ query, type, limit = 10 } = req.query);
  } else if (req.method === 'POST') {
    ({ query, type, limit = 10 } = req.body);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  if (!query) {
    return res.status(400).json({ error: 'Missing search query' });
  }
  
  try {
    functions.logger.info('Searching destinations', { query, type });
    
    // First, search local database
    let results = await searchLocalDestinations(query, limit);
    
    functions.logger.info('Local search results', { count: results.length });
    
    // If we have less than 3 results, supplement with Google Places
    if (results.length < 3) {
      try {
        const googleResults = await searchGooglePlaces(query, type);
        
        // Merge results, avoiding duplicates
        googleResults.forEach(googleResult => {
          const isDuplicate = results.some(r => 
            r.name === googleResult.name || 
            r.place_id === googleResult.place_id
          );
          
          if (!isDuplicate) {
            results.push(googleResult);
          }
        });
        
        functions.logger.info('Combined results', { 
          local: results.filter(r => r.source === 'local').length,
          google: results.filter(r => r.source === 'google').length 
        });
        
      } catch (googleError) {
        functions.logger.warn('Google Places search failed, using local results only', googleError);
      }
    }
    
    // Transform to expected format
    const places = results.slice(0, limit).map(result => ({
      id: result.place_id || result.id,
      name: result.name,
      formatted_address: result.formatted_address || `${result.city}, ${result.country}`,
      location: result.location || { lat: 0, lng: 0 },
      types: result.types || [result.type],
      code: result.code,
      source: result.source
    }));
    
    res.status(200).json({ 
      places,
      count: places.length,
      sources: {
        local: places.filter(p => p.source === 'local').length,
        google: places.filter(p => p.source === 'google').length
      }
    });
    
  } catch (error) {
    functions.logger.error('Error searching destinations', error);
    res.status(500).json({ error: error.message });
  }
});
