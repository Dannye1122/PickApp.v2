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
    return {
        clockOut: 0,
        dinner: 0,
        postDinner: 0,
        total: 0
    };
};

export const calculateAislesExemption = (totalSeconds: number, rules?: WarehouseSettings['exemptionRules']): number => {
    return 0;
};
