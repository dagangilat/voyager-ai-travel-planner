const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'voyagerai-travel-planner'
});

const db = admin.firestore();

async function testStockholm() {
  console.log('Testing Stockholm search...\n');
  
  // Test 1: Exact match
  const exact = await db.collection('GlobalDestinations')
    .where('search_terms', 'array-contains', 'stockholm')
    .get();
  
  console.log(`✅ Exact "stockholm": ${exact.size} results`);
  exact.forEach(doc => {
    const data = doc.data();
    console.log(`   - ${data.name}`);
  });
  
  // Test 2: City field
  const city = await db.collection('GlobalDestinations')
    .where('city', '==', 'Stockholm')
    .get();
  
  console.log(`\n✅ City field "Stockholm": ${city.size} results`);
  
  // Test 3: Partial match
  const all = await db.collection('GlobalDestinations')
    .orderBy('popularity', 'desc')
    .limit(100)
    .get();
  
  console.log(`\nChecking top 100 destinations for Stockholm:`);
  let found = false;
  all.forEach(doc => {
    const data = doc.data();
    if (data.name?.toLowerCase().includes('stockholm') || 
        data.city?.toLowerCase().includes('stockholm')) {
      console.log(`✅ Found: ${data.name} in ${data.city}, ${data.country}`);
      console.log(`   Search terms: ${data.search_terms?.join(', ')}`);
      found = true;
    }
  });
  
  if (!found) {
    console.log('❌ Stockholm NOT FOUND in top 100!');
    console.log('\nNeed to add Stockholm to the database.');
  }
}

testStockholm()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
