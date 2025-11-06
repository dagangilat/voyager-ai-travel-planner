const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with your service account
// You'll need to download your service account key from Firebase Console
// and place it in the project root as 'service-account.json'
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Read the export data
const exportData = require('../entities-data-export.json');

async function setupFirestore() {
  try {
    console.log('Starting Firestore setup...');
    
    // Process each entity type
    for (const [entityType, entities] of Object.entries(exportData.entities)) {
      console.log(`Processing ${entityType}...`);
      const collectionRef = db.collection(entityType.toLowerCase());
      
      // Create a batch write
      let batch = db.batch();
      let operationCount = 0;
      
      for (const entity of entities) {
        const docRef = collectionRef.doc(entity.id);
        
        // Prepare the document data
        const docData = {
          ...entity.data,
          created_date: admin.firestore.Timestamp.fromDate(new Date(entity.created_date)),
          updated_date: entity.updated_date ? admin.firestore.Timestamp.fromDate(new Date(entity.updated_date)) : null,
          created_by: entity.created_by
        };
        
        // Add to batch
        batch.set(docRef, docData);
        operationCount++;
        
        // Firebase has a limit of 500 operations per batch
        if (operationCount >= 450) {
          await batch.commit();
          console.log(`Committed batch of ${operationCount} documents for ${entityType}`);
          batch = db.batch();
          operationCount = 0;
        }
      }
      
      // Commit any remaining operations
      if (operationCount > 0) {
        await batch.commit();
        console.log(`Committed final batch of ${operationCount} documents for ${entityType}`);
      }
      
      console.log(`✅ Completed ${entityType}`);
    }
    
    // Create indexes for common queries
    const indexes = [
      {
        collectionGroup: 'destination',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'trip_id', order: 'ASCENDING' },
          { fieldPath: 'order', order: 'ASCENDING' }
        ]
      },
      {
        collectionGroup: 'transportation',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'trip_id', order: 'ASCENDING' },
          { fieldPath: 'departure_datetime', order: 'ASCENDING' }
        ]
      },
      {
        collectionGroup: 'lodging',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'trip_id', order: 'ASCENDING' },
          { fieldPath: 'check_in_date', order: 'ASCENDING' }
        ]
      },
      {
        collectionGroup: 'experience',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'trip_id', order: 'ASCENDING' },
          { fieldPath: 'date', order: 'ASCENDING' }
        ]
      }
    ];
    
    console.log('Setting up indexes...');
    for (const index of indexes) {
      try {
        await db.collection(index.collectionGroup).doc('dummy').set({ dummy: true });
        console.log(`Created index for ${index.collectionGroup}`);
      } catch (error) {
        console.warn(`Warning: Could not create index for ${index.collectionGroup}:`, error.message);
      }
    }
    
    console.log('🎉 Setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
}

setupFirestore();