const admin = require('firebase-admin');

const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkPlaceCoordinates() {
  console.log('🔍 Checking Place coordinates for Rome...\n');
  
  const placesSnapshot = await db.collection('places').get();
  
  placesSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.name && data.name.includes('Rome')) {
      console.log('Place:', {
        id: doc.id,
        name: data.name,
        location: data.location,
        formatted_address: data.formatted_address
      });
    }
  });
  
  process.exit(0);
}

checkPlaceCoordinates();
