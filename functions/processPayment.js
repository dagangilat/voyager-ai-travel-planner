const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Process payment and add credits to user account
 * This is a simulated payment for demo purposes
 */
exports.processPayment = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  const { userId, amount, price, paymentMethod, pro_searches_add, topup_id } = req.body;

    // Validate input
    if (!userId || !amount || !price) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, amount, price' 
      });
    }

    // Calculate credits (amount is number of credits)
    const credits = parseInt(amount);
    if (isNaN(credits) || credits <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Create payment record
    const paymentData = {
      user_id: userId,
      user_email: req.body.user_email, // Add user_email for Billing page query
      credits: credits,
      price: parseFloat(price),
      payment_method: paymentMethod || 'test',
      status: 'completed',
      purchase_date: admin.firestore.FieldValue.serverTimestamp(),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      test_mode: true,
      topup_id: topup_id || null,
      pro_searches_added: pro_searches_add || 0
    };

    // Use a batch write for atomicity
    const batch = db.batch();

    // Add to purchase history
    const purchaseRef = db.collection('purchase_history').doc();
    batch.set(purchaseRef, paymentData);

    // Update user credits
    const userRef = db.collection('users').doc(userId);
    
    // Get current user data
    const userDoc = await userRef.get();
    
    // Get current credits (matching Profile page structure: credits.ai_generations_remaining)
    const currentCredits = userDoc.exists 
      ? (userDoc.data().credits?.ai_generations_remaining || 0) 
      : 0;
    const currentProSearches = userDoc.exists 
      ? (userDoc.data().credits?.pro_searches_remaining || 0) 
      : 0;
    
    // Update credits in nested structure to match Profile page
    batch.set(userRef, {
      credits: {
        ai_generations_remaining: currentCredits + credits,
        pro_searches_remaining: currentProSearches + (pro_searches_add || 0)
      },
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Commit the batch
    await batch.commit();

    functions.logger.info(`Payment processed: ${credits} credits for user ${userId}`);

    return res.status(200).json({
      success: true,
      credits_added: credits,
      pro_searches_added: pro_searches_add || 0,
      new_ai_balance: currentCredits + credits,
      new_pro_searches_balance: currentProSearches + (pro_searches_add || 0),
      purchaseId: purchaseRef.id
    });

  } catch (error) {
    functions.logger.error('Error processing payment:', error);
    return res.status(500).json({ 
      error: 'Payment processing failed',
      message: error.message 
    });
  }
});
