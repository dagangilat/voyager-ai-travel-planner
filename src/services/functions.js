import { auth } from '@/config/firebase';

/**
 * Firebase Functions Service
 * Wrapper for calling Firebase Cloud Functions (HTTP endpoints)
 */

// Cloud Functions are deployed as HTTP endpoints, not callable functions
const REGION = 'europe-west1';
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'voyagerai-travel-planner';
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
    } else if (functionName === 'searchAmadeusFlights' && data) {
      // GET request with query params for Amadeus flights
      requestInit.method = 'GET';
      const params = new URLSearchParams();
      if (data.origin) params.append('originLocationCode', data.origin);
      if (data.originLocationCode) params.append('originLocationCode', data.originLocationCode);
      if (data.destination) params.append('destinationLocationCode', data.destination);
      if (data.destinationLocationCode) params.append('destinationLocationCode', data.destinationLocationCode);
      if (data.departureDate) params.append('departureDate', data.departureDate);
      if (data.returnDate) params.append('returnDate', data.returnDate);
      if (data.adults) params.append('adults', data.adults);
      if (data.travelClass) params.append('travelClass', data.travelClass);
      finalUrl = `${url}?${params.toString()}`;
    } else if (functionName === 'searchAmadeusHotels' && data) {
      // GET request with query params for Amadeus hotels
      requestInit.method = 'GET';
      const params = new URLSearchParams();
      if (data.cityCode) params.append('cityCode', data.cityCode);
      if (data.checkInDate) params.append('checkInDate', data.checkInDate);
      if (data.checkOutDate) params.append('checkOutDate', data.checkOutDate);
      if (data.adults) params.append('adults', data.adults);
      if (data.radius) params.append('radius', data.radius);
      if (data.ratings) params.append('ratings', data.ratings);
      if (data.priceRange) params.append('priceRange', data.priceRange);
      finalUrl = `${url}?${params.toString()}`;
    } else if (functionName === 'searchAmadeusActivities' && data) {
      // GET request with query params for Amadeus activities
      requestInit.method = 'GET';
      const params = new URLSearchParams();
      if (data.latitude) params.append('latitude', data.latitude);
      if (data.longitude) params.append('longitude', data.longitude);
      if (data.radius) params.append('radius', data.radius);
      finalUrl = `${url}?${params.toString()}`;
    } else if (data) {
      // POST request with JSON body
      requestInit.body = JSON.stringify(data);
    }
    
    const response = await fetch(finalUrl, requestInit);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Function ${functionName} error details:`, {
        status: response.status,
        statusText: response.statusText,
        errorData,
        url: finalUrl
      });
      throw new Error(errorData.error || errorData.details?.errors?.[0]?.detail || `Function call failed: ${response.statusText}`);
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
