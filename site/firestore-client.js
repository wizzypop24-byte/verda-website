/**
 * Firestore client for the storefront.
 * Loaded on demand so a CDN hiccup cannot block the page.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB3Pa0TylDXPswxiAWSj4im9ZApkr6EHOo",
  authDomain: "fir-479b9.firebaseapp.com",
  projectId: "fir-479b9",
  storageBucket: "fir-479b9.firebasestorage.app",
  messagingSenderId: "935041001190",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export { addDoc, collection, doc, serverTimestamp, setDoc };
