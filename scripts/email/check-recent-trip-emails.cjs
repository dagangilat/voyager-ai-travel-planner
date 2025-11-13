const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'voyagerai-travel-planner'
});

const db = admin.firestore();

async function checkTripEmails() {
  console.log('Checking recent trip-related emails...\n');
  
  // Get all mail documents
  const snapshot = await db.collection('mail').get();
  
  // Find trip-related ones
  const tripEmails = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data(), _createTime: doc.createTime }))
    .filter(email => 
      email.metadata?.type === 'trip_created' || 
      email.metadata?.type === 'trip_updated' ||
      email.metadata?.type === 'trip_deleted'
    )
    .sort((a, b) => (b._createTime?.toMillis() || 0) - (a._createTime?.toMillis() || 0))
    .slice(0, 5);
  
  if (tripEmails.length === 0) {
    console.log('❌ No trip-related emails found in mail collection');
    console.log('\nThis means the triggers are not creating email documents.');
    return;
  }
  
  console.log(`Found ${tripEmails.length} recent trip emails:\n`);
  
  tripEmails.forEach((email, i) => {
    console.log(`${i + 1}. ${email.message?.subject}`);
    console.log(`   ID: ${email.id}`);
    console.log(`   Type: ${email.metadata?.type}`);
    console.log(`   TO: ${email.to}`);
    console.log(`   FROM: ${email.from || 'NOT SET (using default)'}`);
    console.log(`   State: ${email.delivery?.state || 'PENDING'}`);
    if (email.delivery?.error) {
      console.log(`   ERROR: ${email.delivery.error.message || JSON.stringify(email.delivery.error)}`);
    }
    console.log(`   Created: ${email._createTime?.toDate?.().toLocaleString() || 'unknown'}`);
    console.log('');
  });
}

checkTripEmails()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
