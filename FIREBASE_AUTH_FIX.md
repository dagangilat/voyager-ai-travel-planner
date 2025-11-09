# Firebase Authentication Fix Guide

## Problem
Google Sign-In and Email Registration not working on Firebase App Hosting deployment.

## Steps to Fix

### 1. Add Your Domain to Firebase Auth

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `voyager-ai-travel-planner`
3. Navigate to **Authentication** → **Settings** → **Authorized domains**
4. Click **Add domain**
5. Add your Firebase App Hosting URL:
   - Format: `voyager-ai-travel-planner--<hash>.web.app`
   - You can find this in Firebase Console → App Hosting section

### 2. Check Environment Variables

Your `server.js` needs these environment variables available:

```javascript
// These should be available from Firebase System:
FIREBASE_CONFIG
FIREBASE_WEBAPP_CONFIG
```

Verify in `apphosting.yaml`:
```yaml
env:
  - variable: NODE_ENV
    value: production
    availability: 
      - BUILD
      - RUNTIME
```

### 3. Verify CORS Configuration

Check your `server.js` has proper CORS setup:

```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'https://voyager-ai-travel-planner.web.app',
  'https://voyager-ai-travel-planner--<your-hash>.web.app',  // Add your App Hosting URL
];
```

### 4. Update Firebase Auth Configuration

In your Firebase Console:

1. **Authentication** → **Settings** → **Sign-in method**
2. Make sure **Email/Password** is enabled
3. Make sure **Google** is enabled and configured with:
   - Web SDK configuration
   - Support email (your email)

### 5. Check Browser Console

When testing on deployed site, open browser DevTools and check:

1. **Console** tab - Look for specific Firebase Auth errors
2. **Network** tab - Check for failed requests to:
   - `identitytoolkit.googleapis.com`
   - Your Cloud Functions
3. Common errors:
   - "auth/unauthorized-domain"
   - "auth/popup-closed-by-user"  
   - CORS errors

### 6. Test Authentication Flow

Once fixed, test in this order:

1. **Google Sign-In**
   - Click Google button
   - Should open Google picker
   - Should redirect back and create session

2. **Email Registration**
   - Fill in email, password, name
   - Should create account
   - Should send verification email (if enabled)

3. **Email Sign-In**  
   - Use registered email/password
   - Should sign in successfully

## Quick Debug Commands

```bash
# Check current authorized domains
firebase auth:export auth-debug.json --project voyager-ai-travel-planner

# View current deployment URL
firebase apphosting:backends:list --project voyager-ai-travel-planner

# Check logs for auth errors
firebase apphosting:backends:logs --backend voyager-ai-travel-planner
```

## Common Issues & Solutions

### Issue: "auth/unauthorized-domain"
**Solution**: Add your deployment URL to authorized domains (see Step 1)

### Issue: Popup closes immediately
**Solution**: Check if pop-ups are blocked in browser settings

### Issue: "auth/configuration-not-found"
**Solution**: Verify FIREBASE_WEBAPP_CONFIG is available at runtime

### Issue: Redirect not working
**Solution**: 
1. Check redirect URL in Google Cloud Console OAuth settings
2. Verify authDomain in Firebase config matches your hosting domain

## Testing Locally vs Production

**Local (works):**
- Domain: `http://localhost:5173`
- Already authorized in Firebase

**Production (needs setup):**
- Domain: `https://voyager-ai-travel-planner--<hash>.web.app`
- Must be added to authorized domains
- Must update CORS configuration

## Need Help?

1. Check Firebase logs:
   ```
   firebase apphosting:backends:logs --backend voyager-ai-travel-planner --limit 50
   ```

2. Check browser console errors and share them

3. Verify your authorized domains list includes the deployment URL

---

**After making changes:**
1. Redeploy if you changed code: `git push` (triggers auto-deploy)
2. If just changed Firebase settings: No redeploy needed, changes are immediate
3. Clear browser cache and test again
