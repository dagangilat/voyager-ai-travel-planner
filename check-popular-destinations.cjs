const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'voyagerai-travel-planner'
});

const db = admin.firestore();

async function checkPopularDestinations() {
  console.log('Checking popular destinations coverage...\n');
  
  // Test searches for popular destinations
  const popularTests = [
    'London', 'Paris', 'New York', 'Tokyo', 'Dubai',
    'Los Angeles', 'Chicago', 'Miami', 'Las Vegas',
    'Rome', 'Barcelona', 'Madrid', 'Berlin', 'Munich',
    'Amsterdam', 'Vienna', 'Prague', 'Budapest',
    'Athens', 'Istanbul', 'Cairo', 'Sydney', 'Melbourne',
    'Bangkok', 'Singapore', 'Hong Kong', 'Seoul', 'Beijing',
    'Shanghai', 'Delhi', 'Mumbai', 'Toronto', 'Vancouver',
    'Mexico City', 'Rio', 'Buenos Aires', 'Sao Paulo'
  ];
  
  console.log('Testing popular destinations:\n');
  
  let found = 0;
  let notFound = [];
  
  for (const city of popularTests) {
    const cityLower = city.toLowerCase();
    const results = await db.collection('GlobalDestinations')
      .where('search_terms', 'array-contains', cityLower)
      .limit(1)
      .get();
    
    if (!results.empty) {
      found++;
      console.log(`✅ ${city}`);
    } else {
      notFound.push(city);
      console.log(`❌ ${city} - NOT FOUND`);
    }
  }
  
  console.log(`\n\nRESULTS:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Found: ${found}/${popularTests.length}`);
  console.log(`Missing: ${notFound.length}`);
  
  if (notFound.length > 0) {
    console.log(`\nMissing destinations:`);
    notFound.forEach(city => console.log(`  - ${city}`));
  }
  
  // Check total count and top destinations
  const snapshot = await db.collection('GlobalDestinations')
    .orderBy('popularity', 'desc')
    .limit(10)
    .get();
  
  console.log(`\n\nTop 10 by popularity:`);
  snapshot.forEach((doc, i) => {
    const data = doc.data();
    console.log(`${i + 1}. ${data.name} (popularity: ${data.popularity || 0})`);
  });
}

checkPopularDestinations()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
