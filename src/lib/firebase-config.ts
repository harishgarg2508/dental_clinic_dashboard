import { type FirebaseApp, getApps, getApp, initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

/**
 * DO NOT expose these keys on the server in a public repo.
 * They are left here for demo-only.  Store them in env vars
 * (`NEXT_PUBLIC_` prefix) before going to production.
 */
const firebaseConfig = {
  apiKey: "AIzaSyDaQkNkqG3dwqU-nWltobC-YyiwQy6s6FQ",
  authDomain: "patientdata-5fe9c.firebaseapp.com",
  projectId: "patientdata-5fe9c",
  storageBucket: "patientdata-5fe9c.firebasestorage.app",
  messagingSenderId: "893013788176",
  appId: "1:893013788176:web:c20c7fef07343dbb9f6c95",
  measurementId: "G-ZC8WEEZW4D"
};

/**
 * Returns the singleton Firebase **client-side** app.
 * Prevents “Firebase app already initialised” and
 * “Service firestore is not available” errors.
 */
function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    return initializeApp(firebaseConfig)
  }
  return getApp()
}

/* App & Services --------------------------------------------------------- */
export const app = getFirebaseApp()
export const db = getFirestore(app)
export const auth = getAuth(app)

/**
 * Analytics can only run in the browser.  Importing it on
 * the server leads to “window is not defined”.
 *
 *  import { getAnalytics } from "firebase/analytics"
 *  export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null
 */
