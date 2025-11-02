// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCZD0UT-1BSboulpZUOQikZFakRGgPBnFQ",
  authDomain: "granor-financas.firebaseapp.com",
  projectId: "granor-financas",
  storageBucket: "granor-financas.firebasestorage.app",
  messagingSenderId: "321962799532",
  appId: "1:321962799532:web:9f4fcd61d62c6df7848a09",
  measurementId: "G-QWBLRJS6KT"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
