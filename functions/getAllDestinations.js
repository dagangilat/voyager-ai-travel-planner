const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Get All Global Destinations
 * Fetches all destinations for client-side caching
 * This is called once on app load, then cached for 24 hours
 */
exports.getAllDestinations = functions.region('europe-west1').https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Cache for 24 hours
  res.set('Cache-Control', 'public, max-age=86400');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    functions.logger.info('Fetching all destinations for client-side cache');
    
    // Fetch all destinations, ordered by popularity
    const snapshot = await db.collection('GlobalDestinations')
      .orderBy('popularity', 'desc')
      .get();
    
    const destinations = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      destinations.push({
        id: data.id || doc.id,
        place_id: data.place_id || doc.id,
        name: data.name,
        city: data.city,
        country: data.country,
        code: data.code,
        type: data.type,
        popularity: data.popularity || 0,
        search_terms: data.search_terms || []
      });
    });
    
    functions.logger.info(`Returning ${destinations.length} destinations`);
    
    res.status(200).json({ 
      destinations,
      count: destinations.length,
      cached_at: new Date().toISOString(),
      cache_duration: '24h'
    });
    
  } catch (error) {
    functions.logger.error('Error fetching all destinations', error);
    res.status(500).json({ error: error.message });
  }
});
