
const seedrandom = (seed) => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
    return () => {
        h = Math.imul(31, h) + 0x7fffffff | 0;
        return (h >>> 0) / 0xffffffff;
    };
};

const getDailyAILiveUsersCount = () => {
    const seed = new Date().toDateString();
    const h = (seed) => {
        let h = 0;
        for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
        return h;
    };
    
    // Simulating seedrandom for count
    // The botGenerator uses seedrandom(seed)
    // I'll just use a simple mock of the logic in botGenerator.ts
    const seedVal = h(seed);
    const rng = () => {
        let x = Math.sin(seedVal) * 10000;
        return x - Math.floor(x);
    };
    
    const count = Math.floor(rng() * 5) + 3;
    return count;
};

console.log('Bot Count:', getDailyAILiveUsersCount());
