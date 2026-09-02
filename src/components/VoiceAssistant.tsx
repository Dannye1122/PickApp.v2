import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Mic, MicOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Owl } from './branding/Owl';
import { GreenMascotOwl } from './branding/GreenMascotOwl';
import { voiceService } from '../services/voiceService';

interface VoiceAssistantProps {
  onCommand: (command: string, value?: number) => void;
  isActive: boolean;
  onToggle: (active: boolean) => void;
  announcementProp?: string;
  customImage?: string;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onCommand, isActive, onToggle, announcementProp, customImage }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [announcement, setAnnouncement] = useState("");
  const [bubbleText, setBubbleText] = useState("");

  // Interactive Eye Tracking
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const owlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isActive]);

  const getEyeOffset = () => {
    if (!owlRef.current || !isActive) return { x: 0, y: 0 };
    const rect = owlRef.current.getBoundingClientRect();
    const owlX = rect.left + rect.width / 2;
    const owlY = rect.top + rect.height / 2;
    
    const dx = mousePos.x - owlX;
    const dy = mousePos.y - owlY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return { x: 0, y: 0 };
    
    // Smooth clamping of pupil offset to a tight 3.5px circle
    const maxOffset = 3.5; 
    const factor = Math.min(maxOffset, distance / 60); 
    return {
      x: (dx / distance) * factor,
      y: (dy / distance) * factor
    };
  };

  const eyeOffset = getEyeOffset();

  const saySomething = () => {
      const phrases = [
        "Hoot hoot! You're picking at a legendary pace, human!", 
        "Don't forget to hydrate! Pecking at boxes is thirsty work.", 
        "Is it a bird? Is it a plane? No, it's just me, your favorite owl assistant!", 
        "Owl-fully impressed by your efficiency today!", 
        "Hoot! I'm owl-fully sorry! I scrambled your rota earlier, but I've fixed it now!",
        "I won't lie to you again! Your 6-week rolling pattern is now 100% accurate. No more imaginary 5-day streaks! Hoot hoot!",
        "Your shift pattern is synced. I'm owl ears if you need anything else, coworker!",
        "Alright, let's smash this order together. To the aisles, away!",
        "Hoot! Did you know? Keeping your pace above historical average triggers special gold coins!",
        "Struggling with a narrow lane? Check the screen lane maps first to bypass bottlenecks!"
      ];
      const text = phrases[Math.floor(Math.random() * phrases.length)];
      setAnnouncement(text);
      setBubbleText(text);
  };

  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const textToSpeak = (announcement || announcementProp)?.trim();
    if (textToSpeak) {
        setBubbleText(textToSpeak);
        const bubbleTimer = setTimeout(() => {
            setBubbleText("");
        }, 5500);

        if (voiceService.isSupported()) {
            try {
                voiceService.speak(textToSpeak, {
                    rate: 1.3,
                    pitch: 1.8,
                    volume: 0.8,
                    onStart: () => setIsSpeaking(true),
                    onEnd: () => setIsSpeaking(false),
                    onError: (e) => {
                        console.error('Owl speech error:', e);
                        setIsSpeaking(false);
                    }
                });
            } catch (speakError) {
                console.warn('VoiceService speak failed:', speakError);
            }
        }

        if (announcement) {
            const timer = setTimeout(() => setAnnouncement(""), 3000);
            return () => {
                clearTimeout(timer);
                clearTimeout(bubbleTimer);
            };
        }
        return () => clearTimeout(bubbleTimer);
    }
  }, [announcement, announcementProp]);

  const startListening = useCallback(() => {
    // Microphone/SpeechRecognition is locked & disabled for user privacy
    // Speech recognition / microphone is completely disabled.
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (isActive) {
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [isActive, startListening, stopListening]);

  return (
    <motion.div 
        ref={owlRef}
        drag
        dragConstraints={{ left: -150, right: 150, top: -150, bottom: 150 }}
        onClick={saySomething}
        animate={isSpeaking ? {
            y: [0, -35, 15, -35, 0],
            rotate: [0, 25, -25, 25, -25, 0],
            scale: [1, 1.25, 0.85, 1.25, 1]
        } : { 
            y: [0, -15, 0],
            rotate: [0, 3, -3, 0]
        }}
        transition={{ 
            duration: isSpeaking ? 0.35 : 5,
            repeat: Infinity,
            ease: "easeInOut"
        }}
        className="fixed bottom-24 right-6 z-50 cursor-grab active:cursor-grabbing pointer-events-auto group"
        whileHover={{ scale: 1.2, rotate: [0, 10, -10, 0] }}
        whileTap={{ scale: 0.8, rotate: 180 }}
    >
        <div className="relative">
            {/* Pulsing Aura */}
            <AnimatePresence>
                {(isActive || isSpeaking) && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ 
                            opacity: [0.3, 0.5, 0.3], 
                            scale: isSpeaking ? [1, 1.3, 1] : [1, 1.1, 1] 
                        }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ repeat: Infinity, duration: isSpeaking ? 0.7 : 4 }}
                        className={`absolute -inset-4 rounded-full blur-xl ${
                            isListening ? 'bg-sky-500' : (isSpeaking ? 'bg-amber-400' : 'bg-slate-500')
                        }`}
                    />
                )}
            </AnimatePresence>
            
            <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    onToggle(!isActive); 
                }}
                className={`relative w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-2xl overflow-hidden ${
                    isActive 
                        ? (isListening ? 'bg-lime-500/20 border-lime-400 text-white ring-4 ring-lime-400/30' : 'bg-slate-900 border-lime-500/60 text-lime-400')
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
            >
                <div className="relative w-full h-full flex items-center justify-center select-none p-1">
                    {customImage ? (
                        <motion.img 
                            src={customImage}
                            alt="Assistant"
                            animate={isListening || isSpeaking ? { scale: [1, 1.15, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 1 }}
                            className={`w-full h-full object-cover ${!isActive && 'grayscale opacity-50 blur-[0.5px]'}`}
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <motion.div 
                            className="w-full h-full flex items-center justify-center"
                            animate={isListening || isSpeaking ? { scale: [1, 1.08, 1], y: [0, -2, 0] } : {}}
                            transition={{ repeat: Infinity, duration: isListening ? 0.8 : 1.4, ease: "easeInOut" }}
                        >
                            <GreenMascotOwl 
                                className="w-full h-full"
                                isListening={isListening}
                                isSpeaking={isSpeaking}
                                isActive={isActive}
                                eyeOffset={eyeOffset}
                            />
                        </motion.div>
                    )}
                </div>
                
                {!isActive && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-slate-500">Zz</span>
                    </div>
                )}
            </button>

            {/* Speech Bubble Dialog */}
            <AnimatePresence>
                {bubbleText && (
                    <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.85 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.85 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="absolute bottom-20 right-0 mb-4 w-60 p-3.5 bg-slate-900/95 border border-amber-500/20 text-white rounded-3xl shadow-2xl z-50 text-[11px] text-left backdrop-blur-md cursor-pointer hover:border-amber-500/40 select-none"
                        onClick={(e) => {
                            e.stopPropagation();
                            setBubbleText("");
                        }}
                    >
                        <div className="font-black text-[9px] text-amber-400 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                            <span className="flex items-center gap-1.5">
                                <Owl className="w-3.5 h-3.5" />
                                Hootie Assistant
                            </span>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setBubbleText("");
                                    }}
                                    className="p-0.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        </div>
                        <p className="font-extrabold text-slate-100 leading-relaxed font-sans pr-1">{bubbleText}</p>
                        <div className="mt-1.5 text-[8px] font-medium text-slate-400 italic text-right">Tap bubble to dismiss</div>
                        
                        {/* Down Arrow Indicator pointing to owl */}
                        <div className="absolute right-6 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900"></div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Status Tooltip */}
            <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-900/90 border border-slate-700 rounded-lg text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {isActive ? (isListening ? 'Hoot!' : 'Owl On Duty') : 'Owl Sleeping'}
            </div>
        </div>
    </motion.div>
  );
};

export default VoiceAssistant;
