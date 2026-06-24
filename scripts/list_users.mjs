import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function listUsers() {
  console.log("Fetching users...");
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    if (querySnapshot.empty) {
      console.log("No users found.");
      return;
    }
    querySnapshot.forEach((doc) => {
      console.log(`User ID: ${doc.id}`);
      console.log(`Name: ${doc.data().displayName}`);
      console.log(`Stats:`, JSON.stringify(doc.data().stats, null, 2));
      console.log("-----------------------------------------");
    });
  } catch (error) {
    console.error("Error fetching users:", error);
  }
}

listUsers();
