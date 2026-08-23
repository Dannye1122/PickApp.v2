import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, Share2, Copy, Check, X, Users, Sparkles, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { haptic } from '../services/hapticService';
import { Share } from '@capacitor/share';

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose }) => {
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [shareSuccess, setShareSuccess] = useState(false);

    // Current web URL or shared production URL
    const appUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'https://ais-pre-734weu2yuruq4kkrcrtfq3-126359002329.europe-west3.run.app';

    const shareTitle = "Join PickApp — Real-Time Warehouse Picking & Leaderboards";
    const shareMessage = `Hey! Join me on PickApp to track pick rates, 45-min exemption math, live leaderboards, and shift stats in real-time. Access here: ${appUrl}`;

    useEffect(() => {
        if (isOpen && appUrl) {
            QRCode.toDataURL(appUrl, {
                width: 280,
                margin: 2,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff'
                },
                errorCorrectionLevel: 'H'
            })
            .then(url => setQrDataUrl(url))
            .catch(err => console.error('Failed to generate QR code', err));
        }
    }, [isOpen, appUrl]);

    const handleCopyLink = async () => {
        haptic('light');
        try {
            await navigator.clipboard.writeText(appUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const handleNativeShare = async () => {
        haptic('medium');
        try {
            if (Share) {
                const canShare = await Share.canShare();
                if (canShare.value) {
                    await Share.share({
                        title: shareTitle,
                        text: shareMessage,
                        url: appUrl,
                        dialogTitle: 'Invite Colleague to PickApp'
                    });
                    setShareSuccess(true);
                    setTimeout(() => setShareSuccess(false), 2500);
                    return;
                }
            }
            if (navigator.share) {
                await navigator.share({
                    title: shareTitle,
                    text: shareMessage,
                    url: appUrl
                });
                setShareSuccess(true);
                setTimeout(() => setShareSuccess(false), 2500);
            } else {
                handleCopyLink();
            }
        } catch (err) {
            console.warn('Share dismissed or failed', err);
        }
    };

    const handleDownloadQr = () => {
        haptic('light');
        if (!qrDataUrl) return;
        const link = document.createElement('a');
        link.href = qrDataUrl;
        link.download = 'pickapp-invite-qr.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[250] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 pt-safe-top pb-safe-bottom"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative flex flex-col items-center text-center overflow-hidden"
                >
                    {/* Background Ambient Glow */}
                    <div className="absolute -top-16 -right-16 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Close Button */}
                    <button 
                        onClick={() => { haptic('light'); onClose(); }}
                        className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors active:scale-95"
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>

                    {/* Header */}
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-emerald-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3 mt-1">
                        <Users size={24} />
                    </div>

                    <h2 className="text-xl font-black text-white tracking-tight italic uppercase">Invite Colleague</h2>
                    <p className="text-xs font-semibold text-slate-400 mt-1 max-w-[240px]">
                        Scan or share to connect your team on the live floor board
                    </p>

                    {/* QR Code Card */}
                    <div className="my-5 p-4 bg-white rounded-2xl shadow-xl border-4 border-slate-800 flex flex-col items-center relative group">
                        {qrDataUrl ? (
                            <img 
                                src={qrDataUrl} 
                                alt="PickApp Invite QR Code" 
                                className="w-48 h-48 rounded-lg object-contain"
                            />
                        ) : (
                            <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400">
                                <QrCode size={32} />
                            </div>
                        )}
                        <div className="mt-2 text-[10px] font-black text-slate-900 tracking-wider uppercase flex items-center gap-1">
                            <Sparkles size={10} className="text-sky-600" />
                            SCAN TO OPEN PICKAPP
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="w-full space-y-2.5">
                        {/* Share Button */}
                        <button
                            onClick={handleNativeShare}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-98 transition-all"
                        >
                            <Share2 size={16} />
                            {shareSuccess ? 'Link Shared!' : 'Share App Link'}
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                            {/* Copy Link Button */}
                            <button
                                onClick={handleCopyLink}
                                className={`py-2.5 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors active:scale-95 ${
                                    copied 
                                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                                        : 'bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-800'
                                }`}
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? 'Copied!' : 'Copy Link'}
                            </button>

                            {/* Download QR Button */}
                            <button
                                onClick={handleDownloadQr}
                                className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                            >
                                <Download size={14} />
                                Save QR
                            </button>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <p className="text-[10px] text-slate-500 font-medium mt-4">
                        Works instantly on mobile & desktop browsers — no app store needed
                    </p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
