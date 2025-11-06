const functions = require('firebase-functions');
const { db, admin } = require('./shared/admin');

exports.makeReservation = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { trip_id, reservation_type, details, booking_url } = req.body;
  if (!trip_id || !reservation_type || !details) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    const userEmail = req.user?.email || 'unknown@example.com';

    const tripDoc = await db.collection('trips').doc(trip_id).get();
    if (!tripDoc.exists) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    const trip = tripDoc.data();
    const isOwner = trip.created_by === userEmail;
    const isEditor = trip.shared_with?.some((s) => s.user_email === userEmail && s.role === 'editor');
    if (!isOwner && !isEditor) {
      res.status(403).json({ error: 'Permission denied' });
      return;
    }

    const collectionName = `${reservation_type}s`;
    const ref = await db.collection(collectionName).add({
      ...details,
      trip_id,
      booking_url,
      status: 'pending',
      created_by: userEmail,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    const doc = await ref.get();
    res.status(200).json({ id: ref.id, ...doc.data() });
  } catch (error) {
    console.error('Error making reservation:', error);
    res.status(500).json({ error: error.message });
  }
});