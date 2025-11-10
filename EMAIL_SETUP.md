# Email Notification Setup Guide

## Overview
Voyager uses Firebase Functions triggers with **Resend** to automatically send email notifications when trips are created, updated, or deleted.

## Prerequisites
- Firebase project with Blaze plan (required for Cloud Functions)
- Resend account (Free tier: 100 emails/day, 3,000/month)

## Resend Setup (Current Implementation)

### 1. Create Resend Account
1. Sign up at https://resend.com
2. Verify your email address
3. Add and verify your sending domain (or use Resend's test domain)

### 2. Get API Key
1. Go to API Keys in Resend dashboard
2. Click "Create API Key"
3. Name it "Voyager Production"
4. Copy the API key (starts with `re_`)

### 3. Configure Firebase Functions
Add the API key to your Firebase project:

```bash
# Using Firebase CLI
firebase functions:config:set resend.api_key="re_your_api_key_here"

# Or add to functions/.env file (for local development)
RESEND_API_KEY=re_your_api_key_here
```

### 4. Set Your From Email
In `functions/sendTripNotifications.js`, update the `from` field:

```javascript
from: 'Voyager <noreply@your-verified-domain.com>',
```

**Note:** You must verify your domain in Resend, or use `onboarding@resend.dev` for testing.

## Deployment

### Deploy Functions
```bash
firebase deploy --only functions
```

This will deploy:
- `onTripCreated` - Triggers when trip is created
- `onTripUpdated` - Triggers when trip is updated  
- `onTripDeleted` - Triggers when trip is deleted

## Verifying Your Domain in Resend

### Why Verify?
- Higher email deliverability
- Professional sender address
- No "via resend.dev" in email headers
- Unlimited sending volume

### Steps
1. Go to Resend Dashboard > Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `voyager-travel.com`)
4. Add DNS records to your domain registrar:
   - SPF record
   - DKIM record
   - DMARC record (optional but recommended)
5. Wait for verification (usually 5-15 minutes)
6. Update `from` address in code to use your domain

## Testing

### 1. Test Trip Creation Email
Create a test trip in the app and check:
- Firebase Console > Functions > Logs for execution
- Resend Dashboard > Logs for email delivery
- User's email inbox

### 2. View Function Logs
```bash
firebase functions:log --only onTripCreated
firebase functions:log --only onTripUpdated
firebase functions:log --only onTripDeleted
```

### 3. Check Resend Dashboard
- Go to Resend Dashboard > Logs
- View all sent emails, delivery status, and opens
- Debug any delivery issues

## Email Preferences

Users can manage their email preferences in Profile settings:
- ✅ Receive trip creation emails
- ✅ Receive trip update emails  
- ✅ Receive trip deletion emails

Default: All enabled

## Troubleshooting

### Emails not sending
1. Check Firebase Functions logs: `firebase functions:log`
2. Verify Resend API key is set correctly
3. Check Resend Dashboard > Logs for errors
4. Verify user's email address is valid
5. Check spam/junk folder
6. Make sure `from` email is verified in Resend

### Function triggers not firing
1. Verify functions are deployed: `firebase functions:list`
2. Check Firestore security rules allow writes
3. Verify trip documents have `user_id` field
4. Check Firebase Console for function errors

### "Invalid from address" error
- You must verify your domain in Resend
- Or use `onboarding@resend.dev` for testing
- Or use `noreply@your-verified-domain.com`

### HTML not rendering
1. Test email in different clients (Gmail, Outlook, Apple Mail)
2. Verify HTML is valid
3. Check inline CSS styles are working
4. Use Resend's preview feature to test

## Cost Considerations

### Resend Pricing
- **Free Tier**: 100 emails/day, 3,000/month
- **Pro**: $20/month for 50,000 emails
- **Scale**: Custom pricing for higher volumes

### Firebase Functions
- ~$0.40 per million invocations
- First 2M invocations free per month

### Estimate for 1000 active users
- 2000 trip creation emails
- 500 trip update emails
- 100 trip deletion emails
- **Total: ~2600 emails/month** (well within free tier)

## Resend Features

✅ **Beautiful Analytics**
- Open rates
- Click rates
- Delivery status
- Bounce tracking

✅ **Testing Tools**
- Email previews
- Test mode
- Webhook support

✅ **Developer Friendly**
- Simple API
- Great documentation
- Fast delivery
- Reliable infrastructure

## Best Practices

1. **Rate Limiting**: Functions automatically handle Firestore trigger rate limits
2. **Error Handling**: All errors are logged but don't block trip creation
3. **HTML Testing**: Test emails in Gmail, Outlook, Apple Mail
4. **Unsubscribe**: Respect user preferences stored in Firestore
5. **From Address**: Use verified domain for better deliverability

## Support

For issues:
1. Check Firebase Console > Functions > Logs
2. Verify email service dashboard
3. Test with a personal email first
4. Check Firestore security rules
