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
    Sliders
} from 'lucide-react';
import { ITALIAN_LESSONS, ItalianLessonUnit, ItalianVocabItem } from '../../constants/italianLessons';
import { voiceService } from '../../services/voiceService';

interface ItalianCoachModalProps {
    isOpen: boolean;
    onClose: () => void;
    isAdmin: boolean;
    onRewardXP?: (xp: number) => void;
}

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

    const [activeTab, setActiveTab] = useState<'study' | 'quiz' | 'settings' | 'ai'>('study');
    const [currentVocabIndex, setCurrentVocabIndex] = useState(0);
    const [repetitionCount, setRepetitionCount] = useState<number>(() => {
        return parseInt(localStorage.getItem('italian_coach_rep_count') || '0', 10);
    });
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);

    // AI Teacher state
    const [aiLesson, setAiLesson] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Quiz state
    const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState<number | null>(null);

    const currentLesson = ITALIAN_LESSONS.find(l => l.id === selectedLessonId) || ITALIAN_LESSONS[0];
    const currentVocab: ItalianVocabItem = currentLesson.vocabulary[currentVocabIndex] || currentLesson.vocabulary[0];

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
                rate: 0.85,
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

    // Handle Quiz Submission
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
            onRewardXP(150); // bonus XP for perfect score
        }
    };

    const handleResetQuiz = () => {
        setQuizAnswers({});
        setQuizSubmitted(false);
        setQuizScore(null);
    };

    if (!isOpen || !isAdmin) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-rose-950/60 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg">
                                🇮🇹
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <h3 className="text-white font-extrabold text-sm tracking-wide">Italian Shift Coach</h3>
                                    <span className="text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded">Admin Only</span>
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
                    <div className="grid grid-cols-4 gap-1 p-2 bg-slate-950/60 border-b border-slate-800 text-xs">
                        <button 
                            onClick={() => setActiveTab('study')}
                            className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                                activeTab === 'study' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Languages size={14} />
                            Study
                        </button>
                        <button 
                            onClick={() => setActiveTab('quiz')}
                            className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                                activeTab === 'quiz' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <HelpCircle size={14} />
                            Quiz
                        </button>
                        <button 
                            onClick={() => setActiveTab('ai')}
                            className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                                activeTab === 'ai' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Sparkles size={14} />
                            Teacher
                        </button>
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                                activeTab === 'settings' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Sliders size={14} />
                            Intervals
                        </button>
                    </div>

                    {/* Content Body */}
                    <div className="p-4 overflow-y-auto space-y-4 flex-1">
                        {/* TAB 1: STUDY & PRACTICE */}
                        {activeTab === 'study' && (
                            <div className="space-y-4">
                                {/* Flashcard */}
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

                                    {/* Example Sentence */}
                                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs space-y-1 bg-slate-900/60 p-3 rounded-xl">
                                        <div className="text-slate-300 font-medium italic">
                                            "{currentVocab.exampleItalian}"
                                        </div>
                                        <div className="text-slate-500 text-[11px]">
                                            "{currentVocab.exampleEnglish}"
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-4 flex items-center justify-center gap-3">
                                        <button 
                                            onClick={() => {
                                                speakItalian(currentVocab.italian, currentVocab.english);
                                                setRepetitionCount(c => c + 1);
                                            }}
                                            disabled={isPlayingAudio}
                                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95"
                                        >
                                            <Volume2 size={16} />
                                            {isPlayingAudio ? 'Speaking...' : 'Pronounce Word'}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                speakItalian(currentVocab.exampleItalian, currentVocab.exampleEnglish);
                                            }}
                                            disabled={isPlayingAudio}
                                            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                                        >
                                            <Sparkles size={14} className="text-amber-400" />
                                            Listen Sentence
                                        </button>
                                    </div>
                                </div>

                                {/* Vocab Carousel Navigator */}
                                <div className="grid grid-cols-5 gap-1.5">
                                    {currentLesson.vocabulary.map((v, idx) => (
                                        <button
                                            key={v.id}
                                            onClick={() => setCurrentVocabIndex(idx)}
                                            className={`p-2 rounded-xl text-center border transition-all ${
                                                currentVocabIndex === idx 
                                                    ? 'bg-emerald-600 border-emerald-400 text-white font-extrabold shadow-md' 
                                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            <div className="text-[10px] font-bold truncate">{v.italian}</div>
                                        </button>
                                    ))}
                                </div>

                                {/* Headset Filter Notice */}
                                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-[10px] text-slate-400 flex items-start gap-2">
                                    <span className="text-amber-400 text-xs">🛡️</span>
                                    <div>
                                        <strong className="text-slate-200">Work Headset Filter Active:</strong> Warehouse voice commands (e.g. <em>"1 ready", "2 ready", "say again", "repeat"</em>) are automatically ignored by PickApp to ensure uninterrupted shift picking.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: QUIZ */}
                        {activeTab === 'quiz' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                                        End-of-Lesson Quiz ({currentLesson.quiz.length} Questions)
                                    </h4>
                                    {quizSubmitted && (
                                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full font-mono ${
                                            quizScore === currentLesson.quiz.length 
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        }`}>
                                            Score: {quizScore} / {currentLesson.quiz.length}
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {currentLesson.quiz.map((q, qIdx) => (
                                        <div key={qIdx} className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-2">
                                            <div className="text-xs font-bold text-slate-200">
                                                {qIdx + 1}. {q.question}
                                            </div>
                                            <div className="grid grid-cols-1 gap-1.5">
                                                {q.options.map((opt, optIdx) => {
                                                    const isSelected = quizAnswers[qIdx] === optIdx;
                                                    let optStyle = 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800';

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
                                            {quizSubmitted && (
                                                <div className="text-[10px] text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800 mt-1">
                                                    💡 {q.explanation}
                                                </div>
                                            )}
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

                        {/* TAB 3: AI TEACHER */}
                        {activeTab === 'ai' && (
                            <div className="space-y-4">
                                <button 
                                    onClick={async () => {
                                        setIsGenerating(true);
                                        try {
                                            const response = await fetch('/api/italian-lesson', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ prompt: 'Generate a comprehensive Italian lesson for a warehouse operator beginner. Include grammar, vocabulary, and practice.' }),
                                            });
                                            const data = await response.json();
                                            setAiLesson(data.lesson);
                                        } catch (e) {
                                            setAiLesson('Failed to generate lesson. Please try again.');
                                        } finally {
                                            setIsGenerating(false);
                                        }
                                    }}
                                    disabled={isGenerating}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase rounded-2xl shadow-lg transition-all"
                                >
                                    {isGenerating ? 'Generating...' : 'Get New Lesson'}
                                </button>
                                <div className="bg-slate-950 p-4 rounded-2xl text-slate-300 text-xs leading-relaxed min-h-[200px]">
                                    {aiLesson ? <pre className="whitespace-pre-wrap font-sans">{aiLesson}</pre> : 'Click the button above to start your lesson.'}
                                </div>
                            </div>
                        )}

                        {/* TAB 4: INTERVALS & LESSON SETTINGS */}
                        {activeTab === 'settings' && (
                            <div className="space-y-4 text-xs">
                                {/* Lesson Unit Selector */}
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

                                {/* Interval Slider */}
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
                                    <div className="text-[10px] text-slate-400 italic">
                                        Over a 6-hour shift, an interval of <strong>{intervalMinutes} min</strong> delivers approx <strong>{Math.round(360 / intervalMinutes)} practice cycles</strong>.
                                    </div>
                                </div>

                                {/* Shift Audio Auto-Coach Toggle */}
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
