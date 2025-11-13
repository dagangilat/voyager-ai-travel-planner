const functions = require('firebase-functions');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const geminiModelsData = require('./gemini-models.json');
const cors = require('cors')({ origin: true });

/**
 * Invoke LLM for AI trip generation
 * Supports Google Gemini API
 */
exports.invokeLLM = functions.region('europe-west1').https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { prompt, response_json_schema, add_context_from_internet } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Get Gemini API keys from environment (only check the keys we actually have)
    const apiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2
    ].filter(Boolean);
    
    // Remove duplicates
    const uniqueKeys = [...new Set(apiKeys)];
    
    if (uniqueKeys.length === 0) {
      functions.logger.error('No GEMINI_API_KEY configured');
      return res.status(500).json({ 
        error: 'LLM service not configured. Please set GEMINI_API_KEY.' 
      });
    }

    functions.logger.info(`Available API keys: ${uniqueKeys.length}`);
    
    // List of models to try in order (excluding image generation model)
    const modelsToTry = geminiModelsData.gemini_models
      .filter(m => m.api_name !== 'gemini-2.5-flash-image')
      .map(m => m.api_name);
    
    let lastError = null;
    let result = null;
    
    // Try each API key with each model
    for (const apiKey of uniqueKeys) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const apiKeyPreview = `${apiKey.substring(0, 10)}...`;
      
      // Try each model with retry logic
      for (const modelName of modelsToTry) {
        functions.logger.info(`Trying model: ${modelName} with key: ${apiKeyPreview}`);
        
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

            functions.logger.info(`LLM invocation successful with ${modelName} and key ${apiKeyPreview}`);

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
          functions.logger.warn(`Model ${modelName} with key ${apiKeyPreview} failed:`, modelError.message);
          lastError = modelError;
          
          // If quota exceeded, try next API key immediately
          if (modelError.status === 429 || modelError.message?.includes('quota')) {
            functions.logger.info(`Quota exceeded for key ${apiKeyPreview}, trying next key...`);
            break; // Break inner loop to try next API key
          }
          // Continue to next model with same key
        }
      }
    }
    
    // All models and keys failed
    throw lastError || new Error('All models and API keys failed');

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
});
