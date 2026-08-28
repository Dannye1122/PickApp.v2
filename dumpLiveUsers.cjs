const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
const fs = require('fs');
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'leaderboard'), where('type', '==', 'live'));
  const snap = await getDocs(q);
  snap.docs.forEach(d => console.log(d.id, d.data()));
  process.exit(0);
}
run();
