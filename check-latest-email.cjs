const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'voyagerai-travel-planner'
});

const db = admin.firestore();

async function checkLatest() {
  // Get all mail docs and find the latest
  const snapshot = await db.collection('mail').get();
  
  if (snapshot.empty) {
    console.log('No emails found');
    return;
  }
  
  // Sort by creation time (newest first)
  const docs = snapshot.docs.sort((a, b) => {
    const timeA = a.createTime?.toMillis() || 0;
    const timeB = b.createTime?.toMillis() || 0;
    return timeB - timeA;
  });
  
  const latest = docs[0];
  const data = latest.data();
  
  console.log('Latest Email Status:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`ID: ${latest.id}`);
  console.log(`To: ${data.to}`);
  console.log(`Subject: ${data.message?.subject}`);
  console.log(`State: ${data.delivery?.state || 'NOT PROCESSED'}`);
  
  if (data.delivery?.error) {
    console.log(`\n❌ ERROR: ${JSON.stringify(data.delivery.error, null, 2)}`);
  } else if (data.delivery?.state === 'SUCCESS') {
    console.log(`\n✅ EMAIL SENT SUCCESSFULLY!`);
    console.log(`Sent at: ${data.delivery.endTime?.toDate?.() || 'unknown'}`);
    console.log(`Message ID: ${data.delivery.info?.messageId || 'N/A'}`);
  } else if (data.delivery?.state === 'PROCESSING') {
    console.log(`\n⏳ Still processing...`);
  } else {
    console.log(`\n⏸️ Not processed yet`);
  }
}

checkLatest()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
