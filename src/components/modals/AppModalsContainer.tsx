import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { OrderFinishModal } from './OrderFinishModal';
import { ShiftSummaryModal } from './ShiftSummaryModal';
import { CaseUnlockModal } from './CaseUnlockModal';
import { ConfirmDialogModal } from './ConfirmDialogModal';
import { InstallTutorialModal } from './InstallTutorialModal';
import { NotificationHubModal } from './NotificationHubModal';
import { AboutPickApp } from '../AboutPickApp';
import { AboutDeveloper } from '../AboutDeveloper';
import { InviteModal } from '../InviteModal';
import { BetaSurveyModal } from '../BetaSurveyModal';
import { MonthlyReportNotificationModal } from '../MonthlyReportNotificationModal';
import VoiceAssistant from '../VoiceAssistant';
import { InteractionToast } from '../leaderboard/InteractionToast';
import { sendSocialInteraction } from '../../services/leaderboardService';

export interface AppModalsContainerProps {
  theme: any;
  shiftData: any;
  userProfile: any;
  currentWarehouseId: string;
  currentDept: any;
  getCleanName: () => string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;

  // Celebration state
  showCelebration: boolean;
  celebrationTitle: string;
  celebrationSubtitle: string;

  // Saving overlay state
  isSavingShift: boolean;

  // Order finish modal state
  orderFinishedData: any;
  pendingLabelImages: string[];
  setPendingLabelImages: React.Dispatch<React.SetStateAction<string[]>>;
  setViewingLabels: (val: boolean) => void;
  confirmFinishPick: (casesOverride?: number, photoUrl?: string) => void;

  // Shift summary modal state
  showSummary: boolean;
  setShowSummary: (val: boolean) => void;
  getSummaryMessage: () => string;
  isShiftFinalized: boolean;
  finalizedStats: any;
  rate: number;
  targetRate: number;
  activeElapsedSeconds: number;
  isAisles: boolean;
  finalExemption: number;
  accruedPostDinner: number;
  accruedDinner: number;
  accruedClockOut: number;
  shiftNotes: string;
  setShiftNotes: (notes: string) => void;
  updateShiftData: (updates: any) => void;
  takeScreenshot: () => Promise<string | null>;
  downloadReport: () => void;
  endShift: () => void;

  // Case unlock modal state
  isUnlockingCaseCount: boolean;
  isEditingCaseCount: boolean;
  unlockPin: string;
  setUnlockPin: (pin: string) => void;
  unlockError: string;
  tempCaseCount: string;
  setTempCaseCount: (count: string) => void;
  handleVerifyUnlock: () => void;
  handleSaveModifiedCaseCount: () => void;
  setIsUnlockingCaseCount: (val: boolean) => void;
  setIsEditingCaseCount: (val: boolean) => void;

  // Confirm dialog state
  confirmDialog: any;
  setConfirmDialog: (dialog: any) => void;

  // Install tutorial state
  showInstallTutorial: boolean;
  setShowInstallTutorial: (val: boolean) => void;

  // Static / Info Modals
  showAbout: boolean;
  setShowAbout: (val: boolean) => void;
  showAboutDeveloper: boolean;
  setShowAboutDeveloper: (val: boolean) => void;
  showInviteModal: boolean;
  setShowInviteModal: (val: boolean) => void;
  showBetaSurvey: boolean;
  setShowBetaSurvey: (val: boolean) => void;

  // Monthly Report
  monthlyReportNotif: {
    isOpen: boolean;
    monthName: string;
    reportKey: string;
  };
  setMonthlyReportNotif: React.Dispatch<React.SetStateAction<{ isOpen: boolean; monthName: string; reportKey: string; }>>;

  // Notification Hub
  showNotificationHub: boolean;
  setShowNotificationHub: (val: boolean) => void;
  shiftNotifications: any[];
  handleMarkNotificationAsRead: (id: string) => void;
  handleMarkAllNotificationsAsRead: () => void;
  handleClearAllNotifications: () => void;
  handleDeleteNotification: (id: string) => void;

  // Voice Assistant
  toggleVoice: () => void;
  handleVoiceCommand: (cmd: string) => void;
  announcement: string;

  // Interaction Toast
  activeInteraction: any;
  setActiveInteraction: (interaction: any) => void;

  // Global Toast
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
}

export const AppModalsContainer: React.FC<AppModalsContainerProps> = ({
  theme,
  shiftData,
  userProfile,
  currentWarehouseId,
  currentDept,
  getCleanName,
  showToast,
  showCelebration,
  celebrationTitle,
  celebrationSubtitle,
  isSavingShift,
  orderFinishedData,
  pendingLabelImages,
  setPendingLabelImages,
  setViewingLabels,
  confirmFinishPick,
  showSummary,
  setShowSummary,
  getSummaryMessage,
  isShiftFinalized,
  finalizedStats,
  rate,
  targetRate,
  activeElapsedSeconds,
  isAisles,
  finalExemption,
  accruedPostDinner,
  accruedDinner,
  accruedClockOut,
  shiftNotes,
  setShiftNotes,
  updateShiftData,
  takeScreenshot,
  downloadReport,
  endShift,
  isUnlockingCaseCount,
  isEditingCaseCount,
  unlockPin,
  setUnlockPin,
  unlockError,
  tempCaseCount,
  setTempCaseCount,
  handleVerifyUnlock,
  handleSaveModifiedCaseCount,
  setIsUnlockingCaseCount,
  setIsEditingCaseCount,
  confirmDialog,
  setConfirmDialog,
  showInstallTutorial,
  setShowInstallTutorial,
  showAbout,
  setShowAbout,
  showAboutDeveloper,
  setShowAboutDeveloper,
  showInviteModal,
  setShowInviteModal,
  showBetaSurvey,
  setShowBetaSurvey,
  monthlyReportNotif,
  setMonthlyReportNotif,
  showNotificationHub,
  setShowNotificationHub,
  shiftNotifications,
  handleMarkNotificationAsRead,
  handleMarkAllNotificationsAsRead,
  handleClearAllNotifications,
  handleDeleteNotification,
  toggleVoice,
  handleVoiceCommand,
  announcement,
  activeInteraction,
  setActiveInteraction,
  toast,
}) => {
  return (
    <>
      {/* Global Overlays & Modals */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-slate-900/90 backdrop-blur-xl p-8 rounded-[40px] border border-emerald-500/30 text-center shadow-2xl relative overflow-hidden">
              <motion.div 
                animate={{ y: [-10, 0, -10] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl mb-4"
              >
                {celebrationTitle.includes('SKIN') ? '✨' : '🏆'}
              </motion.div>
              <h2 className="text-white text-3xl font-black italic tracking-tighter mb-2">{celebrationTitle}</h2>
              <p className="text-emerald-400 font-bold text-lg">{celebrationSubtitle}</p>
              <div className="mt-6 flex gap-2 justify-center">
                <Sparkles className="text-emerald-400 animate-pulse" />
                <Sparkles className="text-sky-400 animate-pulse delay-75" />
                <Sparkles className="text-purple-400 animate-pulse delay-150" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isSavingShift && (
        <div id="saving-overlay" className="fixed inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-[450] px-4 backdrop-blur-md">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
          <h3 className="text-white text-xl font-bold mb-2">Finalizing Shift</h3>
          <p className="text-slate-400 text-sm text-center">Capturing history snapshot & saving data.<br/>Please do not close the app.</p>
        </div>
      )}

      {/* Order Finish Procedure Modal */}
      <OrderFinishModal
        orderFinishedData={orderFinishedData}
        pendingLabelImages={pendingLabelImages}
        setPendingLabelImages={setPendingLabelImages}
        setViewingLabels={setViewingLabels}
        onConfirmFinish={confirmFinishPick}
      />

      {/* Shift Summary Modal */}
      <ShiftSummaryModal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        theme={theme}
        getSummaryMessage={getSummaryMessage}
        isShiftFinalized={isShiftFinalized}
        finalizedStats={finalizedStats}
        shiftData={shiftData}
        rate={rate}
        targetRate={targetRate}
        activeElapsedSeconds={activeElapsedSeconds}
        isAisles={isAisles}
        finalExemption={finalExemption}
        accruedPostDinner={accruedPostDinner}
        accruedDinner={accruedDinner}
        accruedClockOut={accruedClockOut}
        shiftNotes={shiftNotes}
        setShiftNotes={setShiftNotes}
        updateShiftData={updateShiftData}
        takeScreenshot={takeScreenshot}
        downloadReport={downloadReport}
        endShift={endShift}
      />

      {/* Case Count Unlock / Edit Modal */}
      <CaseUnlockModal
        isUnlockingCaseCount={isUnlockingCaseCount}
        isEditingCaseCount={isEditingCaseCount}
        unlockPin={unlockPin}
        setUnlockPin={setUnlockPin}
        unlockError={unlockError}
        tempCaseCount={tempCaseCount}
        setTempCaseCount={setTempCaseCount}
        handleVerifyUnlock={handleVerifyUnlock}
        handleSaveModifiedCaseCount={handleSaveModifiedCaseCount}
        onClose={() => {
          setIsUnlockingCaseCount(false);
          setIsEditingCaseCount(false);
        }}
      />

      {/* Confirm Dialog Overlay */}
      <ConfirmDialogModal
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
        theme={theme}
      />

      {/* Install Tutorial Overlay */}
      <InstallTutorialModal
        isOpen={showInstallTutorial}
        onClose={() => setShowInstallTutorial(false)}
        theme={theme}
      />

      {/* About PickApp Section */}
      <AboutPickApp isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <AboutDeveloper isOpen={showAboutDeveloper} onClose={() => setShowAboutDeveloper(false)} />
      <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />
      <BetaSurveyModal 
        isOpen={showBetaSurvey}
        onClose={() => setShowBetaSurvey(false)}
        username={getCleanName()}
        department={currentDept?.name || shiftData.department}
        zone={shiftData.zone}
        onSuccess={() => {
          showToast("Operational feedback recorded. Thank you!", "success");
        }}
      />
      <MonthlyReportNotificationModal
        isOpen={monthlyReportNotif.isOpen}
        onClose={() => setMonthlyReportNotif(prev => ({ ...prev, isOpen: false }))}
        monthName={monthlyReportNotif.monthName}
        reportKey={monthlyReportNotif.reportKey}
        warehouseId={currentWarehouseId}
        onSuccess={() => {
          showToast("Executive Monthly PDF Report Downloaded!", "success");
        }}
      />

      {/* Shift Notification Hub Modal */}
      <NotificationHubModal
        isOpen={showNotificationHub}
        onClose={() => setShowNotificationHub(false)}
        notifications={shiftNotifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onClearAll={handleClearAllNotifications}
        onDeleteNotification={handleDeleteNotification}
        onSendInteractionReply={async (recipient, type) => {
          const sender = (shiftData.operator || userProfile?.username || 'Teammate').toUpperCase().trim();
          const res = await sendSocialInteraction(sender, recipient, type);
          if (res && res.message) {
            showToast(res.message, "success");
          }
        }}
        currentOperator={(shiftData.operator || userProfile?.username || '').toUpperCase().trim()}
      />

      <VoiceAssistant 
        isActive={shiftData.voiceEnabled} 
        onToggle={toggleVoice}
        onCommand={handleVoiceCommand}
        announcementProp={announcement}
        customImage={shiftData.assistantImage}
      />

      {/* Global Forensic Notification Toast Overlay */}
      <div className="fixed top-safe-top left-0 right-0 z-[1000] pointer-events-none p-4 flex flex-col items-center gap-2">
        <InteractionToast 
          interaction={activeInteraction} 
          onDismiss={() => setActiveInteraction(null)} 
          onOpenHub={() => {
            setActiveInteraction(null);
            setShowNotificationHub(true);
          }}
          onQuickReply={async (recipient, type) => {
            const sender = (shiftData.operator || userProfile?.username || 'Teammate').toUpperCase().trim();
            const res = await sendSocialInteraction(sender, recipient, type);
            if (res && res.message) {
              showToast(res.message, "success");
            }
          }}
        />
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md border ${
                toast.type === 'error' ? 'bg-red-500/90 border-red-400 text-white' :
                toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' :
                'bg-slate-800/90 border-slate-700 text-white'
              } text-sm font-black tracking-tight pointer-events-auto flex items-center gap-3`}
            >
              {toast.type === 'error' && <AlertCircle size={16} />}
              {toast.type === 'success' && <CheckCircle size={16} />}
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
