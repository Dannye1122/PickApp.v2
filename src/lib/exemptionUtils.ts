/**
 * Single source of truth for the picking exemption logic.
 * 
 * Accrual rules:
 * 1. Mandatory Prep: Up to 10m (600s) accrued over the first 30m (1800s) of the shift.
 * 2. Dinner Accrual: Up to 30m (1800s) accrued linearly over 6 hours (21600s).
 * 3. Cleanup Accrual: Up to 5m (300s) accrued linearly over 6 hours (21600s).
 */

import { WarehouseSettings } from '../types';

export interface AislesExemptionDetail {
    prep: number;
    dinner: number;
    cleanup: number;
    total: number;
}

export const calculateAislesExemptionDetail = (totalSeconds: number, rules?: WarehouseSettings['exemptionRules']): AislesExemptionDetail => {
    const r = rules || {
        prepLimitSeconds: 600,
        prepAccrualWindowSeconds: 1800,
        dinnerLimitSeconds: 1800,
        dinnerAccrualWindowSeconds: 21600,
        cleanupLimitSeconds: 300,
        cleanupAccrualWindowSeconds: 21600
    };

    const prep = Math.min(totalSeconds * (r.prepLimitSeconds / r.prepAccrualWindowSeconds), r.prepLimitSeconds);
    const dinner = Math.min(totalSeconds * (r.dinnerLimitSeconds / r.dinnerAccrualWindowSeconds), r.dinnerLimitSeconds);
    const cleanup = Math.min(totalSeconds * (r.cleanupLimitSeconds / r.cleanupAccrualWindowSeconds), r.cleanupLimitSeconds);
    
    return {
        prep: Math.floor(prep),
        dinner: Math.floor(dinner),
        cleanup: Math.floor(cleanup),
        total: Math.floor(prep + dinner + cleanup)
    };
};

export const calculateAislesExemption = (totalSeconds: number, rules?: WarehouseSettings['exemptionRules']): number => {
    return calculateAislesExemptionDetail(totalSeconds, rules).total;
};
