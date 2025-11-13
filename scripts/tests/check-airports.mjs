import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAirports() {
  console.log('✈️ Checking airports collection...\n');
  
  const airportsSnapshot = await db.collection('airports').get();
  
  console.log(`Found ${airportsSnapshot.size} airports`);
  
  // Find Rome airport
  airportsSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.name && (data.name.includes('Rome') || data.code === 'FCO')) {
      console.log('\nRome Airport:');
      console.log('  ID:', doc.id);
      console.log('  Name:', data.name);
      console.log('  Code:', data.code);
      console.log('  Location:', data.location);
      console.log('  Formatted Address:', data.formatted_address);
    }
  });
  
  // Check if ID matches
  console.log('\n\nChecking specific ID: 2w3BOkS0ODui337yKhtj');
  const specificDoc = await db.collection('airports').doc('2w3BOkS0ODui337yKhtj').get();
  if (specificDoc.exists) {
    console.log('Found:', specificDoc.data());
  } else {
    console.log('Not found in airports collection');
  }
  
  process.exit(0);
}

checkAirports();
