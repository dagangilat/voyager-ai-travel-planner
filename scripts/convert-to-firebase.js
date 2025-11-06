import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the source data
const sourceData = JSON.parse(
  readFileSync(resolve(__dirname, '../entities-data-export.json'), 'utf8')
);

// Restructured data will be stored here
const firebaseData = {
  users: {},
  trips: {},
  itineraries: {},
  activities: {},
  collaborations: {}
};

// Helper function to create timestamp
function toTimestamp(dateString) {
  return {
    _seconds: Math.floor(new Date(dateString).getTime() / 1000),
    _nanoseconds: 0
  };
}

// Convert source data to new structure
function convertData() {
  // First, collect all unique users
  const users = new Set();
  Object.values(sourceData.entities).forEach(entities => {
    entities.forEach(entity => {
      if (entity.created_by) {
        users.add(entity.created_by);
      }
      if (entity.data?.user_email) {
        users.add(entity.data.user_email);
      }
    });
  });

  // Create user documents
  users.forEach(email => {
    const username = email.split('@')[0];
    firebaseData.users[email] = {
      username: username,
      email: email,
      profilePictureUrl: null,
      preferences: JSON.stringify({
        defaultCurrency: 'USD',
        languagePreference: 'en'
      })
    };
  });

  // Convert Trips
  sourceData.entities.Trip?.forEach(trip => {
    const tripId = trip.id;
    firebaseData.trips[tripId] = {
      user: trip.created_by,
      name: trip.data.name,
      startDate: toTimestamp(trip.data.departure_date),
      endDate: toTimestamp(trip.data.return_date),
      destination: trip.data.origin, // Using origin as main destination
      description: trip.data.notes || '',
      imageUrl: null,
      visibility: trip.data.shared_with?.length > 0 ? 'SHARED' : 'PRIVATE',
      createdAt: toTimestamp(trip.created_date),
      updatedAt: toTimestamp(trip.updated_date || trip.created_date)
    };

    // Create collaboration record for trip owner
    firebaseData.collaborations[`${trip.created_by}_${tripId}`] = {
      user: trip.created_by,
      trip: tripId,
      role: 'OWNER',
      createdAt: toTimestamp(trip.created_date)
    };

    // Create collaborations for shared users
    trip.data.shared_with?.forEach(share => {
      firebaseData.collaborations[`${share.user_email}_${tripId}`] = {
        user: share.user_email,
        trip: tripId,
        role: share.role.toUpperCase(),
        createdAt: toTimestamp(trip.created_date)
      };
    });
  });

  // Convert Destinations to Itineraries
  const destinations = sourceData.entities.Destination || [];
  destinations.forEach(dest => {
    const itineraryId = `${dest.data.trip_id}_day${dest.data.order}`;
    firebaseData.itineraries[itineraryId] = {
      trip: dest.data.trip_id,
      dayNumber: dest.data.order,
      title: `Day ${dest.data.order}: ${dest.data.location_name}`,
      notes: ''
    };
  });

  // Convert other entities to Activities
  const activitySources = {
    Transportation: 'TRANSPORT',
    Lodging: 'ACCOMMODATION',
    Experience: 'ATTRACTION'
  };

  Object.entries(activitySources).forEach(([sourceType, activityType]) => {
    const entities = sourceData.entities[sourceType] || [];
    entities.forEach(entity => {
      const activityId = entity.id;
      const tripId = entity.data.trip_id;
      const dayNumber = calculateDayNumber(entity, tripId);
      const itineraryId = `${tripId}_day${dayNumber}`;

      firebaseData.activities[activityId] = {
        itinerary: itineraryId,
        name: entity.data.name || `${activityType} - ${entity.data.location_display || entity.data.to_location_display}`,
        type: activityType,
        location: entity.data.location_display || entity.data.to_location_display,
        startTime: toTimestamp(entity.data.departure_datetime || entity.data.check_in_date || entity.data.date),
        endTime: toTimestamp(entity.data.arrival_datetime || entity.data.check_out_date || entity.data.date),
        description: entity.data.details || '',
        bookingInfo: JSON.stringify({
          provider: entity.data.provider,
          status: entity.data.status
        }),
        cost: entity.data.price || entity.data.total_price || 0
      };
    });
  });

  return firebaseData;
}

// Helper function to calculate day number for an activity
function calculateDayNumber(entity, tripId) {
  const trip = sourceData.entities.Trip.find(t => t.id === tripId);
  if (!trip) return 1;

  const tripStart = new Date(trip.data.departure_date);
  const activityDate = new Date(entity.data.departure_datetime || entity.data.check_in_date || entity.data.date);
  
  const diffTime = Math.abs(activityDate - tripStart);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

try {
  // Export the converted data
  const outputData = convertData();
  writeFileSync(
    resolve(__dirname, '../firebase-converted-data.json'),
    JSON.stringify(outputData, null, 2)
  );

  console.log('Data conversion completed! Check firebase-converted-data.json for the results.');
} catch (error) {
  console.error('Error during conversion:', error);
  process.exit(1);
}