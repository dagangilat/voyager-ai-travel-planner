const admin = require('firebase-admin');

// Initialize the admin SDK with the environment-specific service account
// This ensures we're using the correct credentials for each environment (dev, prod)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export a singleton instance of Firestore
const db = admin.firestore();

// Export commonly used Firebase services
module.exports = {
  admin,  // Export full admin SDK for advanced use cases
  db,     // Export Firestore instance for direct database access
  auth: admin.auth(),  // Export Auth instance for user management
  storage: admin.storage()  // Export Storage instance for file operations
};