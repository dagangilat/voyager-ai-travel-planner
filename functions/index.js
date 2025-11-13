// Export all functions
exports.addDestinationToTrip = require('./addDestinationToTrip').addDestinationToTrip;
exports.createTripWithDestinations = require('./createTripWithDestinations').createTripWithDestinations;
exports.findBookingUrl = require('./findBookingUrl').findBookingUrl;
exports.geocodeLocation = require('./geocodeLocation').geocodeLocation;
exports.getMyTrips = require('./getMyTrips').getMyTrips;
exports.invokeLLM = require('./invokeLLM').invokeLLM;
exports.makeReservation = require('./makeReservation').makeReservation;
exports.processPayment = require('./processPayment').processPayment;
exports.searchAmadeusActivities = require('./searchAmadeusActivities').searchAmadeusActivities;
exports.searchAmadeusFlights = require('./searchAmadeusFlights').searchAmadeusFlights;
exports.searchAmadeusHotels = require('./searchAmadeusHotels').searchAmadeusHotels;
exports.searchGooglePlaces = require('./searchGooglePlaces').searchGooglePlaces;
exports.searchGlobalDestinations = require('./searchGlobalDestinations').searchGlobalDestinations;
exports.getAllDestinations = require('./getAllDestinations').getAllDestinations;
exports.seedGlobalDestinations = require('./seedGlobalDestinations').seedGlobalDestinations;
exports.exportDatabase = require('./exportDatabase').exportDatabase;

// Email notification triggers
exports.onTripCreated = require('./sendTripNotifications').onTripCreated;
exports.onTripUpdated = require('./sendTripNotifications').onTripUpdated;
exports.onTripDeleted = require('./sendTripNotifications').onTripDeleted;
exports.onLodgingChanged = require('./sendTripNotifications').onLodgingChanged;
exports.onTransportationChanged = require('./sendTripNotifications').onTransportationChanged;
exports.onExperiencesChanged = require('./sendTripNotifications').onExperiencesChanged;
