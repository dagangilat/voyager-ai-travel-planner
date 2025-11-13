const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'voyagerai-travel-planner'
});

const db = admin.firestore();

async function triggerEmailSend() {
  console.log('Getting a pending mail document...\n');
  
  const mailDocs = await db.collection('mail').limit(1).get();
  
  if (mailDocs.empty) {
    console.log('No mail documents found');
    return;
  }
  
  const doc = mailDocs.docs[0];
  const data = doc.data();
  
  console.log(`Found email: ${doc.id}`);
  console.log(`  To: ${data.to}`);
  console.log(`  Subject: ${data.message?.subject}`);
  console.log(`  Current State: ${data.delivery?.state || 'NO STATE'}\n`);
  
  // Touch the document to trigger the extension
  console.log('Updating document to trigger extension...');
  await doc.ref.update({
    triggerTime: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log('✅ Document updated!');
  console.log('The extension should process it now.');
  console.log('Wait 10-30 seconds and check:');
  console.log('  1. Your email inbox');
  console.log('  2. Run: node check-mail-simple.cjs');
}

triggerEmailSend()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
