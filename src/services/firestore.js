import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '@/config/firebase';

/**
 * Generic Firestore CRUD operations
 */

// Create a new document
export const createDocument = async (collectionName, data) => {
  try {
    const user = auth.currentUser;
    const docData = {
      ...data,
      created_by: user?.uid || 'anonymous',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, collectionName), docData);
    return { id: docRef.id, ...docData };
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    throw error;
  }
};

// Get a single document by ID
export const getDocument = async (collectionName, id) => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error(`Document not found in ${collectionName} with id: ${id}`);
    }
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error);
    throw error;
  }
};

// Update a document
export const updateDocument = async (collectionName, id, data) => {
  try {
    const docRef = doc(db, collectionName, id);
    const updateData = {
      ...data,
      updated_at: serverTimestamp()
    };
    
    await updateDoc(docRef, updateData);
    return { id, ...updateData };
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
};

// Delete a document
export const deleteDocument = async (collectionName, id) => {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return { id };
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
};

// List all documents in a collection with optional ordering
export const listDocuments = async (collectionName, orderByField = null) => {
  try {
    let q = collection(db, collectionName);
    
    if (orderByField) {
      // Handle descending order (prefix with -)
      const isDescending = orderByField.startsWith('-');
      const field = isDescending ? orderByField.substring(1) : orderByField;
      const direction = isDescending ? 'desc' : 'asc';
      q = query(q, orderBy(field, direction));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error listing documents from ${collectionName}:`, error);
    throw error;
  }
};

// Filter documents with where clauses
export const filterDocuments = async (collectionName, filters = {}, orderByField = null) => {
  try {
    let q = collection(db, collectionName);
    
    // Apply filters
    Object.entries(filters).forEach(([field, value]) => {
      q = query(q, where(field, '==', value));
    });
    
    // Apply ordering
    if (orderByField) {
      const isDescending = orderByField.startsWith('-');
      const field = isDescending ? orderByField.substring(1) : orderByField;
      const direction = isDescending ? 'desc' : 'asc';
      q = query(q, orderBy(field, direction));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error filtering documents from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Entity-specific operations
 */

export const Trip = {
  create: (data) => createDocument('trips', data),
  get: (id) => getDocument('trips', id),
  update: (id, data) => updateDocument('trips', id, data),
  delete: (id) => deleteDocument('trips', id),
  list: (orderByField) => listDocuments('trips', orderByField),
  filter: (filters, orderByField) => filterDocuments('trips', filters, orderByField)
};

export const Destination = {
  create: (data) => createDocument('destinations', data),
  get: (id) => getDocument('destinations', id),
  update: (id, data) => updateDocument('destinations', id, data),
  delete: (id) => deleteDocument('destinations', id),
  list: (orderByField) => listDocuments('destinations', orderByField),
  filter: (filters, orderByField) => filterDocuments('destinations', filters, orderByField)
};

export const Transportation = {
  create: (data) => createDocument('transportation', data),
  get: (id) => getDocument('transportation', id),
  update: (id, data) => updateDocument('transportation', id, data),
  delete: (id) => deleteDocument('transportation', id),
  list: (orderByField) => listDocuments('transportation', orderByField),
  filter: (filters, orderByField) => filterDocuments('transportation', filters, orderByField)
};

export const Lodging = {
  create: (data) => createDocument('lodging', data),
  get: (id) => getDocument('lodging', id),
  update: (id, data) => updateDocument('lodging', id, data),
  delete: (id) => deleteDocument('lodging', id),
  list: (orderByField) => listDocuments('lodging', orderByField),
  filter: (filters, orderByField) => filterDocuments('lodging', filters, orderByField)
};

export const Experience = {
  create: (data) => createDocument('experiences', data),
  get: (id) => getDocument('experiences', id),
  update: (id, data) => updateDocument('experiences', id, data),
  delete: (id) => deleteDocument('experiences', id),
  list: (orderByField) => listDocuments('experiences', orderByField),
  filter: (filters, orderByField) => filterDocuments('experiences', filters, orderByField)
};

export const PurchaseHistory = {
  create: (data) => createDocument('purchase_history', data),
  get: (id) => getDocument('purchase_history', id),
  list: (orderByField) => listDocuments('purchase_history', orderByField),
  filter: (filters, orderByField) => filterDocuments('purchase_history', filters, orderByField)
};
