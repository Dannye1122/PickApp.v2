import React from 'react';
import { 
    ClockInModal,
    LeaderboardModal,
    RotaModal,
    RotaOverrideModal,
    HistoricalShiftModal,
    RestoreShiftModal,
    AdminPinModal
} from './index';
import { ShiftSummary, ThemeColors, UserProfile, LiveUser, LeaderboardEntry, ShiftData } from '../../types';

export interface HistoryLeaderboardOverlaysProps {
    theme: ThemeColors;
    haptic: (type?: 'light' | 'medium' | 'heavy') => void;
    
    // Clock In Modal
    showClockInModal: boolean;
    setShowClockInModal: (val: boolean) => void;
    manualClockType: 'in' | 'out' | 'pick_start';
    manualClockTime: string;
    setManualClockTime: (val: string) => void;
    manualStart: (timeStr: string) => void;
    manualPickStart: (timeStr: string) => void;
    manualEnd: (timeStr: string) => void;

    // Leaderboard Modal
    showLeaderboard: boolean;
    setShowLeaderboard: (val: boolean) => void;
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
    userProfile: UserProfile | null;
    showToast: (msg: string, type?: 'error' | 'success' | 'info') => void;

    // Viewing Stored Label Images
    viewingLabels: string[] | null;
    setViewingLabels: (val: string[] | null) => void;

    // Rota Modal
    showRota: boolean;
    setShowRota: (val: boolean) => void;
    shiftData: ShiftData;
    setShiftData: React.Dispatch<React.SetStateAction<ShiftData>>;
    mergedShiftSummaries: ShiftSummary[];
    setShiftSummaries: React.Dispatch<React.SetStateAction<ShiftSummary[]>>;
    fetchShiftSummaries: (targetUser: string, force?: boolean) => Promise<ShiftSummary[]>;
    isUserAdmin: () => boolean;
    announce: (msg: string) => void;
    
    // Rota Sub-modals & History
    viewingPastSummary: ShiftSummary | null;
    setViewingPastSummary: (val: ShiftSummary | null) => void;
    showRestoreModal: boolean;
    setShowRestoreModal: (val: boolean) => void;
    restoreText: string;
    setRestoreText: (val: string) => void;
    restoreStatus: any;
    setRestoreStatus: (val: any) => void;
    selectedFutureDate: Date | null;
    setSelectedFutureDate: (val: Date | null) => void;
    handleSetDayOverride: (overrideType: 'work' | 'holiday' | 'none', date: Date) => void;
    storedShiftPhotos: Record<string, string>;

    // Editing Past Labels
    editingOrderIndex: number | null;
    setEditingOrderIndex: (val: number | null) => void;
    editingOrderLabel: string;
    setEditingOrderLabel: (val: string) => void;
    handleSavePastOrderLabel: (idxToSave: number) => Promise<void>;

    // Admin PIN Modal
    pinModal: { show: boolean; type: 'clear_db' | 'view_secret_logs' | 'adjust_rota' | ''; input: string };
    setPinModal: React.Dispatch<React.SetStateAction<{ show: boolean; type: 'clear_db' | 'view_secret_logs' | 'adjust_rota' | ''; input: string }>>;
    onActiveSessionRestored?: (snapshotData: any) => void;
}

export const HistoryLeaderboardOverlays: React.FC<HistoryLeaderboardOverlaysProps> = ({
    theme,
    haptic,
    showClockInModal,
    setShowClockInModal,
    manualClockType,
    manualClockTime,
    setManualClockTime,
    manualStart,
    manualPickStart,
    manualEnd,
    showLeaderboard,
    setShowLeaderboard,
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
    userProfile,
    showToast,
    viewingLabels,
    setViewingLabels,
    showRota,
    setShowRota,
    shiftData,
    setShiftData,
    mergedShiftSummaries,
    setShiftSummaries,
    fetchShiftSummaries,
    isUserAdmin,
    announce,
    viewingPastSummary,
    setViewingPastSummary,
    showRestoreModal,
    setShowRestoreModal,
    restoreText,
    setRestoreText,
    restoreStatus,
    setRestoreStatus,
    selectedFutureDate,
    setSelectedFutureDate,
    handleSetDayOverride,
    storedShiftPhotos,
    editingOrderIndex,
    setEditingOrderIndex,
    editingOrderLabel,
    setEditingOrderLabel,
    handleSavePastOrderLabel,
    pinModal,
    setPinModal,
    onActiveSessionRestored
}) => {
    return (
        <>
            <ClockInModal 
                isOpen={showClockInModal}
                onClose={() => setShowClockInModal(false)}
                manualClockType={manualClockType}
                manualClockTime={manualClockTime}
                setManualClockTime={setManualClockTime}
                theme={theme}
                onConfirm={(type, time) => {
                    if (type === 'in') {
                        manualStart(time);
                    } else if (type === 'pick_start') {
                        manualPickStart(time);
                    } else {
                        manualEnd(time);
                    }
                }}
            />
            
            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                theme={theme}
                haptic={haptic}
                fetchingLeaderboard={fetchingLeaderboard}
                fetchLeaderboardManual={fetchLeaderboardManual}
                leaderboardTab={leaderboardTab}
                setLeaderboardTab={setLeaderboardTab}
                allShiftSummariesList={allShiftSummariesList}
                adminAllSummaries={adminAllSummaries}
                shiftSummaries={shiftSummaries}
                zoneXP={zoneXP}
                liveUsers={liveUsers}
                leaderboardData={leaderboardData}
                currentOperator={shiftData.operator || userProfile?.username || 'You'}
                onToast={(msg, type) => showToast(msg, type)}
            />

            {viewingLabels && viewingLabels.length > 0 && (
                <div className="fixed inset-0 z-[120] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
                    <div className="flex flex-col gap-6 w-full max-w-full my-auto pb-24 pt-8 items-center">
                    {viewingLabels.map((lbl, idx) => (
                        typeof lbl === 'string' && (lbl.startsWith('data:image') || lbl.startsWith('http') || lbl.startsWith('blob:') || lbl.startsWith('/')) ? (
                            <div key={idx} className="relative">
                                {viewingLabels.length > 1 && (
                                    <span className="absolute -top-3 -left-3 w-8 h-8 bg-sky-500 text-white rounded-full flex items-center justify-center font-bold shadow-lg z-10 border-2 border-black">{idx + 1}</span>
                                )}
                                <img src={lbl} alt={`Label ${idx + 1}`} className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
                            </div>
                        ) : (
                            <div key={idx} className="text-center p-8 bg-slate-900 rounded-2xl border border-rose-500 max-w-sm w-full mx-auto">
                                <div className="text-rose-500 text-4xl mb-4">⚠️</div>
                                <h3 className="text-white font-bold mb-2">Image Unavailable</h3>
                                <p className="text-slate-400 text-sm">This label was corrupted or saved incorrectly in a previous version of the app and cannot be recovered.</p>
                            </div>
                        )
                    ))}
                    </div>
                    <div className="fixed bottom-6 left-0 right-0 flex justify-center pb-safe">
                        <button 
                            onClick={() => setViewingLabels(null)}
                            className="px-8 py-3.5 bg-white text-black font-black uppercase tracking-widest text-xs rounded-full hover:bg-slate-100 transition-colors shadow-2xl border-4 border-black/20"
                        >
                            Close Labels
                        </button>
                    </div>
                </div>
            )}

            <RotaModal
                isOpen={showRota}
                onClose={() => setShowRota(false)}
                theme={theme}
                haptic={haptic}
                shiftData={shiftData}
                setShiftData={setShiftData}
                userProfile={userProfile}
                mergedShiftSummaries={mergedShiftSummaries}
                setShiftSummaries={setShiftSummaries}
                fetchShiftSummaries={fetchShiftSummaries}
                isUserAdmin={isUserAdmin}
                announce={announce}
                setViewingPastSummary={setViewingPastSummary}
                setShowRestoreModal={setShowRestoreModal}
                setRestoreText={setRestoreText}
                setRestoreStatus={setRestoreStatus}
                selectedFutureDate={selectedFutureDate}
                setSelectedFutureDate={setSelectedFutureDate}
            />

            <RotaOverrideModal
                selectedFutureDate={selectedFutureDate}
                onClose={() => setSelectedFutureDate(null)}
                onSelectOverride={handleSetDayOverride}
            />

            <HistoricalShiftModal
                viewingPastSummary={viewingPastSummary}
                onClose={() => setViewingPastSummary(null)}
                shiftData={shiftData}
                isUserAdmin={isUserAdmin}
                storedShiftPhotos={storedShiftPhotos}
                setShiftSummaries={setShiftSummaries}
                setViewingPastSummary={setViewingPastSummary}
                setViewingLabels={setViewingLabels}
                editingOrderIndex={editingOrderIndex}
                setEditingOrderIndex={setEditingOrderIndex}
                editingOrderLabel={editingOrderLabel}
                setEditingOrderLabel={setEditingOrderLabel}
                handleSavePastOrderLabel={handleSavePastOrderLabel}
            />

            <RestoreShiftModal
                isOpen={showRestoreModal}
                onClose={() => setShowRestoreModal(false)}
                restoreText={restoreText}
                setRestoreText={setRestoreText}
                restoreStatus={restoreStatus}
                setRestoreStatus={setRestoreStatus}
                operator={shiftData.operator || 'DASERGHIE'}
                onShiftRestored={(fresh) => setShiftSummaries(fresh)}
                onActiveSessionRestored={onActiveSessionRestored}
            />

            <AdminPinModal
                isOpen={pinModal.show}
                type={pinModal.type}
                input={pinModal.input}
                onInputChange={(newInput) => setPinModal({ ...pinModal, input: newInput })}
                onClose={() => setPinModal({ ...pinModal, show: false, input: '' })}
            />
        </>
    );
};
