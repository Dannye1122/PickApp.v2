import { DEPARTMENTS } from '../constants/data';
import { resolveDepartmentInfo } from './deptUtils';

export const getDepartmentBreakdown = (history: any[], summaryInfo?: any) => {
    if (!history || history.length === 0) return [];
    
    const breakdownMap: Record<string, {
        department: string;
        departmentName: string;
        zone: string;
        cases: number;
        activeSeconds: number;
        rate: number;
        targetRate: number;
        picksCount: number;
    }> = {};
    
    history.forEach((h: any) => {
        if (h.gap === 'BREAK' || h.gap === 'NOTE' || h.isNote) return;
        
        const deptInfo = resolveDepartmentInfo(h.department, h.departmentName);
        const deptKey = deptInfo.key;
        const cases = parseInt(h.cases) || 0;
        
        // Calculate estimated or retrieve exact completed order pick seconds
        let elapsed = h.elapsedSeconds;
        if (elapsed === undefined || isNaN(elapsed) || elapsed <= 0) {
            const hRate = parseFloat(h.rate);
            elapsed = (hRate > 0 && cases > 0) ? Math.round((cases / hRate) * 3600) : 0;
        }
        
        if (!breakdownMap[deptKey]) {
            breakdownMap[deptKey] = {
                department: deptKey,
                departmentName: deptInfo.name,
                zone: deptInfo.zone,
                cases: 0,
                activeSeconds: 0,
                rate: 0,
                targetRate: h.targetRate || deptInfo.targetRate,
                picksCount: 0
            };
        }
        
        breakdownMap[deptKey].cases += cases;
        breakdownMap[deptKey].activeSeconds += elapsed;
        breakdownMap[deptKey].picksCount += 1;
    });
    
    // Distribute total shift active seconds proportionally if available
    const totalAisleSeconds = Object.values(breakdownMap).reduce((acc, item) => acc + item.activeSeconds, 0);
    if (summaryInfo && typeof summaryInfo.activeSeconds === 'number' && summaryInfo.activeSeconds > 60 && totalAisleSeconds > 0) {
        const shiftActiveSecs = summaryInfo.activeSeconds;
        Object.values(breakdownMap).forEach(item => {
            const ratio = item.activeSeconds / totalAisleSeconds;
            item.activeSeconds = Math.round(shiftActiveSecs * ratio);
        });
    }
    
    return Object.values(breakdownMap).map(item => {
        const hours = item.activeSeconds / 3600;
        item.rate = hours > 0 ? Math.round(item.cases / hours) : 0;
        const targetSec = (item.cases / (item.targetRate || 220)) * 3600;
        (item as any).netSeconds = Math.round(targetSec - item.activeSeconds);
        return item;
    });
};
