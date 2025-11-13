const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'voyagerai-travel-planner'
});

const db = admin.firestore();

async function checkEmail() {
  const doc = await db.collection('mail').doc('g6Hs9QfIyYW2vb8q6C6P').get();
  
  if (!doc.exists) {
    console.log('Document not found');
    return;
  }
  
  const data = doc.data();
  console.log('Test Email Status:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`To: ${data.to}`);
  console.log(`Subject: ${data.message?.subject}`);
  console.log(`Delivery State: ${data.delivery?.state || 'NOT PROCESSED YET'}`);
  
  if (data.delivery?.error) {
    console.log(`\n❌ ERROR: ${data.delivery.error.message || JSON.stringify(data.delivery.error)}`);
  } else if (data.delivery?.state === 'SUCCESS') {
    console.log(`\n✅ EMAIL SENT SUCCESSFULLY!`);
    console.log(`Check your inbox: dagan.gilat@gmail.com`);
  } else if (data.delivery?.state === 'PROCESSING') {
    console.log(`\n⏳ Email is being processed...`);
  } else {
    console.log(`\n⏸️ Email not processed yet - extension may still be starting`);
  }
}

checkEmail()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
