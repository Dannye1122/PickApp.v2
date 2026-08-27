export const formatTime = (seconds: number) => {
    const val = (typeof seconds === 'number' && !isNaN(seconds) && isFinite(seconds)) ? Math.max(0, seconds) : 0;
    const mins = Math.floor(val / 60);
    const secs = Math.floor(val % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatHHMM = (seconds: number) => {
    const val = (typeof seconds === 'number' && !isNaN(seconds) && isFinite(seconds)) ? Math.max(0, seconds) : 0;
    const h = Math.floor(val / 3600);
    const m = Math.floor((val % 3600) / 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
};

export const formatHHMMSS = (seconds: number) => {
    const val = (typeof seconds === 'number' && !isNaN(seconds) && isFinite(seconds)) ? Math.max(0, seconds) : 0;
    const h = Math.floor(val / 3600);
    const m = Math.floor((val % 3600) / 60);
    const s = Math.floor(val % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const hoursToHHMM = (hours: number) => {
    const val = (typeof hours === 'number' && !isNaN(hours) && isFinite(hours)) ? Math.max(0, hours) : 0;
    const h = Math.floor(val);
    const m = Math.round((val - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
};
