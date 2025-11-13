# 🗑️ Undeploy Old Project (voyager-ai-travel-planner)

**IMPORTANT:** Make sure the new project is working perfectly before running these commands!

---

## 🎯 What Will Be Removed

- ✅ All Cloud Functions (stops billing)
- ✅ Hosting site (no longer accessible)
- ⚠️ Firestore data (KEPT as backup)
- ⚠️ Storage buckets (KEPT as backup)
- ⚠️ Authentication users (KEPT)

---

## 📋 Step-by-Step Undeploy Commands

### 1. Switch to Old Project
```bash
firebase use voyager-ai-travel-planner
```

### 2. Delete All Cloud Functions (Saves most costs)
```bash
# List all functions first
firebase functions:list --project voyager-ai-travel-planner

# Delete all functions at once
firebase functions:delete --force \
  searchGlobalDestinations \
  createTripWithDestinations \
  invokeLLM \
  onTripCreated \
  onTripUpdated \
  onTripDeleted \
  getMyTrips \
  addDestinationToTrip \
  findBookingUrl \
  makeReservation \
  geocodeLocation \
  searchAmadeusFlights \
  searchAmadeusHotels \
  searchAmadeusActivities \
  searchGooglePlaces \
  exportDatabase \
  --project voyager-ai-travel-planner
```

Or delete them one by one:
```bash
firebase functions:delete searchGlobalDestinations --project voyager-ai-travel-planner --force
firebase functions:delete createTripWithDestinations --project voyager-ai-travel-planner --force
firebase functions:delete invokeLLM --project voyager-ai-travel-planner --force
# ... etc
```

### 3. Disable Hosting (Stop serving site)
```bash
# This won't delete files, just stops serving
firebase hosting:disable --project voyager-ai-travel-planner
```

### 4. (Optional) Delete Hosting Files
```bash
# Only if you want to free up storage
firebase hosting:clone voyager-ai-travel-planner:live voyager-ai-travel-planner:archive
```

---

## 💰 Cost Savings

After deleting functions and disabling hosting:
- **Cloud Functions:** $0/month (was ~$5-50/month depending on usage)
- **Hosting:** $0/month (was free anyway)
- **Firestore:** Minimal ($0-1/month for storage only, no reads/writes)
- **Storage:** Minimal ($0.026/GB/month)
- **Authentication:** Free

**Estimated savings: 90-95% of costs**

---

## ⚠️ What NOT to Delete (Keep as Backup)

### DON'T Delete These (at least for 30 days):
```bash
# ❌ DON'T RUN THESE YET
# firebase firestore:delete --all-collections --project voyager-ai-travel-planner
# gcloud projects delete voyager-ai-travel-planner
```

**Why?** Keep data as backup in case:
- You need to reference old data
- Something goes wrong with new project
- You need to verify migration was complete

---

## 🗓️ Recommended Timeline

### Week 1-2: Monitor New Project
- ✅ Test all features work
- ✅ Verify all trips visible
- ✅ Check email notifications
- ✅ Monitor for errors

### Week 2-4: Delete Functions & Hosting
```bash
# Run the commands above to delete functions and disable hosting
```

### After 30+ Days: Full Cleanup (Optional)
```bash
# Archive the project in Firebase Console
# Or delete completely via:
gcloud projects delete voyager-ai-travel-planner
```

---

## 🔍 Verify Current Costs

Check what's actually costing money:
```bash
# View function invocations (main cost driver)
firebase functions:log --project voyager-ai-travel-planner --lines 10

# Check hosting bandwidth
# Go to: https://console.firebase.google.com/project/voyager-ai-travel-planner/usage
```

---

## 🚀 Quick Undeploy (All at Once)

If you're confident and want to undeploy everything now:

```bash
#!/bin/bash
# Quick undeploy script for old project

echo "Switching to old project..."
firebase use voyager-ai-travel-planner

echo "Getting list of all functions..."
FUNCTIONS=$(firebase functions:list --project voyager-ai-travel-planner --json | jq -r '.[].name')

echo "Deleting all functions..."
for func in $FUNCTIONS; do
  echo "Deleting $func..."
  firebase functions:delete "$func" --project voyager-ai-travel-planner --force
done

echo "Disabling hosting..."
firebase hosting:disable --project voyager-ai-travel-planner --yes

echo "✅ Old project undeployed!"
echo "⚠️  Data is still preserved as backup"
```

Save as `undeploy-old-project.sh` and run:
```bash
chmod +x undeploy-old-project.sh
./undeploy-old-project.sh
```

---

## 📊 Monitor Costs

After undeploying, monitor your GCP billing:
1. Go to: https://console.cloud.google.com/billing
2. Select project: voyager-ai-travel-planner
3. View cost breakdown
4. Should see dramatic drop after function deletion

---

## 🆘 Rollback (If Needed)

If you need to reactivate the old project:
```bash
# Redeploy functions
firebase deploy --only functions --project voyager-ai-travel-planner

# Reactivate hosting
firebase deploy --only hosting --project voyager-ai-travel-planner
```

---

## ✅ Recommended Action NOW

**Conservative approach:**
```bash
# Just delete the functions (biggest cost)
firebase use voyager-ai-travel-planner
firebase functions:delete --all --project voyager-ai-travel-planner --force

# Keep everything else for 30 days
```

This saves ~90% of costs while keeping your backup!

