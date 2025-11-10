const functions = require('firebase-functions');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const geminiModelsData = require('./gemini-models.json');

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
    
    // List of models to try in order (excluding image generation model)
    const modelsToTry = geminiModelsData.gemini_models
      .filter(m => m.api_name !== 'gemini-2.5-flash-image')
      .map(m => m.api_name);
    
    let lastError = null;
    let result = null;
    
    // Try each model with retry logic
    for (const modelName of modelsToTry) {
      functions.logger.info(`Trying model: ${modelName}`);
      
      try {
        // Configure the model
        const modelConfig = {
          model: modelName,
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

        // Generate content with retry
        let retries = 3;
        while (retries > 0) {
          try {
            functions.logger.info(`Sending prompt to ${modelName} (${retries} retries left)...`);
            result = await model.generateContent(prompt);
            break; // Success, exit retry loop
          } catch (retryError) {
            retries--;
            if (retries === 0 || retryError.status !== 503) {
              throw retryError; // Give up on this model
            }
            // Wait before retrying (exponential backoff)
            const waitTime = (3 - retries) * 2000; // 2s, 4s
            functions.logger.warn(`Model ${modelName} overloaded, retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
        
        if (result) {
          const response = await result.response;
          const text = response.text();

          if (!text) {
            throw new Error('No text in response');
          }

          // If JSON schema was requested, parse the response
          let resultData = text;
          if (response_json_schema) {
            try {
              resultData = JSON.parse(text);
            } catch (e) {
              functions.logger.error('Failed to parse JSON response:', text);
              throw new Error('Invalid JSON response from LLM');
            }
          }

          functions.logger.info(`LLM invocation successful with ${modelName}`);

          return res.status(200).json({
            success: true,
            result: resultData,
            model: modelName, // Include which model was used
            usage: {
              promptTokens: response.usageMetadata?.promptTokenCount || 0,
              completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
              totalTokens: response.usageMetadata?.totalTokenCount || 0
            }
          });
        }
      } catch (modelError) {
        functions.logger.warn(`Model ${modelName} failed:`, modelError.message);
        lastError = modelError;
        // Continue to next model
      }
    }
    
    // All models failed
    throw lastError || new Error('All models failed');

  } catch (error) {
    functions.logger.error('Error invoking LLM:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'LLM invocation failed';
    if (error.status === 429 || error.message?.includes('quota')) {
      errorMessage = 'API quota exceeded. Please wait a few minutes and try again, or upgrade your API key to a paid plan.';
    } else if (error.status === 503) {
      errorMessage = 'AI service temporarily unavailable. Please try again in a moment.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return res.status(error.status || 500).json({ 
      error: errorMessage,
      message: error.message,
      details: error.status === 429 ? 'Rate limit exceeded. Free tier has strict limits. Consider upgrading your Gemini API key.' : undefined
    });
  }
});
