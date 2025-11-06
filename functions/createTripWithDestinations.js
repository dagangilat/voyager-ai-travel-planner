const functions = require('firebase-functions');
const { db, admin } = require('./shared/admin');

exports.createTripWithDestinations = functions.https.onRequest(async (req, res) => {
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
    const userEmail = req.user?.email || 'unknown@example.com';

    const tripRef = db.collection('trips').doc();
    const tripData = {
      ...trip,
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