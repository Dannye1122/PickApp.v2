import React from 'react';
import { 
  Trophy, RefreshCw, X, Calendar, Sparkles, Bot
} from 'lucide-react';
import { LeaderboardInteractions } from '../leaderboard/LeaderboardInteractions';
import { PreviousMonthSummary } from '../leaderboard/PreviousMonthSummary';
import { LeaderboardEntry, LiveUser, ShiftSummary, ThemeColors } from '../../types';
import { THEMES } from '../../constants/themes';
import { formatHHMM } from '../../utils/formatUtils';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeColors;
  haptic: (type?: 'light' | 'medium' | 'heavy') => void;
  fetchingLeaderboard: boolean;
  fetchLeaderboardManual: (force?: boolean) => void;
  leaderboardTab: 'live' | 'prev_month';
  setLeaderboardTab: (tab: 'live' | 'prev_month') => void;
  allShiftSummariesList: ShiftSummary[];
  adminAllSummaries: ShiftSummary[];
  shiftSummaries: ShiftSummary[];
  zoneXP: Record<string, number>;
  liveUsers: LiveUser[];
  leaderboardData: LeaderboardEntry[];
  currentOperator: string;
  onToast: (message: string, type?: 'error' | 'success' | 'info') => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  theme,
  haptic,
  fetchingLeaderboard,
  fetchLeaderboardManual,
  leaderboardTab,
  setLeaderboardTab,
  allShiftSummariesList,
  adminAllSummaries,
  shiftSummaries,
  zoneXP,
  liveUsers,
  leaderboardData,
  currentOperator,
  onToast
}) => {
  if (!isOpen) return null;

  return (
    <div id="leaderboard-modal-overlay" className="fixed inset-0 bg-slate-950/80 z-[100] flex flex-col justify-end backdrop-blur-sm transition-all">
      <div className={`${theme.panel} ${theme.radius} p-6 border shadow-2xl animate-in slide-in-from-bottom-full duration-200 h-[85vh] flex flex-col`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={24} className="text-amber-400" />
            <h3 className={`text-xl font-bold text-white ${theme.font}`}>Leaderboard</h3>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchLeaderboardManual(true)}
              disabled={fetchingLeaderboard}
              className={`w-11 h-11 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white border border-slate-700/50 ${fetchingLeaderboard ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Sync latest leaderboard data"
            >
              <RefreshCw size={18} className={fetchingLeaderboard ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={() => { haptic('light'); onClose(); }} 
              className="w-11 h-11 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white border border-slate-700/50"
              aria-label="Close Leaderboard"
            >
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* Leaderboard Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 mb-4 shrink-0">
          <button
            onClick={() => { haptic('light'); setLeaderboardTab('live'); }}
            className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              leaderboardTab === 'live' 
                ? 'bg-slate-800 text-amber-400 shadow-md border border-slate-700/60' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy size={14} className={leaderboardTab === 'live' ? 'text-amber-400' : 'text-slate-500'} />
            <span>Live & Shift Rank</span>
          </button>
          <button
            onClick={() => { haptic('light'); setLeaderboardTab('prev_month'); }}
            className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              leaderboardTab === 'prev_month' 
                ? 'bg-slate-800 text-sky-400 shadow-md border border-slate-700/60' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar size={14} className={leaderboardTab === 'prev_month' ? 'text-sky-400' : 'text-slate-500'} />
            <span>Previous Month</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-1">
          {leaderboardTab === 'prev_month' ? (
            <PreviousMonthSummary 
              summaries={allShiftSummariesList.length > 0 ? allShiftSummariesList : (adminAllSummaries.length > 0 ? adminAllSummaries : shiftSummaries)}
              theme={theme}
              currentDate={new Date()}
            />
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Sparkles size={14} className="text-sky-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Zone Competition</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(zoneXP).map(([zone, xp]) => {
                    const currentXp = xp as number;
                    const values = Object.values(zoneXP) as number[];
                    const total = values.reduce((a, b) => a + b, 0) || 1;
                    const pct = (currentXp / total) * 100;
                    const zTheme = THEMES[zone] || THEMES.AMBIENT;
                    return (
                      <div key={zone} className={`bg-slate-800/40 border border-slate-700/50 ${theme.radius} p-2.5 flex flex-col items-center`}>
                        <span className={`text-[8px] font-black uppercase tracking-tighter mb-1 ${zTheme.text}`}>{zone}</span>
                        <span className="text-xs font-black text-white">{currentXp.toLocaleString()}</span>
                        <div className={`w-full bg-slate-900 h-1 ${theme.radius} mt-2 overflow-hidden`}>
                          <div className={`h-full ${zTheme.bg}`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {liveUsers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Active Now</span>
                  </div>
                  {liveUsers.map((user, idx) => (
                    <div key={`live-${idx}`} className="bg-slate-800/80 p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-500/20 flex flex-col gap-3 shadow-lg shadow-emerald-500/5">
                      <div className="flex items-center justify-between gap-2.5 sm:gap-4 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs border border-emerald-500/30 shrink-0">
                            LIVE
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className="truncate">{user.name}</span>
                              {user.isBot && (
                                <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider font-black shrink-0 flex items-center gap-1">
                                  <Bot size={10} className="text-cyan-400" /> AI BOT
                                </span>
                              )}
                              <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-tighter shrink-0 ${user.status === 'picking' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : user.status === 'break' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-400/10 text-slate-400 border-slate-400/20'}`}>
                                {user.status || 'Active'}
                              </span>
                            </div>
                            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider truncate">
                              {user.department}
                              {user.currentOrder && (
                                <span className="ml-1.5 text-sky-400 font-bold border border-sky-500/20 px-1 rounded bg-sky-500/10">Order: {user.currentOrder}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
                          {idx < 5 && (
                            <LeaderboardInteractions
                              targetName={user.name}
                              senderName={currentOperator || 'You'}
                              rank={idx + 1}
                              onSent={(msg) => onToast(msg, 'success')}
                            />
                          )}
                          <div className="text-right">
                            <div className="text-lg sm:text-xl font-black text-emerald-400 leading-tight">{user.rate}</div>
                            <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-none">P/H</div>
                          </div>
                        </div>
                      </div>

                      {(user.customStatus || user.listeningTo) && (
                        <div className="bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-700/30 flex items-center gap-2">
                          <span className="text-xs animate-bounce shrink-0">🎵</span>
                          <span className="text-[10px] sm:text-[11px] text-indigo-300 italic truncate font-medium">Vibe: <span className="text-white not-italic font-semibold">{user.customStatus || user.listeningTo}</span></span>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/50">
                        <div className="flex flex-col">
                          <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-wider">Activity</span>
                          <span className="text-xs text-white font-mono break-all">{user.totalCases || 0} cs • {user.xp || 0} XP</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-wider">Time Active</span>
                          <span className="text-xs text-white font-mono">{user.activeSeconds ? formatHHMM(user.activeSeconds) : '00h 00m'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">All-Time Rankings</span>
                </div>
                {/* Merge live users into leaderboard */}
                {leaderboardData.map((entry, idx) => {
                  const liveUser = liveUsers.find(u => u.name.toUpperCase() === entry.name.toUpperCase());
                  const displayRate = liveUser ? liveUser.rate : entry.rate;
                  const isLive = !!liveUser;

                  return (
                    <div key={idx} className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col gap-2 ${isLive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                      <div className="flex items-center justify-between gap-2.5 sm:gap-4 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${idx === 0 ? 'bg-amber-400 text-slate-900 shadow-md shadow-amber-400/20' : idx === 1 ? 'bg-slate-300 text-slate-900' : idx === 2 ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white truncate flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className="truncate">{entry.name}</span>
                              {(entry.isBot || liveUser?.isBot) && (
                                <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider font-black shrink-0 flex items-center gap-1">
                                  <Bot size={10} className="text-cyan-400" /> AI BOT
                                </span>
                              )}
                              {isLive && (
                                <span className="text-[8px] sm:text-[9px] bg-emerald-500 text-white px-1 rounded uppercase animate-pulse">Live</span>
                              )}
                            </div>
                            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider truncate">
                              {entry.department} • {entry.date}
                            </div>
                            {entry.cases !== undefined && (
                              <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium">
                                {entry.cases || 0} cases
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
                          {idx < 5 && (
                            <LeaderboardInteractions
                              targetName={entry.name}
                              senderName={currentOperator || 'You'}
                              rank={idx + 1}
                              onSent={(msg) => onToast(msg, 'success')}
                            />
                          )}
                          <div className="text-right">
                            <div className={`text-base sm:text-lg font-black leading-tight ${displayRate >= (entry.targetRate || 200) ? 'text-emerald-400' : 'text-slate-400'}`}>{displayRate}</div>
                            <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-none">Goal: {entry.targetRate || 200}</div>
                          </div>
                        </div>
                      </div>
                      {isLive && liveUser && (liveUser.customStatus || liveUser.listeningTo) && (
                        <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-800/30 flex items-center gap-2 mt-1">
                          <span className="text-[10px] animate-pulse shrink-0">🎵</span>
                          <span className="text-[10px] sm:text-[11px] text-indigo-300 italic truncate font-medium">Vibe: <span className="text-slate-200 not-italic font-semibold">{liveUser.customStatus || liveUser.listeningTo}</span></span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {leaderboardData.length === 0 && liveUsers.length === 0 && (
                  <div className="text-center py-12 text-slate-400 italic">No rankings yet. Finish a shift to be first!</div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <button 
          className="w-full mt-4 py-3.5 bg-slate-800 text-white rounded-2xl font-bold text-base hover:bg-slate-700 transition-all border border-slate-700 shrink-0"
          onClick={() => { haptic('light'); onClose(); }}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};
