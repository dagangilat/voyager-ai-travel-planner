const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Send email notification when a trip is created, updated, or deleted
 * Uses Firebase Extension: Trigger Email from Firestore
 * 
 * How it works:
 * 1. Write email document to 'mail' collection
 * 2. Extension watches this collection
 * 3. Extension sends the email via configured provider
 * 4. Extension updates document with delivery status
 */

// Helper to format date nicely
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// Helper to generate trip itinerary HTML with daily plan
const generateTripItineraryHTML = async (trip, destinations, tripId) => {
  const db = admin.firestore();
  
  // Fetch lodging, transportation, and experiences for this trip
  const [lodgingSnap, transportationSnap, experiencesSnap] = await Promise.all([
    db.collection('lodging').where('trip_id', '==', tripId).get(),
    db.collection('transportation').where('trip_id', '==', tripId).get(),
    db.collection('experiences').where('trip_id', '==', tripId).get()
  ]);
  
  const lodging = lodgingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const transportation = transportationSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const experiences = experiencesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Build daily plan by destination
  const destinationsHTML = destinations.map((dest, idx) => {
    const destLodging = lodging.filter(l => 
      l.location === dest.location || l.location_display === dest.location_name
    );
    const destExperiences = experiences.filter(e => 
      e.location === dest.location || e.location_display === dest.location_name
    );
    
    const lodgingHTML = destLodging.length > 0 ? `
      <div style="margin: 15px 0;">
        <h4 style="color: #1e3a8a; font-size: 14px; margin: 10px 0;">🏨 Lodging Options:</h4>
        ${destLodging.map(l => `
          <div style="padding: 10px; background: white; border-radius: 6px; margin: 5px 0;">
            <strong>${l.name}</strong> (${l.type || 'Hotel'})<br>
            <span style="color: #666; font-size: 13px;">
              Check-in: ${formatDate(l.check_in_date)} | Check-out: ${formatDate(l.check_out_date)}
              ${l.price_per_night ? ` | $${l.price_per_night}/night` : ''}
            </span>
          </div>
        `).join('')}
      </div>
    ` : '';
    
    const experiencesHTML = destExperiences.length > 0 ? `
      <div style="margin: 15px 0;">
        <h4 style="color: #1e3a8a; font-size: 14px; margin: 10px 0;">🎯 Experiences & Activities:</h4>
        ${destExperiences.map(e => `
          <div style="padding: 10px; background: white; border-radius: 6px; margin: 5px 0;">
            <strong>${e.name}</strong> (${e.category || 'Activity'})<br>
            <span style="color: #666; font-size: 13px;">
              ${e.date ? formatDate(e.date) : ''} ${e.duration ? `| ${e.duration}` : ''}
              ${e.price ? ` | $${e.price}` : ''}
            </span>
          </div>
        `).join('')}
      </div>
    ` : '';
    
    return `
      <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-left: 4px solid #3b82f6; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; color: #1e3a8a; font-size: 18px;">
          📍 Day ${idx + 1}: ${dest.location_name || dest.location}
        </h3>
        <p style="margin: 5px 0; color: #666;">
          <strong>Arrival:</strong> ${formatDate(dest.arrival_date)}<br>
          <strong>Duration:</strong> ${dest.nights} night${dest.nights !== 1 ? 's' : ''}
        </p>
        ${dest.purposes && dest.purposes.length > 0 ? `
          <p style="margin: 5px 0; color: #666;">
            <strong>Focus:</strong> ${dest.purposes.join(', ')}
          </p>
        ` : ''}
        ${lodgingHTML}
        ${experiencesHTML}
      </div>
    `;
  }).join('');
  
  // Get transportation between destinations
  const transportationHTML = transportation.length > 0 ? `
    <h2 style="color: #1e3a8a; font-size: 24px; margin: 30px 0 20px 0;">🚗 Transportation</h2>
    ${transportation.map(t => `
      <div style="margin: 15px 0; padding: 15px; background: #f0f9ff; border-radius: 8px;">
        <strong style="color: #1e3a8a;">${t.from_location_display || t.from_location} → ${t.to_location_display || t.to_location}</strong><br>
        <span style="color: #666; font-size: 14px;">
          ${t.type || 'Transport'} ${t.provider ? `via ${t.provider}` : ''}<br>
          ${t.departure_datetime ? `Departs: ${new Date(t.departure_datetime).toLocaleString()}` : ''}
          ${t.price ? ` | $${t.price}` : ''}
        </span>
      </div>
    `).join('')}
  ` : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
      <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%); border-radius: 12px; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 32px;">✈️ ${trip.name}</h1>
      </div>

      <div style="padding: 20px; background: #f0f9ff; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 10px 0; color: #1e3a8a; font-size: 16px;">
          <strong>📅 Dates:</strong> ${formatDate(trip.departure_date)} - ${formatDate(trip.return_date)}
        </p>
        <p style="margin: 10px 0; color: #1e3a8a; font-size: 16px;">
          <strong>🏠 Starting From:</strong> ${trip.origin}
        </p>
        ${trip.budget_level ? `
          <p style="margin: 10px 0; color: #1e3a8a; font-size: 16px;">
            <strong>💰 Budget:</strong> ${trip.budget_level.charAt(0).toUpperCase() + trip.budget_level.slice(1)}
          </p>
        ` : ''}
        ${trip.tempo ? `
          <p style="margin: 10px 0; color: #1e3a8a; font-size: 16px;">
            <strong>⚡ Tempo:</strong> ${trip.tempo.charAt(0).toUpperCase() + trip.tempo.slice(1)}
          </p>
        ` : ''}
      </div>

      <h2 style="color: #1e3a8a; font-size: 24px; margin: 30px 0 20px 0;">📅 Daily Plan</h2>
      ${destinationsHTML}
      
      ${transportationHTML}

      <div style="text-align: center; margin-top: 40px;">
        <a href="https://voyagerai-travel-planner.web.app/TripDetails?id=${trip.id}" 
           style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%); color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
          View Full Trip Details →
        </a>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
        <p>This email was sent by Voyager AI Travel Planner</p>
        <p style="margin-top: 15px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; color: #92400e;">
          <strong>📌 Important:</strong> This is a free service. Your trip data will be kept for 90 days and deleted afterwards. 
          Please save this email as it contains your complete daily schedule!
        </p>
        <p style="margin-top: 10px;">You can manage your notification preferences in your profile settings</p>
      </div>
    </div>
  `;
};

// Trigger on trip creation
exports.onTripCreated = functions.region('europe-west1').firestore
  .document('trips/{tripId}')
  .onCreate(async (snap, context) => {
    functions.logger.info('🔔 onTripCreated trigger fired!', { tripId: context.params.tripId });
    
    const trip = snap.data();
    const tripId = context.params.tripId;
    trip.id = tripId;

    functions.logger.info('Trip data:', { 
      tripId, 
      tripName: trip.name, 
      userId: trip.user_id 
    });

    try {
      // Get user info
      functions.logger.info('Fetching user document...', { userId: trip.user_id });
      const userDoc = await admin.firestore().collection('users').doc(trip.user_id).get();
      if (!userDoc.exists) {
        functions.logger.warn('❌ User not found:', trip.user_id);
        return null;
      }

      functions.logger.info('✅ User document found');
      const user = userDoc.data();
      
      // Check if user wants this notification (default to true if not set)
      const emailNotifications = user.email_notifications || {};
      functions.logger.info('Email notification preferences:', emailNotifications);
      
      if (emailNotifications.trip_created === false) {
        functions.logger.info('User has disabled trip_created notifications');
        return null;
      }

      functions.logger.info('✅ Notification preferences OK, proceeding to send email');

      // Get user email from Firebase Auth
      functions.logger.info('Getting user auth info...');
      const userAuth = await admin.auth().getUser(trip.user_id);
      const email = userAuth.email;

      if (!email) {
        functions.logger.warn('❌ No email found for user:', trip.user_id);
        return null;
      }

      functions.logger.info('✅ User email found:', email);

      // Get destinations
      functions.logger.info('Fetching destinations...');
      const destinationsSnapshot = await admin.firestore()
        .collection('destinations')
        .where('trip_id', '==', tripId)
        .orderBy('order')
        .get();
      
      const destinations = destinationsSnapshot.docs.map(doc => doc.data());
      functions.logger.info(`Found ${destinations.length} destinations`);

      const htmlContent = await generateTripItineraryHTML(trip, destinations, tripId);

      // Write email document to 'mail' collection
      // Firebase Extension will pick it up and send it
      functions.logger.info('Creating email document in Firestore...');
      
      await admin.firestore().collection('mail').add({
        to: email,
        from: 'feedmyinfo@gmail.com', // Gmail address
        message: {
          subject: `🎉 Your trip "${trip.name}" has been created!`,
          html: htmlContent,
        },
        metadata: {
          tripId,
          userId: trip.user_id,
          type: 'trip_created',
        },
      });

      functions.logger.info('✅ Email document created! Extension will send it.', { 
        tripId, 
        to: email 
      });
      
      return null;
    } catch (error) {
      functions.logger.error('❌ Error creating email document:', {
        error: error.message,
        stack: error.stack,
        tripId: context.params.tripId
      });
      return null;
    }
  });

// Trigger on trip update
exports.onTripUpdated = functions.region('europe-west1').firestore
  .document('trips/{tripId}')
  .onUpdate(async (change, context) => {
    const tripAfter = change.after.data();
    const tripId = context.params.tripId;
    tripAfter.id = tripId;

    try {
      // Get user info
      const userDoc = await admin.firestore().collection('users').doc(tripAfter.user_id).get();
      if (!userDoc.exists) {
        functions.logger.warn('User not found:', tripAfter.user_id);
        return null;
      }

      const user = userDoc.data();
      
      // Check if user wants this notification (default to true if not set)
      const emailNotifications = user.email_notifications || {};
      if (emailNotifications.trip_updated === false) {
        functions.logger.info('User has disabled trip_updated notifications');
        return null;
      }

      // Get user email
      const userAuth = await admin.auth().getUser(tripAfter.user_id);
      const email = userAuth.email;

      if (!email) {
        functions.logger.warn('No email found for user:', tripAfter.user_id);
        return null;
      }

      // Get destinations
      const destinationsSnapshot = await admin.firestore()
        .collection('destinations')
        .where('trip_id', '==', tripId)
        .orderBy('order')
        .get();
      
      const destinations = destinationsSnapshot.docs.map(doc => doc.data());

      const htmlContent = await generateTripItineraryHTML(tripAfter, destinations, tripId);

      // Write email document to 'mail' collection
      await admin.firestore().collection('mail').add({
        to: email,
        from: 'feedmyinfo@gmail.com', // Gmail address
        message: {
          subject: `✏️ Your trip "${tripAfter.name}" has been updated`,
          html: htmlContent,
        },
        metadata: {
          tripId,
          userId: tripAfter.user_id,
          type: 'trip_updated',
        },
      });

      functions.logger.info('Email document created for trip update:', tripId);
      return null;
    } catch (error) {
      functions.logger.error('Error creating email document for trip update:', error);
      return null;
    }
  });

// Trigger on trip deletion
exports.onTripDeleted = functions.region('europe-west1').firestore
  .document('trips/{tripId}')
  .onDelete(async (snap, context) => {
    const trip = snap.data();
    const tripId = context.params.tripId;

    try {
      // Get user info
      const userDoc = await admin.firestore().collection('users').doc(trip.user_id).get();
      if (!userDoc.exists) {
        functions.logger.warn('User not found:', trip.user_id);
        return null;
      }

      const user = userDoc.data();
      
      // Check if user wants this notification (default to true if not set)
      const emailNotifications = user.email_notifications || {};
      if (emailNotifications.trip_deleted === false) {
        functions.logger.info('User has disabled trip_deleted notifications');
        return null;
      }

      // Get user email
      const userAuth = await admin.auth().getUser(trip.user_id);
      const email = userAuth.email;

      if (!email) {
        functions.logger.warn('No email found for user:', trip.user_id);
        return null;
      }

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 12px; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 32px;">🗑️ Trip Deleted</h1>
          </div>

          <div style="padding: 20px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
            <p style="margin: 0; color: #991b1b; font-size: 16px;">
              Your trip <strong>"${trip.name}"</strong> has been deleted.
            </p>
          </div>

          <p style="margin-top: 30px; color: #666;">
            If this was a mistake, you can create a new trip from your dashboard.
          </p>

          <div style="text-align: center; margin-top: 40px;">
            <a href="https://voyagerai-travel-planner.web.app/Dashboard" 
               style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%); color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
              Go to Dashboard →
            </a>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>This email was sent by Voyager AI Travel Planner</p>
            <p>You can manage your notification preferences in your profile settings</p>
          </div>
        </div>
      `;

      // Write email document to 'mail' collection
      await admin.firestore().collection('mail').add({
        to: email,
        from: 'feedmyinfo@gmail.com', // Gmail address
        message: {
          subject: `🗑️ Trip "${trip.name}" has been deleted`,
          html: htmlContent,
        },
        metadata: {
          tripId,
          userId: trip.user_id,
          type: 'trip_deleted',
        },
      });

      functions.logger.info('Email document created for trip deletion:', tripId);
      return null;
    } catch (error) {
      functions.logger.error('Error creating email document for trip deletion:', error);
      return null;
    }
  });
