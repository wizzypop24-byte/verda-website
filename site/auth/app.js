/**
 * Google Sign-In with Firebase Authentication (project: fir-479b9)
 *
 * This is the public web config served by Firebase Hosting; it is not a secret.
 * Firebase security is enforced by Authorized Domains + provider settings.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

const els = {
  googleBtn: document.getElementById("google-btn"),
  signoutBtn: document.getElementById("signout-btn"),
  signedOut: document.getElementById("signed-out"),
  signedIn: document.getElementById("signed-in"),
  status: document.getElementById("status"),
  photo: document.getElementById("user-photo"),
  name: document.getElementById("user-name"),
  email: document.getElementById("user-email"),
  providerId: document.getElementById("user-provider"),
  uid: document.getElementById("user-uid"),
};

const ERROR_COPY = {
  "auth/popup-closed-by-user": "Sign-in cancelled. You can try again anytime.",
  "auth/popup-blocked": "Your browser blocked the sign-in window. Allow pop-ups and retry.",
  "auth/cancelled-popup-request": "Another sign-in window is already open.",
  "auth/unauthorized-domain": "This domain is not authorised in Firebase. Add it under Authentication → Settings → Authorized domains.",
  "auth/operation-not-allowed": "Google sign-in is not enabled for this project. Enable it in Firebase Console → Authentication → Sign-in method.",
  "auth/account-exists-with-different-credential": "An account already exists with this email using a different sign-in method.",
  "auth/network-request-failed": "Network problem. Check your connection and try again.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes.",
  "auth/internal-error": "Firebase returned an internal error. Try again.",
};

function setStatus(message, kind = "error") {
  els.status.textContent = message;
  if (message) {
    els.status.dataset.kind = kind;
  } else {
    delete els.status.dataset.kind;
  }
}

function setBusy(busy) {
  els.googleBtn.disabled = busy;
  els.googleBtn.querySelector("span").textContent = busy ? "Signing in…" : "Continue with Google";
  els.googleBtn.setAttribute("aria-busy", String(busy));
}

function renderUser(user) {
  const signedIn = Boolean(user);
  els.signedOut.hidden = signedIn;
  els.signedIn.hidden = !signedIn;

  if (!user) {
    els.photo.removeAttribute("src");
    els.name.textContent = "";
    els.email.textContent = "";
    els.providerId.textContent = "";
    els.uid.textContent = "";
    return;
  }

  els.name.textContent = user.displayName ?? "Signed in";
  els.email.textContent = user.email ?? "";
  els.providerId.textContent = user.providerData[0]?.providerId ?? "google.com";
  els.uid.textContent = user.uid;
  if (user.photoURL) {
    els.photo.src = user.photoURL;
    els.photo.alt = `${user.displayName ?? "User"} profile photo`;
  } else {
    els.photo.removeAttribute("src");
    els.photo.alt = "";
  }
}

els.googleBtn.addEventListener("click", async () => {
  setStatus("");
  setBusy(true);
  try {
    const result = await signInWithPopup(auth, provider);
    setStatus(`Signed in as ${result.user.email ?? result.user.displayName}. Taking you to the store…`, "info");
    setTimeout(() => window.location.assign("/"), 700);
  } catch (error) {
    setStatus(ERROR_COPY[error?.code] ?? `Sign-in failed (${error?.code ?? "unknown"}). Please try again.`);
    console.error("[auth]", error?.code, error?.message);
  } finally {
    setBusy(false);
  }
});

els.signoutBtn.addEventListener("click", async () => {
  setStatus("");
  try {
    await signOut(auth);
    setStatus("You are signed out.", "info");
  } catch (error) {
    setStatus(ERROR_COPY[error?.code] ?? "Could not sign out. Try again.");
  }
});

// Persist the session across restarts (Section 17: 30-day rolling session).
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("[auth] persistence fallback", error?.code);
});

async function syncProfile(user) {
  try {
    const ref = doc(db, "users", user.uid);
    const snapshot = await getDoc(ref);
    const profile = {
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
      providerId: user.providerData[0]?.providerId ?? "google.com",
      lastLoginAt: serverTimestamp(),
    };
    if (snapshot.exists()) {
      await setDoc(ref, profile, { merge: true });
    } else {
      await setDoc(ref, { ...profile, createdAt: serverTimestamp() });
    }
  } catch (error) {
    console.warn("[firestore] profile not saved", error?.code ?? error);
  }
}

onAuthStateChanged(auth, (user) => {
  renderUser(user);
  if (user) syncProfile(user);
  document.body.dataset.authReady = "true";
});

// Diagnostics for tests / support (no secrets involved).
window.__firebase = { app, auth, projectId: firebaseConfig.projectId };
