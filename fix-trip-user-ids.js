/**
 * Script to fix user_id on existing trips
 * Run with: node fix-trip-user-ids.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./voyager-ai-travel-planner-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixTripUserIds() {
  try {
    console.log('Fetching all trips...');
    const tripsSnapshot = await db.collection('trips').get();
    
    console.log(`Found ${tripsSnapshot.size} trips`);
    
    for (const tripDoc of tripsSnapshot.docs) {
      const tripData = tripDoc.data();
      console.log(`\nTrip: ${tripDoc.id}`);
      console.log(`  Name: ${tripData.name}`);
      console.log(`  Current user_id: ${tripData.user_id}`);
      console.log(`  Created by: ${tripData.created_by}`);
      
      // If user_id is missing or doesn't look like a Firebase UID
      if (!tripData.user_id || tripData.user_id.length < 20) {
        console.log(`  ⚠️  user_id looks invalid or missing`);
        
        // Try to find user by email
        if (tripData.created_by) {
          try {
            const userRecord = await admin.auth().getUserByEmail(tripData.created_by);
            console.log(`  ✓ Found user: ${userRecord.uid}`);
            
            // Update the trip
            await tripDoc.ref.update({
              user_id: userRecord.uid
            });
            
            console.log(`  ✓ Updated trip ${tripDoc.id} with user_id: ${userRecord.uid}`);
          } catch (error) {
            console.log(`  ✗ Could not find user by email: ${error.message}`);
          }
        }
      } else {
        console.log(`  ✓ user_id looks valid`);
      }
    }
    
    console.log('\n✓ Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixTripUserIds();
