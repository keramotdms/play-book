import "server-only";
import * as admin from "firebase-admin";

/**
 * Lazily-initialised Firebase Admin SDK singleton.
 */
export function firebaseApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saJson) {
    const sa = JSON.parse(saJson);
    return admin.initializeApp({
      credential: admin.credential.cert(sa),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
    });
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
  });
}

export function adminAuth() {
  return firebaseApp().auth();
}

export function adminDb() {
  return firebaseApp().firestore();
}

export function adminBucket() {
  return firebaseApp().storage().bucket();
}