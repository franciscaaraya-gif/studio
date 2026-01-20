import { initializeApp, getApps, getApp, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// These are initialized on first use to ensure credentials are ready.
let app: App | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

/**
 * Initializes the Firebase Admin SDK if it hasn't been already.
 * This "lazy initialization" approach helps prevent race conditions
 * in serverless environments where credentials might not be available
 * at module load time.
 */
function initializeServerApp() {
  if (!app) {
    // When running in a Google-managed environment, initializeApp()
    // without arguments automatically uses the project's configuration.
    app = !getApps().length ? initializeApp() : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return { app, auth, db };
}

/**
 * Gets the initialized Firestore instance for the server.
 * @returns {Firestore} The Firestore database object.
 */
export function getDb() {
  const { db: firestoreDb } = initializeServerApp();
  if (!firestoreDb) {
    throw new Error("Firestore not initialized. Call initializeServerApp first.");
  }
  return firestoreDb;
}

/**
 * Gets the initialized Auth instance for the server.
 * @returns {Auth} The Firebase Auth object.
 */
export function getAuthAdmin() {
    const { auth: adminAuth } = initializeServerApp();
    if (!adminAuth) {
        throw new Error("Firebase Admin Auth not initialized.");
    }
    return adminAuth;
}
