#!/bin/bash

# Check if firebase-admin is installed
if ! npm list firebase-admin > /dev/null 2>&1; then
    echo "Installing firebase-admin..."
    npm install firebase-admin
fi

# Check if service account file exists
if [ ! -f "./service-account.json" ]; then
    echo "Error: service-account.json not found!"
    echo "Please download your service account key from Firebase Console:"
    echo "1. Go to Project Settings > Service Accounts"
    echo "2. Click 'Generate New Private Key'"
    echo "3. Save the file as 'service-account.json' in the project root"
    exit 1
fi

# Run the setup script
echo "Starting Firestore setup..."
node ./scripts/setup-firebase.js