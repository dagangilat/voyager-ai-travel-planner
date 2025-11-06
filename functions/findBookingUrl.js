const functions = require('firebase-functions');

exports.findBookingUrl = functions.https.onRequest(async (req, res) => {
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

  const { type, query } = req.body;
  if (!type || !query) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    let bookingUrl;
    switch (type.toLowerCase()) {
      case 'hotel':
        bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(query)}`;
        break;
      case 'flight':
        bookingUrl = `https://www.google.com/flights?hl=en#flt=${encodeURIComponent(query)}`;
        break;
      case 'activity':
        bookingUrl = `https://www.viator.com/search/${encodeURIComponent(query)}`;
        break;
      default:
        res.status(400).json({ error: 'Invalid booking type' });
        return;
    }

    res.status(200).json({ url: bookingUrl });
  } catch (error) {
    console.error('Error finding booking URL:', error);
    res.status(500).json({ error: error.message });
  }
});