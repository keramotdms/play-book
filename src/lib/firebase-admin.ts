import "server-only";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * Lazily-initialised Firebase Admin SDK singleton.
 */
export function firebaseApp(): App {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0];
  }

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saJson) {
    const sa = JSON.parse(saJson);
    return initializeApp({
      credential: cert(sa),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
    });
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
  });
}

export function adminAuth() {
  return getAuth(firebaseApp());
}

export function adminDb() {
  return getFirestore(firebaseApp());
}

export function adminBucket() {
  return getStorage(firebaseApp()).bucket();
}