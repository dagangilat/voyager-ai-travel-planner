const functions = require('firebase-functions');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Invoke LLM for AI trip generation
 * Supports Google Gemini API
 */
exports.invokeLLM = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, response_json_schema, add_context_from_internet } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Get Gemini API key from environment
    const geminiApiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
    
    if (!geminiApiKey) {
      functions.logger.error('GEMINI_API_KEY not configured');
      return res.status(500).json({ 
        error: 'LLM service not configured. Please set GEMINI_API_KEY.' 
      });
    }

    // Initialize the Google Generative AI client
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    
    // Configure the model
    const modelConfig = {
      model: 'gemini-2.5-flash',
    };

    // Add generation config if JSON schema is provided
    if (response_json_schema) {
      modelConfig.generationConfig = {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: response_json_schema,
      };
    } else {
      modelConfig.generationConfig = {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      };
    }

    const model = genAI.getGenerativeModel(modelConfig);

    // Generate content
    functions.logger.info('Sending prompt to Gemini 1.5 Flash...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      functions.logger.error('No text in Gemini response');
      return res.status(500).json({ error: 'No response from LLM' });
    }

    // If JSON schema was requested, parse the response
    let resultData = text;
    if (response_json_schema) {
      try {
        resultData = JSON.parse(text);
      } catch (e) {
        functions.logger.error('Failed to parse JSON response:', text);
        return res.status(500).json({ 
          error: 'Invalid JSON response from LLM',
          raw: text 
        });
      }
    }

    functions.logger.info('LLM invocation successful');

    return res.status(200).json({
      success: true,
      result: resultData,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      }
    });

  } catch (error) {
    functions.logger.error('Error invoking LLM:', error);
    return res.status(500).json({ 
      error: 'LLM invocation failed',
      message: error.message 
    });
  }
});
