import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
try {
  initializeApp({
    credential: cert(resolve(__dirname, '../service-account.json')),
    projectId: 'voyager-ai-travel'
  });
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  console.log('Please make sure you have placed your service-account.json file in the project root');
  process.exit(1);
}

const db = getFirestore();

async function importData() {
  try {
    // Read the export file
    const data = JSON.parse(
      readFileSync(resolve(__dirname, '../entities-data-export.json'), 'utf8')
    );

    console.log(`Starting import for ${data.app_name} (Export date: ${data.export_date})`);

    // Process each entity type
    for (const [entityType, entities] of Object.entries(data.entities)) {
      console.log(`\nImporting ${entities.length} ${entityType} records...`);
      
      // Create a batch for each 500 documents (Firestore limit)
      const batches = [];
      let currentBatch = db.batch();
      let operationCount = 0;
      
      for (const entity of entities) {
        const docRef = db.collection(entityType).doc(entity.id);
        
        // Convert dates from strings to Firestore timestamps
        const processedEntity = {
          ...entity,
          created_date: new Date(entity.created_date),
          updated_date: new Date(entity.updated_date)
        };
        
        currentBatch.set(docRef, processedEntity);
        operationCount++;
        
        // When batch reaches limit, start a new one
        if (operationCount === 450) {
          batches.push(currentBatch);
          currentBatch = db.batch();
          operationCount = 0;
        }
      }
      
      // Push the last batch if it has operations
      if (operationCount > 0) {
        batches.push(currentBatch);
      }
      
      // Commit all batches
      console.log(`Committing ${batches.length} batches for ${entityType}...`);
      await Promise.all(batches.map(batch => batch.commit()));
      console.log(`✅ Imported ${entities.length} ${entityType} records`);
    }

    console.log('🎉 Data import completed successfully!');
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  }
}

importData();