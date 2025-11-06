// --- Configuration ---
// ⚠️ UPDATE THIS with your project's database URL
const DATABASE_URL = "https://voyager-ai-travel-planner.firebaseio.com";
// The name of your data file
const FILE_NAME = "./firebase-converted-data.json";
// ---------------------

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const data = require(FILE_NAME);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: DATABASE_URL,
});

const db = admin.firestore();

// A helper function to handle the special timestamp format
function convertTimestamps(obj) {
  if (obj && typeof obj === 'object') {
    if (obj.hasOwnProperty('_seconds') && obj.hasOwnProperty('_nanoseconds')) {
      return new admin.firestore.Timestamp(obj._seconds, obj._nanoseconds);
    }
    // Recurse into nested objects and arrays
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        obj[key] = convertTimestamps(obj[key]);
      }
    }
  }
  return obj;
}

// Main upload function
async function uploadData() {
  console.log("✅ Starting data upload...");

  for (const collectionName of Object.keys(data)) {
    console.log(`\n--- Processing collection: ${collectionName} ---`);
    const collectionData = data[collectionName];

    for (const docId of Object.keys(collectionData)) {
      console.log(`  Uploading document: ${docId}`);
      
      const docData = collectionData[docId];
      // Convert our special timestamp objects back to real Firestore Timestamps
      const processedData = convertTimestamps(docData);
      
      // Get a reference to the document
      const docRef = db.collection(collectionName).doc(docId);
      
      // Use .set() to create or overwrite the document
      try {
        await docRef.set(processedData);
      } catch (error) {
        console.error(`    🔥 Error uploading document ${docId}:`, error);
      }
    }
  }

  console.log("\n🎉 --- Upload complete! ---");
}

// Run the script
uploadData();
