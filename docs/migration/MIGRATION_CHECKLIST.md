# Firebase Project Migration Checklist

## Migration: voyager-ai-travel-planner → voyagerai-travel-planner

### ✅ Pre-Migration Checklist

- [ ] Firebase CLI installed and logged in (`firebase login`)
- [ ] Access to new project (`voyagerai-travel-planner`)
- [ ] Backup of current database (if needed)
- [ ] List of all API keys and secrets
- [ ] Access to Google Cloud Console for both projects

---

## 🤖 Automated Steps (Run Script)

```bash
chmod +x migrate-to-new-project.sh
./migrate-to-new-project.sh
```

The script will automatically:
- ✅ Get Firebase config from new project
- ✅ Update `.firebaserc`
- ✅ Update `.env` with new Firebase credentials
- ✅ Create backups of all modified files

---

## 📋 Manual Steps (Required)

### 1. Download New Service Account Key

**Why:** Cloud Functions need this to access Firebase Admin SDK

**Steps:**
1. Go to: https://console.firebase.google.com/project/voyagerai-travel-planner/settings/serviceaccounts/adminsdk
2. Click **"Generate new private key"**
3. Save as `service-account.json` in project root
4. **Keep it secret!** (already in .gitignore)

**Verify:**
```bash
cat service-account.json | jq '.project_id'
# Should show: "voyagerai-travel-planner"
```

---

### 2. Enable Firebase Services

**Why:** New project needs services activated

Go to Firebase Console: https://console.firebase.google.com/project/voyagerai-travel-planner

#### 2.1 Authentication
- Navigate to: **Build > Authentication**
- Click: **Get started**
- Enable: **Google Sign-In**
  - Add your email as test user if needed
  - Configure OAuth consent screen

#### 2.2 Firestore Database
- Navigate to: **Build > Firestore Database**
- Click: **Create database**
- Choose: **Start in production mode** (we'll deploy rules)
- Location: **us-central** (same as functions)
- Click: **Enable**

#### 2.3 Cloud Functions
- Navigate to: **Build > Functions**
- Click: **Get started**
- Will be automatically enabled on first deploy

#### 2.4 Cloud Storage
- Navigate to: **Build > Storage**
- Click: **Get started**
- Choose: **Start in production mode**
- Location: **us-central**
- Click: **Done**

#### 2.5 Hosting
- Navigate to: **Build > Hosting**
- Click: **Get started**
- Will be configured on first deploy

**Verify All Services:**
```bash
firebase projects:list
# Should show voyagerai-travel-planner as current
```

---

### 3. Install Firebase Extensions

**Why:** Email notifications use Firebase Extension

Go to: https://console.firebase.google.com/project/voyagerai-travel-planner/extensions

#### 3.1 Install "Trigger Email from Firestore"
1. Click **"Install Extension"**
2. Search for: **"Trigger Email from Firestore"**
3. Click **"Install"**
4. Configure:

**Required Settings:**
- **Collection Name:** `mail`
- **SMTP Connection URI:** Choose one option below

**Option A - Gmail (Testing):**
```
smtp://your-email@gmail.com:app-password@smtp.gmail.com:587
```
Get Gmail App Password:
1. https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Create App Password for "Mail"

**Option B - SendGrid (Production):**
```
smtp://apikey:YOUR_SENDGRID_API_KEY@smtp.sendgrid.net:587
```
Get SendGrid key at: https://sendgrid.com

**Option C - Use Environment Variable:**
- Set `SMTP_CONNECTION_URI` in Functions config
- Install extension without URI, configure later

5. Click **"Install extension"**
6. Wait for installation to complete

**Verify:**
```bash
firebase ext:list --project voyagerai-travel-planner
# Should show: firestore-send-email
```

---

### 4. Configure Firestore Security Rules

**Why:** Control access to your database

```bash
# Deploy security rules
firebase deploy --only firestore:rules --project voyagerai-travel-planner

# Deploy indexes
firebase deploy --only firestore:indexes --project voyagerai-travel-planner
```

**Verify in Console:**
1. Go to: Firestore Database > Rules
2. Should see your custom rules
3. Check publish date is recent

---

### 5. Configure Storage Rules

**Why:** Control access to uploaded files

```bash
firebase deploy --only storage --project voyagerai-travel-planner
```

---

### 6. Deploy Cloud Functions

**Why:** Backend logic and triggers

```bash
# Install dependencies first
cd functions
npm install
cd ..

# Deploy all functions
firebase deploy --only functions --project voyagerai-travel-planner
```

**Expected Output:**
```
✔  functions[searchGlobalDestinations(us-central1)] Successful create operation.
✔  functions[createTripWithDestinations(us-central1)] Successful create operation.
✔  functions[invokeLLM(us-central1)] Successful create operation.
✔  functions[onTripCreated(us-central1)] Successful create operation.
✔  functions[onTripUpdated(us-central1)] Successful create operation.
✔  functions[onTripDeleted(us-central1)] Successful create operation.
... (more functions)
```

**Verify:**
```bash
firebase functions:list --project voyagerai-travel-planner
```

---

### 7. Deploy Frontend (Hosting)

**Why:** Serve your React application

```bash
# Build frontend
npm run build

# Deploy to hosting
firebase deploy --only hosting --project voyagerai-travel-planner
```

**Expected Output:**
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/voyagerai-travel-planner/overview
Hosting URL: https://voyagerai-travel-planner.web.app
```

**Verify:**
- Visit: https://voyagerai-travel-planner.web.app
- Should see your app
- Try signing in with Google

---

### 8. Migrate Data (If Needed)

**Why:** Transfer existing trips and user data

#### Option A - Export/Import via Firebase Console

**Export from old project:**
1. Go to: https://console.firebase.google.com/project/voyager-ai-travel-planner/firestore/data
2. Click: ⋮ (three dots) > **"Export"**
3. Choose: All collections
4. GCS Bucket: Create new bucket or use existing
5. Click: **"Export"**
6. Wait for export to complete (check Cloud Storage)

**Import to new project:**
1. Go to: https://console.firebase.google.com/project/voyagerai-travel-planner/firestore/data
2. Click: ⋮ (three dots) > **"Import"**
3. Browse to exported data in GCS bucket
4. Click: **"Import"**
5. Wait for import to complete

#### Option B - Use gcloud CLI

```bash
# Export from old project
gcloud firestore export gs://voyager-ai-travel-planner-export/$(date +%Y%m%d) \
  --project=voyager-ai-travel-planner

# Import to new project
gcloud firestore import gs://voyager-ai-travel-planner-export/YYYYMMDD \
  --project=voyagerai-travel-planner
```

#### Option C - Incremental Migration Script

If you want to migrate gradually, use the provided script:

```bash
# Copy the migration script
cp firestore/migrate-data.js ./migrate-to-new-project-data.js

# Edit to set source/target projects
# Run it
node migrate-to-new-project-data.js
```

---

### 9. Update DNS (If Custom Domain)

**Why:** Point your domain to new hosting

If using custom domain:

1. Go to: Hosting settings in new project
2. Add custom domain
3. Get verification TXT record
4. Add to your DNS provider
5. Wait for verification
6. Get new A/AAAA records
7. Update DNS to point to new hosting

---

### 10. Test Everything

**Why:** Ensure migration was successful

#### Frontend Tests:
- [ ] App loads at new URL
- [ ] Google Sign-In works
- [ ] Can create new trip
- [ ] Can view existing trips (if data migrated)
- [ ] Can edit trip
- [ ] Can delete trip
- [ ] AI generation works
- [ ] Search works (airports, destinations)
- [ ] Images load correctly

#### Backend Tests:
- [ ] All Cloud Functions respond
- [ ] Firestore reads/writes work
- [ ] Storage uploads work
- [ ] Email notifications sent (check mail collection)
- [ ] API integrations work (Amadeus, Google Places)

#### Email Tests:
- [ ] Create trip → Email sent
- [ ] Update trip → Email sent
- [ ] Delete trip → Email sent
- [ ] Check Firestore `mail` collection for delivery status

```bash
# Test a function directly
firebase functions:shell --project voyagerai-travel-planner

# In the shell:
# searchGlobalDestinations({ query: "New York", type: "city" })
```

---

### 11. Update API Keys in Firebase Console

**Why:** Some keys may be project-specific

1. Go to: Functions > Configuration
2. Check environment variables
3. Update if needed:

```bash
firebase functions:config:set \
  google.places_api_key="YOUR_KEY" \
  google.gemini_api_key="YOUR_KEY" \
  amadeus.api_key="YOUR_KEY" \
  amadeus.api_secret="YOUR_SECRET" \
  --project voyagerai-travel-planner
```

**Better: Use .env in functions folder**

The `functions/.env` file should already have all keys and doesn't need project-specific changes.

---

### 12. Update GitHub Repository Secrets (If Using CI/CD)

**Why:** Automated deployments need new credentials

If using GitHub Actions or similar:

1. Go to: GitHub repo > Settings > Secrets
2. Update:
   - `FIREBASE_SERVICE_ACCOUNT_VOYAGERAI_TRAVEL_PLANNER`
   - `FIREBASE_PROJECT_ID` → `voyagerai-travel-planner`
3. Update workflow files if they reference project ID

---

### 13. Monitor After Migration

**Why:** Catch any issues early

**Check these regularly:**

1. **Functions Logs:**
   ```bash
   firebase functions:log --project voyagerai-travel-planner
   ```

2. **Firestore Console:**
   - Watch for errors
   - Check `mail` collection for email delivery
   - Monitor usage/quota

3. **Hosting Analytics:**
   - Check if users can access site
   - Monitor performance

4. **Email Extension Logs:**
   - Go to: Extensions > Manage
   - Click on email extension
   - Check logs for delivery status

---

## 🔄 Rollback Plan (If Needed)

If something goes wrong:

### Quick Rollback:

```bash
# Restore backups
mv .firebaserc.backup-* .firebaserc
mv .env.backup-* .env
mv service-account.json.backup-* service-account.json

# Switch back to old project
firebase use voyager-ai-travel-planner

# Verify
firebase projects:list
```

### Full Rollback:

1. Keep old project running
2. Update DNS to point back to old hosting
3. Investigate issues with new project
4. Fix and try migration again

---

## ✅ Post-Migration Cleanup

**After successful migration and testing:**

- [ ] Keep old project running for 1-2 weeks (safety buffer)
- [ ] Monitor new project for issues
- [ ] Update documentation with new URLs
- [ ] Notify team of new project ID
- [ ] Archive old project (don't delete yet)
- [ ] Update bookmarks and saved links
- [ ] Clean up old backups after 30 days

---

## 📊 Migration Verification Commands

```bash
# Verify current project
firebase use

# List all projects
firebase projects:list

# Check functions
firebase functions:list

# Check hosting
firebase hosting:sites:list

# Check extensions
firebase ext:list

# Test function locally
firebase emulators:start
```

---

## 🆘 Troubleshooting

### Issue: "Permission denied"
**Solution:** Make sure you're authenticated and have Owner/Editor role in new project

### Issue: Functions fail to deploy
**Solution:** Check `functions/.env` has all required keys

### Issue: Emails not sending
**Solution:** 
1. Check extension configuration
2. Verify SMTP credentials
3. Check Firestore `mail` collection for error messages

### Issue: Frontend shows Firebase errors
**Solution:** Check `.env` has correct Firebase credentials

### Issue: Data not showing up
**Solution:** Check Firestore security rules allow read access

---

## 📚 Resources

- Firebase Migration Guide: https://firebase.google.com/docs/projects/learn-more#moving-data
- Firestore Export/Import: https://firebase.google.com/docs/firestore/manage-data/export-import
- Email Extension Docs: https://firebase.google.com/products/extensions/firestore-send-email
- Firebase CLI Reference: https://firebase.google.com/docs/cli

---

## ✅ Final Checklist

- [ ] Script executed successfully
- [ ] Service account downloaded
- [ ] All Firebase services enabled
- [ ] Email extension installed and configured
- [ ] Firestore rules deployed
- [ ] Functions deployed successfully
- [ ] Hosting deployed successfully
- [ ] Data migrated (if needed)
- [ ] DNS updated (if custom domain)
- [ ] Everything tested and working
- [ ] Team notified
- [ ] Old project kept as backup

**Estimated Total Time:** 1-2 hours (excluding data migration)

**Ready to migrate? Run the script and follow this checklist!**
