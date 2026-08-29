import "server-only";
import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * Lazily-initialised Firebase Admin SDK singleton.
 *
 * Credentials come from the environment, in one of two shapes:
 *  - FIREBASE_SERVICE_ACCOUNT: the full service-account JSON (recommended on
 *    Vercel — paste the downloaded JSON file content as one variable), or
 *  - FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
 *
 * In the downloaded JSON the private key contains literal "\n" escape
 * sequences; when the three individual variables are used the key must be
 * un-escaped, which is handled below.
 */
export function firebaseApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0];

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
