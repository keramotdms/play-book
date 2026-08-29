# Deploying Copy Playbook to Vercel

Copy Playbook ships with **two data backends**, switched automatically by environment:

| Backend | When it activates | Where it's used |
|---|---|---|
| **SQLite (Prisma)** | when no Firebase Admin credentials are set | sandbox preview / local dev |
| **Firebase** (Auth + Firestore + Storage) | when `FIREBASE_SERVICE_ACCOUNT` (or the three individual `FIREBASE_*` vars) is set | production / Vercel |

SQLite cannot persist on Vercel's ephemeral serverless filesystem, so production
deployments **must** configure Firebase. The Firebase backend mirrors the
original spec's data model exactly:

```
users/{uid}                     ← profile document
users/{uid}/clients/{id}
users/{uid}/outreach_scripts/{id}
users/{uid}/copies/{id}
users/{uid}/learn_progress/{id}
client_photos/{uid}/…           ← Cloud Storage uploads
```

Sessions are **httpOnly cookies** holding a Firebase session cookie (minted by
the Admin SDK, 14 days, verified server-side on every request). The same value
doubles as a `Bearer` token so the app also works inside cookie-blocking
embedded previews.

---

## 1. Create the Firebase project

1. <https://console.firebase.google.com> → **Add project**.
2. **Authentication → Get started → Email/Password → Enable** (leave
   Email link disabled). *No public sign-up exists; the single account is
   created in step 3.*
3. **Firestore Database → Create database** → *Production mode* → pick a
   region close to you.
4. **Storage → Get started** (accept default bucket).
   > Note: Firebase requires the pay-as-you-go **Blaze** plan for *new*
   > Storage buckets (created after Oct 2024). Blaze has a free tier; photos
   > are small. If you prefer to skip Storage entirely, everything else still
   > works — only client photo uploads will error.
5. **Project settings (gear) → General → Your apps → Web app (`</>`)** →
   register it (no hosting needed) → copy the `firebaseConfig` values.

## 2. Publish the security rules

* **Firestore → Rules** → paste `firestore.rules` from this repo → Publish.
* **Storage → Rules** → paste `storage.rules` from this repo → Publish.

They enforce per-uid isolation exactly as the spec requires.

## 3. Service account (server credentials)

**Project settings → Service accounts → Generate new private key** → download
the JSON file. You will paste its **entire content** as one environment
variable (`FIREBASE_SERVICE_ACCOUNT`). This secret never reaches the browser —
only `NEXT_PUBLIC_*` variables do, and those are public by design.

## 4. Fill in `.env`

Copy `.env.example` → `.env` and fill in:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-app", ...entire JSON on one line...}
SEED_EMAIL=you@yourdomain.com        # optional; defaults to demo@copyplaybook.app
SEED_PASSWORD=your-password          # optional; defaults to demo1234
```

## 5. Create your account + starter data

```bash
bun install
bun run seed:firebase
```

*Creates the account in Firebase Auth and seeds the profile, 2 starter
scripts and the 29-lesson curriculum (all unchecked).*

*Alternative:* create the user manually in **Authentication → Users → Add
user** — starter data then seeds itself automatically on first login. Both
paths are supported.

## 6. Deploy to Vercel

**Option A — Dashboard:** push this folder to a Git repo → Vercel **Add New
Project → Import** → framework auto-detects Next.js → paste all `.env`
variables under **Environment Variables** → Deploy.

**Option B — CLI:**

```bash
bunx vercel login
bunx vercel link
bunx vercel env pull           # optional
bunx vercel --prod
```

`postinstall` runs `prisma generate` automatically, so the build works even
though production uses Firestore.

## 7. Post-deploy checklist

- [ ] Open the deployed URL → login screen renders with your logo/theme.
- [ ] Sign in with the seeded email/password → dashboard shows zeroed counts.
- [ ] Add a client → run it through the pipeline (outreach → follow-ups →
      replied → sold).
- [ ] Upload a client photo → image renders (validates Storage).
- [ ] Reload the page while logged in → session persists (cookie).
- [ ] **Firebase console → Firestore** → data visible under `users/{uid}`.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Login: *"Email/password sign-in is not enabled…"* | Enable the Email/Password provider (step 1.2). |
| Login: *Invalid email or password* | Run `bun run seed:firebase` or create the user in the console. |
| Everything 500s after deploy | `FIREBASE_SERVICE_ACCOUNT` malformed — paste the raw JSON on one line, no quotes around it in Vercel's field. |
| Private key errors in logs | Using individual vars instead of the JSON? Keep the literal `\n` escapes; the app un-escapes them. |
| Photo upload fails | Storage bucket missing/Blaze not enabled, or `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` mismatch. |
| Logged out on every request | Cookies blocked (rare outside embedded previews) — the Bearer fallback covers this automatically; make sure you log in through the app UI so the token gets stored. |

## Notes

- **Cold-lead timer** stays *lazy* (evaluated on dashboard/client-list load),
  keeping the project on Firestore's free tier — no Cloud Scheduler needed.
- **Account creation is intentionally private** (single-user tool). Anyone
  else with the password would share the same data.
- **Rotating the service account** (Security concern or leak): generate a new
  key, update the env var, redeploy. Sessions minted earlier remain valid up
  to 14 days; revoke instantly via *Authentication → user → ⋮ → Revoke
  sessions* if needed.
- `SESSION_SECRET` / `DATABASE_URL` are only used by the SQLite backend and
  can be omitted on Vercel.
