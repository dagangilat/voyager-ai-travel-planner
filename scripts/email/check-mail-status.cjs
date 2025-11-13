const admin = require('firebase-admin');

// Don't initialize if already initialized
if (!admin.apps.length) {
  const serviceAccount = require('./service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'voyagerai-travel-planner'
  });
}

const db = admin.firestore();

async function checkMailStatus() {
  try {
    console.log('Checking mail collection...\n');
    
    const snapshot = await db.collection('mail')
      .orderBy('__name__', 'desc')
      .limit(10)
      .get();
    
    if (snapshot.empty) {
      console.log('No emails found in mail collection');
      return;
    }
    
    console.log(`Found ${snapshot.size} recent emails:\n`);
    
    snapshot.docs.forEach((doc, i) => {
      const data = doc.data();
      const metadata = data.metadata || {};
      console.log(`${i + 1}. ${data.message?.subject || 'No subject'}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Type: ${metadata.type || 'unknown'}`);
      console.log(`   TO: ${data.to}`);
      console.log(`   FROM: ${data.from || 'NOT SET'}`);
      console.log(`   State: ${data.delivery?.state || 'NO STATE'}`);
      if (data.delivery?.error) {
        console.log(`   ERROR: ${data.delivery.error}`);
      }
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkMailStatus();
