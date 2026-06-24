import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC062R_qS1jbdlknD1NWrArfgnNgHcU2Nc",
  authDomain: "crickstreet-890e7.firebaseapp.com",
  projectId: "crickstreet-890e7",
  storageBucket: "crickstreet-890e7.firebasestorage.app",
  messagingSenderId: "461731506048",
  appId: "1:461731506048:web:d1bf43596bd0b607268365"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedUser() {
  const userId = "8xNAIYpB88XLxy8qKdvUL6pXkVG3";
  console.log(`Seeding user ${userId}...`);
  
  const stats = {
    matches: 12,
    runs: 450,
    wickets: 8,
    highestScore: 92,
    winPercentage: 75,
    matchesWon: 9,
    momAwards: 4,
    totalBallsFaced: 320,
    battingAverage: 37.5,
    strikeRate: 140.6,
    followers: 1420,
    following: 89,
    teams: 3,
    last5: [
      { match: "M12", runs: 45, won: true },
      { match: "M11", runs: 92, won: true },
      { match: "M10", runs: 12, won: false },
      { match: "M9", runs: 78, won: true },
      { match: "M8", runs: 30, won: true }
    ],
    achievements: ["mvp", "top_scorer", "match_winner", "champion"]
  };

  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { stats });
    console.log("Successfully seeded stats!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding user stats:", error);
    process.exit(1);
  }
}

seedUser();
