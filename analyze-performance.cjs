const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'voyagerai-travel-planner'
});

const db = admin.firestore();

async function analyze() {
  console.log('🔍 AUTOCOMPLETE PERFORMANCE ANALYSIS\n');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Test search performance
  console.log('Testing search for "New York"...');
  const start = Date.now();
  
  const results = await db.collection('GlobalDestinations')
    .where('search_terms', 'array-contains', 'new york')
    .orderBy('popularity', 'desc')
    .limit(10)
    .get();
  
  const elapsed = Date.now() - start;
  
  console.log(`✅ Found ${results.size} results in ${elapsed}ms`);
  console.log('\nResults:');
  results.forEach((doc, i) => {
    const data = doc.data();
    console.log(`${i + 1}. ${data.name} (${data.type})`);
  });
  
  // Check collection size
  console.log('\n\nChecking collection size...');
  const allDocs = await db.collection('GlobalDestinations').count().get();
  console.log(`Total documents: ${allDocs.data().count}`);
  
  // Identify issues
  console.log('\n\n🎯 IDENTIFIED ISSUES:');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('1. COLD START DELAY:');
  console.log('   - Cloud Functions in europe-west1 may have cold starts');
  console.log('   - First request takes 1-3 seconds');
  console.log('   - Solution: Use always-on instances OR client-side caching\n');
  
  console.log('2. NETWORK LATENCY:');
  console.log('   - Client → EU function → Firestore → back');
  console.log('   - Each hop adds ~100-300ms');
  console.log('   - Solution: Client-side search with cached data\n');
  
  console.log('3. MISSING DESTINATIONS:');
  console.log('   - Limited to what\'s in GlobalDestinations collection');
  console.log('   - Fallback to Google Places if < 3 results');
  console.log('   - Google Places adds another API call delay\n');
}

analyze()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
