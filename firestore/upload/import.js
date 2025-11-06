// import.js (ES Module Version)

// Use 'import' syntax for ES Module environment
import admin from 'firebase-admin';
import fs from 'fs';

// 1. Initialize Firebase Admin
admin.initializeApp({
  // 🚨 IMPORTANT: REPLACE 'YOUR_PROJECT_ID_HERE' with your actual Firebase Project ID
  projectId: 'voyager-ai-travel'
});

const db = admin.firestore();

// 2. Define the path to your JSON file
const jsonFilePath = './firebase-converted-data.json'; 

/**
 * A helper function to recursively traverse the data and convert
 * the Firestore-exported timestamp objects ({_seconds: N, _nanoseconds: M})
 * back into native Firestore Timestamp objects.
 */
function convertTimestamps(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Check if this object matches the Firestore timestamp export format
  if (
    typeof obj._seconds === 'number' && 
    typeof obj._nanoseconds === 'number' &&
    Object.keys(obj).length === 2 // Ensure no extra properties
  ) {
    // Convert to a native Firestore Timestamp object
    return new admin.firestore.Timestamp(obj._seconds, obj._nanoseconds);
  }

  // Handle Arrays: Recursively map over array elements
  if (Array.isArray(obj)) {
    return obj.map(convertTimestamps);
  }

  // Handle Objects: Recursively check all property values
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      obj[key] = convertTimestamps(obj[key]);
    }
  }
  return obj;
}


/**
 * The main function to read the JSON file and import data using batched writes.
 */
async function importData() {
  try {
    console.log(`Reading JSON file from: ${jsonFilePath}`);
    const fileContents = fs.readFileSync(jsonFilePath, 'utf8');
    const data = JSON.parse(fileContents);

    if (!data) {
      console.error('No data found in JSON file.');
      return;
    }

    // Loop through each top-level key (which represents a collection)
    for (const collectionName in data) {
      if (!Object.prototype.hasOwnProperty.call(data, collectionName)) continue;

      console.log(`\nImporting collection: "${collectionName}"...`);
      const collectionData = data[collectionName];
      const docIds = Object.keys(collectionData);

      if (docIds.length === 0) {
        console.log(`No documents found in "${collectionName}". Skipping.`);
        continue;
      }

      let batch = db.batch();
      let docCountInBatch = 0;
      let totalDocCount = 0;

      // Loop through each document in the collection
      for (const docId of docIds) {
        const docData = collectionData[docId];
        
        // Convert any timestamp objects recursively
        const processedData = convertTimestamps(docData);
        
        // Get a reference to the new document, using the original document ID
        const docRef = db.collection(collectionName).doc(docId);
        
        // Add the document 'set' operation to the batch
        batch.set(docRef, processedData);
        docCountInBatch++;
        totalDocCount++;

        // Firestore batches are limited to 500 operations (writes). 
        // We commit and reset the batch before hitting the limit.
        if (docCountInBatch === 499) {
          console.log(`Committing batch of 499 documents...`);
          await batch.commit();
          batch = db.batch(); // Start a new batch
          docCountInBatch = 0; // Reset batch counter
        }
      }

      // Commit any remaining documents in the last batch
      if (docCountInBatch > 0) {
        console.log(`Committing final batch of ${docCountInBatch} documents...`);
        await batch.commit();
      }
      
      console.log(`Successfully imported ${totalDocCount} documents into "${collectionName}".`);
    }

    console.log('\n✅ All data imported successfully!');

  } catch (error) {
    // This catches the gRPC error (like 5 NOT_FOUND)
    console.error('Error importing data:', error.message || error);
    console.error('*** Import failed. Please check the following: ***');
    console.error('1. Did you replace "YOUR_PROJECT_ID_HERE" with your actual ID?');
    console.error('2. Is Firestore enabled in your Firebase Console?');
    console.error('3. Are your gcloud credentials (`gcloud auth application-default login`) correct?');
  }
}

// Run the import
importData();
