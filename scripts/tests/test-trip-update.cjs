const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'voyagerai-travel-planner'
});

async function testTriggers() {
  console.log('Testing if onTripUpdated is working...\n');
  
  const db = admin.firestore();
  
  // Get a test trip
  const tripsSnapshot = await db.collection('trips').limit(1).get();
  
  if (tripsSnapshot.empty) {
    console.log('No trips found to test with');
    process.exit(0);
  }
  
  const testTrip = tripsSnapshot.docs[0];
  console.log(`Test trip: ${testTrip.id} - ${testTrip.data().name}`);
  console.log('');
  
  // Count current emails
  const beforeCount = await db.collection('mail').get();
  console.log(`Current email count: ${beforeCount.size}`);
  console.log('');
  
  // Update the trip to trigger onTripUpdated
  console.log('Updating trip to trigger onTripUpdated...');
  await testTrip.ref.update({
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    test_update: new Date().toISOString()
  });
  
  console.log('✅ Trip updated');
  console.log('');
  console.log('Waiting 10 seconds for trigger to fire...');
  
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Check if new email was created
  const afterCount = await db.collection('mail').get();
  console.log(`New email count: ${afterCount.size}`);
  
  if (afterCount.size > beforeCount.size) {
    console.log('');
    console.log('✅ SUCCESS! Email was created by onTripUpdated trigger');
    
    // Get the latest email
    const latestEmail = afterCount.docs[afterCount.docs.length - 1];
    const emailData = latestEmail.data();
    console.log('');
    console.log('Email details:');
    console.log(`  Subject: ${emailData.message?.subject}`);
    console.log(`  TO: ${emailData.to}`);
    console.log(`  FROM: ${emailData.from || 'NOT SET'}`);
    console.log(`  State: ${emailData.delivery?.state || 'PENDING'}`);
  } else {
    console.log('');
    console.log('❌ No new email created - trigger may not be working');
  }
  
  process.exit(0);
}

testTriggers().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
