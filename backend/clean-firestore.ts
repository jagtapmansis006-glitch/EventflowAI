import { firestore } from './server/firebase';

async function deleteAllInCollection(collectionName: string): Promise<void> {
  let totalDeleted = 0;

  while (true) {
    const snapshot = await firestore.collection(collectionName).limit(400).get();
    if (snapshot.empty) break;

    const batch = firestore.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    totalDeleted += snapshot.size;
    console.log(`[${collectionName}] Deleted ${totalDeleted} so far...`);
  }

  console.log(`[${collectionName}] Done. Total deleted: ${totalDeleted}`);
}

async function main() {
  await deleteAllInCollection('crowdTelemetry');
  await deleteAllInCollection('mlPredictions');
  console.log('Cleanup complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Cleanup script failed:', err);
  process.exit(1);
});
