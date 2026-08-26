import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface AppUIState {
    showSettings: boolean;
    setShowSettings: (val: boolean) => void;
    showSummary: boolean;
    setShowSummary: (val: boolean) => void;
    showHistory: boolean;
    setShowHistory: (val: boolean) => void;
    showRota: boolean;
    setShowRota: (val: boolean) => void;
    showRestoreModal: boolean;
    setShowRestoreModal: (val: boolean) => void;
    showInstallTutorial: boolean;
    setShowInstallTutorial: (val: boolean) => void;
    showLeaderboard: boolean;
    setShowLeaderboard: (val: boolean) => void;
    showInviteModal: boolean;
    setShowInviteModal: (val: boolean) => void;
    showNotificationHub: boolean;
    setShowNotificationHub: (val: boolean) => void;
    showClockInModal: boolean;
    setShowClockInModal: (val: boolean) => void;
    showBetaSurvey: boolean;
    setShowBetaSurvey: (val: boolean) => void;
    toast: {message: string, type: 'error' | 'success' | 'info'} | null;
    showToast: (message: string, type?: 'error' | 'success' | 'info') => void;
}

const AppUIContext = createContext<AppUIState | undefined>(undefined);

export function AppUIProvider({ children }: { children: ReactNode }) {
    const [showSettings, setShowSettings] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showRota, setShowRota] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [showInstallTutorial, setShowInstallTutorial] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showNotificationHub, setShowNotificationHub] = useState(false);
    const [showClockInModal, setShowClockInModal] = useState(false);
    const [showBetaSurvey, setShowBetaSurvey] = useState(false);
    const [toast, setToast] = useState<{message: string, type: 'error' | 'success' | 'info'} | null>(null);

    const showToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const value = {
        showSettings, setShowSettings,
        showSummary, setShowSummary,
        showHistory, setShowHistory,
        showRota, setShowRota,
        showRestoreModal, setShowRestoreModal,
        showInstallTutorial, setShowInstallTutorial,
        showLeaderboard, setShowLeaderboard,
        showInviteModal, setShowInviteModal,
        showNotificationHub, setShowNotificationHub,
        showClockInModal, setShowClockInModal,
        showBetaSurvey, setShowBetaSurvey,
        toast, showToast
    };

    return <AppUIContext.Provider value={value}>{children}</AppUIContext.Provider>;
}

export function useAppUI() {
    const context = useContext(AppUIContext);
    if (context === undefined) {
        throw new Error('useAppUI must be used within an AppUIProvider');
    }
    return context;
}
