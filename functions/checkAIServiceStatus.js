const functions = require('firebase-functions');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Check AI Service Status
 * Returns the availability status of Gemini API
 */
exports.checkAIServiceStatus = functions.region('europe-west1').https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
    return res.status(204).send('');
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all API keys
    const apiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
    ].filter(Boolean);

    if (apiKeys.length === 0) {
      return res.status(200).json({
        status: 'unavailable',
        message: 'No API keys configured',
        availableKeys: 0,
        workingKeys: 0
      });
    }

    // Test each key with a simple prompt
    const testPrompt = 'Say "OK" if you can read this.';
    let workingKeys = 0;
    const keyStatuses = [];

    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      const keyPreview = `Key ${i + 1} (${apiKey.substring(0, 10)}...)`;
      
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-2.5-flash',
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 10
          }
        });

        // Set timeout for the request
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        const resultPromise = model.generateContent(testPrompt);
        const result = await Promise.race([resultPromise, timeoutPromise]);
        
        const response = await result.response;
        const text = response.text();

        if (text) {
          workingKeys++;
          keyStatuses.push({
            key: keyPreview,
            status: 'working',
            model: 'gemini-2.5-flash'
          });
        } else {
          keyStatuses.push({
            key: keyPreview,
            status: 'error',
            error: 'No response text'
          });
        }
      } catch (error) {
        const errorMsg = error.message || 'Unknown error';
        const isQuotaError = error.status === 429 || errorMsg.includes('quota') || errorMsg.includes('429');
        
        keyStatuses.push({
          key: keyPreview,
          status: isQuotaError ? 'quota_exceeded' : 'error',
          error: errorMsg
        });
      }
    }

    // Determine overall status
    let overallStatus = 'unavailable';
    let message = 'AI service is currently unavailable';

    if (workingKeys > 0) {
      overallStatus = 'available';
      message = `AI service is available (${workingKeys}/${apiKeys.length} keys working)`;
    } else {
      // Check if all keys have quota issues
      const quotaErrors = keyStatuses.filter(k => k.status === 'quota_exceeded').length;
      if (quotaErrors === apiKeys.length) {
        overallStatus = 'quota_exceeded';
        message = 'AI service quota exceeded. Please try again later.';
      }
    }

    return res.status(200).json({
      status: overallStatus,
      message,
      availableKeys: apiKeys.length,
      workingKeys,
      keys: keyStatuses,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    functions.logger.error('Error checking AI service status:', error);
    return res.status(200).json({
      status: 'error',
      message: 'Failed to check AI service status',
      error: error.message
    });
  }
});
