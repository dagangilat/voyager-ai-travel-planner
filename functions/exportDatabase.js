const functions = require('firebase-functions');
const { db } = require('./shared/admin');

exports.exportDatabase = functions.https.onRequest(async (req, res) => {
    // This function should only be accessible to admin users
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const data = {};

        // Get all collections
        const collections = ['trips', 'destinations', 'lodgings', 'transportations', 'experiences'];

        // Export each collection
        await Promise.all(collections.map(async (collection) => {
            const snapshot = await db.collection(collection).get();
            data[collection] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }));

        res.status(200).json(data);
    } catch (error) {
        console.error('Error exporting database:', error);
        res.status(500).json({ error: error.message });
    }
});