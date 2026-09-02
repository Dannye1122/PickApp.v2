import React from 'react';
import { ClipboardCheck, RefreshCcw } from 'lucide-react';

interface MandatoryBetaFeedbackOverlayProps {
  requiresBetaFeedback: boolean;
  betaFeedbackData: {
    ergonomics: number;
    resilience: string;
    motivation: number;
    notes: string;
  };
  setBetaFeedbackData: React.Dispatch<React.SetStateAction<{
    ergonomics: number;
    resilience: string;
    motivation: number;
    notes: string;
  }>>;
  submittingBetaFeedback: boolean;
  handleSubmitBetaFeedback: () => Promise<void>;
}

export const MandatoryBetaFeedbackOverlay: React.FC<MandatoryBetaFeedbackOverlayProps> = ({
  requiresBetaFeedback,
  betaFeedbackData,
  setBetaFeedbackData,
  submittingBetaFeedback,
  handleSubmitBetaFeedback,
}) => {
  if (!requiresBetaFeedback) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-start p-4 text-center overflow-y-auto pt-safe-top pb-safe-bottom">
      <div className="max-w-md w-full bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in duration-200">
        <div className="absolute top-4 left-4 flex gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <ClipboardCheck size={56} className="text-emerald-400 mx-auto mb-4" />
        <h2 className="text-xl font-black text-white italic tracking-tighter uppercase mb-1">14-Shift Milestone</h2>
        <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase rounded-full mb-6">
          Mandatory Beta Log
        </div>
        
        <p className="text-slate-300 text-xs mb-6 leading-relaxed">
          You have completed 14 shifts in the PickApp pilot program. Please submit your operational feedback to permanently unlock the dashboard.
        </p>

        <div className="space-y-6 text-left">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">UI/UX Ergonomics</label>
            <p className="text-[10px] text-slate-500 mb-3">How easy was it to tap buttons and read data while moving or wearing gloves?</p>
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star}
                  onClick={() => setBetaFeedbackData({...betaFeedbackData, ergonomics: star})}
                  className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-all ${
                    betaFeedbackData.ergonomics === star 
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                  }`}
                >
                  {star}★
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Network Resilience</label>
            <p className="text-[10px] text-slate-500 mb-3">During Wi-Fi dead zones, did the app crash or preserve data?</p>
            <div className="space-y-2">
              {['Flawless (No data lost)', 'Lagged but recovered', 'Crashed/Lost data'].map((opt) => (
                <button 
                  key={opt}
                  onClick={() => setBetaFeedbackData({...betaFeedbackData, resilience: opt})}
                  className={`w-full py-2.5 px-3 rounded-lg border text-xs font-bold transition-all text-left ${
                    betaFeedbackData.resilience === opt 
                      ? 'bg-sky-500/20 border-sky-500 text-sky-400' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full border ${betaFeedbackData.resilience === opt ? 'bg-sky-500 border-sky-400' : 'border-slate-600'}`} />
                    {opt}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Motivation Impact</label>
            <p className="text-[10px] text-slate-500 mb-2">Did Live-Pace & Stretch Goals push you faster? {betaFeedbackData.motivation}/5</p>
            <input 
              type="range" min="1" max="5" step="1"
              value={betaFeedbackData.motivation}
              onChange={(e) => setBetaFeedbackData({...betaFeedbackData, motivation: parseInt(e.target.value)})}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-bold uppercase">
              <span>Distracting</span>
              <span>Highly Motivating</span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Qualitative Notes (Optional)</label>
            <textarea 
              placeholder="Any workflow friction or suggestions..."
              value={betaFeedbackData.notes}
              onChange={(e) => setBetaFeedbackData({...betaFeedbackData, notes: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 min-h-[80px]"
            />
          </div>
        </div>

        <button 
          disabled={submittingBetaFeedback || !betaFeedbackData.ergonomics || !betaFeedbackData.resilience}
          onClick={handleSubmitBetaFeedback}
          className={`w-full mt-6 py-4 rounded-xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${
            (betaFeedbackData.ergonomics && betaFeedbackData.resilience && !submittingBetaFeedback)
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-[0.98]' 
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {submittingBetaFeedback ? <RefreshCcw size={16} className="animate-spin" /> : null}
          <span>{submittingBetaFeedback ? 'SUBMITTING...' : 'SUBMIT LOG & UNLOCK'}</span>
        </button>
      </div>
    </div>
  );
};
