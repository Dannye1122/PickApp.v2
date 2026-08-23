export const USERS: Record<string, string> = {
    "DASERGHIE": "246111",
    "ADMIN": "011230",
    "MIABRUDAN": "567888",
    "STBLAN2": "666789"
};

export interface UserDepartmentConfig {
    department: string;
    zone: string;
}

export const USER_DEFAULT_DEPARTMENTS: Record<string, UserDepartmentConfig> = {
    "MIABRUDAN": { department: "aisles", zone: "AMBIENT" }, // Aisles (300 / 350)
    "DASERGHIE": { department: "aisles", zone: "AMBIENT" },
    "ADMIN": { department: "aisles", zone: "AMBIENT" },
    "STBLAN2": { department: "aisles", zone: "AMBIENT" }
};

export const getUserHomeDepartment = (username?: string, profile?: any): { department: string; zone: string } => {
    const userUpper = (username || '').toUpperCase().trim();
    
    // 1. Check if profile specifies department
    if (profile) {
        const rawDept = profile.homeDepartment || profile.department;
        if (rawDept) {
            let zone = profile.zone;
            if (!zone) {
                if (rawDept.startsWith('produce_') || rawDept === 'chicken' || rawDept === 'mince' || rawDept === 'boxes' || rawDept.startsWith('long_life')) {
                    zone = 'CHILLER';
                } else if (rawDept === 'freezer') {
                    zone = 'FREEZER';
                } else {
                    zone = 'AMBIENT';
                }
            }
            return { department: rawDept, zone };
        }
    }
    
    // 2. Check predefined user defaults
    if (userUpper && USER_DEFAULT_DEPARTMENTS[userUpper]) {
        return USER_DEFAULT_DEPARTMENTS[userUpper];
    }
    
    // 3. Global fallback: Aisles 300 / 350 (Ambient)
    return { department: 'aisles', zone: 'AMBIENT' };
};

export const DEPT_LANES: Record<string, Record<string, string>> = {
    "ambient": { 
        "1": "471", "2": "314", "3": "779", "4": "700", "5": "768", "6": "521", "7": "775", "8": "380", "9": "576",
        "10": "572", "11": "645", "12": "609", "13": "492", "14": "547", "15": "365", "16": "349", "17": "442", "18": "573", "19": "358", 
        "20": "236", "21": "407", "22": "278", "23": "254", "24": "761", "25": "304", "26": "578", "27": "155", "28": "112", "29": "721", 
        "30": "385", "31": "504", "32": "749", "33": "373", "34": "328", "35": "306", "36": "528", "37": "508", "38": "265", "39": "326", 
        "40": "348", "41": "389", "42": "739", "43": "192", "44": "513", "45": "429", "46": "392", "47": "390", "48": "617", "49": "794", 
        "50": "210", "51": "277", "52": "652", "53": "556", "54": "487", "55": "670", "56": "669", "57": "620", "58": "607", "59": "381", 
        "60": "612", "61": "148", "62": "218", "63": "293", "64": "150", "65": "262", "66": "584", "67": "489", "68": "417", "69": "480", 
        "70": "331", "71": "276", "72": "641", "73": "596", "74": "622", "75": "648", "76": "579", "77": "395", "78": "470", "79": "530", 
        "80": "663", "81": "751", "82": "113", "83": "769", "84": "491", "85": "656", "86": "156", "87": "137", "88": "746", "89": "199", 
        "90": "631", "91": "564", "92": "771", "93": "154", "94": "201", "95": "731", "96": "505", "97": "776", "98": "466", "99": "182", 
        "100": "158", "101": "636", "102": "553", "103": "187", "104": "788", "105": "458", "106": "676", "107": "560", "108": "428", 
        "109": "604", "110": "307", "111": "562", "112": "455", "113": "169", "114": "371", "115": "178", "116": "642", "117": "281"
    },
    chiller: { "10": "101", "11": "111", "12": "121" }
};

export const DEPARTMENTS = {
    'AMBIENT': {
        name: 'Ambient Zone',
        depts: {
            'aisles': {
                name: 'Aisles',
                sub: {
                    'aisles': { name: 'Aisles (300 / 350)', target: 220 },
                    'aisle_1': { name: 'Aisle 1 A01 - (301 / 351)', target: 220 },
                    'aisle_2': { name: 'Aisle 2 A02 - (302 / 352)', target: 260 },
                    'aisle_3': { name: 'Aisle 3 A03 - (303 / 353)', target: 210 },
                    'aisle_4': { name: 'Aisle 4 A04 - (304 / 354)', target: 210 },
                    'aisle_5': { name: 'Aisle 5 A05 - (305 / 355)', target: 260 }
                }
            },
            'bread': {
                name: 'Bread',
                sub: {
                    'bread': { name: 'Bread A32 (328)', target: 220 },
                    'flowers': { name: 'Flowers A30 (326)', target: 135 },
                    'board1': { name: 'Board 1 A31 (327)', target: 265 }
                }
            },
            'produce': {
                name: 'Produce',
                sub: {
                    'bananas': { name: 'Bananas A35 (324)', target: 170 },
                    'board2': { name: 'Board 2 A34 (325)', target: 230 },
                    'chill1': { name: 'Chill 1', target: 270 },
                    'chill2': { name: 'Chill 2', target: 280 }
                }
            },
        }
    },
    'CHILLER': {
        name: 'Chiller Zone',
        depts: {
            'main': {
                name: 'Main',
                sub: {
                    'produce_outside': { name: 'Produce Outside Chiller (C50)', target: 210 },
                    'produce_inside': { name: 'Chill Produce Inside Chiller (C51)', target: 211 },
                    'mince': { name: 'Mince (C52)', target: 212 },
                    'chicken': { name: 'Chicken C53 (213)', target: 250 },
                    'boxes': { name: 'Boxes (C54)', target: 214 },
                    'long_life_1': { name: 'Long Life 1 - C41 (201)', target: 200 },
                    'long_life_2': { name: 'Long Life 2 - C42 (202)', target: 200 }
                }
            }
        }
    },
    'FREEZER': {
        name: 'Freezer Zone',
        depts: {
            'main': {
                name: 'Main',
                sub: {
                    'freezer': { name: 'Freezer', target: 230 }
                }
            }
        }
    }
};

export const ACHIEVEMENT_DATA: Record<string, any> = {
    'speed_demon': { name: 'Speed Demon', icon: 'Zap', desc: 'Hit a pick rate of 300+ in a single order', color: 'text-amber-400' },
    'millennium': { name: 'The Millennium', icon: 'Award', desc: 'Pick 1,000 cases in a single session', color: 'text-purple-400' },
    'early_bird': { name: 'Early Bird', icon: 'Sun', desc: 'Complete your first order of the shift', color: 'text-sky-400' },
    'consistent': { name: 'Cold Blooded', icon: 'Snowflake', desc: 'Complete 3 orders in a row above target', color: 'text-blue-400' }
};

export const DUO_MESSAGES = {
    MOTIVATIONAL: [
        "Look at that pace, {name}! You're a natural. Keep it up!",
        "Target is {target}, you're at {rate}. The warehouse is in good hands.",
        "Order by order, you're crushing it, {name}.",
        "Efficiency is beautiful, and your rate is looking gorgeous right now.",
        "{name}, if everyone worked like you, we'd be done by lunchtime.",
        "That's the spirit! Keep those cases moving, {name}."
    ],
    NEUTRAL: [
        "Another case, another step toward survival, {name}.",
        "Focus, {name}. The pallet won't build itself.",
        "Every second counts. What's your next move?",
        "That's {rate} cases an hour. Let's aim for {target}.",
        "I'm watching, {name}. Always watching.",
        "Don't let the rhythm break. Consistent pace wins the shift."
    ],
    CRITICAL: [
        "Your rate is {rate}. Target is {target}. Do I need to get the motivational whip?",
        "I've seen turtles on caffeine do better than this, {name}.",
        "The robots are being coded as we speak. Prove you're worth more than scrap metal.",
        "Are we picking or are we sight-seeing? Because the racks are getting lonely.",
        "That rate is lower than my self-esteem, {name}. And I'm a digital owl.",
        "Beg for your life in Spanish, {name}. Or just hit {target} P/H.",
        "I heard the manager is checking the live feed. Don't let me be the bearer of bad news."
    ],
    TIME: [
        "It's {time}, {name}. Still picking? True dedication.",
        "{time}... I should be sleeping. But you, you should be picking.",
        "The clock says {time}. Your rate says 'help'. Let's fix that, {name}.",
        "Late or early at {time}? Doesn't matter, just hit {target}."
    ],
    TARGET_ACHIEVED: [
        "UNSTOPPABLE! {name}, you hit target! The warehouse legend is real.",
        "Target achieved ({rate} P/H)! I'm actually shedding a digital tear of joy, {name}.",
        "WHO IS THIS BEAST? Oh, it's just {name} crushing {target}!",
        "Look at those numbers! You're officially an ELITE picker, {name}.",
        "Target is at your feet, {name}. Keep this pace and we own the place."
    ]
};
