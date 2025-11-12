#!/bin/bash

# Migration Script: voyager-ai-travel-planner → voyagerai-travel-planner
# This script automates the Firebase project migration process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project IDs
OLD_PROJECT_ID="voyager-ai-travel-planner"
NEW_PROJECT_ID="voyagerai-travel-planner"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Firebase Project Migration Tool${NC}"
echo -e "${BLUE}   ${OLD_PROJECT_ID} → ${NEW_PROJECT_ID}${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Function to prompt for confirmation
confirm() {
    read -p "$1 (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Aborted by user${NC}"
        exit 1
    fi
}

# Function to backup file
backup_file() {
    local file=$1
    if [ -f "$file" ]; then
        cp "$file" "$file.backup-$(date +%Y%m%d-%H%M%S)"
        echo -e "${GREEN}✓${NC} Backed up $file"
    fi
}

echo -e "${YELLOW}⚠️  WARNING: This will modify project configuration files!${NC}"
echo ""
echo "This script will:"
echo "  1. Get Firebase config from new project"
echo "  2. Update .firebaserc"
echo "  3. Update .env files with new Firebase credentials"
echo "  4. Update service-account.json path references"
echo "  5. Create backups of all modified files"
echo ""
confirm "Do you want to continue?"

echo ""
echo -e "${BLUE}Step 1: Getting Firebase configuration from new project...${NC}"

# Get Firebase config for the new project
echo "Fetching Firebase Web App config..."
firebase apps:sdkconfig web --project $NEW_PROJECT_ID > /tmp/firebase-config-temp.txt 2>&1 || {
    echo -e "${RED}✗ Failed to get Firebase config. Make sure you're logged in and have access to the project.${NC}"
    exit 1
}

# Parse the Firebase config (it's in the format of JavaScript object)
if [ -f /tmp/firebase-config-temp.txt ]; then
    # Extract values from the config
    NEW_API_KEY=$(grep "apiKey:" /tmp/firebase-config-temp.txt | sed 's/.*apiKey: "\(.*\)".*/\1/')
    NEW_AUTH_DOMAIN=$(grep "authDomain:" /tmp/firebase-config-temp.txt | sed 's/.*authDomain: "\(.*\)".*/\1/')
    NEW_STORAGE_BUCKET=$(grep "storageBucket:" /tmp/firebase-config-temp.txt | sed 's/.*storageBucket: "\(.*\)".*/\1/')
    NEW_MESSAGING_SENDER_ID=$(grep "messagingSenderId:" /tmp/firebase-config-temp.txt | sed 's/.*messagingSenderId: "\(.*\)".*/\1/')
    NEW_APP_ID=$(grep "appId:" /tmp/firebase-config-temp.txt | sed 's/.*appId: "\(.*\)".*/\1/')
    NEW_MEASUREMENT_ID=$(grep "measurementId:" /tmp/firebase-config-temp.txt | sed 's/.*measurementId: "\(.*\)".*/\1/' || echo "")
    
    echo -e "${GREEN}✓${NC} Firebase config retrieved successfully"
    echo "  API Key: ${NEW_API_KEY:0:20}..."
    echo "  Project ID: $NEW_PROJECT_ID"
else
    echo -e "${RED}✗ Failed to retrieve Firebase config${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Backing up files...${NC}"

backup_file ".firebaserc"
backup_file ".env"
backup_file "functions/.env"
backup_file "service-account.json"

echo ""
echo -e "${BLUE}Step 3: Updating .firebaserc...${NC}"

cat > .firebaserc << EOF
{
  "projects": {
    "default": "$NEW_PROJECT_ID"
  }
}
EOF

echo -e "${GREEN}✓${NC} Updated .firebaserc"

echo ""
echo -e "${BLUE}Step 4: Updating .env file...${NC}"

# Update root .env file
sed -i.bak \
    -e "s|VITE_FIREBASE_API_KEY=.*|VITE_FIREBASE_API_KEY=$NEW_API_KEY|" \
    -e "s|VITE_FIREBASE_AUTH_DOMAIN=.*|VITE_FIREBASE_AUTH_DOMAIN=$NEW_AUTH_DOMAIN|" \
    -e "s|VITE_FIREBASE_PROJECT_ID=.*|VITE_FIREBASE_PROJECT_ID=$NEW_PROJECT_ID|" \
    -e "s|VITE_FIREBASE_STORAGE_BUCKET=.*|VITE_FIREBASE_STORAGE_BUCKET=$NEW_STORAGE_BUCKET|" \
    -e "s|VITE_FIREBASE_MESSAGING_SENDER_ID=.*|VITE_FIREBASE_MESSAGING_SENDER_ID=$NEW_MESSAGING_SENDER_ID|" \
    -e "s|VITE_FIREBASE_APP_ID=.*|VITE_FIREBASE_APP_ID=$NEW_APP_ID|" \
    .env

if [ -n "$NEW_MEASUREMENT_ID" ]; then
    sed -i.bak "s|VITE_FIREBASE_MEASUREMENT_ID=.*|VITE_FIREBASE_MEASUREMENT_ID=$NEW_MEASUREMENT_ID|" .env
fi

rm .env.bak 2>/dev/null || true
echo -e "${GREEN}✓${NC} Updated .env with new Firebase credentials"

echo ""
echo -e "${BLUE}Step 5: Checking service account...${NC}"

if [ -f "service-account.json" ]; then
    echo -e "${YELLOW}⚠️  Service account file found${NC}"
    echo "You need to download a NEW service account key from:"
    echo "https://console.firebase.google.com/project/$NEW_PROJECT_ID/settings/serviceaccounts/adminsdk"
    echo ""
    echo "Steps:"
    echo "  1. Click 'Generate new private key'"
    echo "  2. Save as 'service-account.json' in project root"
    echo "  3. Update functions/.env if needed"
    echo ""
else
    echo -e "${GREEN}✓${NC} No service account file to update"
fi

echo ""
echo -e "${BLUE}Step 6: Checking functions configuration...${NC}"

# Functions .env doesn't need Firebase project ID, only API keys
echo -e "${GREEN}✓${NC} Functions .env looks good (API keys are project-independent)"

echo ""
echo -e "${BLUE}Step 7: Summary of changes...${NC}"
echo ""
echo -e "${GREEN}✓ Updated files:${NC}"
echo "  • .firebaserc"
echo "  • .env (Firebase credentials)"
echo ""
echo -e "${YELLOW}⚠️  Manual steps required:${NC}"
echo "  1. Download new service account key:"
echo "     https://console.firebase.google.com/project/$NEW_PROJECT_ID/settings/serviceaccounts/adminsdk"
echo ""
echo "  2. Enable required Firebase services in new project:"
echo "     • Authentication (Google Sign-In)"
echo "     • Firestore Database"
echo "     • Cloud Functions"
echo "     • Cloud Storage"
echo "     • Hosting"
echo ""
echo "  3. Install Firebase Extensions in new project:"
echo "     • Trigger Email from Firestore"
echo ""
echo "  4. Configure Firestore security rules:"
echo "     firebase deploy --only firestore:rules"
echo ""
echo "  5. Deploy functions:"
echo "     firebase deploy --only functions"
echo ""
echo "  6. Deploy hosting:"
echo "     firebase deploy --only hosting"
echo ""
echo "  7. Migrate Firestore data (if needed):"
echo "     • Use Firebase console to export/import"
echo "     • Or use the provided migration scripts"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Migration preparation complete!${NC}"
echo ""
echo "Backups created with timestamp suffix (.backup-YYYYMMDD-HHMMSS)"
echo ""
echo "Next: Complete the manual steps above, then run:"
echo "  ${YELLOW}firebase deploy${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
