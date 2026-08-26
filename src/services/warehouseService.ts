import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { WarehouseSettings } from '../types';
import { OperationType, handleFirestoreError } from './leaderboardService';
import { canFetchData, getCachedData, setCachedData } from '../utils/quotaManager';
import { STORES, getLocalItem, saveLocalItem } from './indexedDbService';

const DEFAULT_SETTINGS: WarehouseSettings = {
    globalTargetRate: 200,
    departments: ['AISLES', 'BREAD', 'CHILLER', 'FREEZER', 'PRODUCE'],
    kpiThresholds: {
        excellent: 120, // % of target
        good: 100,
        warning: 85
    },
    shiftTypes: ['Morning', 'Afternoon', 'Twilight', 'Night'],
    exemptionRules: {
        prepLimitSeconds: 600,
        prepAccrualWindowSeconds: 1800,
        dinnerLimitSeconds: 1800,
        dinnerAccrualWindowSeconds: 21600,
        cleanupLimitSeconds: 300,
        cleanupAccrualWindowSeconds: 21600
    },
    subscriptionStatus: 'active',
    tierLevel: 'enterprise',
    subscriptionBillingCycle: 'monthly'
};

export const fetchWarehouseConfig = async (warehouseId: string, force: boolean = false): Promise<WarehouseSettings> => {
    const cacheKey = `warehouse_config_${warehouseId}`;
    
    // 1. Instant load from local IndexedDB first
    const localCached = await getLocalItem<WarehouseSettings & { key: string }>(STORES.SYSTEM_CONFIG, cacheKey);
    if (localCached && !force) {
        setCachedData(cacheKey, localCached);
    }

    if (!canFetchData(cacheKey, force)) {
        return getCachedData<WarehouseSettings>(cacheKey) || localCached || DEFAULT_SETTINGS;
    }

    try {
        const docRef = doc(db, 'warehouse_settings', warehouseId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = { ...DEFAULT_SETTINGS, ...snap.data() };
            setCachedData(cacheKey, data);
            // Save to local device database
            saveLocalItem(STORES.SYSTEM_CONFIG, { key: cacheKey, ...data });
            return data as WarehouseSettings;
        }
        return localCached || DEFAULT_SETTINGS;
    } catch (error) {
        try {
            handleFirestoreError(error, OperationType.GET, `warehouse_settings/${warehouseId}`);
        } catch (e) {}
        return getCachedData<WarehouseSettings>(cacheKey) || localCached || DEFAULT_SETTINGS;
    }
};

export const saveWarehouseConfig = async (warehouseId: string, config: WarehouseSettings): Promise<boolean> => {
    const cacheKey = `warehouse_config_${warehouseId}`;
    try {
        // Save to local device database immediately
        await saveLocalItem(STORES.SYSTEM_CONFIG, { key: cacheKey, ...config });
        setCachedData(cacheKey, config);

        const docRef = doc(db, 'warehouse_settings', warehouseId);
        await setDoc(docRef, config, { merge: true });
        return true;
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `warehouse_settings/${warehouseId}`);
        return false;
    }
};

export const getWarehouseConfig = fetchWarehouseConfig;

