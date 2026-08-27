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
    clockOut: number;
    dinner: number;
    postDinner: number;
    total: number;
}

export const calculateAislesExemptionDetail = (totalSeconds: number, rules?: WarehouseSettings['exemptionRules']): AislesExemptionDetail => {
    const validTotal = (typeof totalSeconds === 'number' && !isNaN(totalSeconds) && isFinite(totalSeconds)) ? Math.max(0, totalSeconds) : 0;
    
    const r = rules || {
        clockOutLimitSeconds: 300,
        clockOutAccrualWindowSeconds: 21600,
        dinnerLimitSeconds: 1800,
        dinnerAccrualWindowSeconds: 21600,
        postDinnerLimitSeconds: 600,
        postDinnerAccrualWindowSeconds: 1800
    };

    const clockOut = Math.min(validTotal * (r.clockOutLimitSeconds / r.clockOutAccrualWindowSeconds), r.clockOutLimitSeconds);
    const dinner = Math.min(validTotal * (r.dinnerLimitSeconds / r.dinnerAccrualWindowSeconds), r.dinnerLimitSeconds);
    const postDinner = Math.min(validTotal * (r.postDinnerLimitSeconds / r.postDinnerAccrualWindowSeconds), r.postDinnerLimitSeconds);
    
    return {
        clockOut: Math.floor(clockOut) || 0,
        dinner: Math.floor(dinner) || 0,
        postDinner: Math.floor(postDinner) || 0,
        total: Math.floor(clockOut + dinner + postDinner) || 0
    };
};

export const calculateAislesExemption = (totalSeconds: number, rules?: WarehouseSettings['exemptionRules']): number => {
    return calculateAislesExemptionDetail(totalSeconds, rules).total;
};
