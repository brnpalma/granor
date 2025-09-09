// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  projectId: "studio-5298964458-59092",
  appId: "1:237167401407:web:3e002c7fb64a33a159690a",
  storageBucket: "studio-5298964458-59092.firebasestorage.app",
  apiKey: "AIzaSyA5psAculLeGhGdFDK-TMckzFu2lPGyQjM",
  authDomain: "studio-5298964458-59092.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "237167401407",
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
