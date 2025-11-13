# 📧 Email Extension Setup Guide

## Problem
Emails are being created in Firestore but stuck in PENDING state because the extension needs SMTP configuration.

## Solution: Configure with Resend SMTP

### Step 1: Get Resend SMTP Credentials

Resend provides SMTP compatibility. Your settings are:

```
SMTP Host: smtp.resend.com
SMTP Port: 465 (SSL) or 587 (TLS)
Username: resend
Password: re_dmwxmqNr_C4415KERdB7ULAJXwQYmPDLh (your API key)
```

### Step 2: Configure the Extension

1. **Go to Firebase Console:**
   https://console.firebase.google.com/project/voyagerai-travel-planner/extensions

2. **Click on "Trigger Email from Firestore"**

3. **Click "Manage Extension"**

4. **Click "Reconfigure Extension"**

5. **Update these settings:**

   **SMTP Connection URI:**
   ```
   smtps://resend:re_dmwxmqNr_C4415KERdB7ULAJXwQYmPDLh@smtp.resend.com:465
   ```
   
   **Default FROM address:**
   ```
   noreply@voyager-ai-travel-planner.web.app
   ```
   OR if you have a custom domain:
   ```
   noreply@yourdomain.com
   ```
   
   **Mail collection:**
   ```
   mail
   ```
   
   **Enable templates:** No (we're using HTML directly)

6. **Click "Save"**

### Step 3: Verify Setup

After configuration, the extension will automatically process pending emails!

Check status:
```bash
node check-mail-simple.cjs
```

Look for `Delivery State: SUCCESS` instead of `PENDING`.

### Step 4: Test Email

Create or update a trip and check your email!

---

## Alternative: Use Gmail SMTP

If you prefer Gmail:

1. **Enable 2-Step Verification** in your Google Account
2. **Create an App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Generate password for "Mail"

3. **SMTP URI:**
   ```
   smtps://your-email@gmail.com:app-password-here@smtp.gmail.com:465
   ```

---

## Troubleshooting

### Emails still PENDING?
- Check SMTP credentials are correct
- Verify Resend API key is active
- Check Firestore rules allow extension to read/write

### Permission errors?
- Extension needs Firestore write permissions
- Check IAM permissions in GCP console

### FROM address issues?
With Resend, you need to verify your domain or use their test address.

For testing, you can use:
```
onboarding@resend.dev
```

But for production, verify your domain at:
https://resend.com/domains

---

## Quick Fix Commands

### Check mail status:
```bash
node check-mail-simple.cjs
```

### View extension logs:
```bash
firebase functions:log --only ext-firestore-send-email-processqueue --project voyagerai-travel-planner
```

### Test the extension:
```javascript
await admin.firestore().collection('mail').add({
  to: 'your-email@gmail.com',
  message: {
    subject: 'Test Email',
    html: '<h1>Hello from Voyager!</h1>',
  }
});
```

