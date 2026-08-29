// Password hashing for the sqlite (sandbox) backend. Deliberately free of
// Next.js imports so standalone scripts (firebase seed) can reuse it.
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const test = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return expected.length === test.length && timingSafeEqual(expected, test);
  } catch {
    return false;
  }
}
