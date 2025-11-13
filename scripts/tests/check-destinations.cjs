const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'voyagerai-travel-planner'
});

const db = admin.firestore();

async function checkDestinations() {
  console.log('Checking GlobalDestinations collection...\n');
  
  // Count total documents
  const snapshot = await db.collection('GlobalDestinations').limit(1).get();
  
  if (snapshot.empty) {
    console.log('❌ GlobalDestinations collection is EMPTY!');
    console.log('\nThis explains the slow autocomplete - it\'s calling Google Places API every time!');
    return;
  }
  
  // Get a few samples
  const samples = await db.collection('GlobalDestinations').limit(5).get();
  
  console.log(`✅ Collection exists with at least ${samples.size} documents\n`);
  console.log('Sample documents:');
  samples.forEach((doc, i) => {
    const data = doc.data();
    console.log(`\n${i + 1}. ${data.name || doc.id}`);
    console.log(`   Type: ${data.type}`);
    console.log(`   City: ${data.city}`);
    console.log(`   Country: ${data.country}`);
    console.log(`   Search terms: ${data.search_terms?.slice(0, 3).join(', ')}...`);
  });
  
  // Check index
  console.log('\n\nChecking if search_terms is indexed...');
  try {
    const testQuery = await db.collection('GlobalDestinations')
      .where('search_terms', 'array-contains', 'new')
      .limit(1)
      .get();
    console.log('✅ Index exists and working!');
  } catch (error) {
    console.log('❌ Index missing or not working:', error.message);
  }
}

checkDestinations()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
