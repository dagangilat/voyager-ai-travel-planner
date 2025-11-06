import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';

/**
 * Firebase Functions Service
 * Wrapper for calling Firebase Cloud Functions
 */

// Generic function invoker
export const invokeFunction = async (functionName, data) => {
  try {
    const callable = httpsCallable(functions, functionName);
    const result = await callable(data);
    return result.data;
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
