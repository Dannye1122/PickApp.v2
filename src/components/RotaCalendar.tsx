import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Briefcase, FileText, AlertCircle } from 'lucide-react';
import { ShiftSummary } from '../services/leaderboardService';
import { fetchShiftSummaries } from '../services/leaderboardService';
import { DASERGHIE_ROTA } from '../contexts/ShiftDataContext';
import { getLocalDateString } from '../services/leaderboardService';

// Redefining rota pattern for access here to avoid cycle dependencies if needed, 
// or I can import it if it's exported in App.tsx (which it is)
// Actually, DASERGHIE_ROTA is exported in App.tsx, so I can import it.

interface RotaCalendarProps {
    userName: string;
    onClose: () => void;
}

export const RotaCalendar: React.FC<RotaCalendarProps> = ({ userName, onClose }) => {
    const [shifts, setShifts] = useState<ShiftSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchShiftSummaries(userName, false).then(data => {
            setShifts(data);
            setLoading(false);
        }).catch(err => {
            console.warn('RotaCalendar load shifts error:', err);
            setLoading(false);
        });
    }, [userName]);

    const days = useMemo(() => {
        const d = [];
        for (let i = 44; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            d.push(date);
        }
        return d;
    }, []);

    // Get shift for date
    const getShiftForDate = (date: Date) => {
        const dateStr = getLocalDateString(date);
        return shifts.find(s => {
            const loginDate = s.clockInTime 
                ? getLocalDateString(new Date(s.clockInTime)) 
                : (s.date ? s.date.split('T')[0] : '');
            return loginDate === dateStr || s.date === dateStr;
        });
    };

    // Calculate work day based on ROTA pattern
    const isWorkDay = (date: Date) => {
        const anchor = new Date(DASERGHIE_ROTA.anchorDate);
        const diffDays = Math.floor((date.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return false;
        const week = Math.floor(diffDays / 7) % DASERGHIE_ROTA.weeks;
        const dayOfWeek = date.getDay(); // 0 is Sunday
        // ROTA pattern days are Mon=0, Tue=1, ..., Sun=6
        // JS getDay is Sun=0, Mon=1, ..., Sat=6
        const rotaIndex = (dayOfWeek + 6) % 7; 
        return DASERGHIE_ROTA.pattern[week][rotaIndex] > 0;
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 z-[1000] flex flex-col pt-safe-top pb-safe-bottom"
        >
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <h2 className="text-xl font-bold text-white">My Rota</h2>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
                    <X size={24} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="text-center text-slate-400 p-8">Loading...</div>
                ) : (
                    <div className="grid grid-cols-7 gap-1">
                        {['M','T','W','T','F','S','S'].map(d => (
                            <div key={d} className="text-center text-xs text-slate-500 font-bold uppercase mb-2">{d}</div>
                        ))}
                        {days.map((date, i) => {
                            const shift = getShiftForDate(date);
                            const workDay = isWorkDay(date);
                            return (
                                <div key={i} className={`p-2 rounded-lg border ${workDay ? 'bg-slate-800 border-slate-700' : 'bg-slate-900 border-slate-800'} ${shift ? 'ring-1 ring-emerald-500' : ''}`}>
                                    <div className="text-xs text-slate-400">{date.getDate()}</div>
                                    {shift && (
                                        <div className="mt-1 flex flex-col items-center">
                                            <div className="text-[10px] text-emerald-400 font-bold">{shift.totalCases}c</div>
                                            <div className="text-[9px] text-sky-400">{Math.round(shift.steps || 0)}s</div>
                                        </div>
                                     )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </motion.div>
    );
};
