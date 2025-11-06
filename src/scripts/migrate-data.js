import { db } from '../config/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import data from '../../entities-data-export.json';

async function migrateData() {
  try {
    // Migrate each entity type
    for (const [entityType, entities] of Object.entries(data.entities)) {
      console.log(`Migrating ${entityType}...`);
      const collectionRef = collection(db, entityType.toLowerCase());
      
      for (const entity of entities) {
        const docRef = doc(collectionRef, entity.id);
        await setDoc(docRef, {
          ...entity.data,
          created_date: new Date(entity.created_date),
          updated_date: entity.updated_date ? new Date(entity.updated_date) : null,
          created_by: entity.created_by
        });
      }
      
      console.log(`✅ Migrated ${entities.length} ${entityType} documents`);
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

migrateData();