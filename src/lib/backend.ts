// Decides which data backend the app runs on.
//
// - "firebase": used for production (e.g. Vercel). Activates automatically as
//   soon as Firebase Admin credentials are present in the environment.
// - "sqlite": used in the local sandbox — zero external dependencies, data
//   lives in a local SQLite file via Prisma.
//
// NOTE: SQLite cannot persist on Vercel's ephemeral serverless filesystem,
// which is exactly why deploys must provide the Firebase admin credentials.

export type Backend = "sqlite" | "firebase";

export function currentBackend(): Backend {
  if (
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    (process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY)
  ) {
    return "firebase";
  }
  return "sqlite";
}

export function isFirebase(): boolean {
  return currentBackend() === "firebase";
}
