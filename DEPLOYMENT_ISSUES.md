# Cloud Run Deployment Errors - Resolution Guide

## Current Issues

Your application is successfully deployed to Cloud Run, but experiencing **Base44 SDK connection errors** because the required environment variables are not configured.

### Errors Observed:
- `[Base44 SDK Error] 404: Request failed with status code 404`
- `Error: server error` (Socket.io connection failures)
- App state check failing with 404

## Root Cause

The app uses the **Base44 platform SDK** (`@base44/sdk`) which requires:
1. `VITE_BASE44_APP_ID` - Your Base44 application ID
2. `VITE_BASE44_BACKEND_URL` - Base44 backend URL (typically `https://api.base44.com`)

These environment variables are embedded in the JavaScript during the **Vite build process**, but they're not currently set.

## Solution Options

### Option 1: Configure Base44 (If you have Base44 account)

1. **Get your Base44 credentials:**
   - Log in to https://base44.com
   - Get your App ID from the dashboard
   - Note the backend URL (usually `https://api.base44.com`)

2. **Create `.env` file locally:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```bash
   VITE_BASE44_APP_ID=your_actual_app_id
   VITE_BASE44_BACKEND_URL=https://api.base44.com
   ```

3. **Rebuild and deploy with environment variables:**
   ```bash
   # Build Docker image with build args
   docker build \
     --build-arg VITE_BASE44_APP_ID=your_actual_app_id \
     --build-arg VITE_BASE44_BACKEND_URL=https://api.base44.com \
     -t gcr.io/YOUR_PROJECT_ID/voyager-ai-travel-planner:latest .
   
   # Push to Google Container Registry
   docker push gcr.io/YOUR_PROJECT_ID/voyager-ai-travel-planner:latest
   
   # Deploy to Cloud Run
   gcloud run deploy voyager-ai-travel-planner \
     --image gcr.io/YOUR_PROJECT_ID/voyager-ai-travel-planner:latest \
     --region us-east4 \
     --platform managed \
     --allow-unauthenticated
   ```

### Option 2: Use GitHub Actions for Automated Deployment

Create `.github/workflows/deploy-cloud-run.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [ main ]

env:
  PROJECT_ID: your-gcp-project-id
  SERVICE_NAME: voyager-ai-travel-planner
  REGION: us-east4

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Google Auth
        uses: google-github-actions/auth@v1
        with:
          credentials_json: '${{ secrets.GCP_SA_KEY }}'
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
      
      - name: Configure Docker
        run: gcloud auth configure-docker
      
      - name: Build Docker image
        run: |
          docker build \
            --build-arg VITE_BASE44_APP_ID=${{ secrets.VITE_BASE44_APP_ID }} \
            --build-arg VITE_BASE44_BACKEND_URL=${{ secrets.VITE_BASE44_BACKEND_URL }} \
            -t gcr.io/$PROJECT_ID/$SERVICE_NAME:${{ github.sha }} .
      
      - name: Push to GCR
        run: docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:${{ github.sha }}
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy $SERVICE_NAME \
            --image gcr.io/$PROJECT_ID/$SERVICE_NAME:${{ github.sha }} \
            --region $REGION \
            --platform managed \
            --allow-unauthenticated
```

Then add secrets to GitHub:
- `GCP_SA_KEY` - Your service account JSON
- `VITE_BASE44_APP_ID` - Your Base44 app ID
- `VITE_BASE44_BACKEND_URL` - Base44 backend URL

### Option 3: Refactor to Remove Base44 Dependency

If you don't have/need Base44:

1. Replace `@base44/sdk` usage with direct Firebase calls
2. Update authentication to use Firebase Auth
3. Replace entity CRUD operations with Firebase Firestore
4. Update Cloud Functions to work independently

This is a larger refactoring effort.

## Current Deployment Status

✅ **Working:**
- Container builds successfully
- nginx serves on port 8080
- Frontend loads in browser
- Static assets served correctly
- Firebase Functions deployed and accessible

❌ **Not Working:**
- Base44 API connections (404 errors)
- User authentication via Base44
- Entity data fetching (trips, destinations, etc.)
- Socket.io real-time connections

## Quick Test

To verify if Base44 configuration is the issue, you can temporarily modify `src/lib/app-params.js` to hardcode values:

```javascript
export const appParams = {
  appId: "your_test_app_id",
  serverUrl: "https://api.base44.com",
  token: null,
  fromUrl: window.location.href,
  functionsVersion: null
}
```

Then rebuild and redeploy. If the 404 errors persist, verify:
1. The Base44 app ID is correct
2. The Base44 app is active and accessible
3. Your Base44 subscription is active

## Next Steps

1. **Determine if you have Base44 credentials**
2. **Choose Option 1 or 2** if you have credentials
3. **Contact me** if you need help with Option 3 (refactoring away from Base44)

## Additional Notes

- The `.env` file is gitignored for security
- Never commit API keys or secrets to version control
- Cloud Run automatic deployment from GitHub doesn't support build args yet
- You may need manual deployment or GitHub Actions for environment variable injection
