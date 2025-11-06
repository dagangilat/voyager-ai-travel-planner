#!/bin/bash

# Build the React application
echo "Building the application..."
npm run build

# Check if the build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix the errors and try again."
    exit 1
fi

# Deploy Firestore rules and indexes
echo "Deploying Firestore rules and indexes..."
firebase deploy --only firestore:rules,firestore:indexes

# Import the converted data to Firestore
echo "Importing data to Firestore..."
node ./scripts/import-to-firebase.js

# Deploy the application
echo "Deploying the application..."
firebase deploy --only hosting

echo "✅ Deployment completed!"
echo "Your application should now be live at: https://voyager-travel-planner.web.app"