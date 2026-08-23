// Shared and unlocked Web Audio Context
let sharedAudioCtx: AudioContext | null = null;

export const getAudioContext = (): AudioContext | null => {
    try {
        if (!sharedAudioCtx) {
            const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                sharedAudioCtx = new AudioCtx();
            }
        }
        if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
            sharedAudioCtx.resume().catch(() => {});
        }
        return sharedAudioCtx;
    } catch (e) {
        return null;
    }
};

// Automatically unlock audio on first user touch/tap on mobile
if (typeof window !== 'undefined') {
    const unlockAudio = () => {
        try {
            const ctx = getAudioContext();
            if (ctx && ctx.state === 'suspended') {
                ctx.resume().then(() => {
                    window.removeEventListener('click', unlockAudio);
                    window.removeEventListener('touchstart', unlockAudio);
                    window.removeEventListener('keydown', unlockAudio);
                }).catch(() => {});
            }
        } catch (e) {}
    };
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
}

export const playAlertSound = (type: 'info' | 'warning' | 'success' | 'level' | 'error' | 'large' = 'info') => {
    try {
        const audioCtx = getAudioContext();
        if (!audioCtx) return;
        
        switch (type) {
            case 'large':
                const osc5 = audioCtx.createOscillator();
                const gain5 = audioCtx.createGain();
                osc5.type = 'square';
                osc5.frequency.setValueAtTime(440, audioCtx.currentTime);
                osc5.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.5);
                gain5.gain.setValueAtTime(0.2, audioCtx.currentTime); // Louder
                gain5.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                osc5.connect(gain5);
                gain5.connect(audioCtx.destination);
                osc5.start();
                osc5.stop(audioCtx.currentTime + 0.5);
                break;
            
            case 'success':
                const osc1 = audioCtx.createOscillator();
                const gain1 = audioCtx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
                osc1.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.3); // C6
                gain1.gain.setValueAtTime(0.12, audioCtx.currentTime);
                gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                osc1.connect(gain1);
                gain1.connect(audioCtx.destination);
                osc1.start();
                osc1.stop(audioCtx.currentTime + 0.3);
                break;
                
            case 'warning':
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(440, audioCtx.currentTime); 
                osc2.frequency.linearRampToValueAtTime(330, audioCtx.currentTime + 0.2);
                gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                osc2.start();
                osc2.stop(audioCtx.currentTime + 0.2);
                break;

            case 'level':
                const osc3 = audioCtx.createOscillator();
                const gain3 = audioCtx.createGain();
                osc3.type = 'square';
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                    osc3.frequency.setValueAtTime(freq, audioCtx.currentTime + (i * 0.1));
                });
                gain3.gain.setValueAtTime(0.08, audioCtx.currentTime);
                gain3.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                osc3.connect(gain3);
                gain3.connect(audioCtx.destination);
                osc3.start();
                osc3.stop(audioCtx.currentTime + 0.5);
                break;

            case 'error':
                const osc4 = audioCtx.createOscillator();
                const gain4 = audioCtx.createGain();
                osc4.type = 'sawtooth';
                osc4.frequency.setValueAtTime(150, audioCtx.currentTime);
                osc4.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.4);
                gain4.gain.setValueAtTime(0.08, audioCtx.currentTime);
                gain4.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                osc4.connect(gain4);
                gain4.connect(audioCtx.destination);
                osc4.start();
                osc4.stop(audioCtx.currentTime + 0.4);
                break;

            default:
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.1);
        }
    } catch (e) {
        console.warn("Audio Context unavailable", e);
    }
};

export const playVictorySound = () => {
    try {
        const audioCtx = getAudioContext();
        if (!audioCtx) return;
        const mainGain = audioCtx.createGain();
        mainGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        mainGain.connect(audioCtx.destination);

        const notes = [
            { f: 523.25, t: 0 },   // C5
            { f: 523.25, t: 0.1 }, 
            { f: 523.25, t: 0.2 },
            { f: 659.25, t: 0.3 }, // E5
            { f: 783.99, t: 0.4 }, // G5
            { f: 523.25, t: 0.5 }, // C5
            { f: 783.99, t: 0.6 }, // G5
            { f: 1046.50, t: 0.7 } // C6
        ];

        notes.forEach(note => {
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(note.f, audioCtx.currentTime + note.t);
            g.gain.setValueAtTime(0.12, audioCtx.currentTime + note.t);
            g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + note.t + 0.2);
            osc.connect(g);
            g.connect(mainGain);
            osc.start(audioCtx.currentTime + note.t);
            osc.stop(audioCtx.currentTime + note.t + 0.2);
        });
    } catch (e) {
        console.warn("Victory Audio failed", e);
    }
};

export const playGentleBeep = () => {
    try {
        const audioCtx = getAudioContext();
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
        console.warn("Gentle beep failed", e);
    }
};

