/**
 * Firebase seed script — run once after creating your Firebase project:
 *
 *   bun run seed:firebase
 *
 * What it does:
 *   1. Initializes the Admin SDK from FIREBASE_SERVICE_ACCOUNT (whole JSON)
 *      or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
 *   2. Creates the single account in Firebase Auth (email/password, no public
 *      sign-up, per spec) using SEED_EMAIL / SEED_PASSWORD.
 *   3. Seeds users/{uid}: profile document, two starter outreach scripts and
 *      the 29-lesson curriculum (every lesson `completed: false`).
 *
 * Safe to re-run — existing data is never overwritten.
 * Copy Playbook is a personal single-user tool: share the .env credentials
 * only with yourself.
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { CURRICULUM } from "../src/lib/shared";
import { STARTER_EMAIL, STARTER_PASSWORD, STARTER_SCRIPTS } from "../src/lib/seed-data";

function initAdmin() {
  const existing = getApps();
  if (existing.length) return existing[0];

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saJson) {
    return initializeApp({
      credential: cert(JSON.parse(saJson)),
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

async function main() {
  const app = initAdmin();
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = (process.env.SEED_EMAIL || STARTER_EMAIL).trim().toLowerCase();
  const password = process.env.SEED_PASSWORD || STARTER_PASSWORD;

  if (!process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.FIREBASE_CLIENT_EMAIL) {
    console.error(
      "✗ Missing Firebase Admin credentials.\n  Set FIREBASE_SERVICE_ACCOUNT (whole JSON) or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY in .env"
    );
    process.exit(1);
  }

  // 1) ensure the auth account
  let uid: string;
  try {
    const user = await auth.getUserByEmail(email);
    uid = user.uid;
    console.log(`• Account already exists: ${email} (${uid})`);
  } catch {
    const user = await auth.createUser({
      email,
      password,
      displayName: "Copywriter",
    });
    uid = user.uid;
    console.log(`✓ Created account: ${email} (${uid})`);
  }

  const userRef = db.collection("users").doc(uid);

  // 2) profile document
  const profile = await userRef.get();
  if (!profile.exists) {
    await userRef.set({
      email,
      displayName: "Copywriter",
      phone: "",
      bio: "",
      avatarUrl: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("✓ Profile document created");
  } else {
    console.log("• Profile document already exists");
  }

  // 3) starter scripts
  const scriptsSnap = await userRef.collection("outreach_scripts").limit(1).get();
  if (scriptsSnap.empty) {
    for (const s of STARTER_SCRIPTS) {
      await userRef.collection("outreach_scripts").add({
        ...s,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    console.log(`✓ Seeded ${STARTER_SCRIPTS.length} starter scripts`);
  } else {
    console.log("• Scripts already present");
  }

  // 4) curriculum — every lesson starts unchecked
  const lessonsSnap = await userRef.collection("learn_progress").limit(1).get();
  if (lessonsSnap.empty) {
    const batch = db.batch();
    let count = 0;
    for (let m = 0; m < CURRICULUM.length; m++) {
      const mod = CURRICULUM[m];
      for (let l = 0; l < mod.lessons.length; l++) {
        batch.set(userRef.collection("learn_progress").doc(), {
          module: mod.module,
          moduleOrder: m + 1,
          lessonOrder: l + 1,
          title: mod.lessons[l],
          completed: false,
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        count++;
      }
    }
    await batch.commit();
    console.log(`✓ Seeded ${count} curriculum lessons (all unchecked)`);
  } else {
    console.log("• Lessons already present");
  }

  console.log("\nDone. Sign in with those credentials in the app.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Seed failed:", err);
    process.exit(1);
  });
