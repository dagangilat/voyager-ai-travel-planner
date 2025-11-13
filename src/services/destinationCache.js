/**
 * Destination Cache Service
 * Provides instant client-side autocomplete with Fuse.js
 */

import Fuse from 'fuse.js';

const CACHE_KEY = 'destinations_cache';
const CACHE_TIMESTAMP_KEY = 'destinations_cache_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms

let destinationsCache = null;
let fuseInstance = null;

// Fuse.js configuration for fuzzy search
const fuseOptions = {
  keys: [
    { name: 'name', weight: 2 },
    { name: 'city', weight: 1.5 },
    { name: 'country', weight: 1 },
    { name: 'code', weight: 2 },
    { name: 'search_terms', weight: 1.5 }
  ],
  threshold: 0.3, // Lower = more strict matching
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true
};

/**
 * Check if cache is valid
 */
function isCacheValid() {
  const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  if (!timestamp) return false;
  
  const age = Date.now() - parseInt(timestamp, 10);
  return age < CACHE_DURATION;
}

/**
 * Load destinations from cache or fetch from server
 */
export async function loadDestinations(force = false) {
  // Return cached instance if already loaded
  if (fuseInstance && !force) {
    return destinationsCache;
  }
  
  // Try to load from localStorage
  if (!force && isCacheValid()) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        destinationsCache = JSON.parse(cached);
        fuseInstance = new Fuse(destinationsCache, fuseOptions);
        console.log(`✅ Loaded ${destinationsCache.length} destinations from cache`);
        return destinationsCache;
      }
    } catch (error) {
      console.warn('Failed to load from cache:', error);
    }
  }
  
  // Fetch from server
  try {
    console.log('Fetching destinations from server...');
    const REGION = 'europe-west1';
    const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'voyagerai-travel-planner';
    const url = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/getAllDestinations`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    destinationsCache = data.destinations;
    
    // Save to localStorage
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(destinationsCache));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
    
    // Initialize Fuse
    fuseInstance = new Fuse(destinationsCache, fuseOptions);
    
    console.log(`✅ Loaded ${destinationsCache.length} destinations from server`);
    return destinationsCache;
    
  } catch (error) {
    console.error('Failed to load destinations:', error);
    throw error;
  }
}

/**
 * Search destinations with instant fuzzy matching
 */
export function searchDestinations(query, limit = 10) {
  if (!fuseInstance || !destinationsCache) {
    console.warn('Destinations not loaded yet');
    return [];
  }
  
  if (!query || query.length < 2) {
    // Return top popular destinations for empty query
    return destinationsCache
      .slice()
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, limit);
  }
  
  // Fuzzy search
  const results = fuseInstance.search(query, { limit: limit * 2 });
  
  // Return formatted results
  return results
    .map(result => result.item)
    .slice(0, limit)
    .map(dest => ({
      id: dest.place_id || dest.id,
      name: dest.name,
      formatted_address: `${dest.city}, ${dest.country}`,
      code: dest.code,
      type: dest.type,
      source: 'cache'
    }));
}

/**
 * Get a specific destination by ID
 */
export function getDestinationById(id) {
  if (!destinationsCache) return null;
  return destinationsCache.find(d => d.id === id || d.place_id === id);
}

/**
 * Clear cache (force refresh)
 */
export function clearCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  destinationsCache = null;
  fuseInstance = null;
}

/**
 * Get cache status
 */
export function getCacheStatus() {
  const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  const size = destinationsCache?.length || 0;
  const age = timestamp ? Date.now() - parseInt(timestamp, 10) : null;
  
  return {
    loaded: !!fuseInstance,
    size,
    age: age ? Math.floor(age / 1000 / 60) : null, // minutes
    valid: isCacheValid()
  };
}
