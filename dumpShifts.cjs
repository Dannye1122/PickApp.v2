const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, limit } = require('firebase/firestore');
const fs = require('fs');
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'shift_summaries'), where('userName', '==', 'DASERGHIE'));
  const snap = await getDocs(q);
  console.log("Found", snap.size, "shifts");
  const dates = {};
  snap.docs.forEach(d => {
    const data = d.data();
    console.log(d.id, "Cases:", data.totalCases, "Date:", data.date, "Time:", new Date(data.clockInTime).toISOString());
    dates[data.date] = (dates[data.date] || 0) + 1;
  });
  console.log("Counts per date:", dates);
  process.exit(0);
}
run();
