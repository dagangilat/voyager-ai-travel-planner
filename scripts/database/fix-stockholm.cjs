const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'voyagerai-travel-planner'
});

const db = admin.firestore();

async function fixStockholm() {
  console.log('Updating Stockholm popularity...\n');
  
  const stockholm = await db.collection('GlobalDestinations')
    .where('city', '==', 'Stockholm')
    .get();
  
  if (stockholm.empty) {
    console.log('❌ Stockholm not found');
    return;
  }
  
  const batch = db.batch();
  let count = 0;
  
  stockholm.forEach(doc => {
    batch.update(doc.ref, { popularity: 85 }); // Set to 85 (same as other European capitals)
    count++;
    console.log(`✅ Updated: ${doc.data().name}`);
  });
  
  await batch.commit();
  console.log(`\n✅ Updated ${count} Stockholm entries to popularity: 85`);
}

fixStockholm()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
