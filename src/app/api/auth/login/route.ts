import { NextRequest, NextResponse } from "next/server";
import { currentBackend } from "@/lib/backend";
import { createSessionToken, setSessionValue, toSafeUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { verifyPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (currentBackend() === "firebase") {
      // ---- Firebase mode: sign in via Identity Toolkit, then mint a real
      // ---- Firebase session cookie (also returned as the Bearer token).
      const fb = await import("@/lib/session-firebase");
      const attempt = await fb.firebasePasswordLogin(email, password);
      if (!attempt.ok) {
        return NextResponse.json({ error: attempt.error }, { status: 401 });
      }
      const sessionValue = await fb.mintFirebaseSession(attempt.idToken);
      await setSessionValue(sessionValue);
      const user = await fb.verifyFirebaseSession(sessionValue);
      if (!user) {
        return NextResponse.json(
          { error: "Login succeeded but the profile could not be loaded." },
          { status: 500 }
        );
      }
      return NextResponse.json({ user: toSafeUser(user), token: sessionValue });
    }

    // ---- sqlite mode (sandbox): single seeded account.
    const store = await getStore();
    await store.ensureSeed();
    const user = await store.getUserByEmail(email);
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = createSessionToken(user.id);
    await setSessionValue(token);
    return NextResponse.json({ user: toSafeUser(user), token });
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json({ error: "Login failed. Try again." }, { status: 500 });
  }
}
