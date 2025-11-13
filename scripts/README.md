# Scripts

Utility scripts for testing, database management, deployment, and other tasks.

## Directory Structure

### 🧪 tests/
Test and verification scripts:
- `analyze-performance.cjs` - Performance analysis
- `check-airports.mjs` - Airport data verification
- `check-destinations.cjs` - Destinations verification
- `check-places.mjs` - Places API testing
- `check-popular-destinations.cjs` - Popular destinations check
- `test-amadeus-apis.js` - Amadeus API testing
- `test-gemini-models.sh` - Gemini models availability test
- `test-place-coords.js/mjs` - Place coordinates testing
- `test-stockholm.cjs` - Stockholm destination test
- `test-trip-update.cjs` - Trip update testing

### 📧 email/
Email-related scripts:
- `check-latest-email.cjs` - Check latest emails
- `check-mail-collection.cjs` - Mail collection verification
- `check-mail-simple.cjs` - Simple mail check
- `check-mail-status.cjs` - Mail status verification
- `check-recent-trip-emails.cjs` - Recent trip emails
- `check-specific-email.cjs` - Check specific email
- `send-test-email.cjs` - Send test email
- `trigger-email-send.cjs` - Trigger email send
- `trigger-email-send2.cjs` - Alternative email trigger
- `setup-gmail-smtp.sh` - Gmail SMTP setup

### 💾 database/
Database management scripts:
- `fix-stockholm.cjs` - Fix Stockholm destination data
- `fix-trip-user-ids.js` - Fix trip user IDs
- `migrate-user-ids.cjs` - Migrate user IDs
- `seed-popular-300.cjs` - Seed 300 popular destinations

### 🚀 deployment/
Deployment and infrastructure scripts:
- `deploy_template.sh` - Deployment template
- `migrate-to-new-project.sh` - Project migration
- `rotate-api-keys.sh` - API key rotation

### 📸 screenshots/
Screenshot generation scripts:
- `organize-screenshots.sh` - Organize screenshots
- `screenshot-voyager.cjs` - Take Voyager screenshots
- `setup-help-screenshots.sh` - Setup help screenshots
- `take-screenshot.mjs` - General screenshot utility

## Usage

Most scripts can be run directly with Node.js:
```bash
node scripts/tests/test-amadeus-apis.js
```

Shell scripts should be made executable:
```bash
chmod +x scripts/tests/test-gemini-models.sh
./scripts/tests/test-gemini-models.sh
```

Some scripts require environment variables to be set. Make sure `.env` is configured before running.
