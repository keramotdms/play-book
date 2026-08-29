import "server-only";
import { randomUUID } from "crypto";
import { adminAuth, adminBucket, adminDb } from "@/lib/firebase-admin";
import { CURRICULUM } from "@/lib/shared";
import { STARTER_SCRIPTS } from "@/lib/seed-data";
import type { DocumentData } from "firebase-admin/firestore";
import type {
  ClientRow,
  ClientUpdate,
  CopyRow,
  CopyUpdate,
  DataStore,
  LessonRow,
  LessonUpdate,
  NewClientInput,
  NewCopyInput,
  NewLessonInput,
  NewScriptInput,
  ScriptRow,
  ScriptUpdate,
  UserRow,
  UserProfileUpdate,
} from "./types";

/**
 * Firebase backend (production / Vercel).
 *
 * Mirrors the spec's Firestore layout exactly:
 *   users/{uid}/clients/{clientId}
 *   users/{uid}/outreach_scripts/{scriptId}
 *   users/{uid}/copies/{copyId}
 *   users/{uid}/learn_progress/{lessonId}
 * Profile fields live on the users/{uid} document itself.
 *
 * Client photos go to Cloud Storage under client_photos/{uid}/ and are served
 * through permanent per-file download tokens (readable regardless of rules;
 * writes happen only via the Admin SDK on the server).
 *
 * Collections are small (single-user app), so reads fetch the whole user
 * collection and sort/filter in memory — no composite indexes required.
 */

const root = () => adminDb().collection("users");
const DAY_MS = 86_400_000;
const COLD_LEAD_DAYS = 7;

// ---------- doc -> row mappers ----------

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "object" && "toDate" in (v as object)) {
    try {
      return (v as { toDate(): Date }).toDate();
    } catch {
      return null;
    }
  }
  return null;
}

function toStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function toNullableStr(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function mapClient(id: string, d: DocumentData): ClientRow {
  const now = new Date();
  return {
    id,
    name: toStr(d.name),
    niche: toStr(d.niche),
    email: toStr(d.email),
    phone: toStr(d.phone),
    socialLinkedin: toStr(d.socialLinkedin),
    socialInstagram: toStr(d.socialInstagram),
    socialX: toStr(d.socialX),
    socialOther: toStr(d.socialOther),
    imageUrl: toStr(d.imageUrl),
    icpScore: typeof d.icpScore === "number" ? d.icpScore : 0,
    icpTier: toStr(d.icpTier, "low_potential"),
    icpHasPaidOffer: Boolean(d.icpHasPaidOffer),
    icpHasEmailList: Boolean(d.icpHasEmailList),
    icpRightAudience: Boolean(d.icpRightAudience),
    icpGenericCopy: Boolean(d.icpGenericCopy),
    icpPostedRecently: Boolean(d.icpPostedRecently),
    status: toStr(d.status, "new"),
    scriptUsedInitial: toNullableStr(d.scriptUsedInitial),
    scriptUsedFollowup1: toNullableStr(d.scriptUsedFollowup1),
    scriptUsedFollowup2: toNullableStr(d.scriptUsedFollowup2),
    outreachSentAt: toDate(d.outreachSentAt),
    followUp1SentAt: toDate(d.followUp1SentAt),
    followUp2SentAt: toDate(d.followUp2SentAt),
    repliedAt: toDate(d.repliedAt),
    notes: toStr(d.notes),
    createdAt: toDate(d.createdAt) ?? now,
    updatedAt: toDate(d.updatedAt) ?? now,
  };
}

function mapScript(id: string, d: DocumentData): ScriptRow {
  const now = new Date();
  return {
    id,
    title: toStr(d.title),
    body: toStr(d.body),
    type: toStr(d.type, "initial"),
    tags: toStr(d.tags),
    createdAt: toDate(d.createdAt) ?? now,
    updatedAt: toDate(d.updatedAt) ?? now,
  };
}

function mapCopy(id: string, d: DocumentData): CopyRow {
  const now = new Date();
  return {
    id,
    title: toStr(d.title),
    body: toStr(d.body),
    nicheTag: toStr(d.nicheTag, "Other"),
    framework: toStr(d.framework, "custom"),
    clientIdRef: toNullableStr(d.clientIdRef),
    createdAt: toDate(d.createdAt) ?? now,
    updatedAt: toDate(d.updatedAt) ?? now,
  };
}

function mapLesson(id: string, d: DocumentData): LessonRow {
  const now = new Date();
  return {
    id,
    module: toStr(d.module),
    moduleOrder: typeof d.moduleOrder === "number" ? d.moduleOrder : 99,
    lessonOrder: typeof d.lessonOrder === "number" ? d.lessonOrder : 0,
    title: toStr(d.title),
    completed: Boolean(d.completed),
    isCustom: Boolean(d.isCustom),
    sourceUrl: toNullableStr(d.sourceUrl),
    notes: toNullableStr(d.notes),
    createdAt: toDate(d.createdAt) ?? now,
    updatedAt: toDate(d.updatedAt) ?? now,
  };
}

function profileFromDoc(uid: string, d: DocumentData): UserRow {
  return {
    id: uid,
    email: toStr(d.email),
    displayName: toStr(d.displayName),
    phone: toStr(d.phone),
    bio: toStr(d.bio),
    avatarUrl: toStr(d.avatarUrl),
  };
}

// ---------- storage helpers ----------

function storagePathFromUrl(url: string): string | null {
  // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?alt=media&token=...
  const m = url.match(/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

async function deleteStorageObject(url: string | null | undefined): Promise<void> {
  const filePath = storagePathFromUrl(url ?? "");
  if (!filePath) return;
  try {
    await adminBucket().file(filePath).delete({ ignoreNotFound: true });
  } catch {
    // best effort
  }
}

// ---------- per-user seed ----------

const seededUsers = new Map<string, Promise<void>>();

async function doUserSeed(userId: string): Promise<void> {
  const userRef = root().doc(userId);

  const scriptsSnap = await userRef.collection("outreach_scripts").limit(1).get();
  if (scriptsSnap.empty) {
    for (const s of STARTER_SCRIPTS) {
      await userRef.collection("outreach_scripts").add({
        ...s,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  const lessonsSnap = await userRef.collection("learn_progress").limit(1).get();
  if (lessonsSnap.empty) {
    const batch = adminDb().batch();
    for (let m = 0; m < CURRICULUM.length; m++) {
      const mod = CURRICULUM[m];
      for (let l = 0; l < mod.lessons.length; l++) {
        const doc = userRef.collection("learn_progress").doc();
        batch.set(doc, {
          module: mod.module,
          moduleOrder: m + 1,
          lessonOrder: l + 1,
          title: mod.lessons[l],
          completed: false, // nothing pre-checked, per spec
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
    await batch.commit();
  }
}

// ---------- profile helpers ----------

/** Loads (or creates) the users/{uid} profile document. */
export async function ensureProfileDoc(uid: string): Promise<UserRow> {
  const ref = root().doc(uid);
  const snap = await ref.get();
  if (snap.exists) return profileFromDoc(uid, snap.data() ?? {});

  let email = "";
  try {
    email = (await adminAuth().getUser(uid)).email ?? "";
  } catch {
    email = "";
  }
  const profile = {
    email,
    displayName: "Copywriter",
    phone: "",
    bio: "",
    avatarUrl: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await ref.set(profile, { merge: true });
  return profileFromDoc(uid, profile as unknown as DocumentData);
}

// ---------- the store ----------

export const firebaseStore: DataStore = {
  async ensureSeed() {
    // Accounts are provisioned in Firebase Auth (console or seed script);
    // per-user starter data is seeded lazily in ensureUserSeed().
  },

  async ensureUserSeed(userId) {
    let p = seededUsers.get(userId);
    if (!p) {
      p = doUserSeed(userId).catch((err) => {
        seededUsers.delete(userId);
        throw err;
      });
      seededUsers.set(userId, p);
    }
    await p;
  },

  async getUserByEmail(email) {
    try {
      const authUser = await adminAuth().getUserByEmail(email);
      return await ensureProfileDoc(authUser.uid);
    } catch {
      return null;
    }
  },

  async getUserById(id) {
    const snap = await root().doc(id).get();
    if (!snap.exists) return null;
    return profileFromDoc(id, snap.data() ?? {});
  },

  async updateUserProfile(userId, patch: UserProfileUpdate) {
    const ref = root().doc(userId);
    await ref.set({ ...patch, updatedAt: new Date() }, { merge: true });
    const snap = await ref.get();
    return profileFromDoc(userId, snap.data() ?? {});
  },

  async listClients(userId) {
    const snap = await root().doc(userId).collection("clients").get();
    return snap.docs
      .map((doc) => mapClient(doc.id, doc.data()))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  async getClient(userId, id) {
    const snap = await root().doc(userId).collection("clients").doc(id).get();
    if (!snap.exists) return null;
    return mapClient(snap.id, snap.data() ?? {});
  },

  async createClient(userId, input: NewClientInput) {
    const ref = root().doc(userId).collection("clients").doc();
    const now = new Date();
    await ref.create({ ...input, createdAt: now, updatedAt: now });
    return mapClient(ref.id, { ...input, createdAt: now, updatedAt: now });
  },

  async updateClient(userId, id, data: ClientUpdate) {
    const ref = root().doc(userId).collection("clients").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    await ref.set({ ...data, updatedAt: new Date() }, { merge: true });
    const after = await ref.get();
    return mapClient(id, after.data() ?? {});
  },

  async deleteClient(userId, id) {
    const ref = root().doc(userId).collection("clients").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const row = mapClient(id, snap.data() ?? {});
    await deleteStorageObject(row.imageUrl);
    await ref.delete();
    return row;
  },

  async deleteAllClients(userId) {
    const snap = await root().doc(userId).collection("clients").get();
    if (snap.empty) return 0;
    await Promise.all(
      snap.docs.map((doc) => deleteStorageObject(toStr(doc.data().imageUrl)))
    );
    // Firestore batches allow max 500 writes; chunk to stay under it.
    const docs = snap.docs;
    let deleted = 0;
    for (let i = 0; i < docs.length; i += 450) {
      const batch = adminDb().batch();
      docs.slice(i, i + 450).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deleted += Math.min(450, docs.length - i);
    }
    return deleted;
  },

  async sweepColdLeads(userId) {
    const snap = await root().doc(userId).collection("clients").get();
    const cutoff = Date.now() - COLD_LEAD_DAYS * DAY_MS;
    const stale = snap.docs.filter((doc) => {
      const d = doc.data();
      if (toStr(d.status) !== "follow_up_2_sent") return false;
      const sentAt = toDate(d.followUp2SentAt);
      return sentAt !== null && sentAt.getTime() <= cutoff;
    });
    if (stale.length === 0) return 0;
    const batch = adminDb().batch();
    stale.forEach((doc) =>
      batch.set(doc.ref, { status: "cold_lead", updatedAt: new Date() }, { merge: true })
    );
    await batch.commit();
    return stale.length;
  },

  async listScripts(userId) {
    const snap = await root().doc(userId).collection("outreach_scripts").get();
    return snap.docs
      .map((doc) => mapScript(doc.id, doc.data()))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getScript(userId, id) {
    const snap = await root()
      .doc(userId)
      .collection("outreach_scripts")
      .doc(id)
      .get();
    if (!snap.exists) return null;
    return mapScript(id, snap.data() ?? {});
  },

  async createScript(userId, input: NewScriptInput) {
    const ref = root().doc(userId).collection("outreach_scripts").doc();
    const now = new Date();
    await ref.create({ ...input, createdAt: now, updatedAt: now });
    return mapScript(ref.id, { ...input, createdAt: now, updatedAt: now });
  },

  async updateScript(userId, id, data: ScriptUpdate) {
    const ref = root().doc(userId).collection("outreach_scripts").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    await ref.set({ ...data, updatedAt: new Date() }, { merge: true });
    const after = await ref.get();
    return mapScript(id, after.data() ?? {});
  },

  async deleteScript(userId, id) {
    await root().doc(userId).collection("outreach_scripts").doc(id).delete();
  },

  async listCopies(userId) {
    const snap = await root().doc(userId).collection("copies").get();
    return snap.docs
      .map((doc) => mapCopy(doc.id, doc.data()))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getCopy(userId, id) {
    const snap = await root().doc(userId).collection("copies").doc(id).get();
    if (!snap.exists) return null;
    return mapCopy(id, snap.data() ?? {});
  },

  async createCopy(userId, input: NewCopyInput) {
    const ref = root().doc(userId).collection("copies").doc();
    const now = new Date();
    await ref.create({ ...input, createdAt: now, updatedAt: now });
    return mapCopy(ref.id, { ...input, createdAt: now, updatedAt: now });
  },

  async updateCopy(userId, id, data: CopyUpdate) {
    const ref = root().doc(userId).collection("copies").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    await ref.set({ ...data, updatedAt: new Date() }, { merge: true });
    const after = await ref.get();
    return mapCopy(id, after.data() ?? {});
  },

  async deleteCopy(userId, id) {
    await root().doc(userId).collection("copies").doc(id).delete();
  },

  async listLessons(userId) {
    const snap = await root().doc(userId).collection("learn_progress").get();
    return snap.docs
      .map((doc) => mapLesson(doc.id, doc.data()))
      .sort(
        (a, b) => a.moduleOrder - b.moduleOrder || a.lessonOrder - b.lessonOrder
      );
  },

  async getLesson(userId, id) {
    const snap = await root().doc(userId).collection("learn_progress").doc(id).get();
    if (!snap.exists) return null;
    return mapLesson(id, snap.data() ?? {});
  },

  async createLesson(userId, input: NewLessonInput) {
    const ref = root().doc(userId).collection("learn_progress").doc();
    const now = new Date();
    await ref.create({ ...input, createdAt: now, updatedAt: now });
    return mapLesson(ref.id, { ...input, createdAt: now, updatedAt: now });
  },

  async updateLesson(userId, id, data: LessonUpdate) {
    const ref = root().doc(userId).collection("learn_progress").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    await ref.set({ ...data, updatedAt: new Date() }, { merge: true });
    const after = await ref.get();
    return mapLesson(id, after.data() ?? {});
  },

  async deleteLesson(userId, id) {
    const ref = root().doc(userId).collection("learn_progress").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return false;
    if (!Boolean(snap.data()?.isCustom)) return false;
    await ref.delete();
    return true;
  },

  async saveUpload(userId, file, contentType, _ext) {
    const token = randomUUID();
    const filename = `${Date.now()}-${randomBytesHex(4)}`;
    const filePath = `client_photos/${userId}/${filename}`;
    const bucket = adminBucket();
    await bucket.file(filePath).save(file, {
      contentType,
      metadata: { metadata: { firebaseStorageDownloadTokens: token } },
      resumable: false,
    });
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
      filePath
    )}?alt=media&token=${token}`;
    return url;
  },
};

function randomBytesHex(n: number): string {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
