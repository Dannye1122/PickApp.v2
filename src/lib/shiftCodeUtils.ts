export const generateShiftCode = (operatorName?: string, timestamp?: number): string => {
    const ts = timestamp || Date.now();
    const d = new Date(ts);
    const dateStr = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
    
    const cleanOp = (operatorName || 'USER')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 4)
        .padEnd(4, 'X');

    const randomHex = Math.floor(Math.random() * 0xffff)
        .toString(16)
        .toUpperCase()
        .padStart(4, '0');

    return `SHF-${cleanOp}-${dateStr}-${randomHex}`;
};
