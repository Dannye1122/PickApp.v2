import React, { useState } from 'react';
import { 
  Calendar, X, FileText, Sparkles, ChevronLeft, ChevronRight, RotateCcw, Trash2, Download
} from 'lucide-react';
import { ShiftSummary, ThemeColors, UserProfile } from '../../types';
import { getLocalDateString, normalizeDateStr, saveUserProfile, deleteShiftSummary } from '../../services/leaderboardService';
import { formatHHMM, hoursToHHMM } from '../../utils/formatUtils';
import { isPickEntry } from '../../utils/statsUtils';
import { auth } from '../../lib/firebase';
import { generateFullShiftReport } from '../../services/shiftReportService';
import { deviceExport } from '../../lib/deviceApi';

const safeLocalStorage = {
  setItem: (key: string, value: string, _force?: boolean) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('safeLocalStorage setItem error:', e);
    }
  },
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }
};

interface RotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeColors;
  haptic: (type?: 'light' | 'medium' | 'heavy') => void;
  shiftData: any;
  setShiftData: React.Dispatch<React.SetStateAction<any>>;
  userProfile: UserProfile | null;
  mergedShiftSummaries: ShiftSummary[];
  setShiftSummaries: React.Dispatch<React.SetStateAction<ShiftSummary[]>>;
  fetchShiftSummaries: (targetUser: string, force?: boolean) => Promise<ShiftSummary[]>;
  isUserAdmin: () => boolean;
  announce: (msg: string) => void;
  setViewingPastSummary: (summary: ShiftSummary | null) => void;
  setShowRestoreModal: (show: boolean) => void;
  setRestoreText: (text: string) => void;
  setRestoreStatus: (status: any) => void;
  selectedFutureDate: Date | null;
  setSelectedFutureDate: (d: Date | null) => void;
}

export const RotaModal: React.FC<RotaModalProps> = ({
  isOpen,
  onClose,
  theme,
  haptic,
  shiftData,
  setShiftData,
  userProfile,
  mergedShiftSummaries,
  setShiftSummaries,
  fetchShiftSummaries,
  isUserAdmin,
  announce,
  setViewingPastSummary,
  setShowRestoreModal,
  setRestoreText,
  setRestoreStatus,
  selectedFutureDate,
  setSelectedFutureDate
}) => {
  const [rotaEditMode, setRotaEditMode] = useState(false);
  const [rotaSubTab, setRotaSubTab] = useState<'calendar' | 'history'>('calendar');
  const [rotaMonthOffset, setRotaMonthOffset] = useState(0);

  if (!isOpen) return null;

  const now = new Date();

  const getRotaCalendarDays = (offset: number) => {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Monday start

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i, 12, 0, 0));
    }
    return { days, year, month };
  };

  const isWorkDay = (date: Date) => {
    const dStr = getLocalDateString(date);
    const override = shiftData.rotaOverrides?.[dStr];
    if (override) {
      return override === 'work';
    }

    if (!shiftData.rotaConfig?.anchorDate) return false;
    const anchor = new Date(shiftData.rotaConfig.anchorDate + "T12:00:00Z");
    const target = new Date(date);
    target.setHours(12, 0, 0, 0);
    const msDiff = target.getTime() - anchor.getTime();
    
    const dayDiffRaw = Math.round(msDiff / (1000 * 60 * 60 * 24));
    const totalDaysInCycle = (shiftData.rotaConfig.weeks || 3) * 7;
    
    let dayDiff = dayDiffRaw % totalDaysInCycle;
    if (dayDiff < 0) dayDiff += totalDaysInCycle;
    
    const weekIndex = Math.floor(dayDiff / 7);
    const dayIndex = dayDiff % 7;
    
    if (!shiftData.rotaConfig.pattern[weekIndex]) return false;
    const val = shiftData.rotaConfig.pattern[weekIndex][dayIndex];
    return typeof val === 'number' ? val > 0 : !!val;
  };

  const getWorkedHoursForDate = (date: Date): number | null => {
    const targetDateStr = getLocalDateString(date);

    let totalMsOnThisDay = 0;
    let hasActivity = false;

    // 1. Process finalized shift summaries
    if (mergedShiftSummaries && mergedShiftSummaries.length > 0) {
      mergedShiftSummaries.forEach(summary => {
        const clockInDateStr = summary.clockInTime ? getLocalDateString(new Date(summary.clockInTime)) : '';
        const normSummaryDate = normalizeDateStr(summary.date);

        if (clockInDateStr === targetDateStr || normSummaryDate === targetDateStr) {
          hasActivity = true;
          const activeSecs = summary.activeSeconds || summary.totalSeconds;
          if (activeSecs && activeSecs > 0) {
            totalMsOnThisDay += activeSecs * 1000;
          } else {
            const startTime = summary.clockInTime;
            const endTime = summary.clockOutTime;
            if (startTime && endTime && endTime > startTime) {
              totalMsOnThisDay += (endTime - startTime);
            }
          }
        }
      });
    }

    // 2. Include current running shift (real-time live math)
    if (shiftData.firstStartTime && !shiftData.isShiftFinalized) {
      if (getLocalDateString(new Date(shiftData.firstStartTime)) === targetDateStr) {
        hasActivity = true;
        const startTime = shiftData.firstStartTime;
        const endTime = Date.now();
        totalMsOnThisDay += (endTime - startTime);
      }
    }

    if (!hasActivity) return null;
    
    return parseFloat((totalMsOnThisDay / (1000 * 60 * 60)).toFixed(2));
  };

  const getPlannedHours = (date: Date) => {
    const dStr = getLocalDateString(date);
    
    const override = shiftData.rotaOverrides?.[dStr];
    if (override) {
      if (override === 'holiday' || override === 'sick' || override === 'off') return 0;
      return 8; // Default value for overridden work days if pattern is 0
    }

    if (!shiftData.rotaConfig?.anchorDate) return 0;
    const anchor = new Date(shiftData.rotaConfig.anchorDate + "T12:00:00Z");
    const target = new Date(date);
    target.setHours(12, 0, 0, 0);
    const msDiff = target.getTime() - anchor.getTime();
    
    const dayDiffRaw = Math.round(msDiff / (1000 * 60 * 60 * 24));
    const totalDaysInCycle = (shiftData.rotaConfig.weeks || 3) * 7;
    
    let dayDiff = dayDiffRaw % totalDaysInCycle;
    if (dayDiff < 0) dayDiff += totalDaysInCycle;
    
    const weekIndex = Math.floor(dayDiff / 7);
    const dayIndex = dayDiff % 7;
    
    if (!shiftData.rotaConfig.pattern[weekIndex]) return 0;
    const val = shiftData.rotaConfig.pattern[weekIndex][dayIndex];
    if (typeof val === 'number') return val;
    return val ? 8 : 0;
  };

  const handleTogglePatternDay = (weekIndex: number, dayIndex: number) => {
    haptic('light');
    const currentVal = shiftData.rotaConfig.pattern[weekIndex]?.[dayIndex];
    let newVal: number;
    
    let currentHours = 0;
    if (typeof currentVal === 'number') {
      currentHours = currentVal;
    } else if (currentVal === true) {
      currentHours = 8;
    }
    
    if (currentHours === 0) newVal = 8;
    else if (currentHours === 8) newVal = 10;
    else if (currentHours === 10) newVal = 12;
    else newVal = 0;
    
    const opName = (shiftData.operator || localStorage.getItem('lastUser') || 'default').toUpperCase().trim();
    const newPattern = shiftData.rotaConfig.pattern.map((w: any[], i: number) => 
      i === weekIndex ? w.map((v: any, j: number) => j === dayIndex ? newVal : v) : w
    );
    
    let updatedConfig: any;
    setShiftData((prev: any) => {
      updatedConfig = { ...prev.rotaConfig, pattern: newPattern };
      const updated = {
        ...prev, 
        rotaConfig: updatedConfig
      };
      safeLocalStorage.setItem(`pickData_${opName}`, JSON.stringify(updated), true);
      safeLocalStorage.setItem('lastUser', opName);
      return updated;
    });

    const uid = userProfile?.uid || auth.currentUser?.uid;
    if (uid) {
      saveUserProfile(uid, opName, userProfile?.pin, {
        rotaConfig: updatedConfig || { ...shiftData.rotaConfig, pattern: newPattern },
        rotaOverrides: shiftData.rotaOverrides || {}
      });
    }
  };

  const handleSetAnchor = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(today.setDate(diff));
    
    const year = monday.getFullYear();
    const monthStr = String(monday.getMonth() + 1).padStart(2, '0');
    const dom = String(monday.getDate()).padStart(2, '0');
    
    const opName = (shiftData.operator || localStorage.getItem('lastUser') || 'default').toUpperCase().trim();
    let updatedConfig: any;
    setShiftData((prev: any) => {
      updatedConfig = { ...prev.rotaConfig, anchorDate: `${year}-${monthStr}-${dom}` };
      const updated = {
        ...prev, 
        rotaConfig: updatedConfig
      };
      safeLocalStorage.setItem(`pickData_${opName}`, JSON.stringify(updated), true);
      safeLocalStorage.setItem('lastUser', opName);
      return updated;
    });

    const uid = userProfile?.uid || auth.currentUser?.uid;
    if (uid) {
      saveUserProfile(uid, opName, userProfile?.pin, {
        rotaConfig: updatedConfig || { ...shiftData.rotaConfig, anchorDate: `${year}-${monthStr}-${dom}` },
        rotaOverrides: shiftData.rotaOverrides || {}
      });
    }
  };

  const { days, year, month } = getRotaCalendarDays(rotaMonthOffset);
  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });
  
  let totalShifts = 0;
  days.forEach(d => {
    if (d && isWorkDay(d)) totalShifts++;
  });

  return (
    <div id="rota-modal-overlay" className="fixed inset-0 bg-slate-950/80 z-[100] flex flex-col justify-end backdrop-blur-sm transition-all">
      <div className={`${theme.panel} ${theme.radius} p-6 border shadow-2xl animate-in slide-in-from-bottom-full duration-200 h-[85vh] flex flex-col`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Calendar size={24} className="text-sky-400" />
            <h3 className={`text-xl font-bold text-white ${theme.font}`}>My Rota</h3>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { haptic('light'); setRotaEditMode(!rotaEditMode); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${rotaEditMode ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              {rotaEditMode ? 'Done' : 'Edit Pattern'}
            </button>
            <button 
              onClick={() => { haptic('light'); onClose(); }} 
              className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white border border-slate-700/50"
            >
              <X size={20}/>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-1 pb-6">
          {!rotaEditMode && (
            <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl mb-5 max-w-md gap-1">
              <button
                onClick={() => { haptic('light'); setRotaSubTab('calendar'); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2
                  ${rotaSubTab === 'calendar' ? 'bg-sky-500 text-white shadow-xl' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Calendar size={14} /> Calendar Rota
              </button>
              <button
                onClick={() => { haptic('light'); setRotaSubTab('history'); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2
                  ${rotaSubTab === 'history' ? 'bg-sky-500 text-white shadow-xl' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <FileText size={14} /> Shift History ({mergedShiftSummaries?.length || 0})
              </button>
            </div>
          )}

          {!rotaEditMode ? (
            rotaSubTab === 'calendar' ? (
              <div className="space-y-6">
                {/* Missing Configuration Notice */}
                {!shiftData.rotaConfig?.anchorDate && (
                  <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex flex-col items-center text-center gap-2">
                    <Sparkles size={24} className="text-sky-450" />
                    <h4 className="text-white font-bold">New Rota Feature</h4>
                    <p className="text-slate-400 text-sm">Tap 'Edit Pattern' to map out your {shiftData.rotaConfig?.weeks || 6}-week recurring schedule and select an anchor date.</p>
                  </div>
                )}

                {/* Calendar Section */}
                <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800/50">
                  <div className="flex justify-between items-center mb-4">
                    <button 
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors disabled:opacity-30"
                      onClick={() => { haptic('light'); setRotaMonthOffset(p => Math.max(-12, p - 1)); }}
                      disabled={rotaMonthOffset <= -12}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <h4 className="text-white font-black text-lg uppercase tracking-wide">{monthName} {year}</h4>
                    <button 
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors disabled:opacity-30"
                      onClick={() => { haptic('light'); setRotaMonthOffset(p => Math.min(6, p + 1)); }}
                      disabled={rotaMonthOffset >= 6}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                      <div key={i} className="text-center text-xs font-bold text-slate-500">{d}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {days.map((d, idx) => {
                      if (!d) return <div key={idx} className="aspect-square bg-slate-900/20 rounded-lg" />;
                      
                      const isToday = d.toDateString() === now.toDateString();
                      const hours = getPlannedHours(d);
                      const actualHours = getWorkedHoursForDate(d);
                      const dStr = getLocalDateString(d);
                      
                      const targetDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
                      const targetDayEnd = targetDayStart + (24 * 60 * 60 * 1000) - 1;

                      const matchingSummary = mergedShiftSummaries.find((summary: any) => {
                        const summaryClockInDate = summary.clockInTime 
                          ? getLocalDateString(new Date(summary.clockInTime)) 
                          : '';
                        const summaryNormDate = normalizeDateStr(summary.date);
                        return summaryClockInDate === dStr || summaryNormDate === dStr;
                      });

                      const hasWorked = (actualHours !== null && actualHours > 0) || !!matchingSummary;
                      const override = shiftData.rotaOverrides?.[dStr];
                      
                      let ringClass = isToday ? 'ring-2 ring-sky-500' : '';
                      let cellStyle = 'bg-slate-800/50 border border-slate-700';
                      let textStyle = 'text-slate-400';
                      
                      if (hasWorked) {
                        cellStyle = 'bg-sky-500/10 border border-sky-500/40 shadow-inner';
                        textStyle = 'text-sky-300 font-extrabold';
                      } else if (override && override !== 'work') {
                        if (override === 'holiday') {
                          cellStyle = 'bg-purple-500/15 border border-purple-500/35';
                          textStyle = 'text-purple-400 font-bold';
                        } else if (override === 'sick') {
                          cellStyle = 'bg-red-500/15 border border-red-500/35';
                          textStyle = 'text-red-400 font-bold';
                        } else if (override === 'off') {
                          cellStyle = 'bg-slate-900 border border-slate-800';
                          textStyle = 'text-slate-500';
                        }
                      } else if (hours > 0) {
                        if (override === 'work') {
                          cellStyle = 'bg-amber-500/10 border border-amber-500/30';
                          textStyle = 'text-amber-400 font-bold';
                        } else {
                          cellStyle = 'bg-emerald-500/10 border border-emerald-500/30';
                          textStyle = 'text-emerald-400 font-bold';
                        }
                      }
                      
                      return (
                        <button 
                          key={idx} 
                          onClick={() => {
                            haptic('light');
                            const todayStart = new Date();
                            todayStart.setHours(0, 0, 0, 0);
                            
                            const isFuture = d.getTime() >= todayStart.getTime();
                            if (isFuture && !hasWorked) {
                              setSelectedFutureDate(d);
                            } else {
                              if (hasWorked) {
                                if (matchingSummary) {
                                  setViewingPastSummary(matchingSummary);
                                } else if (shiftData.firstStartTime && !shiftData.isShiftFinalized) {
                                  const activeStart = shiftData.firstStartTime;
                                  const activeEnd = Date.now();
                                  if (Math.max(activeStart, targetDayStart) < Math.min(activeEnd, targetDayEnd)) {
                                    announce("This shift is currently active! Finalize your shift to view the full detail report.");
                                  } else {
                                    announce("No detailed summary found for this shift.");
                                  }
                                } else {
                                  announce("No detailed summary found for this shift.");
                                }
                              } else {
                                announce("No shift was recorded on this past day.");
                              }
                            }
                          }}
                          className={`aspect-square rounded-lg flex items-center justify-center relative flex-col hover:brightness-125 transition-all text-center ${cellStyle} ${ringClass}`}
                        >
                          <span className={`text-xs md:text-sm leading-none ${textStyle} ${isToday && 'text-sky-400 font-extrabold'}`}>
                            {d.getDate()}
                          </span>
                          {hasWorked ? (
                            <span className="text-[8px] md:text-[9px] text-sky-400 font-mono font-black mt-1 leading-none flex items-center flex-col gap-0.5 animate-pulse">
                              <span>{matchingSummary?.totalCases || (isToday && !shiftData.isShiftFinalized ? (shiftData.totalCases || 0) : 0)}c</span>
                              <span>{matchingSummary?.steps ? `${Math.round(matchingSummary.steps)}s` : (actualHours ? `${actualHours}h` : '0h')}</span>
                            </span>
                          ) : override && override !== 'work' ? (
                            <span className={`text-[8px] md:text-[9px] font-bold mt-1 leading-none uppercase tracking-wide
                              ${override === 'holiday' ? 'text-purple-400' : override === 'sick' ? 'text-red-400' : 'text-slate-500'}`}
                            >
                              {override === 'holiday' ? 'Holiday' : override === 'sick' ? 'Sick' : 'Off'}
                            </span>
                          ) : (hours > 0) ? (
                            <span className={`text-[8px] md:text-[9px] font-mono font-bold mt-1 leading-none ${override === 'work' ? 'text-amber-500/80' : 'text-emerald-500/80'}`}>
                              {hoursToHHMM(hours > 0 ? hours : 8)}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Stats block */}
                <div className="bg-slate-800/80 p-4 rounded-2xl flex justify-between items-center border border-slate-700/50 gap-2">
                  <div className="flex-1">
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Expected Shifts</div>
                    <div className="text-white text-base md:text-lg font-black truncate">{totalShifts} <span className="text-xs font-normal text-slate-400 font-mono font-bold">/ {days.filter(x => x).length}</span></div>
                  </div>
                  <div className="flex-1 text-center border-x border-slate-700/50 px-2">
                    <div className="text-[9px] text-sky-400 font-bold uppercase tracking-widest">Actual Worked</div>
                    <div className="text-sky-400 text-base md:text-lg font-black truncate">
                      {hoursToHHMM(days.reduce((sum, d) => sum + (d ? (getWorkedHoursForDate(d) || 0) : 0), 0))}
                    </div>
                  </div>
                  <div className="flex-1 text-right">
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Base Hours</div>
                    <div className="text-white text-base md:text-lg font-black truncate">{hoursToHHMM(days.reduce((sum, d) => sum + (d ? getPlannedHours(d) : 0), 0))}</div>
                  </div>
                </div>
              </div>
            ) : (
              /* Shift History Tab */
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-[10px] uppercase font-black tracking-widest text-slate-400">Last 6 Weeks of Picking Summaries</div>
                  {isUserAdmin() && (
                    <button
                      onClick={() => {
                        haptic('medium');
                        setRestoreText('');
                        setRestoreStatus(null);
                        setShowRestoreModal(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5"
                    >
                      <RotateCcw size={12} /> Restore Shift
                    </button>
                  )}
                </div>
                {mergedShiftSummaries.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/40 border border-slate-800/50 rounded-2xl text-slate-450 italic text-xs">
                    No previous shift history found.
                  </div>
                ) : (
                  mergedShiftSummaries.map((summary, idx) => {
                    let dt;
                    if (summary.date) {
                      dt = new Date(summary.date.includes('T') ? summary.date : `${summary.date}T12:00:00`);
                    } else if (summary.clockInTime) {
                      dt = new Date(summary.clockInTime);
                    } else {
                      dt = new Date();
                    }
                    return (
                      <div key={`hist-${idx}`} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3 hover:border-slate-700 transition-colors">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                          <div>
                            <div className="font-extrabold text-xs text-slate-200">
                              {dt.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex gap-2">
                              <span>In: {summary.clockInTime ? new Date(summary.clockInTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '--:--'}</span>
                              <span>•</span>
                              <span>Out: {summary.clockOutTime ? new Date(summary.clockOutTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : (summary.clockInTime && summary.totalSeconds ? new Date(summary.clockInTime + summary.totalSeconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '--:--')}</span>
                            </div>
                          </div>
                        </div>
                        
                        {(() => {
                          const depMap: any = {};
                          (summary.history || []).forEach((h: any) => {
                            if (!isPickEntry(h)) return;
                            const dId = h.departmentName || h.department || 'Aisles';
                            if (!depMap[dId]) {
                              depMap[dId] = { cases: 0, seconds: 0 };
                            }
                            depMap[dId].cases += (h.cases || 0);
                            if (h.elapsedSeconds) {
                              depMap[dId].seconds += h.elapsedSeconds;
                            } else {
                              if(h.rate > 0) depMap[dId].seconds += ((h.cases/h.rate)*3600) || 0;
                            }
                          });
                          
                          const keys = Object.keys(depMap);
                          if (keys.length === 0) {
                            return (
                              <div className="grid grid-cols-2 gap-3 text-center w-full">
                                <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50">
                                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Pick Rate</div>
                                  <div className="text-sm font-black text-white">{summary.finalRate || 0}</div>
                                </div>
                                <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50">
                                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Cases</div>
                                  <div className="text-sm font-black text-white">{summary.totalCases || 0}</div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="flex flex-col gap-2">
                              <div className="flex justify-between pb-1 border-b border-slate-800/50 px-1">
                                <div className="text-[9px] uppercase font-bold text-slate-500 tracking-widest w-1/3 text-left">Department</div>
                                <div className="text-[9px] uppercase font-bold text-slate-500 tracking-widest w-1/3 text-center">Cases</div>
                                <div className="text-[9px] uppercase font-bold text-slate-500 tracking-widest w-1/3 text-right">Pick Rate</div>
                              </div>
                              {keys.map((k) => {
                                const ms = depMap[k];
                                const rt = ms.seconds > 0 ? Math.round(ms.cases / (ms.seconds / 3600)) : 0;
                                return (
                                  <div key={k} className="flex justify-between items-center px-1">
                                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider w-1/3 text-left">{k}</div>
                                    <div className="text-xs font-black text-white w-1/3 text-center">{ms.cases}</div>
                                    <div className="text-xs font-black text-sky-400 w-1/3 text-right">{rt} <span className="text-[8px] text-slate-400 font-mono">P/H</span></div>
                                  </div>
                                )
                              })}
                              <div className="grid grid-cols-2 gap-3 text-center w-full mt-2 pt-2 border-t border-slate-800/50">
                                <div className="bg-slate-950/40 py-2 px-1 rounded-xl border border-slate-800/50">
                                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Active Time</div>
                                  <div className="text-[10px] font-black text-slate-350">{formatHHMM(summary.activeSeconds || 0)}</div>
                                </div>
                                <div className="bg-slate-950/40 py-2 px-1 rounded-xl border border-slate-800/50">
                                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Break Time</div>
                                  <div className="text-[10px] font-black text-slate-350">{formatHHMM(summary.breakSeconds || 0)}</div>
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                        
                        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-800/80">
                          <button
                            onClick={() => { haptic('medium'); setViewingPastSummary(summary); }}
                            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-[11px] font-black tracking-wider rounded-xl border border-slate-700/60 transition-all flex items-center justify-center gap-1.5 uppercase font-mono"
                          >
                            <FileText size={13} /> View Detail
                          </button>
                          <button
                            onClick={async () => {
                              haptic('medium');
                              const csvContent = generateFullShiftReport(summary);
                              const dateStr = (summary.date || 'shift').replace(/-/g, '');
                              const opName = (summary.userName || shiftData.operator || 'OPERATOR').toUpperCase().trim();
                              const fileName = `ShiftReport_${opName}_${dateStr}.csv`;
                              await deviceExport(csvContent, fileName, true);
                            }}
                            className="flex-1 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-black tracking-wider rounded-xl border border-emerald-500/20 transition-all flex items-center justify-center gap-1.5 uppercase font-mono"
                          >
                            <Download size={13} /> Download Report
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )
          ) : (
            /* Rota Edit Mode */
            <div className="space-y-6">
              <div className="text-slate-300 text-sm">
                Tap the days you are <b>scheduled to work</b> in your repeating cycle.
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Analyse Shift History</label>
                  <textarea 
                    placeholder="Paste a list of dates you worked (e.g. May 1, May 2...)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white h-20 focus:outline-none focus:border-sky-500 transition-colors mb-2"
                  />
                  <button 
                    onClick={() => announce("I can help you deduce the pattern if you paste those dates in the chat!")}
                    className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors mb-3"
                  >
                    Detect Pattern Correctly
                  </button>
                  
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-t border-slate-700/50 pt-3">Custom Assistant Image URL</label>
                  <input 
                    type="text" 
                    placeholder="Paste an image URL (PNG/JPG)"
                    value={shiftData.assistantImage || ''}
                    onChange={(e) => setShiftData({ ...shiftData, assistantImage: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                  />
                  <p className="mt-2 text-[10px] text-slate-500 italic">Leave blank to keep the funny owl!</p>
                </div>

                {(shiftData.rotaConfig?.pattern || []).map((week: any[], wIdx: number) => (
                  <div key={`w-${wIdx}`} className="bg-slate-900 rounded-xl p-3 border border-slate-800">
                    <div className="text-xs font-bold text-slate-500 mb-2 uppercase">Week {wIdx + 1}</div>
                    <div className="grid grid-cols-7 gap-1">
                      {week.map((val: any, dIdx: number) => {
                        const hours = typeof val === 'number' ? val : (val ? 8 : 0);
                        const working = hours > 0;
                        return (
                          <button
                            key={`wd-${wIdx}-${dIdx}`}
                            onClick={() => handleTogglePatternDay(wIdx, dIdx)}
                            className={`aspect-square rounded-lg font-bold text-[10px] transition-colors flex flex-col items-center justify-center p-0.5
                              ${working ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                          >
                            <span className="font-bold leading-tight">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][dIdx]}</span>
                            <span className={`text-[8px] font-mono leading-tight ${working ? 'text-white/80' : 'text-slate-500'}`}>
                              {working ? `${hours}h` : 'Off'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-500 mb-2 uppercase">Anchor Date Setting</div>
                <p className="text-[10px] text-slate-400 mb-4 whitespace-normal">
                  To align this recurring pattern with real life dates, set an Anchor Date. This date will represent <b>Monday of Week 1</b>.
                </p>
                
                {shiftData.rotaConfig?.anchorDate ? (
                  <div className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-emerald-400 font-bold font-mono">{shiftData.rotaConfig.anchorDate}</span>
                    <input 
                      type="date" 
                      value={shiftData.rotaConfig.anchorDate}
                      onChange={(e) => setShiftData((prev: any) => ({
                        ...prev,
                        rotaConfig: { ...prev.rotaConfig, anchorDate: e.target.value }
                      }))}
                      className="bg-slate-800 text-white text-xs px-2 py-1 rounded"
                    />
                  </div>
                ) : (
                  <button
                    onClick={handleSetAnchor}
                    className="w-full py-3 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-xl font-bold shadow-lg"
                  >
                    Set Anchor Date (Current Week)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
