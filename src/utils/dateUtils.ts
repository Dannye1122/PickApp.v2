/**
 * PickApp v2.2.0 Universal Date Normalization Utility
 * Standardizes all date formats (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, Date, timestamps)
 * into a single canonical ISO key (YYYY-MM-DD).
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

    // Case 2: DD-MM-YYYY or MM-DD-YYYY or DD/MM/YYYY
    if (parts[2].length === 4) {
      const year = parts[2];
      const num1 = parseInt(parts[0], 10);
      const num2 = parseInt(parts[1], 10);

      let day = num1;
      let month = num2;

      // Disambiguate day vs month
      if (num1 > 12 && num2 <= 12) {
        // First part > 12 -> Must be DD/MM/YYYY
        day = num1;
        month = num2;
      } else if (num2 > 12 && num1 <= 12) {
        // Second part > 12 -> Must be MM/DD/YYYY
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
