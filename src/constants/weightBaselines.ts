export interface DepartmentWeightConfig {
  dept: string;
  avgKgPerCase: number;
}

export const DEFAULT_DEPARTMENT_WEIGHTS: Record<string, number> = {
  ambient: 7.5,
  aisles: 7.5,
  chiller: 10.5,
  chill: 10.5,
  freezer: 9.0,
  frozen: 9.0,
  produce: 8.5,
  bws: 14.5,
  drinks: 15.0,
  meat: 11.0,
  bakery: 6.0,
  default: 8.0,
};

/**
 * Calculates estimated total weight lifted in kilograms given orders or department breakdown
 */
export function calculateEstimatedWeightKg(
  departmentStats: Array<{ dept: string; cases: number }>,
  customAvgKg?: number
): number {
  if (customAvgKg && customAvgKg > 0) {
    const totalCases = departmentStats.reduce((sum, d) => sum + (d.cases || 0), 0);
    return totalCases * customAvgKg;
  }

  let totalKg = 0;
  for (const item of departmentStats) {
    const rawDept = (item.dept || '').toLowerCase().trim();
    let weightPerCase = DEFAULT_DEPARTMENT_WEIGHTS[rawDept];
    if (!weightPerCase) {
      // Fuzzy prefix search
      const matchedKey = Object.keys(DEFAULT_DEPARTMENT_WEIGHTS).find(k => rawDept.includes(k));
      weightPerCase = matchedKey ? DEFAULT_DEPARTMENT_WEIGHTS[matchedKey] : DEFAULT_DEPARTMENT_WEIGHTS.default;
    }
    totalKg += (item.cases || 0) * weightPerCase;
  }
  return totalKg;
}

/**
 * Formats kilograms into a human readable string (Tonnes or kg)
 */
export function formatWeightTonnes(kg: number): { value: string; unit: string; totalKg: number; tonnes: number } {
  const tonnes = kg / 1000;
  if (tonnes >= 1) {
    return {
      value: tonnes.toFixed(2),
      unit: 'tonnes',
      totalKg: Math.round(kg),
      tonnes: parseFloat(tonnes.toFixed(2))
    };
  }
  return {
    value: Math.round(kg).toLocaleString(),
    unit: 'kg',
    totalKg: Math.round(kg),
    tonnes: parseFloat(tonnes.toFixed(3))
  };
}
