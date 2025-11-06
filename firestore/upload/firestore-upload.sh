#!/bin/bash

# --- Configuration ---
# ⚠️ UPDATE THIS with your Firebase Project ID
PROJECT_ID="voyager-ai-travel-planner"
# The name of your data file
FILE_NAME="firebase-converted-data.json"
# ---------------------

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "🚨 Error: 'jq' is not installed."
    echo "Please install it first (e.g., 'brew install jq')"
    exit 1
fi

# Check if firebase-cli is installed
if ! command -v firebase &> /dev/null; then
    echo "🚨 Error: 'firebase-tools' is not installed."
    echo "Please install it first (e.g., 'npm install -g firebase-tools')"
    exit 1
fi

# Check if the data file exists
if [ ! -f "$FILE_NAME" ]; then
    echo "🚨 Error: Data file '$FILE_NAME' not found."
    exit 1
fi

# Set the active Firebase project
echo "✅ Setting active project to '$PROJECT_ID'..."
firebase use $PROJECT_ID

# Get all top-level keys, which will be our collection names
collections=$(jq -r 'keys_unsorted[]' $FILE_NAME)

# Loop through each collection
for collection in $collections; do
    echo ""
    echo "--- Processing collection: $collection ---"

    # Get all document IDs for the current collection
    # We use 'keys_unsorted[]' for performance
    docIds=$(jq -r ".$collection | keys_unsorted[]" $FILE_NAME)

    # Loop through each document ID
    for docId in $docIds; do
        echo "  Uploading document: $docId"

        # Get the document's data as a compact JSON string
        # We must quote the $docId in the jq query in case it contains special chars (like emails)
        docData=$(jq -c ".$collection[\"$docId\"]" $FILE_NAME)

        # Use 'firebase firestore:set' to upload the data.
        # The CLI correctly parses the JSON string $docData,
        # including special formats like Timestamps ({"_seconds":...}).
        firebase firestore:set "$collection" "$docId" "$docData"
    done
done

echo ""
echo "🎉 --- Upload complete! ---"
