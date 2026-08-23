import { DEPARTMENTS } from '../constants/data';

export const getDeptName = (key: string): string => {
    for (const zone of Object.values(DEPARTMENTS)) {
        for (const dept of Object.values(zone.depts)) {
            if (dept.sub && dept.sub[key]) {
                return dept.sub[key].name;
            }
        }
    }
    return key.charAt(0).toUpperCase() + key.slice(1);
};

export const resolveDepartmentInfo = (rawDept: any, rawDeptName?: any) => {
    const raw = `${rawDept || ''} ${rawDeptName || ''}`.toLowerCase().trim();
    
    if (raw.includes('aisle 1') || raw.includes('aisle_1') || raw.includes('301') || raw.includes('351') || raw.includes('a01')) {
        return { key: 'aisle_1', name: 'Aisle 1 A01 - (301 / 351)', targetRate: 220, zone: 'AMBIENT' };
    }
    if (raw.includes('aisle 2') || raw.includes('aisle_2') || raw.includes('302') || raw.includes('352') || raw.includes('a02')) {
        return { key: 'aisle_2', name: 'Aisle 2 A02 - (302 / 352)', targetRate: 260, zone: 'AMBIENT' };
    }
    if (raw.includes('aisle 3') || raw.includes('aisle_3') || raw.includes('303') || raw.includes('353') || raw.includes('a03')) {
        return { key: 'aisle_3', name: 'Aisle 3 A03 - (303 / 353)', targetRate: 210, zone: 'AMBIENT' };
    }
    if (raw.includes('aisle 4') || raw.includes('aisle_4') || raw.includes('304') || raw.includes('354') || raw.includes('a04')) {
        return { key: 'aisle_4', name: 'Aisle 4 A04 - (304 / 354)', targetRate: 210, zone: 'AMBIENT' };
    }
    if (raw.includes('aisle 5') || raw.includes('aisle_5') || raw.includes('305') || raw.includes('355') || raw.includes('a05')) {
        return { key: 'aisle_5', name: 'Aisle 5 A05 - (305 / 355)', targetRate: 260, zone: 'AMBIENT' };
    }
    if (raw.includes('aisle') || raw.includes('ambient') || raw.includes('300') || raw.includes('350')) {
        return { key: 'aisles', name: 'Aisles (300 / 350)', targetRate: 220, zone: 'AMBIENT' };
    }

    if (DEPARTMENTS) {
        for (const [zoneKey, zoneObj] of Object.entries(DEPARTMENTS as any)) {
            if (zoneObj && (zoneObj as any).depts) {
                for (const [_, deptObj] of Object.entries((zoneObj as any).depts)) {
                    if ((deptObj as any).sub) {
                        for (const [subKey, subObj] of Object.entries((deptObj as any).sub)) {
                            const sName = ((subObj as any).name || '').toLowerCase();
                            if (raw.includes(subKey.toLowerCase()) || raw.includes(sName)) {
                                return {
                                    key: subKey,
                                    name: (subObj as any).name,
                                    targetRate: (subObj as any).target || 200,
                                    zone: zoneKey
                                };
                            }
                        }
                    }
                }
            }
        }
    }

    const fallbackName = (rawDeptName || rawDept || 'Aisles').toString();
    return {
        key: rawDept || 'aisles',
        name: fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1),
        targetRate: 220,
        zone: 'AMBIENT'
    };
};
