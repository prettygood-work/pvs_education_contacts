import * as admin from 'firebase-admin';
import { District } from '../types';

export interface ScrapeProgress {
  runId: string;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  stats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  errors: Array<{
    districtId: string;
    districtName: string;
    error: string;
    timestamp: Date;
  }>;
  currentDistrict?: {
    id: string;
    name: string;
    startedAt: Date;
  };
}

export interface DistrictLog {
  districtId: string;
  districtName: string;
  runId: string;
  status: 'success' | 'failed' | 'skipped';
  startedAt: Date;
  completedAt: Date;
  duration: number; // milliseconds
  contactsFound: number;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Tracks scraping progress in Firestore for monitoring and resume capability
 */
export class ProgressTracker {
  private db: admin.firestore.Firestore;
  private runId: string;
  private progressDoc: admin.firestore.DocumentReference;
  private startTime: number;

  constructor(db: admin.firestore.Firestore, runId?: string) {
    this.db = db;
    this.runId = runId || this.generateRunId();
    this.progressDoc = this.db.collection('scrape_progress').doc(this.runId);
    this.startTime = Date.now();
  }

  /**
   * Generates a unique run ID
   */
  private generateRunId(): string {
    const date = new Date().toISOString().split('T')[0];
    const random = Math.random().toString(36).substring(2, 8);
    return `run_${date}_${random}`;
  }

  /**
   * Initializes a new scraping run
   */
  async initializeRun(totalDistricts: number): Promise<void> {
    const progress: ScrapeProgress = {
      runId: this.runId,
      startedAt: new Date(),
      updatedAt: new Date(),
      status: 'running',
      stats: {
        total: totalDistricts,
        pending: totalDistricts,
        processing: 0,
        completed: 0,
        failed: 0,
      },
      errors: [],
    };

    await this.progressDoc.set(progress);
    console.log(`Initialized scraping run: ${this.runId}`);
  }

  /**
   * Updates the current district being processed
   */
  async startDistrict(district: District): Promise<void> {
    await this.progressDoc.update({
      currentDistrict: {
        id: district.id,
        name: district.name,
        startedAt: new Date(),
      },
      'stats.processing': admin.firestore.FieldValue.increment(1),
      'stats.pending': admin.firestore.FieldValue.increment(-1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Logs successful district completion
   */
  async completeDistrict(
    district: District,
    contactsFound: number,
    details?: Record<string, any>
  ): Promise<void> {
    const startedAt = new Date();
    const completedAt = new Date();
    
    // Log to district logs collection
    const log: DistrictLog = {
      districtId: district.id,
      districtName: district.name,
      runId: this.runId,
      status: 'success',
      startedAt,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      contactsFound,
      details,
    };

    await this.db.collection('district_logs').add(log);

    // Update progress
    await this.progressDoc.update({
      currentDistrict: admin.firestore.FieldValue.delete(),
      'stats.processing': admin.firestore.FieldValue.increment(-1),
      'stats.completed': admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Logs failed district
   */
  async failDistrict(district: District, error: string): Promise<void> {
    const errorEntry = {
      districtId: district.id,
      districtName: district.name,
      error,
      timestamp: new Date(),
    };

    // Log to district logs
    const log: DistrictLog = {
      districtId: district.id,
      districtName: district.name,
      runId: this.runId,
      status: 'failed',
      startedAt: new Date(),
      completedAt: new Date(),
      duration: 0,
      contactsFound: 0,
      error,
    };

    await this.db.collection('district_logs').add(log);

    // Update progress
    await this.progressDoc.update({
      currentDistrict: admin.firestore.FieldValue.delete(),
      'stats.processing': admin.firestore.FieldValue.increment(-1),
      'stats.failed': admin.firestore.FieldValue.increment(1),
      errors: admin.firestore.FieldValue.arrayUnion(errorEntry),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Marks the run as completed
   */
  async completeRun(): Promise<void> {
    await this.progressDoc.update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const duration = Date.now() - this.startTime;
    console.log(`Scraping run completed: ${this.runId} (${this.formatDuration(duration)})`);
  }

  /**
   * Marks the run as failed
   */
  async failRun(error: string): Promise<void> {
    await this.progressDoc.update({
      status: 'failed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      fatalError: error,
    });
  }

  /**
   * Gets the current progress
   */
  async getProgress(): Promise<ScrapeProgress | null> {
    const doc = await this.progressDoc.get();
    return doc.exists ? (doc.data() as ScrapeProgress) : null;
  }

  /**
   * Gets districts that need to be processed (for resume capability)
   */
  async getUnprocessedDistricts(): Promise<string[]> {
    // Get all districts
    const districtsSnapshot = await this.db
      .collection('districts')
      .where('status', 'in', ['pending', 'processing'])
      .get();

    // Get successfully processed districts from this run
    const logsSnapshot = await this.db
      .collection('district_logs')
      .where('runId', '==', this.runId)
      .where('status', '==', 'success')
      .get();

    const processedIds = new Set(logsSnapshot.docs.map(doc => doc.data().districtId));
    
    return districtsSnapshot.docs
      .map(doc => doc.id)
      .filter(id => !processedIds.has(id));
  }

  /**
   * Checks if a district was already processed in this run
   */
  async isDistrictProcessed(districtId: string): Promise<boolean> {
    const snapshot = await this.db
      .collection('district_logs')
      .where('runId', '==', this.runId)
      .where('districtId', '==', districtId)
      .where('status', '==', 'success')
      .limit(1)
      .get();

    return !snapshot.empty;
  }

  /**
   * Gets the latest run (for monitoring or resume)
   */
  static async getLatestRun(db: admin.firestore.Firestore): Promise<ScrapeProgress | null> {
    const snapshot = await db
      .collection('scrape_progress')
      .orderBy('startedAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as ScrapeProgress;
  }

  /**
   * Formats duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  /**
   * Gets the run ID
   */
  getRunId(): string {
    return this.runId;
  }
}