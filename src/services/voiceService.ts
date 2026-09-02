export interface SpeechOptions {
  lang?: string;
  rate?: number;
  volume?: number;
  onEnd?: () => void;
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

  speak(text: string, options: SpeechOptions = {}): void {
    if (!this.isSupported()) return;

    try {
      this.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      if (options.lang) utterance.lang = options.lang;
      if (options.rate !== undefined) utterance.rate = options.rate;
      if (options.volume !== undefined) utterance.volume = options.volume;
      
      if (options.onEnd) {
        utterance.onend = options.onEnd;
      }

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('VoiceService speak failed:', error);
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
