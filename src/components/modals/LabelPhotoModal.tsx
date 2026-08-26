import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Tag, Calendar, Sparkles } from 'lucide-react';

interface LabelPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string | null;
  orderNumber?: string | number;
  storeLabel?: string;
  timestamp?: string | number;
}

export const LabelPhotoModal: React.FC<LabelPhotoModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  orderNumber,
  storeLabel,
  timestamp
}) => {
  if (!isOpen || !photoUrl) return null;

  const handleDownload = () => {
    try {
      const a = document.createElement('a');
      a.href = photoUrl;
      a.download = `PickApp_Label_${orderNumber || 'photo'}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.warn('Download error:', e);
    }
  };

  const formattedDate = timestamp 
    ? (typeof timestamp === 'number' ? new Date(timestamp).toLocaleTimeString() : String(timestamp))
    : new Date().toLocaleTimeString();

  return (
    <AnimatePresence>
      <div 
        id="label-photo-modal-overlay"
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          id="label-photo-modal-content"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.2 }}
          className="relative max-w-md w-full bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Label Inspection {orderNumber ? `#${orderNumber}` : ''}
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {formattedDate}
                </p>
              </div>
            </div>
            <button
              id="label-photo-modal-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Photo Preview Canvas */}
          <div className="relative p-4 flex items-center justify-center bg-slate-950/90 min-h-[260px] max-h-[60vh] overflow-auto">
            <img
              src={photoUrl}
              alt="Scanned Label Photo"
              referrerPolicy="no-referrer"
              className="max-h-[50vh] w-auto max-w-full object-contain rounded-lg border border-slate-800 shadow-md"
            />
          </div>

          {/* Store Label Badge if present */}
          {storeLabel && (
            <div className="px-5 py-2.5 bg-slate-800/60 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                OCR Detected Store:
              </span>
              <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {storeLabel}
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-end gap-2">
            <button
              id="label-photo-modal-download-btn"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download Photo
            </button>
            <button
              id="label-photo-modal-done-btn"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default LabelPhotoModal;
