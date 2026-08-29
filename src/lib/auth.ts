import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { currentBackend } from "@/lib/backend";
import { db } from "@/lib/db";
import type { UserRow } from "@/lib/store/types";

/**
 * Session handling, backend-aware:
 *
 *  - sqlite (sandbox): HMAC-signed opaque token stored in an httpOnly cookie
 *    (and mirrored as a Bearer token for embedded-preview contexts).
 *  - firebase (production): a Firebase session cookie minted by the Admin
 *    SDK from a fresh ID token — see src/lib/session-firebase.ts. Verified
 *    with the same value sent as Bearer.
 *
 * Both modes accept the credential from the `Authorization: Bearer` header
 * first (used when the preview panel blocks cookies) and fall back to the
 * httpOnly cookie.
 */

const SECRET = process.env.SESSION_SECRET || "copy-playbook-local-secret";
export const SESSION_COOKIE = "cp_session";
// Both backends issue two-week sessions.
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

// ---------- shared cookie plumbing ----------

async function isHttps(): Promise<boolean> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  return proto.split(",")[0].trim() === "https";
}

export async function setSessionValue(value: string): Promise<void> {
  const store = await cookies();
  // The app is often viewed inside the sandbox preview panel's cross-site
  // iframe. SameSite=Lax cookies are dropped in that context, so when the
  // request comes in over HTTPS we relax to SameSite=None; Secure.
  // `SameSite=None` without `Secure` is rejected by browsers, hence the check.
  const https = await isHttps();
  store.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: https ? "none" : "lax",
    secure: https,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionValue(): Promise<void> {
  const store = await cookies();
  // Clear with the same attributes the cookie was set with, so the browser
  // reliably overwrites it regardless of http/https context.
  const https = await isHttps();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: https ? "none" : "lax",
    secure: https,
    path: "/",
    maxAge: 0,
  });
}

// ---------- sqlite token helpers (HMAC) ----------

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function createSessionToken(userId: string): string {
  const expires = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${userId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, signature] = parts;
  const expected = Buffer.from(sign(`${userId}.${expires}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(expires) < Date.now()) return null;
  return userId;
}

// ---------- session resolution ----------

async function readCredential(): Promise<string | null> {
  // 1) Bearer token — used when the preview panel's iframe blocks third-party
  //    cookies entirely (client sends the session value from localStorage).
  // 2) Session cookie — regular same-origin browsing.
  const h = await headers();
  const auth = h.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const bearer = auth.slice(7).trim();
    if (bearer) return bearer;
  }
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function getSessionUser(): Promise<UserRow | null> {
  const credential = await readCredential();
  if (!credential) return null;

  if (currentBackend() === "firebase") {
    const fb = await import("@/lib/session-firebase");
    return fb.verifyFirebaseSession(credential);
  }

  // sqlite mode
  const userId = verifySessionToken(credential);
  if (!userId) return null;
  try {
    return (await db.user.findUnique({ where: { id: userId } })) as
      | (UserRow & { passwordHash: string })
      | null;
  } catch {
    return null;
  }
}

// ---------- profile shaping ----------

export function toSafeUser(user: {
  id: string;
  email: string;
  displayName: string;
  phone: string;
  bio: string;
  avatarUrl: string;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    phone: user.phone,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
  };
}
