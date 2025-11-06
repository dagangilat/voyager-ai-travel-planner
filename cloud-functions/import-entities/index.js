const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');


// Initialize Firebase Admin with explicit projectId if available
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || 'voyager-ai-travel';
try {
  admin.initializeApp({ projectId });
} catch (e) {
  // ignore if already initialized
}

const db = admin.firestore();

// Load the bundled JSON file included with the function source
const dataPath = path.join(__dirname, 'entities-data-export.json');
let exportData = null;
try {
  exportData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} catch (err) {
  console.error('Failed to read bundled export JSON:', err);
}

exports.importEntities = async (req, res) => {
  if (!exportData) {
    res.status(500).send({ error: 'No export data available in function bundle' });
    return;
  }

  try {
    // Debug: log runtime project and admin config
    // Determine projectId: try admin config, env vars, then metadata server as a last resort
    let runtimeProjectId = (admin?.app?.() && admin.app().options && admin.app().options.projectId) || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
    if (!runtimeProjectId) {
      try {
        const METADATA_HEADERS = { 'Metadata-Flavor': 'Google' };
        const projResp = await fetch('http://metadata.google.internal/computeMetadata/v1/project/project-id', { headers: METADATA_HEADERS });
        if (projResp.ok) runtimeProjectId = await projResp.text();
      } catch (projErr) {
        console.warn('Could not read project-id from metadata server:', projErr && projErr.message ? projErr.message : projErr);
      }
    }
    runtimeProjectId = runtimeProjectId || 'unknown';
    console.log('Runtime projectId (admin.app().options / env / metadata):', runtimeProjectId);

    // Try to read service account email and an access token from the metadata server (works inside Cloud Functions)
    let runtimeServiceAccount = 'unknown';
    let metadataToken = null;
    try {
      // metadata server requires this header
      const METADATA_HEADERS = { 'Metadata-Flavor': 'Google' };
      // fetch is available in Node 18 runtime
      const emailResp = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email', { headers: METADATA_HEADERS });
      if (emailResp.ok) runtimeServiceAccount = await emailResp.text();

      const tokenResp = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', { headers: METADATA_HEADERS });
      if (tokenResp.ok) metadataToken = await tokenResp.json();
    } catch (mdErr) {
      console.warn('Metadata server request failed (not running on GCP or blocked):', mdErr && mdErr.message ? mdErr.message : mdErr);
    }

    console.log('Runtime service account:', runtimeServiceAccount);
    console.log('Metadata token present:', metadataToken ? true : false);

    // Health-check write to help diagnose permission/database issues (Admin SDK)
    try {
      await db.collection('__debug_import').doc('ping').set({ ts: admin.firestore.Timestamp.now(), note: 'pre-import-check' });
      console.log('Health-check write (Admin SDK) succeeded');
    } catch (hcErr) {
      console.error('Health-check write (Admin SDK) failed:', hcErr);
      // continue to try import so we can capture the main error too
    }

    // If we have a metadata access token, also try a direct REST write for comparison
    if (metadataToken && metadataToken.access_token) {
      try {
        const restResp = await fetch(`https://firestore.googleapis.com/v1/projects/${runtimeProjectId}/databases/(default)/documents/__debug_import_rest?documentId=probe-2`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${metadataToken.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fields: { probe_field: { stringValue: 'probe-rest' } } })
        });

        const restText = await restResp.text();
        console.log('REST probe status:', restResp.status, 'body:', restText);
      } catch (restErr) {
        console.error('REST probe failed:', restErr && restErr.message ? restErr.message : restErr);
      }
    } else {
      console.log('No metadata access token available to run REST probe from runtime');
    }

    const results = {};
    for (const [entityType, entities] of Object.entries(exportData.entities)) {
      console.log(`Importing ${entities.length} ${entityType} records...`);

      const batches = [];
      let batch = db.batch();
      let ops = 0;

      for (const entity of entities) {
        const docRef = db.collection(entityType).doc(entity.id);

        // Convert date strings to Firestore Timestamps if present
        const processed = { ...entity };
        if (processed.created_date) processed.created_date = admin.firestore.Timestamp.fromDate(new Date(processed.created_date));
        if (processed.updated_date) processed.updated_date = admin.firestore.Timestamp.fromDate(new Date(processed.updated_date));

        batch.set(docRef, processed, { merge: false });
        ops++;

        if (ops >= 450) {
          batches.push(batch);
          batch = db.batch();
          ops = 0;
        }
      }

      if (ops > 0) batches.push(batch);

      // Commit sequentially to limit resource usage
      let committed = 0;
      for (const b of batches) {
        await b.commit();
        committed++;
      }

      results[entityType] = { imported: entities.length, batches: batches.length };
      console.log(`Imported ${entities.length} ${entityType} records in ${batches.length} batches`);
    }

    res.status(200).send({ success: true, details: results });
  } catch (error) {
    console.error('Import failed:', error);
    res.status(500).send({ success: false, error: String(error) });
  }
};
