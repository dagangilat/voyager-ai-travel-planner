# 📧 Gmail SMTP Setup Guide

## ✅ Why Gmail?
- Free tier: 500 emails/day
- More reliable than Resend test mode
- No domain verification needed
- Works with App Passwords (secure!)

## 🔐 Step 1: Enable 2-Step Verification

1. Go to: https://myaccount.google.com/security
2. Scroll to "How you sign in to Google"
3. Click "2-Step Verification"
4. If not enabled:
   - Click "Get Started"
   - Follow the prompts
   - Use your phone for verification
5. ✅ Verify it shows "2-Step Verification is on"

## 🔑 Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
   - **Note:** This only works if 2-Step Verification is enabled!

2. You may be asked to sign in again (for security)

3. Create the App Password:
   - **Select app:** Mail
   - **Select device:** Other (Custom name)
   - **Name it:** Voyager Travel Planner
   - Click **"Generate"**

4. **COPY THE 16-CHARACTER PASSWORD!**
   - Format: `abcd efgh ijkl mnop` (with spaces)
   - ⚠️ **IMPORTANT:** You'll only see this once!
   - Copy it somewhere safe temporarily

## 🔧 Step 3: Configure Firebase Extension

### A. Open Extension Configuration

1. Go to: https://console.firebase.google.com/project/voyagerai-travel-planner/extensions
2. Find "Trigger Email from Firestore"
3. Click **"Manage"** → **"Reconfigure extension"**

### B. Update SMTP Connection URI

**Remove spaces** from your App Password first!

Example: `abcd efgh ijkl mnop` → `abcdefghijklmnop`

Then use this format:

```
smtps://feedmyinfo@gmail.com:YOUR-APP-PASSWORD-NO-SPACES@smtp.gmail.com:465
```

**Example:**
```
smtps://feedmyinfo@gmail.com:abcdefghijklmnop@smtp.gmail.com:465
```

### C. Update Default FROM Address

```
feedmyinfo@gmail.com
```

Or with a friendly name:
```
Voyager Travel <feedmyinfo@gmail.com>
```

### D. Verify Firestore Collection Path

```
mail
```

### E. Save Configuration

Click **"Save"** and wait 3-5 minutes for redeployment.

## 🔄 Step 4: Update Cloud Functions FROM Address

Run this command to automatically update all functions:

```bash
# Update FROM addresses in functions
sed -i '' "s/onboarding@resend.dev/feedmyinfo@gmail.com/g" functions/sendTripNotifications.js

# Deploy updated functions
firebase deploy --only functions:onTripCreated,functions:onTripUpdated,functions:onTripDeleted --project voyagerai-travel-planner
```

Or manually edit `functions/sendTripNotifications.js` and change:
- Line 231: `from: 'onboarding@resend.dev'` → `from: 'feedmyinfo@gmail.com'`
- Line 307: `from: 'onboarding@resend.dev'` → `from: 'feedmyinfo@gmail.com'`
- Line 397: `from: 'onboarding@resend.dev'` → `from: 'feedmyinfo@gmail.com'`

## 🧪 Step 5: Test the Configuration

Wait 5 minutes after saving the extension configuration, then test:

```bash
# Update test script
cat << 'SCRIPT' > send-test-email.cjs
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'voyagerai-travel-planner'
});

async function sendTestEmail() {
  await admin.firestore().collection('mail').add({
    to: ['feedmyinfo@gmail.com'],
    from: 'feedmyinfo@gmail.com',
    message: {
      subject: '✅ Gmail Test - Voyager Travel Planner',
      html: '<h1>Success!</h1><p>Gmail SMTP is working!</p>',
    }
  });
  console.log('✅ Test email sent! Check feedmyinfo@gmail.com inbox.');
}

sendTestEmail().then(() => process.exit(0));
SCRIPT

# Send test
node send-test-email.cjs

# Wait 20 seconds
sleep 20

# Check status
node check-latest-email.cjs
```

### Expected Result:
```
State: SUCCESS
✅ EMAIL SENT SUCCESSFULLY!
```

## 🎯 Step 6: Test with Real Trip

1. Go to: https://voyagerai-travel-planner.web.app
2. Create a new trip or update existing one
3. Check your email inbox for beautiful trip notification!

## 📋 Troubleshooting

### Error: "Invalid credentials"
- ✅ Check 2-Step Verification is enabled
- ✅ Regenerate App Password
- ✅ Remove ALL spaces from App Password
- ✅ Use correct email address

### Error: "Authentication failed"
- ✅ Use `smtps://` (with 's') not `smtp://`
- ✅ Port should be 465, not 587
- ✅ App Password, not your regular Gmail password

### Email not sending
- ✅ Wait 5 minutes after reconfiguration
- ✅ Check extension logs for errors
- ✅ Verify FROM address matches your Gmail

### Still issues?
```bash
# Check extension logs
firebase functions:log --only ext-firestore-send-email-processqueue --project voyagerai-travel-planner

# Check latest email status
node check-latest-email.cjs
```

## ✨ Benefits of Gmail SMTP

✅ **500 emails/day** - More than enough for testing and small scale  
✅ **No domain verification** - Works immediately  
✅ **Reliable delivery** - Gmail's reputation  
✅ **Free forever** - No credit card needed  
✅ **Secure** - App Passwords, no password sharing  
✅ **Easy to set up** - Just 5 minutes  

## 🚀 You're All Set!

Once configured, your app will automatically send beautiful emails for:
- ✅ Trip creation (with full daily plan)
- ✅ Trip updates
- ✅ Trip deletions

Users will receive professional emails with:
- Trip overview
- Daily itinerary
- Lodging options
- Experiences and activities
- Transportation details
- Direct link to trip

---

**Setup Date:** 2025-11-13  
**Email Provider:** Gmail SMTP  
**Daily Limit:** 500 emails  
**Status:** Ready to configure

