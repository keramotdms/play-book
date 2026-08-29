import "server-only";
import { adminAuth } from "@/lib/firebase-admin";
import { ensureProfileDoc, firebaseStore } from "@/lib/store/firebase";
import type { UserRow } from "@/lib/store/types";

/**
 * Firebase-mode session helpers.
 * Loaded lazily (only when the firebase backend is active) so that the
 * sandbox sqlite mode never touches the Admin SDK.
 *
 * The session cookie value is a Firebase session cookie minted by the Admin
 * SDK from a fresh ID token — it is httpOnly, lasts up to two weeks, and can
 * be verified server-side without touching Google on every request. The same
 * string doubles as the Bearer token for embedded-preview contexts.
 */

export const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

interface IdentityToolkitError {
  error?: { message?: string };
}

/** Sign-in via the Identity Toolkit REST API (server-side, no client SDK). */
export async function firebasePasswordLogin(
  email: string,
  password: string
): Promise<{ ok: true; idToken: string; uid: string } | { ok: false; error: string }> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Server is missing NEXT_PUBLIC_FIREBASE_API_KEY." };
  }
  let res: Response;
  try {
    res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
  } catch {
    return { ok: false, error: "Could not reach Firebase Auth. Try again." };
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as IdentityToolkitError;
    const code = body.error?.message ?? "";
    if (code.includes("OPERATION_NOT_ALLOWED")) {
      return {
        ok: false,
        error:
          "Email/password sign-in is not enabled for this Firebase project. Enable it under Authentication → Sign-in method.",
      };
    }
    if (code.includes("USER_DISABLED")) {
      return { ok: false, error: "This account has been disabled." };
    }
    if (code.includes("TOO_MANY_ATTEMPTS")) {
      return { ok: false, error: "Too many attempts. Please try again later." };
    }
    return { ok: false, error: "Invalid email or password." };
  }

  const data = (await res.json()) as { idToken?: string; localId?: string };
  if (!data.idToken || !data.localId) {
    return { ok: false, error: "Unexpected response from Firebase Auth." };
  }
  return { ok: true, idToken: data.idToken, uid: data.localId };
}

/** Exchanges a fresh ID token for a long-lived Firebase session cookie value. */
export async function mintFirebaseSession(idToken: string): Promise<string> {
  return adminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_MS,
  });
}

/**
 * Verifies a Firebase session cookie (or the same value sent as a Bearer
 * token), loads the profile document, and seeds starter data on first visit.
 */
export async function verifyFirebaseSession(token: string): Promise<UserRow | null> {
  const decoded = await adminAuth()
    .verifySessionCookie(token, false /* checkRevoked */)
    .catch(() => null);
  if (!decoded?.uid) return null;

  const user = await ensureProfileDoc(decoded.uid);
  await firebaseStore.ensureUserSeed(decoded.uid);
  return user;
}
