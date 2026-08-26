import { LeaderboardEntry } from '../types';

const BOT_NAME_POOL = [
    'AisleBot Alpha', 'PickBot 3000', 'RoboPicker Prime', 'NexusBot-7',
    'CypherPick', 'SpeedBot v2', 'AutoStack-X', 'EchoPicker',
    'VanguardBot', 'Zenith AI', 'AeroPick 900', 'TitanBot-01',
    'QuantumPick', 'PulseBot', 'OmniPicker', 'HyperBot',
    'VectorPick', 'GlideBot-X', 'SwiftBot 9', 'CorePicker AI',
    'NovaPick AI', 'AtlasBot-4', 'ApexRobo', 'OptiPick v3'
];

const DEPTS = ['Ambient Aisles', 'Chill Depot', 'Sub-Zero Freezer', 'Produce Lane'];

/**
 * Deterministically generates between 3 to 6 AI Bots for the current day.
 * Uses the current calendar date string (YYYY-MM-DD) as seed so bots rotate daily
 * but remain consistent throughout the same day.
 */
export function getDailyAIBots(): LeaderboardEntry[] {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const todayStr = new Date(now.getTime() - tzOffset).toISOString().split('T')[0];
    
    // Hash based on current date string
    let hash = 0;
    for (let i = 0; i < todayStr.length; i++) {
        hash = ((hash << 5) - hash) + todayStr.charCodeAt(i);
        hash |= 0;
    }
    const positiveHash = Math.abs(hash);

    // Number of bots between 3 and 6
    const botCount = 3 + (positiveHash % 4); 

    const bots: LeaderboardEntry[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < botCount; i++) {
        let nameIdx = (positiveHash + i * 7) % BOT_NAME_POOL.length;
        let counter = 1;
        while (usedIndices.has(nameIdx)) {
            nameIdx = (nameIdx + counter) % BOT_NAME_POOL.length;
            counter++;
        }
        usedIndices.add(nameIdx);
        const name = BOT_NAME_POOL[nameIdx];

        const deptIdx = (positiveHash + i * 3) % DEPTS.length;
        const baseRate = 168 + ((positiveHash * (i + 1) * 17) % 65); // Rate between 168 and 232 P/H
        const cases = 420 + ((positiveHash * (i + 1) * 37) % 850); // Cases between 420 and 1270

        bots.push({
            name,
            dept: DEPTS[deptIdx],
            department: DEPTS[deptIdx],
            rate: baseRate,
            cases,
            targetRate: 200,
            date: todayStr,
            timestamp: new Date().toISOString(),
            isPicking: true,
            isBot: true
        } as any);
    }

    return bots;
}

/**
 * Returns 1-2 active live bot records for the "Active Now" live list
 */
export function getDailyAILiveUsers(): any[] {
    const allBots = getDailyAIBots();
    // Pick first 2 bots to also display in Active Now
    return allBots.slice(0, 2).map(bot => ({
        id: `bot-${bot.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: bot.name,
        department: bot.department || 'Ambient Aisles',
        zone: 'AMBIENT',
        rate: bot.rate,
        totalCases: bot.cases,
        xp: bot.cases * 10,
        status: 'picking',
        isActive: true,
        activeSeconds: 14400 + (bot.rate * 20),
        customStatus: '⚡ Automated Precision Picking',
        isBot: true
    }));
}
