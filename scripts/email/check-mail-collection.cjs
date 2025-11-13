const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'voyagerai-travel-planner'
});

const db = admin.firestore();

async function checkMail() {
  console.log('Checking mail collection...\n');
  
  const mailDocs = await db.collection('mail').orderBy('__name__', 'desc').limit(5).get();
  
  if (mailDocs.empty) {
    console.log('❌ No mail documents found!');
    console.log('\nThe email triggers may not be firing.');
    console.log('Let\'s check if the triggers are deployed...\n');
  } else {
    console.log(`✅ Found ${mailDocs.size} mail documents:\n`);
    mailDocs.forEach((doc, i) => {
      const data = doc.data();
      console.log(`${i + 1}. To: ${data.to}`);
      console.log(`   Subject: ${data.message?.subject}`);
      console.log(`   Type: ${data.metadata?.type}`);
      console.log(`   Delivery State: ${data.delivery?.state || 'pending'}`);
      console.log(`   Created: ${doc.createTime?.toDate?.() || 'unknown'}\n`);
    });
  }
}

checkMail()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
