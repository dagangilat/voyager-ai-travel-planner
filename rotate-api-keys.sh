#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID="voyagerai-travel-planner"
SERVICE_ACCOUNT_FILE="service-account.json"

echo -e "${BLUE}🔐 SERVICE ACCOUNT KEY ROTATION${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 1: Check current service account
echo -e "${YELLOW}Step 1: Checking current service account...${NC}"
if [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
    echo -e "${RED}❌ service-account.json not found!${NC}"
    exit 1
fi

CURRENT_EMAIL=$(cat $SERVICE_ACCOUNT_FILE | grep -o '"client_email": *"[^"]*"' | cut -d'"' -f4)
echo -e "${GREEN}✅ Current service account: $CURRENT_EMAIL${NC}"
echo ""

# Step 2: Backup old key
echo -e "${YELLOW}Step 2: Backing up old key...${NC}"
BACKUP_FILE="service-account.json.backup-$(date +%Y%m%d-%H%M%S)"
cp $SERVICE_ACCOUNT_FILE $BACKUP_FILE
echo -e "${GREEN}✅ Backed up to: $BACKUP_FILE${NC}"
echo ""

# Step 3: Generate new key
echo -e "${YELLOW}Step 3: Generating new service account key...${NC}"
echo "Running: gcloud iam service-accounts keys create $SERVICE_ACCOUNT_FILE ..."

gcloud iam service-accounts keys create $SERVICE_ACCOUNT_FILE \
  --iam-account=$CURRENT_EMAIL \
  --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ New key generated successfully!${NC}"
else
    echo -e "${RED}❌ Failed to generate new key!${NC}"
    echo "Restoring backup..."
    cp $BACKUP_FILE $SERVICE_ACCOUNT_FILE
    exit 1
fi
echo ""

# Step 4: Test new key
echo -e "${YELLOW}Step 4: Testing new key...${NC}"
cat << 'TESTSCRIPT' > test-firestore.js
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'voyagerai-travel-planner'
});

async function test() {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('trips').limit(1).get();
    console.log('✅ New service account key is working!');
    console.log(`   Firestore connection successful (found ${snapshot.size} test doc)`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
TESTSCRIPT

node test-firestore.js
TEST_RESULT=$?

if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ New key works correctly!${NC}"
    rm test-firestore.js
else
    echo -e "${RED}❌ New key test failed! Restoring backup...${NC}"
    cp $BACKUP_FILE $SERVICE_ACCOUNT_FILE
    rm test-firestore.js
    exit 1
fi
echo ""

# Step 5: Update .gitignore
echo -e "${YELLOW}Step 5: Updating .gitignore...${NC}"
if ! grep -q "service-account.json" .gitignore; then
    echo "" >> .gitignore
    echo "# Service account keys (never commit!)" >> .gitignore
    echo "service-account.json" >> .gitignore
    echo "service-account.json.*" >> .gitignore
fi
echo -e "${GREEN}✅ .gitignore updated${NC}"
echo ""

# Step 6: List old keys for manual deletion
echo -e "${YELLOW}Step 6: Listing service account keys...${NC}"
echo "Getting key IDs for cleanup..."
gcloud iam service-accounts keys list \
  --iam-account=$CURRENT_EMAIL \
  --project=$PROJECT_ID \
  --format="table(name,validAfterTime)" \
  --filter="keyType=USER_MANAGED"
echo ""

echo -e "${BLUE}📝 NEXT STEPS:${NC}"
echo "════════════════════════════════════════════════════════════"
echo "1. Deploy to Firebase to verify everything works:"
echo "   ${GREEN}firebase deploy --project $PROJECT_ID${NC}"
echo ""
echo "2. After successful deployment, delete old keys:"
echo "   ${YELLOW}gcloud iam service-accounts keys delete KEY_ID --iam-account=$CURRENT_EMAIL --project=$PROJECT_ID${NC}"
echo ""
echo "3. Commit to git (new key is in .gitignore):"
echo "   ${GREEN}git add .gitignore${NC}"
echo "   ${GREEN}git commit -m 'chore: Rotate service account key and update .gitignore'${NC}"
echo "   ${GREEN}git push origin main${NC}"
echo ""
echo -e "${GREEN}✅ Key rotation complete!${NC}"
echo -e "${YELLOW}⚠️  Remember to delete old backup: $BACKUP_FILE${NC}"
echo ""

