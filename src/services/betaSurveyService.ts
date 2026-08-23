// Semi-monthly (every 14 days) Survey Trigger & Tracking Engine for PickApp

const LAST_SURVEY_TIMESTAMP_KEY = 'pickapp_last_beta_survey_timestamp';
const SURVEY_SNOOZE_TIMESTAMP_KEY = 'pickapp_beta_survey_snooze_timestamp';
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000; // Twice a month (14 days)
const SNOOZE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 3 days snooze if dismissed

export interface SurveySubmission {
    ergonomics: number; // 1 to 5
    resilience: string; // 'Flawless Operation', 'Minor Delay', 'Sync Glitch'
    motivation: number; // 1 to 5
    notes?: string;
    department?: string;
    zone?: string;
    appVersion?: string;
}

/**
 * Check whether the operator is eligible for their semi-monthly survey at shift end
 */
export const shouldPromptBetaSurvey = (username?: string): boolean => {
    if (typeof window === 'undefined') return false;

    // Do not prompt ADMIN
    const safeUser = (username || localStorage.getItem('lastUser') || '').toUpperCase().trim();
    if (safeUser === 'ADMIN') return false;

    const lastSurveyStr = localStorage.getItem(`${LAST_SURVEY_TIMESTAMP_KEY}_${safeUser}`);
    const snoozeStr = localStorage.getItem(`${SURVEY_SNOOZE_TIMESTAMP_KEY}_${safeUser}`);
    const now = Date.now();

    // Check if currently snoozed
    if (snoozeStr) {
        const snoozeTime = parseInt(snoozeStr, 10);
        if (now - snoozeTime < SNOOZE_DAYS_MS) {
            return false;
        }
    }

    // If never submitted, allow prompt after a shift completion
    if (!lastSurveyStr) {
        return true;
    }

    const lastSurveyTime = parseInt(lastSurveyStr, 10);
    return (now - lastSurveyTime) >= FOURTEEN_DAYS_MS;
};

/**
 * Record a successful survey submission to reset the 14-day timer
 */
export const recordSurveyCompleted = (username?: string) => {
    if (typeof window === 'undefined') return;
    const safeUser = (username || localStorage.getItem('lastUser') || '').toUpperCase().trim();
    const now = Date.now();
    localStorage.setItem(`${LAST_SURVEY_TIMESTAMP_KEY}_${safeUser}`, now.toString());
    localStorage.removeItem(`${SURVEY_SNOOZE_TIMESTAMP_KEY}_${safeUser}`);
};

/**
 * Snooze the survey prompt for 3 days if dismissed by user
 */
export const snoozeSurveyPrompt = (username?: string) => {
    if (typeof window === 'undefined') return;
    const safeUser = (username || localStorage.getItem('lastUser') || '').toUpperCase().trim();
    const now = Date.now();
    localStorage.setItem(`${SURVEY_SNOOZE_TIMESTAMP_KEY}_${safeUser}`, now.toString());
};
