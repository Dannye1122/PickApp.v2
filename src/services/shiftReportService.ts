import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { setCachedData, getCachedData } from '../utils/quotaManager';
import { syncManager } from './syncManager';
import { shiftCacheService } from './shiftCacheService';
import { normalizeDateKey } from '../utils/dateUtils';
import { isBreakEntry, isNoteEntry, isPickEntry } from '../utils/statsUtils';

/**
 * Interface for a complete Shift Summary object
 */
export interface ShiftSummaryData {
  id?: string;
  docId?: string;
  userId?: string;
  userName: string;
  date: string; // ISO or YYYY-MM-DD
  clockInTime: number; // Unix timestamp ms
  clockOutTime: number; // Unix timestamp ms
  activeSeconds: number;
  totalSeconds: number;
  breakSeconds: number;
  totalCases: number;
  finalRate: number;
  peakRate?: number;
  steps: number;
  distanceKm?: number;
  department: string;
  zone?: string;
  storeLabel?: string;
  notes?: string;
  operatorNote?: string;
  timestamp?: { seconds: number };
  history: Array<{
    id?: string;
    type?: string;
    start: string;
    finish?: string;
    gap?: string;
    cases?: number | string;
    rate?: number | string;
    performance?: string;
    saved?: string;
    storeLabel?: string;
    departmentName?: string;
    department?: string;
    isNote?: boolean;
    breakTime?: string;
  }>;
}

/**
 * Format HH:MM:SS or HH:MM from seconds
 */
function formatTimeFromSecs(secs: number): string {
  if (isNaN(secs) || secs <= 0) return '00h 00m';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) {
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  }
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

/**
 * Generates a complete, comprehensive End of Shift report string.
 * Contains human-readable text/CSV plus a structured JSON restore payload at the bottom.
 */
export function generateFullShiftReport(shift: any): string {
  const operatorName = (shift.userName || shift.operator || 'UNKNOWN').toUpperCase().trim();
  const dateStr = shift.date || new Date(shift.clockInTime || Date.now()).toISOString().split('T')[0];
  
  const history = Array.isArray(shift.history) ? shift.history : [];
  const firstHistStart = history.length > 0 && history[0].start && history[0].start !== '--:--' ? history[0].start : null;
  const lastHistFinish = history.length > 0 && history[history.length - 1].finish && history[history.length - 1].finish !== '--:--' ? history[history.length - 1].finish : null;

  const rawClockIn = shift.firstStartTime || shift.startTime || firstHistStart;
  let clockInMs = shift.clockInTime;
  let clockInFormatted = rawClockIn;

  if (!clockInFormatted && clockInMs) {
    clockInFormatted = new Date(clockInMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (!clockInFormatted) {
    clockInFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (!clockInMs) {
    if (rawClockIn && dateStr) {
      try {
        const [h, m] = rawClockIn.split(':').map((x: string) => parseInt(x, 10));
        const d = new Date(dateStr);
        if (!isNaN(h) && !isNaN(m)) {
          d.setHours(h, m, 0, 0);
          clockInMs = d.getTime();
        }
      } catch (e) {
        clockInMs = Date.now();
      }
    } else {
      clockInMs = Date.now();
    }
  }

  let clockOutFormatted = shift.clockOutFormatted || lastHistFinish;
  let clockOutMs = shift.clockOutTime || (clockInMs && shift.totalSeconds ? clockInMs + shift.totalSeconds * 1000 : Date.now());
  if (!clockOutFormatted && clockOutMs) {
    clockOutFormatted = new Date(clockOutMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  const totalCases = shift.totalCases || shift.cases || 0;
  const appRate = shift.finalRate || shift.rate || 0;
  const systemRate = Math.round(appRate * 1.02);
  const steps = shift.steps || 0;
  const distKm = shift.distanceKm || (steps * 0.00075).toFixed(2);
  const dept = shift.department || 'ambient/aisle_3';
  const zone = shift.zone || 'AMBIENT';
  const storeLabel = shift.storeLabel || '';
  
  // Calculate Peak Rate
  const pickRates = history
    .filter((h: any) => isPickEntry(h) && typeof h.rate === 'number' && h.rate > 0)
    .map((h: any) => h.rate);
  const peakRate = shift.peakRate || (pickRates.length > 0 ? Math.max(...pickRates) : appRate);
  
  const activeSecs = shift.activeSeconds || shift.activeElapsedSeconds || 0;
  const breakSecs = shift.breakSeconds || 0;
  const totalSecs = shift.totalSeconds || (activeSecs + breakSecs) || 0;
  const shiftTimeStr = formatTimeFromSecs(totalSecs);

  let csv = "sep=,\n";
  csv += `"SUMMARY TYPE","DATA"\n`;
  csv += `"Operator","${operatorName}"\n`;
  csv += `"Date","${dateStr}"\n`;
  csv += `"Clock In Time","${clockInFormatted}"\n`;
  csv += `"Clock Out Time","${clockOutFormatted}"\n`;
  csv += `"Clock In Timestamp","${clockInMs}"\n`;
  csv += `"Clock Out Timestamp","${clockOutMs}"\n`;
  csv += `"App Rate","${appRate}"\n`;
  csv += `"System Rate","${systemRate}"\n`;
  csv += `"Total Cases","${totalCases}"\n`;
  csv += `"Steps","${steps}"\n`;
  csv += `"Distance Km","${distKm}"\n`;
  csv += `"Department","${dept}"\n`;
  csv += `"Zone","${zone}"\n`;
  csv += `"Store Label","${storeLabel}"\n`;
  csv += `"Peak Rate","${peakRate}"\n`;
  csv += `"Shift Time","${shiftTimeStr}"\n`;
  csv += `"Active Seconds","${activeSecs}"\n`;
  csv += `"Break Seconds","${breakSecs}"\n`;
  csv += `"Total Seconds","${totalSecs}"\n\n`;

  csv += `"HISTORY TYPE","LOG"\n`;
  csv += `Type,Start Time,Finish Time,Gap,Cases,Rate,Performance,Store Label,Department\n`;

  history.forEach((h: any) => {
    const isBreak = isBreakEntry(h);
    const isNote = isNoteEntry(h);
    const type = isBreak ? 'BREAK' : (isNote ? 'NOTE' : 'PICK');
    const start = h.start || '--:--';
    const finish = h.finish || '--:--';
    const gap = isBreak ? (h.gap?.toUpperCase().includes('DINNER') ? 'DINNER BREAK' : 'BREAK') : (isNote ? '-' : (h.gap || '-'));
    const cases = (isBreak || isNote || h.cases === 0 || h.cases === '-') ? '-' : h.cases;
    const rateVal = (isBreak || isNote || h.rate === 0 || h.rate === '-') ? '-' : h.rate;
    const perf = isBreak ? (h.breakTime || h.saved || '-') : (isNote ? (h.storeLabel || '-') : (h.saved || h.performance || '-'));
    const itemLabel = (h.storeLabel || storeLabel || '-').replace(/"/g, '""');
    const itemDept = (h.departmentName || h.department || dept || '-').replace(/"/g, '""');

    csv += `${type},${start},${finish},${gap},${cases},${rateVal},"${perf}","${itemLabel}","${itemDept}"\n`;
  });

  // Prepare full restore JSON object payload
  const restorePayload: ShiftSummaryData = {
    docId: `${operatorName}_${clockInMs}`,
    id: `${operatorName}_${clockInMs}`,
    userId: operatorName,
    userName: operatorName,
    date: dateStr,
    clockInTime: clockInMs,
    clockOutTime: clockOutMs,
    activeSeconds: activeSecs,
    totalSeconds: totalSecs,
    breakSeconds: breakSecs,
    totalCases: totalCases,
    finalRate: appRate,
    peakRate: peakRate,
    steps: steps,
    distanceKm: parseFloat(distKm.toString()),
    department: dept,
    zone: zone,
    storeLabel: storeLabel,
    timestamp: { seconds: Math.floor(clockOutMs / 1000) },
    history: history
  };

  csv += `\n"RESTORE_PAYLOAD_JSON",${JSON.stringify(restorePayload)}\n`;

  return csv;
}

/**
 * Copies the complete shift report string to clipboard.
 */
export async function copyFullShiftReport(shift: any): Promise<boolean> {
  try {
    const text = generateFullShiftReport(shift);
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy shift report to clipboard:', err);
    return false;
  }
}

/**
 * Restores a shift from pasted report text/CSV or JSON.
 * Returns the reconstructed ShiftSummaryData and persists it across IndexedDB, LocalStorage, Quota Cache, and Firestore.
 */
export async function restoreShiftFromReportText(
  reportText: string,
  overrideUserName?: string
): Promise<{ success: boolean; summary?: ShiftSummaryData; message: string }> {
  try {
    if (!reportText || !reportText.trim()) {
      return { success: false, message: 'Report text is empty.' };
    }

    let parsedSummary: Partial<ShiftSummaryData> | null = null;

    // 1. Check for embedded RESTORE_PAYLOAD_JSON
    if (reportText.includes('"RESTORE_PAYLOAD_JSON"')) {
      const idx = reportText.indexOf('"RESTORE_PAYLOAD_JSON"');
      const jsonStart = reportText.indexOf('{', idx);
      if (jsonStart !== -1) {
        const jsonEnd = reportText.lastIndexOf('}');
        if (jsonEnd > jsonStart) {
          try {
            const jsonStr = reportText.substring(jsonStart, jsonEnd + 1);
            parsedSummary = JSON.parse(jsonStr);
          } catch (e) {
            console.warn('Could not parse embedded RESTORE_PAYLOAD_JSON, falling back to CSV line parser:', e);
          }
        }
      }
    }

    // 2. Fallback: Parse CSV Key-Value pairs and History table lines
    if (!parsedSummary || !parsedSummary.userName || !parsedSummary.history) {
      const lines = reportText.split('\n').map(l => l.trim()).filter(Boolean);
      
      const metaMap: Record<string, string> = {};
      const historyRows: any[] = [];
      let inHistorySection = false;
      let historyHeaderSeen = false;

      lines.forEach(line => {
        if (line.includes('HISTORY TYPE') || line.includes('PICK HISTORY')) {
          inHistorySection = true;
          return;
        }

        if (!inHistorySection) {
          // Parse CSV key-value lines like `"Operator","DASERGHIE"` or `Operator,2026-08-16...`
          const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim());
          if (parts.length >= 2) {
            const key = parts[0];
            const val = parts[1];
            if (key && val) {
              metaMap[key.toLowerCase()] = val;
            }
          }
        } else {
          // Parse History lines
          if (line.startsWith('Type,') || line.startsWith('"Type",') || line.includes('Time/Start')) {
            historyHeaderSeen = true;
            return;
          }

          const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim());
          if (parts.length >= 4) {
            const type = parts[0].toUpperCase();
            const start = parts[1] || '--:--';
            const finish = parts.length >= 8 ? parts[2] : '';
            const gap = parts.length >= 8 ? parts[3] : parts[2];
            const casesStr = parts.length >= 8 ? parts[4] : parts[3];
            const rateStr = parts.length >= 8 ? parts[5] : parts[4];
            const perf = parts.length >= 8 ? parts[6] : parts[5];
            const itemLabel = parts.length >= 8 ? parts[7] : '';
            const itemDept = parts.length >= 9 ? parts[8] : '';

            const cases = parseInt(casesStr, 10) || 0;
            const rate = parseInt(rateStr, 10) || 0;

            historyRows.push({
              id: `hist_${Date.now()}_${historyRows.length}`,
              type: type,
              start: start,
              finish: finish || start,
              gap: gap,
              cases: cases,
              rate: rate,
              performance: perf,
              saved: perf,
              storeLabel: itemLabel,
              departmentName: itemDept
            });
          }
        }
      });

      const opName = overrideUserName || metaMap['operator'] || metaMap['user'] || 'DASERGHIE';
      const dateVal = metaMap['date'] || new Date().toISOString().split('T')[0];
      const clockInMs = metaMap['clock in timestamp'] ? parseInt(metaMap['clock in timestamp'], 10) : (metaMap['clockintime'] ? parseInt(metaMap['clockintime'], 10) : Date.now());
      const clockOutMs = metaMap['clock out timestamp'] ? parseInt(metaMap['clock out timestamp'], 10) : (clockInMs + 28000 * 1000);
      
      const totalCases = parseInt(metaMap['total cases'] || metaMap['cases'] || '0', 10) || historyRows.reduce((sum, h) => sum + (h.cases || 0), 0);
      const appRate = parseInt(metaMap['app rate'] || metaMap['rate'] || '0', 10) || 200;
      const steps = parseInt(metaMap['steps'] || '0', 10);
      const dist = parseFloat(metaMap['distance km'] || metaMap['distance'] || (steps * 0.00075).toFixed(2));
      const dept = metaMap['department'] || metaMap['dept'] || 'ambient/aisle_3';
      const zone = metaMap['zone'] || 'AMBIENT';
      const storeLabel = metaMap['store label'] || '';
      const activeSecs = parseInt(metaMap['active seconds'] || '27000', 10);
      const breakSecs = parseInt(metaMap['break seconds'] || '1800', 10);
      const totalSecs = parseInt(metaMap['total seconds'] || String(activeSecs + breakSecs), 10);

      parsedSummary = {
        userName: opName.toUpperCase().trim(),
        date: dateStrStandardize(dateVal),
        clockInTime: clockInMs,
        clockOutTime: clockOutMs,
        activeSeconds: activeSecs,
        totalSeconds: totalSecs,
        breakSeconds: breakSecs,
        totalCases: totalCases,
        finalRate: appRate,
        peakRate: parseInt(metaMap['peak rate'] || String(appRate), 10),
        steps: steps,
        distanceKm: dist,
        department: dept,
        zone: zone,
        storeLabel: storeLabel,
        history: historyRows
      };
    }

    if (!parsedSummary.userName || !parsedSummary.clockInTime) {
      return { success: false, message: 'Report text missing valid operator name or timestamp.' };
    }

    const safeUserName = (overrideUserName || parsedSummary.userName).toUpperCase().trim();
    const docId = parsedSummary.docId || `${safeUserName}_${parsedSummary.clockInTime}`;

    const completeSummary: ShiftSummaryData = {
      docId: docId,
      id: docId,
      userId: safeUserName,
      userName: safeUserName,
      date: parsedSummary.date || new Date(parsedSummary.clockInTime!).toISOString().split('T')[0],
      clockInTime: parsedSummary.clockInTime!,
      clockOutTime: parsedSummary.clockOutTime || (parsedSummary.clockInTime! + (parsedSummary.totalSeconds || 27000) * 1000),
      activeSeconds: parsedSummary.activeSeconds || 27000,
      totalSeconds: parsedSummary.totalSeconds || 27000,
      breakSeconds: parsedSummary.breakSeconds || 0,
      totalCases: parsedSummary.totalCases || 0,
      finalRate: parsedSummary.finalRate || 0,
      peakRate: parsedSummary.peakRate || parsedSummary.finalRate || 0,
      steps: parsedSummary.steps || 0,
      distanceKm: parsedSummary.distanceKm || parseFloat(((parsedSummary.steps || 0) * 0.00075).toFixed(2)),
      department: parsedSummary.department || 'ambient/aisle_3',
      zone: parsedSummary.zone || 'AMBIENT',
      storeLabel: parsedSummary.storeLabel || '',
      timestamp: { seconds: Math.floor((parsedSummary.clockOutTime || Date.now()) / 1000) },
      history: parsedSummary.history || []
    };

    // Update in-memory ShiftCacheService directly (v2.1.0)
    const record = shiftCacheService.convertSummaryToShiftRecord(completeSummary, docId);
    shiftCacheService.setCachedShift(record);

    // Update Quota Manager Cache
    const cacheKey = `shiftsummaries_${safeUserName}`;
    const cachedList = getCachedData<any[]>(cacheKey) || [];
    const cacheIdx = cachedList.findIndex(s => s.docId === docId || s.clockInTime === completeSummary.clockInTime);
    if (cacheIdx >= 0) {
      cachedList[cacheIdx] = completeSummary;
    } else {
      cachedList.unshift(completeSummary);
    }
    setCachedData(cacheKey, cachedList);

    // Save to Firestore DB via direct setDoc AND syncManager queue
    try {
      const docRef = doc(db, 'shift_summaries', docId);
      await setDoc(docRef, completeSummary, { merge: true });
    } catch (e) {
      console.warn('Firestore setDoc restore direct attempt:', e);
    }

    try {
      syncManager.enqueue('shiftSummary', { docId, summaryData: completeSummary });
      syncManager.sync();
    } catch (e) {
      console.warn('syncManager restore enqueue:', e);
    }

    return {
      success: true,
      summary: completeSummary,
      message: `Shift for ${completeSummary.date} (${completeSummary.totalCases} cases @ ${completeSummary.finalRate} P/H) restored successfully!`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to restore shift: ${err?.message || String(err)}`
    };
  }
}

function dateStrStandardize(val: string): string {
  return normalizeDateKey(val);
}
