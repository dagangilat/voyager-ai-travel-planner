#!/bin/bash

# Script to organize help screenshots
# Run this script after taking your screenshots

echo "📸 Help Screenshots Setup"
echo "========================="
echo ""

# Create directory if it doesn't exist
mkdir -p public/help-screenshots

echo "Please place your screenshots in the public/help-screenshots/ folder"
echo "with the following names:"
echo ""
echo "Required screenshots:"
echo "  1. create-trip.png       - Create Trip page with form"
echo "  2. create-with-ai.png    - AI Options dialog"
echo "  3. trip-details.png      - Trip Details page"
echo "  4. share-trip.png        - Share dialog"
echo "  5. email-example.png     - Email notification example"
echo "  6. search-results.png    - Search results page"
echo "  7. budget-tempo.png      - Budget and Tempo selectors"
echo "  8. visit-focus.png       - Visit Focus tags"
echo ""
echo "Current screenshots in folder:"
ls -lh public/help-screenshots/ 2>/dev/null || echo "  (folder is empty)"
echo ""
echo "After adding screenshots, rebuild the app:"
echo "  npm run build"
echo ""
