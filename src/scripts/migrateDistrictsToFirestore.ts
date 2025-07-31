import * as fs from 'fs/promises';
import * as path from 'path';
import { District } from '../types';
import { initializeFirebase } from '../utils/firebase';
import { validateConfig } from '../config';
import * as admin from 'firebase-admin';

/**
 * Migrates district data from JSON file to Firestore
 * This is a one-time operation to seed the database
 */
async function migrateDistrictsToFirestore(): Promise<void> {
  console.log('Starting district migration to Firestore...');
  
  try {
    // Validate environment configuration
    validateConfig();
    
    // Initialize Firebase
    const db = initializeFirebase();
    
    // Read districts data
    const dataPath = path.join(process.cwd(), 'data', 'districts-full.json');
    const jsonData = await fs.readFile(dataPath, 'utf-8');
    const { districts } = JSON.parse(jsonData) as { districts: District[] };
    
    console.log(`Found ${districts.length} districts to migrate`);
    
    // Process in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    let totalProcessed = 0;
    
    for (let i = 0; i < districts.length; i += batchSize) {
      const batch = db.batch();
      const batchDistricts = districts.slice(i, i + batchSize);
      
      for (const district of batchDistricts) {
        // Validate district data
        if (!district.id || !district.name) {
          console.warn(`Skipping invalid district: ${JSON.stringify(district)}`);
          continue;
        }
        
        // Prepare district document
        const docRef = db.collection('districts').doc(district.id);
        const districtData = {
          ...district,
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        
        batch.set(docRef, districtData, { merge: true });
      }
      
      // Commit batch
      await batch.commit();
      totalProcessed += batchDistricts.length;
      
      console.log(`Migrated ${totalProcessed}/${districts.length} districts`);
    }
    
    // Verify migration
    const snapshot = await db.collection('districts').count().get();
    const count = snapshot.data().count;
    
    console.log(`Migration complete! Total districts in Firestore: ${count}`);
    
    // Create indexes if needed
    console.log('Creating indexes...');
    
    // Note: Composite indexes need to be created manually in Firebase Console
    // or via firebase CLI. Here we just log the recommendation
    console.log(`
Recommended indexes to create in Firebase Console:
1. Collection: districts
   - status (Ascending)
   - name (Ascending)
   
2. Collection: districts  
   - status (Ascending)
   - county (Ascending)
   
3. Collection: districtContacts
   - districtId (Ascending)
   - scrapedAt (Descending)
`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Check if running directly
if (require.main === module) {
  migrateDistrictsToFirestore()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

export { migrateDistrictsToFirestore };