import React from 'react';
import { ShieldAlert, RefreshCcw } from 'lucide-react';
import { APP_VERSION } from '../../constants/version';

interface MandatoryUpdateOverlayProps {
  isAppBlocked: boolean;
  minAllowedVersion: string;
  availableUpdate: any;
  consentUpdate: boolean;
  setConsentUpdate: (val: boolean) => void;
  updating: boolean;
  handleUpdateApp: () => Promise<void>;
}

export const MandatoryUpdateOverlay: React.FC<MandatoryUpdateOverlayProps> = ({
  isAppBlocked,
  minAllowedVersion,
  availableUpdate,
  consentUpdate,
  setConsentUpdate,
  updating,
  handleUpdateApp,
}) => {
  if (!isAppBlocked) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-center p-6 text-center overflow-y-auto pt-safe-top pb-safe-bottom">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <div className="absolute top-4 left-4 flex gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
        </div>
        <ShieldAlert size={56} className="text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-black text-white italic tracking-tighter uppercase mb-1">Update Mandatory</h2>
        <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase rounded-full mb-4">
          System v{APP_VERSION} ➔ v{minAllowedVersion}
        </div>
        
        <p className="text-slate-400 text-xs mb-5 leading-relaxed">
          A newer version of PickApp is required for safe operation and synchronization with the warehouse database.
        </p>

        {availableUpdate && availableUpdate.notes && availableUpdate.notes.length > 0 && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left mb-6 space-y-2.5">
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">What's New in v{availableUpdate.version}:</span>
            <ul className="space-y-1.5 pt-0.5">
              {availableUpdate.notes.map((note: string, idx: number) => (
                <li key={idx} className="text-[11px] text-slate-300 flex items-start gap-2">
                  <span className="text-amber-500 select-none font-bold">▪</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-slate-950/45 p-3.5 border border-slate-800/40 rounded-2xl mb-6">
          <label className="flex items-start gap-3 text-left text-slate-300 cursor-pointer select-none">
            <input 
              type="checkbox" 
              className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0 cursor-pointer"
              checked={consentUpdate} 
              onChange={(e) => setConsentUpdate(e.target.checked)} 
            />
            <span className="text-[11px] font-medium leading-normal text-slate-400">
              I consent to update and understand I must reload to obtain the newest PickApp build.
            </span>
          </label>
        </div>

        <button 
          disabled={!consentUpdate || updating}
          onClick={async () => {
            if (availableUpdate) {
              await handleUpdateApp();
            } else {
              window.location.reload();
            }
          }}
          className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${
            consentUpdate && !updating 
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.98]' 
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {updating ? <RefreshCcw size={16} className="animate-spin" /> : null}
          <span>{updating ? 'INSTALLING UPDATE...' : 'APPROVE & INSTALL UPDATE'}</span>
        </button>
      </div>
    </div>
  );
};
