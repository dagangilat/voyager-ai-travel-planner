const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'voyagerai-travel-planner'
});

const db = admin.firestore();

async function triggerEmailSend() {
  console.log('Triggering email send by touching mail documents...\n');
  
  const mailDocs = await db.collection('mail')
    .where('delivery.state', '==', 'PENDING')
    .limit(1)
    .get();
  
  if (mailDocs.empty) {
    console.log('No pending emails found');
    return;
  }
  
  const doc = mailDocs.docs[0];
  console.log(`Touching email document: ${doc.id}`);
  console.log(`  To: ${doc.data().to}`);
  console.log(`  Subject: ${doc.data().message?.subject}\n`);
  
  // Update the document to trigger the extension
  await doc.ref.update({
    delivery: {
      startTime: admin.firestore.FieldValue.serverTimestamp(),
      state: 'PENDING',
      attempts: 0
    }
  });
  
  console.log('✅ Document updated - extension should process it now');
  console.log('Wait 10-30 seconds and check your email!');
}

triggerEmailSend()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
