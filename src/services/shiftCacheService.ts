/**
 * PickApp v2.1.0 In-Memory Shift Cache & Query Optimizer
 * Single Source of Truth: Firebase Firestore with Zero-Redundant-Read Memory Caching.
 * Protects Firebase Free Tier limits (50k daily reads) by caching monthly datasets in memory.
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getLocalDateString, ShiftSummary } from './leaderboardService';
import { compressImage } from '../lib/imageCompressor';
import { normalizeDateKey } from '../utils/dateUtils';

export interface ShiftRecord {
  id: string;
  date: string; // YYYY-MM-DD
  userId?: string;
  userName: string;
  department: string;
  zone?: string;
  totalCases: number;
  appRate: number;
  systemRate: number;
  finalRate: number;
  peakRate?: number;
  activeSeconds: number;
  totalSeconds: number;
  breakSeconds: number;
  shiftTime: string; // "07h 30m"
  steps: number;
  distanceKm: number;
  history: any[];
  storeLabel?: string;
  clockInTime: number;
  clockOutTime: number;
  operatorNote?: string;
  notes?: string;
  labelPhotos?: string[]; // IDs or lazy-loaded URLs
  rawPhotoBlobs?: any[];
  updatedAt?: number;
}

export interface ShiftPhotoRecord {
  photoId: string;
  shiftDate: string; // YYYY-MM-DD
  userId?: string;
  userName: string;
  blob: string;
  orderIndex?: number;
  type?: 'label' | 'proof' | 'order';
  createdAt?: any;
}

class ShiftCacheService {
  private static instance: ShiftCacheService;

  // In-Memory Monthly Cache: Key format: "USERNAME_YYYY-MM"
  private monthCache = new Map<string, ShiftRecord[]>();

  // In-Memory Photo Cache: Key format: "USERNAME_YYYY-MM-DD"
  private photoCache = new Map<string, ShiftPhotoRecord[]>();

  private constructor() {}

  public static getInstance(): ShiftCacheService {
    if (!ShiftCacheService.instance) {
      ShiftCacheService.instance = new ShiftCacheService();
    }
    return ShiftCacheService.instance;
  }

  /**
   * Generates cache key for a user and month
   */
  private getMonthKey(userName: string, year: number, month: number): string {
    const safeUser = (userName || 'DEFAULT').toUpperCase().trim();
    const monthStr = month.toString().padStart(2, '0');
    return `${safeUser}_${year}-${monthStr}`;
  }

  /**
   * Generates photo cache key
   */
  private getPhotoKey(userName: string, dateStr: string): string {
    const safeUser = (userName || 'DEFAULT').toUpperCase().trim();
    const normDate = normalizeDateKey(dateStr);
    return `${safeUser}_${normDate}`;
  }

  /**
   * Invalidate in-memory cache (e.g. on manual pull-to-refresh or shift mutation)
   */
  public invalidateCache(userName?: string, yearMonth?: string): void {
    if (userName && yearMonth) {
      const key = `${userName.toUpperCase().trim()}_${yearMonth}`;
      this.monthCache.delete(key);
    } else if (userName) {
      const prefix = `${userName.toUpperCase().trim()}_`;
      for (const k of Array.from(this.monthCache.keys())) {
        if (k.startsWith(prefix)) {
          this.monthCache.delete(k);
        }
      }
      for (const k of Array.from(this.photoCache.keys())) {
        if (k.startsWith(prefix)) {
          this.photoCache.delete(k);
        }
      }
    } else {
      this.monthCache.clear();
      this.photoCache.clear();
    }
  }

  /**
   * Directly inject or update a shift in the in-memory cache
   */
  public setCachedShift(shift: ShiftRecord): void {
    const normDate = normalizeDateKey(shift.date);
    const parts = normDate.split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const key = this.getMonthKey(shift.userName, year, month);

      const existingList = this.monthCache.get(key) || [];
      const idx = existingList.findIndex(s => normalizeDateKey(s.date) === normDate);
      if (idx >= 0) {
        existingList[idx] = shift;
      } else {
        existingList.push(shift);
        existingList.sort((a, b) => b.date.localeCompare(a.date));
      }
      this.monthCache.set(key, existingList);
    }
  }

  /**
   * Query all shifts for a specific calendar month.
   * Utilizes in-memory cache first (0 Firestore reads on repeated views).
   * Fires exactly ONE bounded query to Firestore if not present in memory.
   */
  public async getMonthShifts(year: number, month: number, userName?: string, forceRefresh: boolean = false): Promise<ShiftRecord[]> {
    const currentName = (userName || localStorage.getItem('lastUser') || 'default').toUpperCase().trim();
    const cacheKey = this.getMonthKey(currentName, year, month);

    // 1. Return from Memory Cache if available
    if (!forceRefresh && this.monthCache.has(cacheKey)) {
      return this.monthCache.get(cacheKey)!;
    }

    // 2. Query Firestore once with bounded date range
    const monthStr = month.toString().padStart(2, '0');
    const startOfMonth = `${year}-${monthStr}-01`;
    const endOfMonth = `${year}-${monthStr}-31`;

    const shiftsMap = new Map<string, ShiftRecord>();

    try {
      const nameVariants = Array.from(new Set([
        currentName,
        currentName.toLowerCase(),
        currentName.charAt(0).toUpperCase() + currentName.slice(1).toLowerCase()
      ]));

      // Query shift_summaries collection bounded by date range
      const q = query(
        collection(db, 'shift_summaries'),
        where('userName', 'in', nameVariants.slice(0, 10)),
        where('date', '>=', startOfMonth),
        where('date', '<=', endOfMonth)
      );

      const snapshot = await getDocs(q);
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as ShiftSummary;
        const normDate = normalizeDateKey(data.date);
        if (normDate.startsWith(`${year}-${monthStr}`)) {
          const record = this.convertSummaryToShiftRecord(data, docSnap.id);
          const existing = shiftsMap.get(normDate);
          if (!existing || (record.totalCases || 0) >= (existing.totalCases || 0)) {
            shiftsMap.set(normDate, record);
          }
        }
      });
    } catch (e) {
      console.warn('Firestore getMonthShifts query error:', e);
    }

    const result = Array.from(shiftsMap.values()).sort((a, b) => b.date.localeCompare(a.date));
    
    // Store in Memory Cache
    this.monthCache.set(cacheKey, result);
    return result;
  }

  /**
   * Get shift by specific date (YYYY-MM-DD)
   */
  public async getShiftByDate(dateStr: string, userName?: string): Promise<ShiftRecord | null> {
    const normDate = normalizeDateKey(dateStr);
    const parts = normDate.split('-');
    if (parts.length < 2) return null;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const monthShifts = await this.getMonthShifts(year, month, userName);
    return monthShifts.find(s => normalizeDateKey(s.date) === normDate) || null;
  }

  /**
   * Save a shift directly to Firebase Firestore
   */
  public async saveShiftToFirestore(
    summary: ShiftSummary,
    photos: ShiftPhotoRecord[] = []
  ): Promise<{ success: boolean; record: ShiftRecord }> {
    const safeUser = (summary.userName || 'DEFAULT').toUpperCase().trim();
    const dateStr = normalizeDateKey(summary.date || summary.clockInTime);
    const uid = auth.currentUser?.uid || 'anon';
    const baseTime = summary.clockInTime || Date.now();
    const docId = `${uid}_${baseTime}`;

    const shiftRecord = this.convertSummaryToShiftRecord(summary, docId);

    // 1. Save Shift Document to Firestore 'shift_summaries'
    try {
      const summaryDocRef = doc(db, 'shift_summaries', docId);
      await setDoc(summaryDocRef, {
        ...summary,
        userId: uid,
        userName: safeUser,
        date: dateStr,
        timestamp: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('Firestore save shift_summaries failed:', err);
      throw err;
    }

    // 2. Save Label Photos directly to Firestore 'shift_photos'
    if (photos && photos.length > 0) {
      await this.saveShiftPhotos(photos, dateStr, safeUser);
    }

    // 3. Update In-Memory Cache immediately
    this.setCachedShift(shiftRecord);

    return { success: true, record: shiftRecord };
  }

  /**
   * Save Shift Photos directly to Firebase Firestore 'shift_photos'
   */
  public async saveShiftPhotos(photos: ShiftPhotoRecord[], shiftDate: string, userName: string): Promise<void> {
    const safeUser = userName.toUpperCase().trim();
    const normDate = normalizeDateKey(shiftDate);

    const savedRecords: ShiftPhotoRecord[] = [];

    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      let compressedBlob = typeof p.blob === 'string' ? p.blob : '';
      if (typeof p.blob === 'string' && p.blob.startsWith('data:image')) {
        try {
          compressedBlob = await compressImage(p.blob, 800, 0.7);
        } catch {
          compressedBlob = p.blob;
        }
      }

      const photoId = p.photoId || `photo_${normDate}_${safeUser}_${i}_${Date.now()}`;
      const photoDocRef = doc(db, 'shift_photos', photoId);

      const record: ShiftPhotoRecord = {
        photoId,
        shiftDate: normDate,
        userName: safeUser,
        blob: compressedBlob,
        orderIndex: p.orderIndex ?? i,
        type: p.type || 'label'
      };

      try {
        await setDoc(photoDocRef, {
          ...record,
          createdAt: serverTimestamp()
        }, { merge: true });
        savedRecords.push(record);
      } catch (err) {
        console.warn('Failed saving photo to Firestore:', err);
      }
    }

    // Update in-memory photo cache
    const photoKey = this.getPhotoKey(safeUser, normDate);
    const existing = this.photoCache.get(photoKey) || [];
    this.photoCache.set(photoKey, [...existing, ...savedRecords]);
  }

  /**
   * Lazy-load photos for a specific shift on demand from Firestore
   */
  public async getShiftPhotos(shiftDate: string, userName?: string): Promise<ShiftPhotoRecord[]> {
    const currentName = (userName || localStorage.getItem('lastUser') || 'default').toUpperCase().trim();
    const normDate = normalizeDateKey(shiftDate);
    const photoKey = this.getPhotoKey(currentName, normDate);

    // 1. Check in-memory photo cache first
    if (this.photoCache.has(photoKey)) {
      return this.photoCache.get(photoKey)!;
    }

    // 2. Query Firestore 'shift_photos'
    const nameVariants = Array.from(new Set([
      currentName,
      currentName.toLowerCase(),
      currentName.charAt(0).toUpperCase() + currentName.slice(1).toLowerCase()
    ]));

    try {
      const q = query(
        collection(db, 'shift_photos'),
        where('shiftDate', '==', normDate),
        where('userName', 'in', nameVariants.slice(0, 10))
      );

      const snap = await getDocs(q);
      const photos: ShiftPhotoRecord[] = [];
      snap.forEach(d => {
        photos.push(d.data() as ShiftPhotoRecord);
      });

      this.photoCache.set(photoKey, photos);
      return photos;
    } catch (e) {
      console.warn('Error fetching photos from Firestore:', e);
      return [];
    }
  }

  /**
   * Delete shift from Firestore and invalidate cache
   */
  public async deleteShift(docId: string, dateStr: string, userName: string): Promise<boolean> {
    const safeUser = userName.toUpperCase().trim();
    try {
      const docRef = doc(db, 'shift_summaries', docId);
      await deleteDoc(docRef);

      // Invalidate memory cache
      this.invalidateCache(safeUser);
      return true;
    } catch (e) {
      console.error('Delete shift error:', e);
      return false;
    }
  }

  /**
   * Convert Firestore ShiftSummary to ShiftRecord
   */
  public convertSummaryToShiftRecord(summary: any, fallbackId?: string): ShiftRecord {
    const normDate = normalizeDateKey(summary.date || summary.clockInTime);
    const uName = (summary.userName || 'DEFAULT').toUpperCase().trim();
    const cases = summary.totalCases || summary.cases || 0;
    const activeSec = summary.activeSeconds || summary.activeElapsedSeconds || 1;
    const totalSec = summary.totalSeconds || activeSec;
    const appRate = summary.finalRate || summary.rate || (activeSec > 10 ? Math.round((cases / activeSec) * 3600) : 0);
    const steps = summary.steps || 0;

    return {
      id: summary.docId || summary.id || fallbackId || `${uName}_${normDate}`,
      date: normDate,
      userName: uName,
      department: summary.department || 'Aisles (300 / 350)',
      zone: summary.zone || 'AMBIENT',
      totalCases: cases,
      appRate,
      systemRate: Math.round(appRate * 1.02),
      finalRate: appRate,
      peakRate: summary.peakRate || appRate,
      activeSeconds: activeSec,
      totalSeconds: totalSec,
      breakSeconds: summary.breakSeconds || Math.max(0, totalSec - activeSec),
      shiftTime: this.formatDuration(totalSec),
      steps,
      distanceKm: parseFloat(((steps || 0) * 0.00075).toFixed(2)),
      history: Array.isArray(summary.history) ? summary.history : [],
      storeLabel: summary.storeLabel || '',
      clockInTime: summary.clockInTime || Date.now(),
      clockOutTime: summary.clockOutTime || Date.now(),
      operatorNote: summary.operatorNote || summary.notes || '',
      notes: summary.notes || summary.operatorNote || ''
    };
  }

  private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  }
}

export const shiftCacheService = ShiftCacheService.getInstance();
export default shiftCacheService;
