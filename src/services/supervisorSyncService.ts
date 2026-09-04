/**
 * Supervisor Sync & Webhook Dispatch Service
 * Automatically dispatches shift summaries to supervisor webhooks upon shift completion.
 */

export interface SupervisorConfig {
    webhookUrl: string;
    supervisorEmail: string;
    enabled: boolean;
}

const STORAGE_KEY = 'pickapp_supervisor_config';

export function getSupervisorConfig(): SupervisorConfig {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            return JSON.parse(raw);
        }
    } catch (e) {
        // Fallback default
    }
    return {
        webhookUrl: '',
        supervisorEmail: '',
        enabled: false
    };
}

export function saveSupervisorConfig(config: SupervisorConfig): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.warn('Failed to save supervisor config', e);
    }
}

export async function dispatchShiftToSupervisor(shiftSummary: any): Promise<boolean> {
    const config = getSupervisorConfig();
    if (!config.enabled || !config.webhookUrl) {
        return false;
    }

    try {
        const payload = {
            event: 'SHIFT_COMPLETED',
            timestamp: new Date().toISOString(),
            operator: shiftSummary.operator || shiftSummary.userName,
            date: shiftSummary.date,
            totalCases: shiftSummary.totalCases || shiftSummary.cases,
            finalRate: shiftSummary.appRate || shiftSummary.finalRate,
            activeTimeMinutes: shiftSummary.activeMinutes || shiftSummary.selectionTime,
            departments: shiftSummary.departments || ['AMBIENT'],
            historyCount: shiftSummary.history?.length || 0
        };

        const response = await fetch(config.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-PickApp-Event': 'ShiftCompleted'
            },
            body: JSON.stringify(payload)
        });

        return response.ok;
    } catch (e) {
        console.warn('Supervisor webhook dispatch error:', e);
        return false;
    }
}
