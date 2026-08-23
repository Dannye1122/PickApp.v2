import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export const ConsentScreen = ({ onConsent }: { onConsent: () => void }) => {
    const [accepted, setAccepted] = useState(false);

    return (
        <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-center p-6 text-center pt-safe-top pb-safe-bottom">
            <ShieldCheck size={64} className="text-emerald-500 mb-6" />
            <h2 className="text-2xl font-black text-white italic mb-4 tracking-tighter">TERMS OF USE</h2>
            <div className="text-slate-400 mb-8 max-w-sm text-left overflow-y-auto max-h-60 bg-slate-900 p-4 rounded-lg text-sm">
                <p className="mb-4">By using PickApp, you agree to the following terms:</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li>You agree to use this application for official work duties only.</li>
                    <li>You understand that your actions may be logged for operational tracking.</li>
                    <li>You acknowledge that this tool is provided 'as is'.</li>
                    <li>You will keep your credentials secure and not share them.</li>
                </ul>
            </div>
            
            <label className="flex items-center gap-3 mb-6 text-slate-300 cursor-pointer min-h-[48px] p-2">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="h-6 w-6 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900" />
                <span className="text-sm font-medium">I have read and agree to the terms of use.</span>
            </label>

            <button 
                disabled={!accepted}
                onClick={onConsent}
                className={`w-full max-w-sm min-h-[56px] px-8 py-3 rounded-2xl font-black uppercase tracking-widest transition-transform ${accepted ? 'bg-white text-slate-900 hover:scale-[1.02] active:scale-95 shadow-lg shadow-white/10' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
            >
                CONTINUE
            </button>
        </div>
    );
};
