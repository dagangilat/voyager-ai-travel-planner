const functions = require('firebase-functions');
const { db, admin } = require('./shared/admin');

exports.createTripWithDestinations = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { trip, destinations } = req.body;
  if (!trip || !Array.isArray(destinations)) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  try {
    // Verify Firebase Auth token
    let userId = null;
    let userEmail = 'unknown@example.com';
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        userId = decodedToken.uid;
        userEmail = decodedToken.email || userEmail;
        console.log('[createTripWithDestinations] Authenticated user:', { userId, userEmail });
      } catch (error) {
        console.error('[createTripWithDestinations] Token verification failed:', error);
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
      }
    } else {
      console.error('[createTripWithDestinations] No authorization header');
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const tripRef = db.collection('trips').doc();
    const tripData = {
      ...trip,
      user_id: userId, // Use the verified user ID from the token
      created_by: userEmail,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const destinationRefs = [];

    await db.runTransaction(async (transaction) => {
      transaction.set(tripRef, tripData);

      for (let i = 0; i < destinations.length; i++) {
        const dest = destinations[i];
        const destRef = db.collection('destinations').doc();
        destinationRefs.push(destRef);
        transaction.set(destRef, {
          ...dest,
          trip_id: tripRef.id,
          order: i + 1,
          created_by: userEmail,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    const tripDoc = await tripRef.get();
    const destinationDocs = await Promise.all(destinationRefs.map((r) => r.get()));

    const response = {
      trip: { id: tripRef.id, ...tripDoc.data() },
      destinations: destinationDocs.map((doc) => ({ id: doc.id, ...doc.data() })),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error creating trip with destinations:', error);
    res.status(500).json({ error: error.message });
  }
});