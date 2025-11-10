#!/bin/bash

# API Key Rotation Script
# This script helps you rotate all exposed API keys

set -e

echo "================================================"
echo "🔐 API KEY ROTATION SCRIPT"
echo "================================================"
echo ""
echo "This script will help you rotate all exposed API keys."
echo "You'll need to manually delete old keys and create new ones."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to wait for user confirmation
confirm() {
    read -p "✓ Press ENTER when done..."
    echo ""
}

# Function to open URL
open_url() {
    if command -v open &> /dev/null; then
        open "$1"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$1"
    else
        echo "Please open this URL manually: $1"
    fi
}

echo -e "${RED}🚨 CRITICAL: The following keys were exposed and MUST be revoked:${NC}"
echo ""
echo "  ✗ Firebase API Key: AIzaSyBATqGAv1CfmOMu93V34r-GRJxzF9nNE7g"
echo "  ✗ Gemini API Key: AIzaSyA61V-H7HvBSy24xutw7ZlGA5K8gUryIC8"
echo "  ✗ Google API Key #3: AIzaSyCVHfXF7eAul5U73a_8J5WCNK8YtAIZSWo"
echo "  ✗ Amadeus API Key: MDBDhOc5rMKcQlciChpPW2Jl46RW6bd5"
echo "  ✗ Amadeus API Secret: HNMMYElil0kZrZDB"
echo ""
echo "================================================"
echo ""

# Step 1: Revoke Google/Firebase API Keys
echo -e "${YELLOW}STEP 1: REVOKE GOOGLE/FIREBASE API KEYS${NC}"
echo "================================================"
echo ""
echo "I'm opening Google Cloud Console..."
sleep 2
open_url "https://console.cloud.google.com/apis/credentials?project=voyager-ai-travel-planner"
echo ""
echo "Instructions:"
echo "1. Find ALL API keys that start with 'AIza'"
echo "2. Click on each key (AIzaSyBATqGAv1CfmOMu93V34r-GRJxzF9nNE7g, etc.)"
echo "3. Click the 'DELETE KEY' or trash icon"
echo "4. Confirm deletion"
echo ""
confirm

# Step 2: Create New Firebase API Key
echo -e "${YELLOW}STEP 2: CREATE NEW FIREBASE API KEY${NC}"
echo "================================================"
echo ""
echo "Still in Google Cloud Console:"
echo "1. Click '+ CREATE CREDENTIALS' at the top"
echo "2. Select 'API key'"
echo "3. Copy the new API key"
echo "4. Click 'RESTRICT KEY'"
echo "5. Under 'Application restrictions', select 'HTTP referrers'"
echo "6. Add these referrers:"
echo "   - https://voyager-ai-travel-planner.web.app/*"
echo "   - https://voyager-ai-travel-planner.firebaseapp.com/*"
echo "   - localhost:*"
echo "7. Under 'API restrictions', select 'Restrict key'"
echo "8. Enable: Identity Toolkit API, Token Service API"
echo "9. Click 'Save'"
echo ""
read -p "Enter your NEW Firebase API key: " NEW_FIREBASE_KEY
echo ""

# Step 3: Create New Gemini API Key
echo -e "${YELLOW}STEP 3: CREATE NEW GEMINI API KEY${NC}"
echo "================================================"
echo ""
echo "Opening Google AI Studio..."
sleep 2
open_url "https://aistudio.google.com/app/apikey"
echo ""
echo "Instructions:"
echo "1. Find and DELETE the old key (AIzaSyA61V-H7HvBSy24xutw7ZlGA5K8gUryIC8)"
echo "2. Click 'Create API Key'"
echo "3. Select your project: voyager-ai-travel-planner"
echo "4. Copy the new API key"
echo ""
read -p "Enter your NEW Gemini API key: " NEW_GEMINI_KEY
echo ""

# Step 4: Create New Google Places API Key
echo -e "${YELLOW}STEP 4: CREATE NEW GOOGLE PLACES API KEY${NC}"
echo "================================================"
echo ""
echo "Back to Google Cloud Console..."
sleep 2
open_url "https://console.cloud.google.com/apis/credentials?project=voyager-ai-travel-planner"
echo ""
echo "Instructions:"
echo "1. Click '+ CREATE CREDENTIALS' → 'API key'"
echo "2. Copy the new API key"
echo "3. Click 'RESTRICT KEY'"
echo "4. Under 'Application restrictions', select 'HTTP referrers'"
echo "5. Add the same referrers as before"
echo "6. Under 'API restrictions', select 'Restrict key'"
echo "7. Enable: Places API, Geocoding API"
echo "8. Click 'Save'"
echo ""
read -p "Enter your NEW Google Places API key: " NEW_PLACES_KEY
echo ""

# Step 5: Revoke Amadeus API Keys
echo -e "${YELLOW}STEP 5: REVOKE AMADEUS API CREDENTIALS${NC}"
echo "================================================"
echo ""
echo "Opening Amadeus Developer Portal..."
sleep 2
open_url "https://developers.amadeus.com/my-apps"
echo ""
echo "Instructions:"
echo "1. Log in to your Amadeus account"
echo "2. Find your app/project"
echo "3. Delete the old API credentials OR regenerate them"
echo "4. Create NEW API Key and Secret"
echo ""
confirm

echo "If you created new credentials:"
read -p "Enter your NEW Amadeus API Key: " NEW_AMADEUS_KEY
read -p "Enter your NEW Amadeus API Secret: " NEW_AMADEUS_SECRET
echo ""

# Step 6: Update .env file
echo -e "${YELLOW}STEP 6: UPDATE .ENV FILE${NC}"
echo "================================================"
echo ""
echo "Creating backup of current .env file..."
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✓ Backup created"
echo ""

echo "Updating .env file with new keys..."

# Update .env file
sed -i.bak "s/VITE_FIREBASE_API_KEY=.*/VITE_FIREBASE_API_KEY=$NEW_FIREBASE_KEY/" .env
sed -i.bak "s/GEMINI_API_KEY=.*/GEMINI_API_KEY=$NEW_GEMINI_KEY/" .env
sed -i.bak "s/GOOGLE_PLACES_API_KEY=.*/GOOGLE_PLACES_API_KEY=$NEW_PLACES_KEY/" .env

if [ ! -z "$NEW_AMADEUS_KEY" ]; then
    sed -i.bak "s/AMADEUS_API_KEY=.*/AMADEUS_API_KEY=$NEW_AMADEUS_KEY/" .env
    sed -i.bak "s/AMADEUS_API_SECRET=.*/AMADEUS_API_SECRET=$NEW_AMADEUS_SECRET/" .env
fi

rm .env.bak

echo "✓ .env file updated"
echo ""

# Step 7: Update Firebase SDK Config
echo -e "${YELLOW}STEP 7: UPDATE FIREBASE CONFIG${NC}"
echo "================================================"
echo ""
echo "Getting latest Firebase config..."
firebase apps:sdkconfig web --project=voyager-ai-travel-planner > /tmp/firebase-config.json

# Extract the new API key from Firebase config
FIREBASE_CONFIG_KEY=$(cat /tmp/firebase-config.json | grep "apiKey" | cut -d'"' -f4)

if [ "$FIREBASE_CONFIG_KEY" != "$NEW_FIREBASE_KEY" ]; then
    echo -e "${YELLOW}⚠️  Warning: Firebase config shows different API key${NC}"
    echo "Config key: $FIREBASE_CONFIG_KEY"
    echo "Your key:   $NEW_FIREBASE_KEY"
    echo ""
    read -p "Use Firebase config key instead? (y/n): " USE_CONFIG_KEY
    if [ "$USE_CONFIG_KEY" = "y" ]; then
        sed -i.bak "s/VITE_FIREBASE_API_KEY=.*/VITE_FIREBASE_API_KEY=$FIREBASE_CONFIG_KEY/" .env
        rm .env.bak
        echo "✓ Updated with Firebase config key"
    fi
fi
echo ""

# Step 8: Build and Deploy
echo -e "${YELLOW}STEP 8: BUILD AND DEPLOY${NC}"
echo "================================================"
echo ""
echo "Building application with new keys..."
npm run build

if [ $? -eq 0 ]; then
    echo "✓ Build successful"
    echo ""
    echo "Deploying to Firebase..."
    firebase deploy --only hosting
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}================================================${NC}"
        echo -e "${GREEN}✓ DEPLOYMENT SUCCESSFUL!${NC}"
        echo -e "${GREEN}================================================${NC}"
        echo ""
        echo "Your application is now running with NEW API keys!"
        echo ""
        echo -e "${BLUE}Next steps:${NC}"
        echo "1. Test your application: https://voyager-ai-travel-planner.web.app"
        echo "2. Monitor usage in Google Cloud Console"
        echo "3. Check Amadeus API usage"
        echo "4. Delete the backup .env files once you confirm everything works"
        echo ""
        echo -e "${RED}IMPORTANT:${NC}"
        echo "- Never commit .env files to git"
        echo "- The exposed keys are now REVOKED and safe"
        echo "- Monitor your billing for unusual activity"
        echo ""
    else
        echo -e "${RED}✗ Deployment failed. Check the error above.${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Build failed. Check the error above.${NC}"
    exit 1
fi

echo "================================================"
echo "🎉 API KEY ROTATION COMPLETE!"
echo "================================================"
