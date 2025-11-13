const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'voyagerai-travel-planner'
});

const db = admin.firestore();

async function checkMail() {
  console.log('Checking mail collection...\n');
  
  const mailDocs = await db.collection('mail').limit(10).get();
  
  if (mailDocs.empty) {
    console.log('❌ NO MAIL DOCUMENTS FOUND!');
    console.log('\nThis means the email triggers (onTripCreated, etc.) are NOT writing to the mail collection.');
    console.log('\nPossible causes:');
    console.log('1. Functions are not triggering');
    console.log('2. Functions have errors and are failing');
    console.log('3. User preferences are blocking emails');
    console.log('\nLet\'s check the function logs...\n');
  } else {
    console.log(`✅ Found ${mailDocs.size} mail documents:\n`);
    mailDocs.forEach((doc, i) => {
      const data = doc.data();
      console.log(`${i + 1}. ID: ${doc.id}`);
      console.log(`   To: ${data.to}`);
      console.log(`   Subject: ${data.message?.subject}`);
      console.log(`   Type: ${data.metadata?.type}`);
      console.log(`   Delivery State: ${data.delivery?.state || 'PENDING'}`);
      if (data.delivery?.error) {
        console.log(`   ERROR: ${data.delivery.error.message}`);
      }
      console.log('');
    });
  }
}

checkMail()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
