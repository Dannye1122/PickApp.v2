export interface SpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (e: any) => void;
}

export const voiceService = {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },

  cancel(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  },

  getVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return [];
    return window.speechSynthesis.getVoices() || [];
  },

  getPreferredVoice(vList: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
    const prioritizedKeywords = [
      'natural', 'enhanced', 'siri', 'premium', 'google', 
      'ava', 'allison', 'evan', 'nathan', 'samantha', 'victoria'
    ];
    
    for (const keyword of prioritizedKeywords) {
      const found = vList.find(v => v.name.toLowerCase().includes(keyword) && v.lang.startsWith('en'));
      if (found) return found;
    }
    return vList.find(v => v.lang.startsWith('en')) || vList[0];
  },

  speak(text: string, options: SpeechOptions = {}): void {
    if (!this.isSupported()) return;

    try {
      this.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      const vList = this.getVoices();
      if (vList.length > 0) {
        const preferredVoice = this.getPreferredVoice(vList);
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      if (options.lang) utterance.lang = options.lang;
      if (options.rate !== undefined) utterance.rate = options.rate;
      if (options.pitch !== undefined) utterance.pitch = options.pitch;
      if (options.volume !== undefined) utterance.volume = options.volume;
      
      if (options.onStart) utterance.onstart = options.onStart;
      if (options.onEnd) utterance.onend = options.onEnd;
      if (options.onError) utterance.onerror = options.onError;

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('VoiceService speak failed:', error);
      if (options.onError) options.onError(error);
    }
  },

  speakItalianVocab(
    italian: string,
    english: string,
    volume: number = 1.0,
    onComplete?: () => void
  ): void {
    if (!this.isSupported()) return;

    try {
      this.cancel();

      const utterance = new SpeechSynthesisUtterance(italian);
      utterance.lang = 'it-IT';
      utterance.rate = 0.85;
      utterance.volume = volume;

      utterance.onend = () => {
        setTimeout(() => {
          try {
            const engUtterance = new SpeechSynthesisUtterance(english);
            engUtterance.lang = 'en-GB';
            engUtterance.rate = 0.95;
            engUtterance.volume = volume * 0.85;
            
            if (onComplete) {
              engUtterance.onend = onComplete;
            }
            
            window.speechSynthesis.speak(engUtterance);
          } catch (e) {
            console.warn('VoiceService speakItalianVocab english failed:', e);
            if (onComplete) onComplete();
          }
        }, 350);
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('VoiceService speakItalianVocab failed:', error);
      if (onComplete) onComplete();
    }
  }
};

