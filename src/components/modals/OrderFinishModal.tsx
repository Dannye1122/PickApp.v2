import React from 'react';
import { CheckCircle, Camera, X } from 'lucide-react';
import { haptic } from '../../services/hapticService';
import { CapCamera, CameraResultType, CameraSource } from '../../lib/capacitorMocks';
import { triggerWebCamera } from '../../utils/webCamera';
import { compressImage } from '../../lib/imageCompressor';

interface OrderFinishModalProps {
    orderFinishedData: { cases: number; finalRate: number } | null;
    pendingLabelImages: string[];
    setPendingLabelImages: React.Dispatch<React.SetStateAction<string[]>>;
    setViewingLabels: (labels: string[]) => void;
    onConfirmFinish: () => void;
}

export const OrderFinishModal: React.FC<OrderFinishModalProps> = ({
    orderFinishedData,
    pendingLabelImages,
    setPendingLabelImages,
    setViewingLabels,
    onConfirmFinish
}) => {
    if (!orderFinishedData) return null;

    const handleTakePhoto = async () => {
        haptic('light');
        if (pendingLabelImages.length >= 4) {
            alert("Maximum of 4 pictures allowed.");
            return;
        }
        try {
            let dataUrl = '';
            let useFallback = false;
            try {
                const permissions = await CapCamera.checkPermissions();
                if (permissions.camera === 'granted') {
                    const photo = await CapCamera.getPhoto({
                        quality: 40,
                        allowEditing: false,
                        resultType: CameraResultType.DataUrl,
                        source: CameraSource.Camera
                    });
                    dataUrl = photo.dataUrl || '';
                } else if (permissions.camera === 'prompt' || permissions.camera === 'denied') {
                    const request = await CapCamera.requestPermissions();
                    if (request.camera === 'granted') {
                        const photo = await CapCamera.getPhoto({
                            quality: 40,
                            allowEditing: false,
                            resultType: CameraResultType.DataUrl,
                            source: CameraSource.Camera
                        });
                        dataUrl = photo.dataUrl || '';
                    } else {
                        useFallback = true;
                    }
                } else {
                    useFallback = true;
                }
            } catch (capErr) {
                console.warn("Capacitor camera failed or unsupported, using web fallback.", capErr);
                useFallback = true;
            }

            if (useFallback || !dataUrl) {
                dataUrl = await triggerWebCamera();
            }

            if (dataUrl) {
                const compressed = await compressImage(dataUrl);
                setPendingLabelImages(prev => [...prev, compressed]);
                haptic('medium');
            }
        } catch (e) {
            alert("Failed to access camera: " + (e instanceof Error ? e.message : 'Unknown error'));
        }
    };

    return (
        <div className="fixed inset-0 z-[150] bg-slate-950 flex flex-col animate-in fade-in zoom-in-95 duration-200 pt-safe-top pb-safe-bottom">
            <div className="flex-1 overflow-y-auto p-6 pb-20">
                <div className="flex justify-center mb-6 mt-6">
                    <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-emerald-500/20 shadow-lg flex items-center justify-center">
                        <CheckCircle className="text-emerald-500" size={32} />
                    </div>
                </div>
                
                <h2 className="text-[26px] font-black text-white text-center tracking-tight mb-2">Order Finish Procedure</h2>
                <p className="text-slate-400 text-sm text-center mb-8 font-medium">Follow the steps below to save your pick run securely</p>
                
                <div className="bg-slate-900/60 rounded-[28px] p-6 border border-slate-800 shadow-xl mb-8 space-y-8">
                    <div className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0">1</div>
                        <div>
                            <h3 className="text-white font-bold text-[13px] uppercase tracking-wider mb-1.5">Review Order Performance</h3>
                            <p className="text-slate-400 text-[13px]">Cases: <span className="text-white font-bold">{orderFinishedData.cases}</span> <span className="mx-1 text-slate-600">|</span> Speed: <span className="text-emerald-400 font-bold">{orderFinishedData.finalRate} P/H.</span></p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0">2</div>
                        <div>
                            <h3 className="text-white font-bold text-[13px] uppercase tracking-wider mb-1.5">Capture Store Labels (Optional)</h3>
                            <p className="text-slate-500 text-[13px] leading-relaxed">Take photo of routing label slips for digital audit trails. Yes, multiple photos are supported!</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0">3</div>
                        <div>
                            <h3 className="text-white font-bold text-[13px] uppercase tracking-wider mb-1.5">Finalize & Add To History</h3>
                            <p className="text-slate-500 text-[13px] leading-relaxed">Click <span className="text-emerald-400 font-bold">Save & Finish</span> below to record this run in your shift log.</p>
                        </div>
                    </div>
                </div>

                {pendingLabelImages.length > 0 && (
                    <div className="mb-4 animate-in fade-in slide-in-from-bottom-4">
                        <h4 className="text-[11px] uppercase font-bold tracking-widest text-slate-500 mb-3">Photos Captured ({pendingLabelImages.length})</h4>
                        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                            {pendingLabelImages.map((img, i) => (
                                <div key={i} className="relative w-[140px] h-[90px] rounded-2xl overflow-hidden shrink-0 border border-slate-700 bg-slate-900 group shadow-lg cursor-pointer" onClick={() => setViewingLabels([img])}>
                                    <img src={img} className="w-full h-full object-cover" alt={`Label ${i + 1}`} />
                                    <div className="absolute bottom-2 left-2 bg-slate-950/80 px-2.5 py-1 rounded-md text-[10px] text-white font-bold backdrop-blur-sm shadow-sm border border-white/10">Label {i + 1}</div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setPendingLabelImages(prev => prev.filter((_, idx) => idx !== i)); haptic('light'); }} 
                                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-950/80 flex items-center justify-center text-white backdrop-blur border border-white/10 opacity-80 hover:opacity-100 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-5 pb-10 bg-slate-950 flex gap-4 z-10 max-w-2xl mx-auto pb-safe-bottom pt-6 border-t border-slate-900">
                <button 
                    className="flex-1 py-4 bg-[#0ea5e9] text-white rounded-[20px] font-bold text-base flex flex-col sm:flex-row items-center justify-center gap-2 hover:bg-[#0284c7] transition-colors active:scale-95 shadow-lg shadow-[#0ea5e9]/20"
                    onClick={handleTakePhoto}
                >
                    <Camera size={20} /> Take Photo
                </button>
                <button 
                    className="flex-1 py-4 bg-emerald-500 text-white rounded-[20px] font-bold text-base flex flex-col sm:flex-row items-center justify-center gap-2 hover:bg-emerald-400 transition-colors active:scale-95 shadow-lg shadow-emerald-500/20"
                    onClick={onConfirmFinish}
                >
                    <CheckCircle size={20} /> Save & Finish
                </button>
            </div>
        </div>
    );
};
