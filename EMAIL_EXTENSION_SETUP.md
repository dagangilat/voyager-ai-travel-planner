# Firebase Email Extension Setup

## Overview

We're using the **Trigger Email from Firestore** extension to send emails. This is better than custom code because:
- ✅ Handles delivery, retries, and errors automatically
- ✅ Works with multiple email providers (SMTP, SendGrid, Mailgun, etc.)
- ✅ No code changes needed for different providers
- ✅ Built-in delivery tracking and logging

## How It Works

1. Your Cloud Function writes an email document to the `mail` collection
2. The extension watches this collection
3. When a new document appears, it sends the email
4. The extension updates the document with delivery status

## Extension Configuration

### 1. Install the Extension

Already done! You installed it via Firebase Console.

### 2. Configure Extension Settings

During installation, you need to provide:

#### Collection Name
- **Value**: `mail`
- This is where your code writes email documents

#### SMTP Configuration

Choose one of these options:

##### Option A: Gmail SMTP (Easy for testing)
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP Username: your-email@gmail.com
SMTP Password: [App Password - see below]
Default FROM email: your-email@gmail.com
```

**To get Gmail App Password:**
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to App Passwords
4. Generate password for "Mail"
5. Use this password (not your regular password)

##### Option B: SendGrid (Better for production)
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP Username: apikey
SMTP Password: [Your SendGrid API Key]
Default FROM email: noreply@yourdomain.com
```

**To get SendGrid API Key:**
1. Go to https://sendgrid.com
2. Sign up (free tier: 100 emails/day)
3. Create API Key in Settings > API Keys
4. Use this as SMTP password

##### Option C: Mailgun (Good alternative)
```
SMTP Host: smtp.mailgun.org
SMTP Port: 587
SMTP Username: [From Mailgun dashboard]
SMTP Password: [From Mailgun dashboard]
Default FROM email: noreply@yourdomain.com
```

### 3. Firestore Security Rules

Add this rule to allow the extension to update email documents:

```javascript
// In firestore.rules
match /mail/{docId} {
  // Allow extension to read and write
  allow read, write: if request.auth != null;
  
  // Users can read their own email status
  allow read: if request.auth.uid == resource.data.metadata.userId;
}
```

## Code Structure

### Email Document Format

When creating an email, write this to Firestore:

```javascript
await admin.firestore().collection('mail').add({
  to: 'user@example.com',
  message: {
    subject: 'Your Trip Has Been Created!',
    html: '<h1>HTML content here</h1>',
    text: 'Plain text version (optional)',
  },
  metadata: {
    tripId: 'abc123',
    userId: 'user123',
    type: 'trip_created',
  },
});
```

### Extension Updates the Document

After sending, the extension adds these fields:

```javascript
{
  delivery: {
    state: 'SUCCESS', // or 'ERROR', 'PENDING', 'PROCESSING'
    startTime: Timestamp,
    endTime: Timestamp,
    error: 'Error message if failed',
    attempts: 1,
    info: {
      messageId: 'smtp-message-id',
      accepted: ['user@example.com'],
      rejected: [],
      response: 'SMTP response',
    }
  }
}
```

## Monitoring

### Check Email Delivery Status

```javascript
// In your code
const emailDoc = await db.collection('mail').doc(emailId).get();
const delivery = emailDoc.data().delivery;

if (delivery.state === 'SUCCESS') {
  console.log('Email sent!');
} else if (delivery.state === 'ERROR') {
  console.error('Email failed:', delivery.error);
}
```

### View in Firebase Console

1. Go to Firestore
2. Open `mail` collection
3. Each document shows delivery status

### Check Extension Logs

1. Go to Firebase Console > Functions
2. Filter by extension function name
3. See detailed logs of email sending

## Testing

### Test Email Sending

After configuration, create a test trip:

```bash
# The trigger will automatically create an email document
# Check Firestore > mail collection
# You should see a new document with delivery status
```

### Verify Email Received

1. Create a new trip
2. Wait 10-30 seconds
3. Check your email inbox
4. Check spam folder if not in inbox

## Troubleshooting

### Emails Not Sending

1. **Check Extension Configuration**
   - Firebase Console > Extensions
   - Verify SMTP settings are correct

2. **Check Firestore**
   - Look at `mail` collection
   - Check `delivery.state`
   - If ERROR, check `delivery.error`

3. **Check Logs**
   - Firebase Console > Functions
   - Look for extension errors

4. **Common Issues**
   - Wrong SMTP credentials
   - FROM email not verified (for some providers)
   - Firewall blocking SMTP port
   - Daily sending limit reached

### Extension Not Triggering

1. **Check Extension Status**
   - Firebase Console > Extensions
   - Should show "Active"

2. **Check Collection Name**
   - Extension watches `mail` collection
   - Make sure code writes to correct collection

3. **Check Firestore Rules**
   - Extension needs read/write access
   - Update security rules if needed

## Migration from Resend

We've updated the code to use the extension instead of direct Resend API calls:

### Before (Direct API)
```javascript
const resend = new Resend(apiKey);
await resend.emails.send({
  from: 'sender@example.com',
  to: 'user@example.com',
  subject: 'Test',
  html: '<p>Content</p>',
});
```

### After (Extension)
```javascript
await admin.firestore().collection('mail').add({
  to: 'user@example.com',
  message: {
    subject: 'Test',
    html: '<p>Content</p>',
  },
});
```

## Advantages

✅ **No API key management** - Configure once in extension
✅ **Automatic retries** - Extension handles failures
✅ **Provider independent** - Switch SMTP providers anytime
✅ **Built-in logging** - See delivery status in Firestore
✅ **No rate limiting code** - Extension handles it
✅ **Easy testing** - Just write to Firestore, no API calls

## Next Steps

1. ✅ Configure extension SMTP settings
2. ✅ Update Firestore security rules
3. ✅ Deploy updated Cloud Functions
4. ✅ Test by creating a trip
5. ✅ Check email delivery

## Support

- Extension Docs: https://firebase.google.com/products/extensions/firestore-send-email
- Extension Issues: https://github.com/firebase/extensions/issues
