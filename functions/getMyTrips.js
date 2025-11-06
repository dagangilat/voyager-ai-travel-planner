const functions = require('firebase-functions');
const { db } = require('./shared/admin');

exports.getMyTrips = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Basic auth check (adjust to your auth middleware)
  const userEmail = req.user?.email || 'unknown@example.com';

  try {
    const ownedSnapshot = await db.collection('trips').where('created_by', '==', userEmail).get();
    const owned = ownedSnapshot.docs.map((d) => ({ id: d.id, ...d.data(), access: 'owner' }));

    // For shared trips, we store shared_with as array of objects; Firestore does not support array-contains with object easily,
    // so this example reads all trips and filters — for production, structure shared_with for efficient queries.
    const allTripsSnapshot = await db.collection('trips').get();
    const shared = [];
    allTripsSnapshot.docs.forEach((d) => {
      const data = d.data();
      if (data.shared_with && Array.isArray(data.shared_with)) {
        if (data.shared_with.some((s) => s.user_email === userEmail)) {
          shared.push({ id: d.id, ...data, access: 'editor' });
        }
      }
    });

    const trips = [...owned, ...shared];
    trips.sort((a, b) => {
      const at = a.updated_at?.toDate?.() || new Date(0);
      const bt = b.updated_at?.toDate?.() || new Date(0);
      return bt - at;
    });

    res.status(200).json({ trips });
  } catch (error) {
    console.error('Error getting trips:', error);
    res.status(500).json({ error: error.message });
  }
});