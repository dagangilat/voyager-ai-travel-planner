import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkPlaces() {
  console.log('🔍 Checking all Places...\n');
  
  const placesSnapshot = await db.collection('places').limit(10).get();
  
  console.log(`Found ${placesSnapshot.size} places:`);
  placesSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`\nID: ${doc.id}`);
    console.log('Data:', JSON.stringify(data, null, 2));
  });
  
  // Also check destinations
  console.log('\n\n🗺️ Checking destinations...\n');
  const destsSnapshot = await db.collection('destinations').limit(5).get();
  
  console.log(`Found ${destsSnapshot.size} destinations:`);
  destsSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`\nID: ${doc.id}`);
    console.log('  location:', data.location);
    console.log('  location_name:', data.location_name);
    console.log('  location_coordinates:', data.location_coordinates);
  });
  
  process.exit(0);
}

checkPlaces();
