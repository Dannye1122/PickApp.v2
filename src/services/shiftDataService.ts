/**
 * PickApp v2.2.0 Master ShiftDataService
 * Single Source of Truth: Firebase Firestore with In-Memory Query Optimization.
 * Universal Date Normalization & Cache Key Enforcement.
 */

import { shiftCacheService, ShiftRecord, ShiftPhotoRecord } from './shiftCacheService';
import { ShiftSummary, getLocalDateString } from './leaderboardService';

export type { ShiftRecord, ShiftPhotoRecord };

/**
 * Universal Date Parser & Key Normalizer (v2.2.0)
 * Standardizes any input date (ISO, DD/MM/YYYY, MM/DD/YYYY, Date object, timestamp)
 * into a canonical "YYYY-MM-DD" string key.
 */
export function normalizeDateKey(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Handle Date object
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    const y = dateInput.getFullYear();
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const d = String(dateInput.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Handle numeric timestamp
  if (typeof dateInput === 'number') {
    const ms = dateInput > 1e11 ? dateInput : dateInput * 1000;
    const dt = new Date(ms);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(dateInput).trim();
  if (!str) {
    return new Date().toISOString().split('T')[0];
  }

  // Handle ISO string with time (e.g. 2026-08-16T20:24:00.000Z)
  const dateOnly = str.includes('T') ? str.split('T')[0] : str.split(' ')[0];

  // Split by common delimiters (-, /, .)
  const parts = dateOnly.split(/[-/.]/);

  if (parts.length === 3) {
    // Case 1: YYYY-MM-DD or YYYY/MM/DD
    if (parts[0].length === 4) {
      const year = parts[0];
      const month = String(parseInt(parts[1], 10) || 1).padStart(2, '0');
      const day = String(parseInt(parts[2], 10) || 1).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Case 2: DD-MM-YYYY or MM-DD-YYYY
    if (parts[2].length === 4) {
      const year = parts[2];
      const num1 = parseInt(parts[0], 10);
      const num2 = parseInt(parts[1], 10);

      let day = num1;
      let month = num2;

      // Disambiguate day vs month
      if (num1 > 12 && num2 <= 12) {
        // Must be DD/MM/YYYY
        day = num1;
        month = num2;
      } else if (num2 > 12 && num1 <= 12) {
        // Must be MM/DD/YYYY
        month = num1;
        day = num2;
      } else {
        // Default to DD/MM/YYYY (UK/European industrial standard)
        day = num1;
        month = num2;
      }

      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Fallback attempt via native Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return dateOnly;
}

class ShiftDataService {
  /**
   * Normalize date key helper
   */
  public normalizeDateKey(dateInput: string | Date | number | null | undefined): string {
    return normalizeDateKey(dateInput);
  }

  /**
   * Helper to format seconds to HH:MM:SS or HHh MMm
   */
  public formatDuration(totalSeconds: number): string {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
    }
    return `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }

  /**
   * Format distance from steps (approx 0.75m per step)
   */
  public calculateDistanceKm(steps: number): number {
    return Math.round(((steps * 0.75) / 1000) * 100) / 100;
  }

  /**
   * Single Source of Truth: Get shift record by date (YYYY-MM-DD)
   * Reads from the in-memory cache (or bounded single monthly Firestore query).
   */
  public async getByDate(dateInput: string | Date, userName?: string): Promise<ShiftRecord | null> {
    const dateStr = normalizeDateKey(dateInput);
    return shiftCacheService.getShiftByDate(dateStr, userName);
  }

  /**
   * Get all shifts for a specific calendar month
   */
  public async getMonthShifts(year: number, month: number, userName?: string, forceRefresh: boolean = false): Promise<ShiftRecord[]> {
    return shiftCacheService.getMonthShifts(year, month, userName, forceRefresh);
  }

  /**
   * Get all photos for a shift by date (lazy loaded on demand from Firestore)
   */
  public async getPhotosByShiftDate(dateInput: string | Date, userName?: string): Promise<ShiftPhotoRecord[]> {
    const dateStr = normalizeDateKey(dateInput);
    return shiftCacheService.getShiftPhotos(dateStr, userName);
  }

  /**
   * Master Shift Finalization (v2.2.0)
   * Saves Shift and photos directly to Firebase Firestore, updating the in-memory cache immediately.
   */
  public async finalizeShift(
    rawShift: any, 
    rawPhotos: Array<{ photoId?: string; blob: string | Blob; orderIndex?: number; type?: 'label' | 'proof' | 'order' }> = []
  ): Promise<{ success: boolean; record?: ShiftRecord; error?: string }> {
    try {
      const userName = (rawShift.userName || rawShift.operator || localStorage.getItem('lastUser') || 'DEFAULT').toUpperCase().trim();
      const dateStr = normalizeDateKey(rawShift.date || rawShift.clockInTime);
      
      const photoRecords: ShiftPhotoRecord[] = rawPhotos.map((p, idx) => ({
        photoId: p.photoId || `photo_${dateStr}_${userName}_${idx}`,
        shiftDate: dateStr,
        userName,
        blob: typeof p.blob === 'string' ? p.blob : '',
        orderIndex: p.orderIndex ?? idx,
        type: p.type || 'label'
      }));

      const summaryPayload: ShiftSummary = {
        userId: userName,
        userName,
        department: rawShift.department || 'Aisles (300 / 350)',
        zone: rawShift.zone || 'AMBIENT',
        totalCases: rawShift.totalCases || rawShift.cases || 0,
        finalRate: rawShift.finalRate || rawShift.rate || 0,
        activeSeconds: rawShift.activeSeconds || rawShift.activeElapsedSeconds || 0,
        totalSeconds: rawShift.totalSeconds || rawShift.totalDurationSeconds || 0,
        breakSeconds: rawShift.breakSeconds || 0,
        steps: rawShift.steps || 0,
        date: dateStr,
        history: rawShift.history || [],
        storeLabel: rawShift.storeLabel || '',
        clockInTime: rawShift.clockInTime || Date.now(),
        clockOutTime: rawShift.clockOutTime || Date.now(),
        operatorNote: rawShift.operatorNote || rawShift.notes || '',
        notes: rawShift.notes || rawShift.operatorNote || '',
        timestamp: { seconds: Math.floor((rawShift.clockOutTime || Date.now()) / 1000) }
      };

      const result = await shiftCacheService.saveShiftToFirestore(summaryPayload, photoRecords);
      return { success: true, record: result.record };
    } catch (err: any) {
      console.error('Master finalizeShift failed:', err);
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Delete shift from Firestore & in-memory cache
   */
  public async deleteShift(docId: string, dateInput: string | Date, userName: string): Promise<boolean> {
    const dateStr = normalizeDateKey(dateInput);
    return shiftCacheService.deleteShift(docId, dateStr, userName);
  }

  /**
   * Invalidate cache
   */
  public invalidateCache(userName?: string, yearMonth?: string): void {
    shiftCacheService.invalidateCache(userName, yearMonth);
  }
}

export const shiftDataService = new ShiftDataService();
export default shiftDataService;
