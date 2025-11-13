/**
 * Migrate User IDs
 * Updates all documents with old UID to new UID
 */

const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'voyagerai-travel-planner'
});

const db = admin.firestore();

// Old and new UIDs
const OLD_UID = 'xc5AZb1153Yxcw5DWGFM5XNRYAl2';
const NEW_UID = 'qJ5o6kSK1wRanwxqbHvVIrqbAuT2';
const EMAIL = 'dagan.gilat@gmail.com';

async function migrateCollection(collectionName, userIdField = 'user_id') {
  console.log(`\nMigrating collection: ${collectionName}`);
  
  try {
    const snapshot = await db.collection(collectionName)
      .where(userIdField, '==', OLD_UID)
      .get();
    
    if (snapshot.empty) {
      console.log(`  No documents found with old UID`);
      return 0;
    }
    
    console.log(`  Found ${snapshot.size} documents to update`);
    
    const batch = db.batch();
    let batchCount = 0;
    let totalUpdated = 0;
    
    for (const doc of snapshot.docs) {
      batch.update(doc.ref, { [userIdField]: NEW_UID });
      batchCount++;
      
      // Firestore batch limit is 500
      if (batchCount === 500) {
        await batch.commit();
        totalUpdated += batchCount;
        console.log(`  Committed batch: ${totalUpdated} documents updated`);
        batchCount = 0;
      }
    }
    
    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
      totalUpdated += batchCount;
    }
    
    console.log(`  ✅ Updated ${totalUpdated} documents in ${collectionName}`);
    return totalUpdated;
    
  } catch (error) {
    console.error(`  ❌ Error migrating ${collectionName}:`, error.message);
    return 0;
  }
}

async function migrateUserProfile() {
  console.log(`\nMigrating user profile`);
  
  try {
    // Check if old user doc exists
    const oldUserDoc = await db.collection('users').doc(OLD_UID).get();
    
    if (oldUserDoc.exists) {
      const userData = oldUserDoc.data();
      
      // Create/update new user doc
      await db.collection('users').doc(NEW_UID).set({
        ...userData,
        uid: NEW_UID,
        email: EMAIL,
        migrated_from: OLD_UID,
        migrated_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log(`  ✅ Migrated user profile`);
      return true;
    } else {
      console.log(`  No old user profile found`);
      return false;
    }
    
  } catch (error) {
    console.error(`  ❌ Error migrating user profile:`, error.message);
    return false;
  }
}

async function run() {
  console.log('════════════════════════════════════════════════════════');
  console.log('  USER ID MIGRATION');
  console.log('════════════════════════════════════════════════════════');
  console.log(`Old UID: ${OLD_UID}`);
  console.log(`New UID: ${NEW_UID}`);
  console.log(`Email:   ${EMAIL}`);
  console.log('════════════════════════════════════════════════════════\n');
  
  const collections = [
    { name: 'trips', field: 'user_id' },
    { name: 'destinations', field: 'user_id' },
    { name: 'lodging', field: 'user_id' },
    { name: 'transportation', field: 'user_id' },
    { name: 'experiences', field: 'user_id' },
    { name: 'purchase_history', field: 'user_id' }
  ];
  
  let totalUpdated = 0;
  
  // Migrate user profile first
  await migrateUserProfile();
  
  // Migrate all collections
  for (const col of collections) {
    const count = await migrateCollection(col.name, col.field);
    totalUpdated += count;
  }
  
  console.log('\n════════════════════════════════════════════════════════');
  console.log(`  ✅ MIGRATION COMPLETE`);
  console.log(`  Total documents updated: ${totalUpdated}`);
  console.log('════════════════════════════════════════════════════════\n');
  
  process.exit(0);
}

run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
