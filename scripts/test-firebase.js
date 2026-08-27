import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL
};

console.log("=========================================");
console.log("🔥 Testing Firebase Connection for Khata");
console.log("=========================================");
console.log("Project ID:", firebaseConfig.projectId);
console.log("Auth Domain:", firebaseConfig.authDomain);

async function testConnection() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log("\n1. Writing test document to Firestore collection '_test_connection'...");
    const docRef = await addDoc(collection(db, "_test_connection"), {
      app: "Khata App",
      message: "Firebase connection successful!",
      timestamp: new Date().toISOString()
    });
    console.log("✓ Document successfully written with ID:", docRef.id);

    console.log("\n2. Reading back from Firestore...");
    const snapshot = await getDocs(collection(db, "_test_connection"));
    console.log(`✓ Successfully read ${snapshot.size} test document(s) from Firestore!`);

    console.log("\n3. Cleaning up test document...");
    await deleteDoc(doc(db, "_test_connection", docRef.id));
    console.log("✓ Test document cleaned up successfully.");

    console.log("\n=========================================");
    console.log("🎉 FIREBASE IS 100% WORKING & CONNECTED!");
    console.log("=========================================");
  } catch (error) {
    console.error("\n❌ Firebase Test Error:", error.message);
  }
}

testConnection();
