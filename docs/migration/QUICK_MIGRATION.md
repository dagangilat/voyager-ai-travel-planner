# Quick Start: Firebase Project Migration

## 🚀 Migrate in 3 Steps

### Step 1: Run the Automated Script
```bash
./migrate-to-new-project.sh
```

This will:
- ✅ Get Firebase config from new project
- ✅ Update `.firebaserc` and `.env` files
- ✅ Create backups of everything

### Step 2: Download Service Account
1. Go to: https://console.firebase.google.com/project/voyagerai-travel-planner/settings/serviceaccounts/adminsdk
2. Click: **Generate new private key**
3. Save as: `service-account.json` in project root

### Step 3: Deploy Everything
```bash
# Enable services in Firebase Console first (see MIGRATION_CHECKLIST.md)

# Then deploy:
firebase deploy --project voyagerai-travel-planner
```

---

## ✅ Full Checklist

See **MIGRATION_CHECKLIST.md** for complete step-by-step instructions.

---

## 🆘 Need Help?

### Common Issues

**"Permission denied"**
```bash
firebase login
firebase projects:list
```

**"Service account not found"**
Download from: https://console.firebase.google.com/project/voyagerai-travel-planner/settings/serviceaccounts/adminsdk

**"Functions deployment failed"**
Check `functions/.env` has all API keys

---

## 📋 What Gets Migrated

### Automatically:
- ✅ Firebase configuration
- ✅ Project settings
- ✅ Code and functions
- ✅ Security rules
- ✅ Environment variables

### Manually (optional):
- ⚠️  Firestore data (see MIGRATION_CHECKLIST.md)
- ⚠️  Storage files
- ⚠️  Custom domain DNS

---

## 🔍 Verification

After migration:

```bash
# Check current project
firebase use

# Should show: voyagerai-travel-planner (current)

# Visit your new site
open https://voyagerai-travel-planner.web.app
```

---

## 🎯 Files Modified

The script modifies:
- `.firebaserc` - Project ID
- `.env` - Firebase credentials
- All backups saved with timestamp

Original files backed up as: `filename.backup-YYYYMMDD-HHMMSS`

---

## ⏱️ Estimated Time

- **Automated script:** 2 minutes
- **Manual setup:** 20-30 minutes
- **Data migration:** 10-60 minutes (depending on data size)
- **Testing:** 10-15 minutes

**Total:** ~1 hour (without large data migration)

---

## 📚 Resources

- **Full Checklist:** MIGRATION_CHECKLIST.md
- **Email Setup:** EMAIL_EXTENSION_SETUP.md
- **Firebase Console:** https://console.firebase.google.com/project/voyagerai-travel-planner

---

## Ready to Migrate?

```bash
# Step 1: Run script
./migrate-to-new-project.sh

# Step 2: Download service account key
# (follow prompts)

# Step 3: Deploy
firebase deploy --project voyagerai-travel-planner
```

**Good luck! 🚀**
