import * as admin from 'firebase-admin';
import { config } from '../config';
import { District, DistrictContacts } from '../types';

let app: admin.app.App | null = null;
let db: admin.firestore.Firestore | null = null;

export function initializeFirebase(): admin.firestore.Firestore {
  if (!app) {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        privateKey: config.firebase.privateKey,
        clientEmail: config.firebase.clientEmail,
      }),
    });
    
    db = app.firestore();
    db.settings({ ignoreUndefinedProperties: true });
  }
  
  return db!;
}

export async function saveDistricts(districts: District[]): Promise<void> {
  const db = initializeFirebase();
  const batch = db.batch();
  
  for (const district of districts) {
    const docRef = db.collection('districts').doc(district.id);
    batch.set(docRef, {
      ...district,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  await batch.commit();
  console.log(`Saved ${districts.length} districts to Firebase`);
}

export async function getDistrict(districtId: string): Promise<District | null> {
  const db = initializeFirebase();
  const doc = await db.collection('districts').doc(districtId).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return doc.data() as District;
}

export async function updateDistrictStatus(
  districtId: string, 
  status: District['status'],
  error?: string
): Promise<void> {
  const db = initializeFirebase();
  const updateData: any = {
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  if (status === 'completed' || status === 'failed') {
    updateData.processedAt = admin.firestore.FieldValue.serverTimestamp();
  }
  
  if (error) {
    updateData.error = error;
  }
  
  await db.collection('districts').doc(districtId).update(updateData);
}

export async function saveDistrictContacts(contacts: DistrictContacts): Promise<void> {
  const db = initializeFirebase();
  const docRef = db.collection('districtContacts').doc(contacts.districtId);
  
  await docRef.set({
    ...contacts,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

export async function getPendingDistricts(limit?: number): Promise<District[]> {
  const db = initializeFirebase();
  let query = db.collection('districts')
    .where('status', '==', 'pending')
    .orderBy('name');
    
  if (limit) {
    query = query.limit(limit);
  }
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => doc.data() as District);
}

export async function getAllDistrictContacts(): Promise<DistrictContacts[]> {
  const db = initializeFirebase();
  const snapshot = await db.collection('districtContacts').get();
  
  return snapshot.docs.map(doc => doc.data() as DistrictContacts);
}

export async function getProcessingStats(): Promise<{
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const db = initializeFirebase();
  const snapshot = await db.collection('districts').get();
  
  const stats = {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  };
  
  snapshot.docs.forEach(doc => {
    const district = doc.data() as District;
    stats.total++;
    stats[district.status]++;
  });
  
  return stats;
}