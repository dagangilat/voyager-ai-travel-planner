const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Resend } = require('resend');

// Get Resend API key lazily (not during module load)
function getResendApiKey() {
  const apiKey = process.env.RESEND_API_KEY || functions.config().resend?.api_key;
  if (!apiKey) {
    functions.logger.error('Resend API key not configured!');
    throw new Error('Resend API key not configured');
  }
  functions.logger.info('Resend API key loaded successfully');
  return apiKey;
}

/**
 * Send email notification when a trip is created, updated, or deleted
 * Uses Resend as the email provider
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

// Helper to generate trip itinerary HTML
const generateTripItineraryHTML = (trip, destinations) => {
  const destinationsHTML = destinations.map((dest, idx) => `
    <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-left: 4px solid #3b82f6; border-radius: 8px;">
      <h3 style="margin: 0 0 10px 0; color: #1e3a8a; font-size: 18px;">
        📍 Destination ${idx + 1}: ${dest.location_name || dest.location}
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
    </div>
  `).join('');

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

      <h2 style="color: #1e3a8a; font-size: 24px; margin: 30px 0 20px 0;">📍 Your Itinerary</h2>
      ${destinationsHTML}

      <div style="text-align: center; margin-top: 40px;">
        <a href="${process.env.APP_URL || 'https://voyager-ai-travel-planner.web.app'}/TripDetails?id=${trip.id}" 
           style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%); color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
          View Full Trip Details →
        </a>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
        <p>This email was sent by Voyager AI Travel Planner</p>
        <p>You can manage your notification preferences in your profile settings</p>
      </div>
    </div>
  `;
};

// Trigger on trip creation
exports.onTripCreated = functions.firestore
  .document('trips/{tripId}')
  .onCreate(async (snap, context) => {
    const trip = snap.data();
    const tripId = context.params.tripId;
    trip.id = tripId;

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
      if (emailNotifications.trip_created === false) {
        functions.logger.info('User has disabled trip_created notifications');
        return null;
      }

      // Get user email from Firebase Auth
      const userAuth = await admin.auth().getUser(trip.user_id);
      const email = userAuth.email;

      if (!email) {
        functions.logger.warn('No email found for user:', trip.user_id);
        return null;
      }

      // Get destinations
      const destinationsSnapshot = await admin.firestore()
        .collection('destinations')
        .where('trip_id', '==', tripId)
        .orderBy('order')
        .get();
      
      const destinations = destinationsSnapshot.docs.map(doc => doc.data());

      const htmlContent = generateTripItineraryHTML(trip, destinations);

      // Initialize Resend with API key
      const resend = new Resend(getResendApiKey());

      // Send email using Resend
      await resend.emails.send({
        from: 'Voyager <onboarding@resend.dev>',
        to: email,
        subject: `🎉 Your trip "${trip.name}" has been created!`,
        html: htmlContent,
      });

      functions.logger.info('Email notification sent successfully for trip creation:', tripId);
      return null;
    } catch (error) {
      functions.logger.error('Error sending trip creation email:', error);
      return null;
    }
  });

// Trigger on trip update
exports.onTripUpdated = functions.firestore
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

      const htmlContent = generateTripItineraryHTML(tripAfter, destinations);

      // Initialize Resend with API key
      const resend = new Resend(getResendApiKey());

      // Send email using Resend
      await resend.emails.send({
        from: 'Voyager <onboarding@resend.dev>',
        to: email,
        subject: `✏️ Your trip "${tripAfter.name}" has been updated`,
        html: htmlContent,
      });

      functions.logger.info('Email notification sent successfully for trip update:', tripId);
      return null;
    } catch (error) {
      functions.logger.error('Error sending trip update email:', error);
      return null;
    }
  });

// Trigger on trip deletion
exports.onTripDeleted = functions.firestore
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
            <a href="${process.env.APP_URL || 'https://voyager-ai-travel-planner.web.app'}/Dashboard" 
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

      // Initialize Resend with API key
      const resend = new Resend(getResendApiKey());

      // Send email using Resend
      await resend.emails.send({
        from: 'Voyager <onboarding@resend.dev>',
        to: email,
        subject: `🗑️ Trip "${trip.name}" has been deleted`,
        html: htmlContent,
      });

      functions.logger.info('Email notification sent successfully for trip deletion:', tripId);
      return null;
    } catch (error) {
      functions.logger.error('Error sending trip deletion email:', error);
      return null;
    }
  });
