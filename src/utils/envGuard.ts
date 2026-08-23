/**
 * PickApp Environment Guard
 * Insulates the application from restricted sandbox environments (iframes).
 * Replaces illegal constructors with safe no-op implementations.
 */

export const initEnvGuard = () => {
    // Detect restricted sandbox/iframe environment
    const isRestricted = () => {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    };

    if (!isRestricted()) return;

    console.warn("[PickApp] Restricted environment detected. Insulating system constructors.");

    // 1. AudioContext Insulation
    let audioRestricted = false;
    try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (typeof AudioCtx === 'function') {
            new AudioCtx();
        } else {
            audioRestricted = true;
        }
    } catch (e) {
        audioRestricted = true;
    }

    if (audioRestricted) {
        const NoOpAudioContext = class {
            currentTime = 0;
            destination = {};
            state = 'suspended';
            createOscillator() { 
                return { 
                    type: '', 
                    frequency: { setValueAtTime: () => {} }, 
                    connect: () => {}, 
                    start: () => {}, 
                    stop: () => {} 
                }; 
            }
            createGain() { 
                return { 
                    gain: { setValueAtTime: () => {} }, 
                    connect: () => {} 
                }; 
            }
            decodeAudioData() { return Promise.resolve({}); }
            resume() { return Promise.resolve(); }
            close() { return Promise.resolve(); }
        };
        (window as any).AudioContext = NoOpAudioContext;
        (window as any).webkitAudioContext = NoOpAudioContext;
    }

    // 2. SpeechSynthesis Insulation
    let speechRestricted = false;
    try {
        if (typeof (window as any).SpeechSynthesisUtterance === 'function') {
            new (window as any).SpeechSynthesisUtterance("test");
        } else {
            speechRestricted = true;
        }
    } catch (e) {
        speechRestricted = true;
    }

    if (speechRestricted) {
        (window as any).SpeechSynthesisUtterance = class {
            text = '';
            lang = '';
            voice = null;
            volume = 1;
            rate = 1;
            pitch = 1;
            constructor(text?: string) { if (text) this.text = text; }
        };
    }
    if (!window.speechSynthesis) {
        (window as any).speechSynthesis = {
            speak: () => {},
            cancel: () => {},
            pause: () => {},
            resume: () => {},
            getVoices: () => []
        };
    }

    // 3. File & Blob Insulation (Prevent Illegal Constructor)
    let fileRestricted = false;
    try {
        if (typeof (window as any).File === 'function') {
            new (window as any).File([], "test.txt");
        } else {
            fileRestricted = true;
        }
    } catch (e) {
        fileRestricted = true;
    }

    if (fileRestricted) {
        (window as any).File = class extends Blob {
            name: string;
            lastModified: number;
            constructor(bits: any[], name: string, options?: any) {
                super(bits, options);
                this.name = name;
                this.lastModified = options?.lastModified || Date.now();
            }
        };
    }

    // 4. Notification Insulation
    if (!("Notification" in window)) {
        (window as any).Notification = class {
            static permission = 'denied';
            static requestPermission() { return Promise.resolve('denied'); }
        };
    }
};
