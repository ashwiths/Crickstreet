import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, deleteField } from "firebase/firestore";

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

async function restoreUser() {
  const userId = "8xNAIYpB88XLxy8qKdvUL6pXkVG3";
  console.log(`Restoring user ${userId} to original state...`);
  
  try {
    const userRef = doc(db, "users", userId);
    // Delete the stats field to restore original state
    await updateDoc(userRef, {
      stats: deleteField()
    });
    console.log("Successfully removed seeded stats and restored original document!");
    process.exit(0);
  } catch (error) {
    console.error("Error restoring user stats:", error);
    process.exit(1);
  }
}

restoreUser();
