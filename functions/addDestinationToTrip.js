const functions = require('firebase-functions');
const { db, admin } = require('./shared/admin');
const { verifyAuthToken } = require('./shared/auth');

exports.addDestinationToTrip = functions.region('europe-west1').https.onRequest(async (req, res) => {
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

    const { trip_id, destination } = req.body;
    if (!trip_id || !destination) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    try {
        // Verify authentication
        const decodedToken = await verifyAuthToken(req);
        const userEmail = decodedToken.email;

        // First, verify the user has permission to edit this trip
        const tripDoc = await db.collection('trips').doc(trip_id).get();
        
        if (!tripDoc.exists) {
            res.status(404).json({ error: 'Trip not found' });
            return;
        }

        const trip = tripDoc.data();

        // Check if user is owner or editor
        const isOwner = trip.created_by === userEmail;
        const isEditor = trip.shared_with?.some(su => 
            su.user_email === userEmail && su.role === 'editor'
        );

        if (!isOwner && !isEditor) {
            res.status(403).json({ error: 'Permission denied' });
            return;
        }

        // Create the new destination document
        const destinationRef = await db.collection('destinations').add({
            ...destination,
            trip_id,
            created_by: userEmail,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });

        // Get the created destination data
        const destinationDoc = await destinationRef.get();
        const newDestination = {
            id: destinationRef.id,
            ...destinationDoc.data()
        };

        res.status(200).json(newDestination);
    } catch (error) {
        console.error('Error adding destination:', error);
        if (error.message === 'No authorization header' || error.message === 'Invalid token') {
            res.status(401).json({ error: 'Unauthorized' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});