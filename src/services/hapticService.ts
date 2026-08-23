// Device haptics for different versions
const deviceHaptic = (window as any).Haptics || (window as any).Capacitor?.Plugins?.Haptics;

let hapticsEnabled = localStorage.getItem('haptics_enabled') !== 'off';

export const isHapticsEnabled = () => hapticsEnabled;

export const setHapticsEnabled = (enabled: boolean) => {
    hapticsEnabled = enabled;
    localStorage.setItem('haptics_enabled', enabled ? 'on' : 'off');
};

export const isVibrationSupported = (): boolean => {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

export const haptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!hapticsEnabled) return;
    try {
        if (deviceHaptic) {
            switch (type) {
                case 'heavy': deviceHaptic.impact({ style: 'heavy' }); break;
                case 'medium': deviceHaptic.impact({ style: 'medium' }); break;
                default: deviceHaptic.impact({ style: 'light' });
            }
        } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
            // Enhanced vibration timings for real mobile physical feedback
            switch (type) {
                case 'heavy': navigator.vibrate([60, 40, 60]); break;
                case 'medium': navigator.vibrate(45); break;
                default: navigator.vibrate(28);
            }
        }
    } catch (e) {
        console.warn("Haptic trigger caught error:", e);
    }
};

