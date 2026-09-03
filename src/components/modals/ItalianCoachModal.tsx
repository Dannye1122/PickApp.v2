import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Languages, 
    Volume2, 
    VolumeX, 
    Play, 
    Pause, 
    Settings, 
    CheckCircle2, 
    HelpCircle, 
    Award, 
    ChevronRight, 
    RotateCcw, 
    Clock, 
    Sparkles, 
    X,
    Sliders,
    Calendar,
    Mic,
    MicOff,
    Send,
    FileText,
    Flame,
    GraduationCap,
    Check
} from 'lucide-react';
import { ITALIAN_LESSONS, ItalianLessonUnit, ItalianVocabItem } from '../../constants/italianLessons';
import { voiceService } from '../../services/voiceService';

interface ItalianCoachModalProps {
    isOpen: boolean;
    onClose: () => void;
    isAdmin: boolean;
    onRewardXP?: (xp: number) => void;
}

interface MonthlyAssessment {
    date: string;
    monthName: string;
    scorePercent: number;
    grade: string;
    cefrLevel: string;
    summary: string;
    masteredWords: string[];
    recommendations: string;
}

const MONTHLY_QUESTIONS = [
    {
        id: 1,
        category: "Attrezzature di Magazzino (Equipment)",
        question: "Come si chiamano in italiano il 'pallet' di legno e il 'forklift'?",
        phonetic: "ban-CA-le e car-REL-lo e-le-va-TO-re",
        expected: "Bancale (o Pallet) e Carrello Elevatore (o Muletto)",
        options: [
            "Bancale e Carrello Elevatore",
            "Scaffale e Transpallet manuale",
            "Collo e Cassone metallico",
            "Nastro trasportatore e Scala"
        ],
        correctIndex: 0
    },
    {
        id: 2,
        category: "Sicurezza sul Lavoro (Floor Safety)",
        question: "Cosa devi dire se c'è un pericolo o un carico instabile nel corridoio?",
        phonetic: "At-ten-ZIO-ne! Ca-ri-co in-sta-BI-le!",
        expected: "Attenzione! Carico instabile nel corridoio!",
        options: [
            "Attenzione! Carico instabile nel corridoio!",
            "Tutto a posto, continuate a correre",
            "Lasciare cadere a terra",
            "Fermare l'ordine per la pausa caffè"
        ],
        correctIndex: 0
    },
    {
        id: 3,
        category: "Navigazione e Corsie (Aisles & Locations)",
        question: "Come chiedi al supervisore dove si trova la corsia 12?",
        phonetic: "Scu-zi, do-ve si TRO-va la cor-SI-a do-DI-ci?",
        expected: "Scusi, dove si trova la corsia dodici?",
        options: [
            "Scusi, dove si trova la corsia dodici?",
            "Quant'è il mio pick rate oggi?",
            "A che ora andiamo in pausa?",
            "Quanti colli mancano sul pallet?"
        ],
        correctIndex: 0
    },
    {
        id: 4,
        category: "Quantità e Colli (Picking & Units)",
        question: "Cosa significa 'Devi prelevare 24 colli e verificare il codice a barre'?",
        phonetic: "Pre-le-va-re ven-ti-QUAT-tro col-li",
        expected: "Pick 24 cases and verify barcode",
        options: [
            "Pick 24 cases and verify barcode",
            "Drop 24 pallets at dock 4",
            "Take a 24 minute lunch break",
            "Clean the aisles before picking"
        ],
        correctIndex: 0
    },
    {
        id: 5,
        category: "Fine Turno e Consegna (Shift Handover)",
        question: "Come saluti il turno successivo alla fine della giornata?",
        phonetic: "Buo-na se-RA-ta e buon la-VO-ro al pros-si-mo tur-no!",
        expected: "Buona serata e buon lavoro al prossimo turno!",
        options: [
            "Buona serata e buon lavoro al prossimo turno!",
            "Non voglio più lavorare qui",
            "Il magazzino è chiuso per sempre",
            "Dov'è il badge smarrito?"
        ],
        correctIndex: 0
    }
];

export const ItalianCoachModal: React.FC<ItalianCoachModalProps> = ({
    isOpen,
    onClose,
    isAdmin,
    onRewardXP
}) => {
    // Settings stored in localStorage
    const [isEnabled, setIsEnabled] = useState<boolean>(() => {
        return localStorage.getItem('italian_coach_enabled') === 'true';
    });
    const [selectedLessonId, setSelectedLessonId] = useState<number>(() => {
        return parseInt(localStorage.getItem('italian_coach_lesson_id') || '1', 10);
    });
    const [intervalMinutes, setIntervalMinutes] = useState<number>(() => {
        return parseInt(localStorage.getItem('italian_coach_interval_min') || '10', 10);
    });
    const [audioVolume, setAudioVolume] = useState<number>(() => {
        return parseFloat(localStorage.getItem('italian_coach_volume') || '1.0');
    });

    const [activeTab, setActiveTab] = useState<'study' | 'quiz' | 'ai' | 'assessment' | 'settings'>('study');
    const [currentVocabIndex, setCurrentVocabIndex] = useState(0);
    const [repetitionCount, setRepetitionCount] = useState<number>(() => {
        return parseInt(localStorage.getItem('italian_coach_rep_count') || '0', 10);
    });
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);

    // AI Teacher & Drill State
    const [teacherMode, setTeacherMode] = useState<'chat' | 'drill'>('drill');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', parts: { text: string }[] }[]>([
        {
            role: 'model',
            parts: [{ text: "Ciao! Sono il tuo Italian Shift Coach 🇮🇹. Vuoi fare un drill vocale con domande e vocaboli del magazzino, o chiedermi spiegazioni su una parola?" }]
        }
    ]);
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [speechLang, setSpeechLang] = useState<'it-IT' | 'en-US'>('it-IT');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    // Quiz state
    const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState<number | null>(null);

    // Monthly Assessment state
    const [assessmentStep, setAssessmentStep] = useState<number>(0);
    const [assessmentAnswers, setAssessmentAnswers] = useState<Record<number, number>>({});
    const [isAssessing, setIsAssessing] = useState<boolean>(false);
    const [assessmentCompleted, setAssessmentCompleted] = useState<boolean>(false);
    const [latestAssessment, setLatestAssessment] = useState<MonthlyAssessment | null>(() => {
        try {
            const raw = localStorage.getItem('italian_monthly_assessment_latest');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    });

    const currentLesson = ITALIAN_LESSONS.find(l => l.id === selectedLessonId) || ITALIAN_LESSONS[0];
    const currentVocab: ItalianVocabItem = currentLesson.vocabulary[currentVocabIndex] || currentLesson.vocabulary[0];

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    // Speech Recognition setup
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = speechLang;
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                setIsListening(false);
                setTimeout(() => handleSendMessage(transcript), 400);
            };

            recognition.onerror = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }
    }, [speechLang]);

    const toggleListening = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            try {
                recognitionRef.current.lang = speechLang;
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                setIsListening(false);
            }
        }
    };

    // Speech Synthesis helper
    const speakItalian = (text: string, englishTranslation?: string) => {
        setIsPlayingAudio(true);
        if (englishTranslation) {
            voiceService.speakItalianVocab(text, englishTranslation, audioVolume, () => {
                setIsPlayingAudio(false);
            });
        } else {
            voiceService.speak(text, {
                lang: 'it-IT',
                rate: 0.88,
                volume: audioVolume,
                onEnd: () => setIsPlayingAudio(false)
            });
        }
    };

    // Save preferences
    useEffect(() => {
        localStorage.setItem('italian_coach_enabled', isEnabled.toString());
        localStorage.setItem('italian_coach_lesson_id', selectedLessonId.toString());
        localStorage.setItem('italian_coach_interval_min', intervalMinutes.toString());
        localStorage.setItem('italian_coach_volume', audioVolume.toString());
        localStorage.setItem('italian_coach_rep_count', repetitionCount.toString());
    }, [isEnabled, selectedLessonId, intervalMinutes, audioVolume, repetitionCount]);

    // Handle Standard Quiz
    const handleSubmitQuiz = () => {
        let score = 0;
        currentLesson.quiz.forEach((q, idx) => {
            if (quizAnswers[idx] === q.correctIndex) {
                score += 1;
            }
        });
        setQuizScore(score);
        setQuizSubmitted(true);

        if (score === currentLesson.quiz.length && onRewardXP) {
            onRewardXP(150);
        }
    };

    const handleResetQuiz = () => {
        setQuizAnswers({});
        setQuizSubmitted(false);
        setQuizScore(null);
    };

    // Handle Teacher Message
    const handleSendMessage = async (dictatedText?: string, explicitMode?: 'chat' | 'drill') => {
        const textToSend = dictatedText !== undefined ? dictatedText : input;
        if (!textToSend.trim()) return;

        const userMsg = { role: 'user' as const, parts: [{ text: textToSend }] };
        const newHistory = [...chatHistory, userMsg];
        setChatHistory(newHistory);
        setInput('');
        setIsGenerating(true);

        try {
            const response = await fetch('/api/italian-lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    messages: newHistory,
                    mode: explicitMode || teacherMode
                }),
            });
            const data = await response.json();
            const replyText = data?.reply || "Ottimo impegno! Continuiamo ad esercitarci.";
            setChatHistory([...newHistory, { role: 'model' as const, parts: [{ text: replyText }] }]);
            
            // Speak reply
            voiceService.speak(replyText, { lang: 'it-IT', volume: audioVolume });
        } catch (e) {
            setChatHistory([...newHistory, { role: 'model' as const, parts: [{ text: 'Ben fatto! Riprova con la prossima parola o domanda del magazzino.' }] }]);
        } finally {
            setIsGenerating(false);
        }
    };

    // Trigger an instant oral drill question
    const handleAskDrillQuestion = () => {
        setTeacherMode('drill');
        const drillPrompts = [
            "Chiedimi una domanda o una parola sul magazzino da tradurre o pronunciare!",
            "Mettimi alla prova con un termine di picking o una situazione di sicurezza nel magazzino!",
            "Dammi una nuova parola italiana da imparare e fammi una domanda subito dopo!"
        ];
        const randomPrompt = drillPrompts[Math.floor(Math.random() * drillPrompts.length)];
        handleSendMessage(randomPrompt, 'drill');
    };

    // Monthly Assessment Submission
    const handleAnswerMonthlyQuestion = (qIdx: number, optIdx: number) => {
        setAssessmentAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
        if (qIdx < MONTHLY_QUESTIONS.length - 1) {
            setAssessmentStep(qIdx + 1);
        }
    };

    const handleFinalizeMonthlyAssessment = async () => {
        setIsAssessing(true);
        let correctCount = 0;
        MONTHLY_QUESTIONS.forEach((q, idx) => {
            if (assessmentAnswers[idx] === q.correctIndex) {
                correctCount++;
            }
        });

        const percent = Math.round((correctCount / MONTHLY_QUESTIONS.length) * 100);
        let grade = "A+ (Eccellente)";
        let cefr = "A2+ (Operatore Indipendente)";
        if (percent < 60) {
            grade = "C (In Progresso)";
            cefr = "A1 (Base Magazzino)";
        } else if (percent < 85) {
            grade = "B (Competente)";
            cefr = "A2 (Operatore Fluente)";
        }

        const dateStr = new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });
        const monthName = new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

        const newAssessment: MonthlyAssessment = {
            date: dateStr,
            monthName,
            scorePercent: percent,
            grade,
            cefrLevel: cefr,
            summary: `Hai risposto correttamente a ${correctCount} su ${MONTHLY_QUESTIONS.length} scenari pratici di magazzino.`,
            masteredWords: [
                "Bancale / Pallet",
                "Carrello Elevatore",
                "Corsia / Scaffale",
                "Carico Instabile / Sicurezza",
                "Colli / Quantità"
            ],
            recommendations: percent >= 80 
                ? "Ottima padronanza dei termini chiave. Prossimo obiettivo: fluidità nei saluti e gestione delle eccezioni di inventario."
                : "Rivedi i vocaboli della corsia e le espressioni di sicurezza con i micro-prompt durante il turno."
        };

        setLatestAssessment(newAssessment);
        localStorage.setItem('italian_monthly_assessment_latest', JSON.stringify(newAssessment));
        setAssessmentCompleted(true);
        setIsAssessing(false);

        if (onRewardXP) {
            onRewardXP(percent >= 80 ? 300 : 150);
        }

        // Voice celebration
        voiceService.speak(`Valutazione mensile completata! Punteggio: ${percent} per cento. Livello ${cefr}. Ottimo lavoro!`, {
            lang: 'it-IT',
            volume: audioVolume
        });
    };

    const handleResetMonthlyAssessment = () => {
        setAssessmentStep(0);
        setAssessmentAnswers({});
        setAssessmentCompleted(false);
    };

    if (!isOpen || !isAdmin) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
                >
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-rose-950/60 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg shadow-inner">
                                🇮🇹
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <h3 className="text-white font-extrabold text-sm tracking-wide">Italian Shift Coach</h3>
                                    <span className="text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded">Floor AI</span>
                                </div>
                                <p className="text-[10px] text-slate-400">Unit {currentLesson.id}: {currentLesson.title}</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="grid grid-cols-5 gap-1 p-1.5 bg-slate-950/80 border-b border-slate-800 text-[11px]">
                        <button 
                            onClick={() => setActiveTab('study')}
                            className={`py-2 rounded-xl font-bold transition-all flex flex-col items-center gap-1 ${
                                activeTab === 'study' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Languages size={13} />
                            <span>Study</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('quiz')}
                            className={`py-2 rounded-xl font-bold transition-all flex flex-col items-center gap-1 ${
                                activeTab === 'quiz' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <HelpCircle size={13} />
                            <span>Quiz</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('ai')}
                            className={`py-2 rounded-xl font-bold transition-all flex flex-col items-center gap-1 ${
                                activeTab === 'ai' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Sparkles size={13} />
                            <span>Drill & AI</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('assessment')}
                            className={`py-2 rounded-xl font-bold transition-all flex flex-col items-center gap-1 ${
                                activeTab === 'assessment' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Award size={13} />
                            <span>Monthly</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={`py-2 rounded-xl font-bold transition-all flex flex-col items-center gap-1 ${
                                activeTab === 'settings' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Sliders size={13} />
                            <span>Intervals</span>
                        </button>
                    </div>

                    {/* Content Body */}
                    <div className="p-4 overflow-y-auto space-y-4 flex-1">
                        {/* TAB 1: STUDY */}
                        {activeTab === 'study' && (
                            <div className="space-y-4">
                                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-inner">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded">
                                            Word {currentVocabIndex + 1} of {currentLesson.vocabulary.length}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                            {repetitionCount} Shift Reps
                                        </span>
                                    </div>

                                    <div className="text-center py-2 space-y-1">
                                        <div className="text-2xl font-black text-white tracking-wide">
                                            {currentVocab.italian}
                                        </div>
                                        <div className="text-xs text-amber-400 font-mono italic">
                                            /{currentVocab.phonetic}/
                                        </div>
                                        <div className="text-base font-bold text-slate-300 mt-2">
                                            {currentVocab.english}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs space-y-1 bg-slate-900/60 p-3 rounded-xl">
                                        <div className="text-slate-300 font-medium italic">
                                            "{currentVocab.exampleItalian}"
                                        </div>
                                        <div className="text-slate-500 text-[11px]">
                                            "{currentVocab.exampleEnglish}"
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-center gap-3">
                                        <button 
                                            onClick={() => {
                                                speakItalian(currentVocab.italian, currentVocab.english);
                                                setRepetitionCount(c => c + 1);
                                            }}
                                            disabled={isPlayingAudio}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg transition-all"
                                        >
                                            <Volume2 size={14} className={isPlayingAudio ? 'animate-pulse' : ''} />
                                            Pronounce Aloud
                                        </button>
                                        <button 
                                            onClick={() => speakItalian(currentVocab.exampleItalian)}
                                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                                        >
                                            Example
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center px-1">
                                    <button 
                                        onClick={() => setCurrentVocabIndex(prev => Math.max(0, prev - 1))}
                                        disabled={currentVocabIndex === 0}
                                        className="px-3 py-1.5 bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-bold rounded-xl transition-all"
                                    >
                                        ← Previous
                                    </button>
                                    <span className="text-xs text-slate-500 font-mono">
                                        {currentVocabIndex + 1} / {currentLesson.vocabulary.length}
                                    </span>
                                    <button 
                                        onClick={() => setCurrentVocabIndex(prev => Math.min(currentLesson.vocabulary.length - 1, prev + 1))}
                                        disabled={currentVocabIndex === currentLesson.vocabulary.length - 1}
                                        className="px-3 py-1.5 bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-bold rounded-xl transition-all"
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: QUIZ */}
                        {activeTab === 'quiz' && (
                            <div className="space-y-4">
                                {quizSubmitted && quizScore !== null && (
                                    <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Award className="text-emerald-400" size={20} />
                                            <div>
                                                <div className="text-white font-bold text-xs">Quiz Completed!</div>
                                                <div className="text-[10px] text-slate-300">Score: {quizScore} / {currentLesson.quiz.length} correct</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {currentLesson.quiz.map((q, qIdx) => (
                                        <div key={qIdx} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                                            <div className="font-bold text-xs text-white flex gap-1.5">
                                                <span className="text-emerald-400 font-mono">{qIdx + 1}.</span>
                                                <span>{q.question}</span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-1.5 pt-1">
                                                {q.options.map((opt, optIdx) => {
                                                    const isSelected = quizAnswers[qIdx] === optIdx;
                                                    let optStyle = 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850';
                                                    if (quizSubmitted) {
                                                        if (optIdx === q.correctIndex) {
                                                            optStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold';
                                                        } else if (isSelected && optIdx !== q.correctIndex) {
                                                            optStyle = 'bg-rose-950/80 border-rose-500 text-rose-300';
                                                        }
                                                    } else if (isSelected) {
                                                        optStyle = 'bg-emerald-600 border-emerald-400 text-white font-bold';
                                                    }

                                                    return (
                                                        <button
                                                            key={optIdx}
                                                            disabled={quizSubmitted}
                                                            onClick={() => setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                                                            className={`p-2 rounded-xl text-left text-xs border transition-all ${optStyle}`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-2 flex justify-between items-center">
                                    {quizSubmitted ? (
                                        <button 
                                            onClick={handleResetQuiz}
                                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                                        >
                                            <RotateCcw size={14} />
                                            Retake Quiz
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={handleSubmitQuiz}
                                            disabled={Object.keys(quizAnswers).length < currentLesson.quiz.length}
                                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all"
                                        >
                                            Submit & Verify Answers
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: ORAL DRILL & AI TUTOR */}
                        {activeTab === 'ai' && (
                            <div className="flex flex-col h-[420px]">
                                {/* Drill Controls Banner */}
                                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-2xl mb-3 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleAskDrillQuestion}
                                            disabled={isGenerating}
                                            className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-[11px] rounded-xl flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                                        >
                                            <Sparkles size={13} />
                                            Ask me a Question / Word
                                        </button>
                                        <button
                                            onClick={() => setSpeechLang(l => l === 'it-IT' ? 'en-US' : 'it-IT')}
                                            className="px-2 py-1.5 bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 rounded-xl"
                                            title="Toggle speech recognition language"
                                        >
                                            Mic: {speechLang === 'it-IT' ? '🇮🇹 IT' : '🇬🇧 EN'}
                                        </button>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono uppercase">Voice Tutor</span>
                                </div>

                                {/* Chat Window */}
                                <div className="flex-1 overflow-y-auto space-y-2.5 mb-3 pr-1">
                                    {chatHistory.map((msg, i) => (
                                        <div 
                                            key={i} 
                                            className={`p-3 rounded-2xl text-xs max-w-[88%] leading-relaxed ${
                                                msg.role === 'user' 
                                                    ? 'bg-emerald-600 text-white ml-auto shadow-md' 
                                                    : 'bg-slate-950 border border-slate-800 text-slate-200'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <span>{msg.parts[0].text}</span>
                                                {msg.role === 'model' && (
                                                    <button 
                                                        onClick={() => voiceService.speak(msg.parts[0].text, { lang: 'it-IT', volume: audioVolume })}
                                                        className="text-slate-400 hover:text-emerald-400 shrink-0 mt-0.5"
                                                        title="Listen again"
                                                    >
                                                        <Volume2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {isGenerating && (
                                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-400 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                            <span>Il docente sta formulando la domanda...</span>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Input Bar */}
                                <div className="flex gap-2">
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Rispondi a voce o digita in italiano..."
                                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                                    />
                                    <button 
                                        onClick={toggleListening}
                                        className={`px-3.5 py-2 rounded-xl font-bold flex items-center justify-center transition-all ${
                                            isListening ? 'bg-rose-600 animate-pulse text-white shadow-lg' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                        }`}
                                        title={isListening ? "Listening... Speak now" : "Speak your answer"}
                                    >
                                        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                                    </button>
                                    <button 
                                        onClick={() => handleSendMessage()}
                                        disabled={isGenerating || !input.trim()}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-40 transition-all flex items-center justify-center"
                                    >
                                        <Send size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: MONTHLY ASSESSMENT */}
                        {activeTab === 'assessment' && (
                            <div className="space-y-4">
                                {!assessmentCompleted ? (
                                    <div className="space-y-4">
                                        {/* Exam Header */}
                                        <div className="p-4 bg-gradient-to-r from-amber-950/60 via-slate-950 to-slate-900 border border-amber-500/30 rounded-2xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="text-amber-400" size={16} />
                                                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                                                        Valutazione Mensile Magazzino
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-400">
                                                    Domanda {assessmentStep + 1} di {MONTHLY_QUESTIONS.length}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-300">
                                                Valuta le tue competenze pratiche in lingua italiana per il lavoro in corsia e ricevi la certificazione mensile di fluenza.
                                            </p>
                                        </div>

                                        {/* Current Question */}
                                        {MONTHLY_QUESTIONS[assessmentStep] && (
                                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                                                <div className="flex justify-between items-center text-[10px] text-amber-400 font-mono font-bold uppercase">
                                                    <span>{MONTHLY_QUESTIONS[assessmentStep].category}</span>
                                                    <button 
                                                        onClick={() => voiceService.speak(MONTHLY_QUESTIONS[assessmentStep].question, { lang: 'it-IT', volume: audioVolume })}
                                                        className="text-slate-400 hover:text-white flex items-center gap-1"
                                                    >
                                                        <Volume2 size={12} /> Ascolta
                                                    </button>
                                                </div>

                                                <div className="text-sm font-extrabold text-white">
                                                    {MONTHLY_QUESTIONS[assessmentStep].question}
                                                </div>
                                                <div className="text-[11px] text-slate-400 font-mono italic">
                                                    Guida fonetica: /{MONTHLY_QUESTIONS[assessmentStep].phonetic}/
                                                </div>

                                                <div className="space-y-2 pt-2">
                                                    {MONTHLY_QUESTIONS[assessmentStep].options.map((opt, optIdx) => {
                                                        const isSelected = assessmentAnswers[assessmentStep] === optIdx;
                                                        return (
                                                            <button
                                                                key={optIdx}
                                                                onClick={() => handleAnswerMonthlyQuestion(assessmentStep, optIdx)}
                                                                className={`w-full p-3 rounded-xl text-left text-xs border transition-all flex items-center justify-between ${
                                                                    isSelected 
                                                                        ? 'bg-amber-600 text-white font-bold border-amber-400 shadow-md' 
                                                                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                                                                }`}
                                                            >
                                                                <span>{opt}</span>
                                                                {isSelected && <Check size={14} />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Navigation / Finalize */}
                                        <div className="flex justify-between items-center pt-2">
                                            <button
                                                disabled={assessmentStep === 0}
                                                onClick={() => setAssessmentStep(s => Math.max(0, s - 1))}
                                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-300 rounded-xl"
                                            >
                                                ← Precedente
                                            </button>

                                            {assessmentStep === MONTHLY_QUESTIONS.length - 1 ? (
                                                <button
                                                    disabled={Object.keys(assessmentAnswers).length < MONTHLY_QUESTIONS.length || isAssessing}
                                                    onClick={handleFinalizeMonthlyAssessment}
                                                    className="px-5 py-2 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                                                >
                                                    <Award size={14} />
                                                    {isAssessing ? "Elaborazione..." : "Completa Valutazione Mensile"}
                                                </button>
                                            ) : (
                                                <button
                                                    disabled={assessmentAnswers[assessmentStep] === undefined}
                                                    onClick={() => setAssessmentStep(s => Math.min(MONTHLY_QUESTIONS.length - 1, s + 1))}
                                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-bold text-white rounded-xl"
                                                >
                                                    Avanti →
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* Assessment Results Certificate */
                                    <div className="space-y-4">
                                        <div className="p-5 bg-gradient-to-b from-amber-950/60 to-slate-950 border border-amber-500/40 rounded-3xl text-center space-y-3 shadow-2xl">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 mx-auto flex items-center justify-center text-amber-400">
                                                <GraduationCap size={24} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-black">
                                                    Certificato di Valutazione Mensile
                                                </span>
                                                <h4 className="text-lg font-black text-white mt-1">
                                                    {latestAssessment?.monthName}
                                                </h4>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-2">
                                                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-center">
                                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Punteggio</div>
                                                    <div className="text-xl font-black text-emerald-400 mt-0.5">
                                                        {latestAssessment?.scorePercent}%
                                                    </div>
                                                </div>
                                                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-center">
                                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Livello CEFR</div>
                                                    <div className="text-xs font-black text-amber-300 mt-1">
                                                        {latestAssessment?.cefrLevel}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80 text-left space-y-2 text-xs">
                                                <div className="text-slate-300 font-medium">
                                                    {latestAssessment?.summary}
                                                </div>
                                                <div className="text-[11px] text-amber-300/90 font-medium border-t border-slate-800 pt-2">
                                                    <strong>Raccomandazione per il prossimo mese:</strong> {latestAssessment?.recommendations}
                                                </div>
                                            </div>

                                            <div className="pt-2 flex justify-center gap-2">
                                                <button
                                                    onClick={handleResetMonthlyAssessment}
                                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                                                >
                                                    <RotateCcw size={13} />
                                                    Ripeti Valutazione
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 5: SETTINGS */}
                        {activeTab === 'settings' && (
                            <div className="space-y-4 text-xs">
                                <div className="space-y-1.5">
                                    <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Active Lesson Unit</label>
                                    <div className="space-y-1.5">
                                        {ITALIAN_LESSONS.map(lesson => (
                                            <button
                                                key={lesson.id}
                                                onClick={() => {
                                                    setSelectedLessonId(lesson.id);
                                                    setCurrentVocabIndex(0);
                                                    handleResetQuiz();
                                                }}
                                                className={`w-full p-3 rounded-2xl border text-left flex justify-between items-center transition-all ${
                                                    selectedLessonId === lesson.id 
                                                        ? 'bg-emerald-950/70 border-emerald-500 text-white' 
                                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                                                }`}
                                            >
                                                <div>
                                                    <div className="font-extrabold text-xs text-white">Unit {lesson.id}: {lesson.title}</div>
                                                    <div className="text-[10px] text-slate-400">{lesson.theme} • {lesson.vocabulary.length} words</div>
                                                </div>
                                                {selectedLessonId === lesson.id && (
                                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-300">Repetition Frequency</span>
                                        <span className="text-emerald-400 font-mono font-black text-sm">
                                            Every {intervalMinutes} minutes
                                        </span>
                                    </div>
                                    <input 
                                        type="range"
                                        min="3"
                                        max="30"
                                        step="1"
                                        value={intervalMinutes}
                                        onChange={(e) => setIntervalMinutes(parseInt(e.target.value, 10))}
                                        className="w-full accent-emerald-500 cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                                        <span>3 min (High Repetition)</span>
                                        <span>15 min</span>
                                        <span>30 min (Relaxed)</span>
                                    </div>
                                </div>

                                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-slate-200">Audio Micro-Prompts</div>
                                        <div className="text-[10px] text-slate-500">Whisper words via headset during shift</div>
                                    </div>
                                    <button 
                                        onClick={() => setIsEnabled(!isEnabled)}
                                        className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all ${
                                            isEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                                        }`}
                                    >
                                        {isEnabled ? 'ACTIVE' : 'MUTED'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
