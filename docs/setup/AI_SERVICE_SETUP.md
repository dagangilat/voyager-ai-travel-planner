# AI Service Setup - Multi-Key Support

## Overview
The Voyager AI Travel Planner now supports multiple Gemini API keys for high availability and automatic failover when quota limits are reached.

## API Keys Configuration

### Environment Variables (.env)
```bash
GEMINI_API_KEY=AIzaSyBPHbohE_CLStSXQXIV4jfFAVbHiINW4Ig
GEMINI_API_KEY_1=AIzaSyBAAYjaZlITT7jKYXTBE06ERIl4-qCEQXI
GEMINI_API_KEY_2=<optional-third-key>
```

### How It Works
1. **Primary Key**: `GEMINI_API_KEY` is tried first
2. **Fallback Keys**: If primary hits quota (429), automatically switches to `GEMINI_API_KEY_1`, then `GEMINI_API_KEY_2`
3. **Model Fallback**: For each key, tries models in order:
   - `gemini-2.5-flash` (fast, primary)
   - `gemini-2.0-flash` (reliable fallback)

## AI Service Status Indicator

### Location
Visible on the **Dashboard** after user login, at the top of the page.

### Status Colors
- 🟢 **Green**: AI service available (at least one key working)
- 🟡 **Yellow**: Quota exceeded (all keys hit limit)
- 🔴 **Red**: Unavailable (service error)

### Features
- **Auto-refresh**: Checks status every 2 minutes
- **Manual refresh**: Click "Refresh" button
- **Expandable**: Click to see detailed status of each key
- **Real-time**: Shows current timestamp of last check

## Testing

### Test Script
Run the model testing script to verify all models and keys:

```bash
./test-gemini-models.sh
```

This will:
- Test all configured API keys
- Try each Gemini model
- Show which ones are working
- Report HTTP status codes and errors
- Generate recommended configuration

### Manual Testing
1. Login to https://voyagerai-travel-planner.web.app
2. Check the status indicator on Dashboard
3. Try creating a trip with AI generation
4. Monitor logs: `firebase functions:log --only invokeLLM`

## Quota Management

### Free Tier Limits (per key)
- **15 requests per minute** (RPM)
- **1,500 requests per day** (RPD)
- **1 million tokens per minute** (TPM)

### Check Usage
Visit: https://ai.dev/usage?tab=rate-limit

### Best Practices
1. **Use multiple keys** for higher throughput
2. **Monitor status indicator** to know when quotas refresh
3. **Upgrade to paid tier** if free tier insufficient
4. **Rotate keys** if one consistently fails

## Functions

### invokeLLM
- **URL**: `https://europe-west1-voyagerai-travel-planner.cloudfunctions.net/invokeLLM`
- **Method**: POST
- **Features**:
  - Multi-key fallback
  - Multi-model fallback
  - Automatic retry on 503 errors
  - Detailed logging

### checkAIServiceStatus
- **URL**: `https://europe-west1-voyagerai-travel-planner.cloudfunctions.net/checkAIServiceStatus`
- **Method**: GET
- **Returns**:
  ```json
  {
    "status": "available|quota_exceeded|unavailable",
    "message": "Human-readable message",
    "availableKeys": 2,
    "workingKeys": 2,
    "keys": [
      {
        "key": "Key 1 (AIzaSyBPHb...)",
        "status": "working|quota_exceeded|error"
      }
    ],
    "timestamp": "2025-11-13T19:11:49.000Z"
  }
  ```

## Troubleshooting

### AI Generation Fails
1. Check status indicator on Dashboard
2. If yellow (quota exceeded), wait for quota to reset
3. If red (unavailable), check function logs
4. Verify API keys in `.env` file
5. Run `./test-gemini-models.sh` to diagnose

### Status Shows All Keys Failed
1. Check if quotas exceeded: https://ai.dev/usage
2. Verify API keys are valid
3. Check Firebase function logs
4. Test manually with curl

### Adding More Keys
1. Generate new API key at: https://aistudio.google.com/apikey
2. Add to `.env` as `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`, etc.
3. Update `invokeLLM.js` to include new key names
4. Redeploy: `firebase deploy --only functions:invokeLLM`

## Useful Links
- **Gemini API Docs**: https://ai.google.dev/gemini-api/docs
- **Model List**: https://ai.google.dev/gemini-api/docs/models/gemini
- **Usage Dashboard**: https://ai.dev/usage
- **Rate Limits**: https://ai.google.dev/gemini-api/docs/rate-limits
- **Get API Key**: https://aistudio.google.com/apikey

## Summary
With 2 API keys configured, the system can handle **3,000 requests per day** (1,500 × 2) with automatic failover. The status indicator provides visibility into service health, ensuring users know when AI generation is available.
