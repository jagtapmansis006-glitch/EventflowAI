import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(
    `Firebase service account file not found at ${serviceAccountPath}. Make sure firebase-service-account.json is in the backend/ folder.`
  );
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

export const firestore = getFirestore();

export async function mirrorToFirestore(data: Record<string, any[]>): Promise<void> {
  return; // Disabled: Firestore free-tier quota exhausted (see handover notes). Re-enable later.
  try {
    // ... rest of function unchanged, left in place below the return
    const collectionNames = Object.keys(data);

    for (const collectionName of collectionNames) {
      const items = data[collectionName];
      if (!Array.isArray(items)) continue;

      const chunkSize = 400; // Firestore batch limit is 500 operations
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const batch = firestore.batch();

        for (const item of chunk) {
          if (!item || !item.id) continue;
          const ref = firestore.collection(collectionName).doc(String(item.id));
          batch.set(ref, item, { merge: true });
        }

        await batch.commit();
      }
    }
  } catch (err) {
    console.error('[Firestore Mirror] Failed to sync data to Firestore:', err);
  }
}

// --- Automatic retention pruning for high-frequency collections ---
// crowdTelemetry and mlPredictions are written very frequently (every few
// seconds from the CV pipeline, every 30s from the simulated loop). They're
// only useful for a short recent window — older records provide no value to
// the prediction engine and just consume Firestore's free-tier document quota
// indefinitely. This job deletes anything older than RETENTION_MINUTES,
// automatically, in the background, on both collections.

const RETENTION_MINUTES = 5;
const PRUNE_INTERVAL_MS = 60000; // run every 60 seconds

const PRUNABLE_COLLECTIONS: { name: string; timestampField: string }[] = [
  { name: 'crowdTelemetry', timestampField: 'timestamp' },
  { name: 'mlPredictions', timestampField: 'createdAt' }
];

async function pruneOldDocuments(collectionName: string, timestampField: string): Promise<void> {
  const cutoffIso = new Date(Date.now() - RETENTION_MINUTES * 60000).toISOString();

  try {
    const snapshot = await firestore
      .collection(collectionName)
      .where(timestampField, '<', cutoffIso)
      .limit(400)
      .get();

    if (snapshot.empty) return;

    const batch = firestore.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log(`[Firestore Prune] Deleted ${snapshot.size} old doc(s) from ${collectionName}`);

    // If we hit the batch limit, there may be more to delete — keep going.
    if (snapshot.size === 400) {
      await pruneOldDocuments(collectionName, timestampField);
    }
  } catch (err) {
    console.error(`[Firestore Prune] Failed to prune ${collectionName}:`, err);
  }
}

function startFirestorePruning() {
  setInterval(() => {
    for (const { name, timestampField } of PRUNABLE_COLLECTIONS) {
      pruneOldDocuments(name, timestampField).catch(err => {
        console.error(`[Firestore Prune] Unexpected error while pruning ${name}:`, err);
      });
    }
  }, PRUNE_INTERVAL_MS);

  console.log(`[Firestore Prune] Retention job started: deleting docs older than ${RETENTION_MINUTES} minutes, every ${PRUNE_INTERVAL_MS / 1000}s.`);
}

// startFirestorePruning(); // Disabled alongside mirroring — this also hits Firestore and will spam the same quota error.
startFirestorePruning();

