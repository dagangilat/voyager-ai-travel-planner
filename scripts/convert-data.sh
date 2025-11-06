#!/bin/bash

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed!"
    exit 1
fi

# Run the conversion script
echo "Converting data to Firebase schema..."
node ./scripts/convert-to-firebase.js

# Check if conversion was successful
if [ $? -eq 0 ]; then
    echo "✅ Conversion completed successfully!"
    echo "The converted data is available in firebase-converted-data.json"
    echo ""
    echo "Next steps:"
    echo "1. Review the converted data in firebase-converted-data.json"
    echo "2. Use firebase-admin SDK to import the data into your Firebase project"
    echo "3. Update your application code to use the new data structure"
else
    echo "❌ Conversion failed!"
fi