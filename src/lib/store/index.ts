import "server-only";
import { currentBackend } from "@/lib/backend";
import type { DataStore } from "./types";

let cached: DataStore | null = null;

/**
 * Returns the active data store.
 *  - firebase: when Firebase Admin credentials are configured (production)
 *  - sqlite: otherwise (sandbox / local development)
 * The first call caches the instance; adapters are imported lazily so the
 * unused backend (and its SDK) is never loaded.
 */
export async function getStore(): Promise<DataStore> {
  if (cached) return cached;
  if (currentBackend() === "firebase") {
    const { firebaseStore } = await import("./firebase");
    cached = firebaseStore;
  } else {
    const { sqliteStore } = await import("./sqlite");
    cached = sqliteStore;
  }
  return cached;
}

export type { DataStore } from "./types";
