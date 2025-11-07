import { auth } from '@/config/firebase';

/**
 * Firebase Functions Service
 * Wrapper for calling Firebase Cloud Functions (HTTP endpoints)
 */

// Cloud Functions are deployed as HTTP endpoints, not callable functions
const REGION = 'us-central1';
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'voyager-ai-travel-planner';
const FUNCTIONS_BASE_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;

// Get the current user's ID token for authentication
const getAuthToken = async () => {
  const user = auth.currentUser;
  if (user) {
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
  }
  return null;
};

// Generic function invoker
export const invokeFunction = async (functionName, data) => {
  try {
    const url = `${FUNCTIONS_BASE_URL}/${functionName}`;
    
    // Get auth token
    const token = await getAuthToken();
    
    // Determine HTTP method and construct request
    let requestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    // Add Authorization header if we have a token
    if (token) {
      requestInit.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Some functions use GET with query params
    let finalUrl = url;
    if (functionName === 'searchGooglePlaces' && data) {
      // GET request with query params
      requestInit.method = 'GET';
      const params = new URLSearchParams();
      if (data.query) params.append('query', data.query);
      if (data.type) params.append('type', data.type);
      finalUrl = `${url}?${params.toString()}`;
    } else if (data) {
      // POST request with JSON body
      requestInit.body = JSON.stringify(data);
    }
    
    const response = await fetch(finalUrl, requestInit);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Function call failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error calling function ${functionName}:`, error);
    throw error;
  }
};

// Specific function wrappers for type safety and convenience
export const searchGooglePlaces = (data) => invokeFunction('searchGooglePlaces', data);
export const searchAmadeusFlights = (data) => invokeFunction('searchAmadeusFlights', data);
export const searchAmadeusHotels = (data) => invokeFunction('searchAmadeusHotels', data);
export const searchAmadeusActivities = (data) => invokeFunction('searchAmadeusActivities', data);
export const createTripWithDestinations = (data) => invokeFunction('createTripWithDestinations', data);
export const addDestinationToTrip = (data) => invokeFunction('addDestinationToTrip', data);
export const findBookingUrl = (data) => invokeFunction('findBookingUrl', data);
export const processPayment = (data) => invokeFunction('processPayment', data);

// Export a functions object that mimics Base44 SDK structure
export const functionsService = {
  invoke: invokeFunction,
  searchGooglePlaces,
  searchAmadeusFlights,
  searchAmadeusHotels,
  searchAmadeusActivities,
  createTripWithDestinations,
  addDestinationToTrip,
  findBookingUrl,
  processPayment
};
