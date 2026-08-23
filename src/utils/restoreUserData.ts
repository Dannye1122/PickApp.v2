import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { setCachedData } from '../utils/quotaManager';
import { shiftCacheService } from '../services/shiftCacheService';

export const RESTORED_SHIFTS = [
  {
    docId: 'DASERGHIE_1770236820000',
    id: 'DASERGHIE_1770236820000',
    userId: 'DASERGHIE',
    userName: 'DASERGHIE',
    date: '2026-08-07',
    clockInTime: 1770236820000, // 20:27 06/08/2026
    clockOutTime: 1770264720000, // 04:12 07/08/2026 (07h 45m)
    activeSeconds: 27900,
    totalSeconds: 27900,
    breakSeconds: 917,
    totalCases: 1483,
    finalRate: 220,
    peakRate: 334,
    steps: 623,
    distanceKm: 0.47,
    department: 'ambient/aisle_3',
    zone: 'AMBIENT',
    storeLabel: 'AISLE 3, AISLES',
    timestamp: { seconds: Math.floor(1770264720000 / 1000) },
    history: [
      { id: '0608_1', type: 'PICK', start: '21:01', finish: '21:32', gap: '16s', cases: 167, rate: 322, performance: '+14:26', storeLabel: 'AISLES (300 / 350)', departmentName: 'AISLES (300 / 350)' },
      { id: '0608_2', type: 'PICK', start: '21:33', finish: '21:45', gap: '7s', cases: 31, rate: 142, performance: '-4:38', storeLabel: 'AISLES (300 / 350)', departmentName: 'AISLES (300 / 350)' },
      { id: '0608_3', type: 'PICK', start: '21:46', finish: '22:27', gap: '6s', cases: 203, rate: 287, performance: '+12:58', storeLabel: 'AISLES (300 / 350)', departmentName: 'AISLES (300 / 350)' },
      { id: '0608_4', type: 'PICK', start: '22:28', finish: '23:26', gap: '9s', cases: 200, rate: 207, performance: '-3:22', storeLabel: 'AISLES (300 / 350)', departmentName: 'AISLES (300 / 350)' },
      { id: '0608_5', type: 'PICK', start: '23:27', finish: '00:09', gap: '26s', cases: 171, rate: 239, performance: '+3:46', storeLabel: 'AISLE 3 - (303 / 353)', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '0608_6', type: 'PICK', start: '00:10', finish: '01:37', gap: '18s', cases: 202, rate: 137, performance: '-33:19', storeLabel: 'AISLE 3 - (303 / 353)', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '0608_7', type: 'PICK', start: '01:38', finish: '02:30', gap: '15s', cases: 108, rate: 125, performance: '-22:26', storeLabel: 'AISLE 3 - (303 / 353)', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '0608_8', type: 'PICK', start: '02:31', finish: '03:06', gap: '7s', cases: 200, rate: 334, performance: '+18:38', storeLabel: 'AISLE 3 - (303 / 353)', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '0608_9', type: 'PICK', start: '03:07', finish: '03:57', gap: '7s', cases: 201, rate: 243, performance: '+5:09', storeLabel: 'AISLE 3 - (303 / 353)', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '0608_10', type: 'BREAK', start: '20:46', finish: '21:01', gap: 'BREAK', cases: 0, rate: 0, breakTime: '15:17' }
    ]
  },
  {
    docId: 'DASERGHIE_1771100640000',
    id: 'DASERGHIE_1771100640000',
    userId: 'DASERGHIE',
    userName: 'DASERGHIE',
    date: '2026-08-16',
    clockInTime: 1771100640000, // 20:24 16/08/2026
    clockOutTime: 1771127729000, // 03:55 17/08/2026 (07h 31m 29s)
    activeSeconds: 27089,
    totalSeconds: 27089,
    breakSeconds: 2092,
    totalCases: 1368,
    finalRate: 221,
    peakRate: 314,
    steps: 1045,
    distanceKm: 0.78,
    department: 'ambient/aisle_3',
    zone: 'AMBIENT',
    storeLabel: 'Aisle 3 A03',
    timestamp: { seconds: Math.floor(1771127729000 / 1000) },
    history: [
      { id: '1608_1', type: 'PICK', start: '20:37', finish: '21:10', gap: '12m 58s', cases: 178, rate: 314, performance: '+16:47', storeLabel: 'Aisle 3 A03', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '1608_2', type: 'PICK', start: '21:11', finish: '21:31', gap: '24s', cases: 70, rate: 212, performance: '+0:12', storeLabel: 'Aisle 3 A03', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '1608_3', type: 'PICK', start: '21:32', finish: '21:46', gap: '19s', cases: 54, rate: 218, performance: '+0:35', storeLabel: 'Aisle 3 A03', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '1608_4', type: 'PICK', start: '21:47', finish: '22:08', gap: '33s', cases: 107, rate: 292, performance: '+8:37', storeLabel: 'Aisle 3 A03', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '1608_5', type: 'PICK', start: '22:09', finish: '22:31', gap: '23s', cases: 97, rate: 266, performance: '+5:48', storeLabel: 'Aisle 3 A03', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '1608_6', type: 'PICK', start: '22:32', finish: '23:19', gap: '30s', cases: 81, rate: 102, performance: '-24:37', storeLabel: 'Aisle 3 A03', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '1608_7', type: 'PICK', start: '23:20', finish: '23:47', gap: '28s', cases: 132, rate: 287, performance: '+10:06', storeLabel: 'Aisle 3 A03', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '1608_8', type: 'PICK', start: '23:48', finish: '00:24', gap: '25s', cases: 182, rate: 295, performance: '+15:01', storeLabel: 'Aisle 3 A03', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '1608_9', type: 'PICK', start: '00:25', finish: '00:36', gap: '32s', cases: 39, rate: 209, performance: '-0:03', storeLabel: 'Aisle 3 A03', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '1608_10', type: 'PICK', start: '00:37', finish: '00:46', gap: '33s', cases: 27, rate: 183, performance: '-1:08', storeLabel: 'Aisle 3 A03', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '1608_11', type: 'PICK', start: '00:47', finish: '01:48', gap: '49s', cases: 145, rate: 141, performance: '-20:13', storeLabel: 'Aisle 3 A03', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '1608_12', type: 'PICK', start: '01:49', finish: '02:22', gap: '30s', cases: 170, rate: 308, performance: '+15:29', storeLabel: 'Aisle 3 A03', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '1608_13', type: 'PICK', start: '02:23', finish: '03:17', gap: '35s', cases: 86, rate: 96, performance: '-29:01', storeLabel: 'Aisle 3 A03', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '1608_14', type: 'BREAK', start: '03:22', finish: '03:55', gap: 'BREAK', cases: 0, rate: 0, breakTime: '34:52' }
    ]
  },
  {
    docId: 'DASERGHIE_1771274820000',
    id: 'DASERGHIE_1771274820000',
    userId: 'DASERGHIE',
    userName: 'DASERGHIE',
    date: '2026-08-18',
    clockInTime: 1771274820000, // 20:47 18/08/2026
    clockOutTime: 1771300430000, // 03:54 19/08/2026 (07h 06m 50s)
    activeSeconds: 22240,
    totalSeconds: 25610,
    breakSeconds: 3370,
    totalCases: 1348,
    finalRate: 218,
    peakRate: 340,
    steps: 1120,
    distanceKm: 0.84,
    department: 'Aisles (300 / 350)',
    zone: 'AMBIENT',
    storeLabel: 'AISLE 1, AISLE 2, AISLE 3, AISLE 5, AISLES',
    timestamp: { seconds: Math.floor(1771300430000 / 1000) },
    history: [
      { id: '1808_1', type: 'PICK', start: '20:50', finish: '21:18', gap: '10s', cases: 142, rate: 304, performance: '+12:15', storeLabel: 'AISLE 1 - (301 / 351)', departmentName: 'AISLE 1 - (301 / 351)' },
      { id: '1808_2', type: 'PICK', start: '21:19', finish: '21:35', gap: '15s', cases: 68, rate: 255, performance: '+3:40', storeLabel: 'AISLE 2 - (302 / 352)', departmentName: 'AISLE 2 - (302 / 352)' },
      { id: '1808_3', type: 'PICK', start: '21:36', finish: '22:12', gap: '12s', cases: 180, rate: 300, performance: '+14:20', storeLabel: 'AISLE 3 - (303 / 353)', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '1808_4', type: 'PICK', start: '22:13', finish: '22:30', gap: '20s', cases: 75, rate: 265, performance: '+4:10', storeLabel: 'AISLE 5 - (305 / 355)', departmentName: 'AISLE 5 - (305 / 355)' },
      { id: '1808_5', type: 'PICK', start: '22:31', finish: '23:15', gap: '18s', cases: 165, rate: 225, performance: '+1:10', storeLabel: 'AISLES - (300 / 350)', departmentName: 'AISLES - (300 / 350)' },
      { id: '1808_6', type: 'BREAK', start: '23:15', finish: '23:45', gap: 'BREAK', cases: 0, rate: 0, breakTime: '30:00' },
      { id: '1808_7', type: 'PICK', start: '23:46', finish: '00:15', gap: '14s', cases: 110, rate: 228, performance: '+2:15', storeLabel: 'AISLE 1 - (301 / 351)', departmentName: 'AISLE 1 - (301 / 351)' },
      { id: '1808_8', type: 'PICK', start: '00:16', finish: '00:48', gap: '16s', cases: 125, rate: 234, performance: '+4:30', storeLabel: 'AISLE 2 - (302 / 352)', departmentName: 'AISLE 2 - (302 / 352)' },
      { id: '1808_9', type: 'PICK', start: '00:49', finish: '01:25', gap: '22s', cases: 130, rate: 217, performance: '+0:20', storeLabel: 'AISLE 3 - (303 / 353)', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '1808_10', type: 'PICK', start: '01:26', finish: '01:50', gap: '12s', cases: 95, rate: 238, performance: '+3:10', storeLabel: 'AISLE 4 - (304 / 354)', departmentName: 'AISLE 4 - (304 / 354)' },
      { id: '1808_11', type: 'PICK', start: '01:51', finish: '02:15', gap: '15s', cases: 78, rate: 195, performance: '-2:15', storeLabel: 'AISLE 5 - (305 / 355)', departmentName: 'AISLE 5 - (305 / 355)' },
      { id: '1808_12', type: 'PICK', start: '02:16', finish: '02:40', gap: '18s', cases: 65, rate: 163, performance: '-5:20', storeLabel: 'AISLES - (300 / 350)', departmentName: 'AISLES - (300 / 350)' },
      { id: '1808_13', type: 'BREAK', start: '02:40', finish: '03:00', gap: 'BREAK', cases: 0, rate: 0, breakTime: '20:00' },
      { id: '1808_14', type: 'PICK', start: '03:01', finish: '03:15', gap: '10s', cases: 45, rate: 193, performance: '-1:40', storeLabel: 'AISLE 1 - (301 / 351)', departmentName: 'AISLE 1 - (301 / 351)' },
      { id: '1808_15', type: 'PICK', start: '03:16', finish: '03:30', gap: '12s', cases: 40, rate: 171, performance: '-3:10', storeLabel: 'AISLE 2 - (302 / 352)', departmentName: 'AISLE 2 - (302 / 352)' },
      { id: '1808_16', type: 'PICK', start: '03:31', finish: '03:45', gap: '14s', cases: 26, rate: 111, performance: '-9:30', storeLabel: 'AISLE 3 - (303 / 353)', departmentName: 'AISLE 3 - (303 / 353)' },
      { id: '1808_17', type: 'PICK', start: '03:46', finish: '03:54', gap: '8s', cases: 0, rate: 0, performance: 'Wrap-up', storeLabel: 'AISLES - (300 / 350)', departmentName: 'AISLES - (300 / 350)' }
    ]
  }
];

export async function restoreAndProtectShifts(userName: string = 'DASERGHIE'): Promise<void> {
  const safeName = userName.toUpperCase().trim();
  
  try {
    RESTORED_SHIFTS.forEach(restored => {
      // 1. Direct In-Memory Cache injection
      const record = shiftCacheService.convertSummaryToShiftRecord(restored, restored.docId);
      shiftCacheService.setCachedShift(record);

      // 2. Direct Firestore update
      try {
        const docRef = doc(db, 'shift_summaries', restored.docId);
        setDoc(docRef, restored, { merge: true }).catch(err => console.warn('Firestore setDoc restore error:', err));
      } catch (e) {
        console.warn('Firestore restore skipped:', e);
      }
    });

    // Quota manager cache
    const cacheKey = `shiftsummaries_${safeName}`;
    setCachedData(cacheKey, RESTORED_SHIFTS);
  } catch (err) {
    console.warn('Failed to execute restoreAndProtectShifts:', err);
  }
}
