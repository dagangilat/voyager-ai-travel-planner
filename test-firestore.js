import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testFirestore() {
  try {
    initializeApp({
      credential: cert(join(__dirname, './service-account.json')),
      projectId: 'voyager-ai-travel'
    });

    const db = getFirestore();
    
    await db.collection('test').doc('test1').set({
      message: 'Test document',
      timestamp: new Date()
    });
    
    console.log('Test document created successfully');
  } catch (error) {
    console.error('Error:', error);
  }
}

testFirestore();