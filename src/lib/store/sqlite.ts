import "server-only";
import { unlink } from "fs/promises";
import { randomBytes } from "crypto";
import path from "path";
import { db } from "@/lib/db";
import { STARTER_PASSWORD, STARTER_SCRIPTS } from "@/lib/seed-data";
import { hashPassword } from "@/lib/password";
import { CURRICULUM } from "@/lib/shared";
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
  UserProfileUpdate,
} from "./types";

/**
 * Single-user SQLite backend (sandbox / local development).
 * There is exactly one account and its data lives in one SQLite file —
 * the Prisma schema is intentionally flat, so `userId` arguments are
 * accepted (per the DataStore contract) and ignored here.
 */

let seedPromise: Promise<void> | null = null;

async function doSeed(): Promise<void> {
  const user = await db.user.findFirst();
  if (!user) {
    await db.user.create({
      data: {
        email: "demo@copyplaybook.app",
        passwordHash: hashPassword(STARTER_PASSWORD),
        displayName: "Copywriter",
      },
    });
  }

  const scriptCount = await db.outreachScript.count();
  if (scriptCount === 0) {
    for (const s of STARTER_SCRIPTS) {
      await db.outreachScript.create({ data: s });
    }
  }

  const lessonCount = await db.lesson.count();
  if (lessonCount === 0) {
    for (let m = 0; m < CURRICULUM.length; m++) {
      const mod = CURRICULUM[m];
      for (let l = 0; l < mod.lessons.length; l++) {
        await db.lesson.create({
          data: {
            module: mod.module,
            moduleOrder: m + 1,
            lessonOrder: l + 1,
            title: mod.lessons[l],
            completed: false,
          },
        });
      }
    }
  }
}

async function deleteUploadFile(url: string | null | undefined): Promise<void> {
  if (!url || !url.startsWith("/uploads/")) return;
  const filename = url.split("/").pop();
  if (!filename || filename.includes("..") || filename.includes("/")) return;
  try {
    await unlink(path.join(process.cwd(), "public", "uploads", filename));
  } catch {
    // ignore missing files
  }
}

export const sqliteStore: DataStore = {
  async ensureSeed() {
    if (!seedPromise) {
      seedPromise = doSeed().catch((err) => {
        seedPromise = null;
        throw err;
      });
    }
    await seedPromise;
  },

  // sqlite keeps one global dataset — nothing per-user to seed.
  async ensureUserSeed() {},

  async getUserByEmail(email) {
    return db.user.findUnique({ where: { email } });
  },

  async getUserById(id) {
    return db.user.findUnique({ where: { id } });
  },

  async updateUserProfile(_userId, patch: UserProfileUpdate) {
    // Single-user schema: the profile row is the one user row.
    const user = await db.user.findFirst();
    if (!user) throw new Error("No user row");
    return db.user.update({ where: { id: user.id }, data: patch });
  },

  async listClients(_userId) {
    const rows = await db.client.findMany({ orderBy: { updatedAt: "desc" } });
    return rows as unknown as ClientRow[];
  },

  async getClient(_userId, id) {
    return (await db.client.findUnique({
      where: { id },
    })) as unknown as ClientRow | null;
  },

  async createClient(_userId, input: NewClientInput) {
    return (await db.client.create({ data: input })) as unknown as ClientRow;
  },

  async updateClient(_userId, id, data: ClientUpdate) {
    try {
      return (await db.client.update({
        where: { id },
        data,
      })) as unknown as ClientRow;
    } catch {
      return null;
    }
  },

  async deleteClient(_userId, id) {
    const existing = await db.client.findUnique({ where: { id } });
    if (!existing) return null;
    await deleteUploadFile(existing.imageUrl);
    await db.client.delete({ where: { id } });
    return existing as unknown as ClientRow;
  },

  async deleteAllClients(_userId) {
    const clients = await db.client.findMany({ select: { imageUrl: true } });
    await Promise.all(clients.map((c) => deleteUploadFile(c.imageUrl)));
    const res = await db.client.deleteMany({});
    return res.count;
  },

  async sweepColdLeads(_userId) {
    const cutoff = new Date(Date.now() - 7 * 86_400_000);
    const res = await db.client.updateMany({
      where: { status: "follow_up_2_sent", followUp2SentAt: { lte: cutoff } },
      data: { status: "cold_lead" },
    });
    return res.count;
  },

  async listScripts(_userId) {
    const rows = await db.outreachScript.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows as unknown as ScriptRow[];
  },

  async getScript(_userId, id) {
    return (await db.outreachScript.findUnique({
      where: { id },
    })) as unknown as ScriptRow | null;
  },

  async createScript(_userId, input: NewScriptInput) {
    return (await db.outreachScript.create({
      data: input,
    })) as unknown as ScriptRow;
  },

  async updateScript(_userId, id, data: ScriptUpdate) {
    try {
      return (await db.outreachScript.update({
        where: { id },
        data,
      })) as unknown as ScriptRow;
    } catch {
      return null;
    }
  },

  async deleteScript(_userId, id) {
    await db.outreachScript.delete({ where: { id } });
  },

  async listCopies(_userId) {
    const rows = await db.copy.findMany({ orderBy: { createdAt: "desc" } });
    return rows as unknown as CopyRow[];
  },

  async getCopy(_userId, id) {
    return (await db.copy.findUnique({ where: { id } })) as unknown as CopyRow | null;
  },

  async createCopy(_userId, input: NewCopyInput) {
    return (await db.copy.create({ data: input })) as unknown as CopyRow;
  },

  async updateCopy(_userId, id, data: CopyUpdate) {
    try {
      return (await db.copy.update({ where: { id }, data })) as unknown as CopyRow;
    } catch {
      return null;
    }
  },

  async deleteCopy(_userId, id) {
    await db.copy.delete({ where: { id } });
  },

  async listLessons(_userId) {
    const rows = await db.lesson.findMany({
      orderBy: [{ moduleOrder: "asc" }, { lessonOrder: "asc" }],
    });
    return rows as unknown as LessonRow[];
  },

  async getLesson(_userId, id) {
    return (await db.lesson.findUnique({
      where: { id },
    })) as unknown as LessonRow | null;
  },

  async createLesson(_userId, input: NewLessonInput) {
    return (await db.lesson.create({ data: input })) as unknown as LessonRow;
  },

  async updateLesson(_userId, id, data: LessonUpdate) {
    try {
      return (await db.lesson.update({ where: { id }, data })) as unknown as LessonRow;
    } catch {
      return null;
    }
  },

  async deleteLesson(_userId, id) {
    const lesson = await db.lesson.findUnique({ where: { id } });
    if (!lesson || !lesson.isCustom) return false;
    await db.lesson.delete({ where: { id } });
    return true;
  },

  async saveUpload(_userId, file, _contentType, ext) {
    const filename = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    const { mkdir, writeFile } = await import("fs/promises");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), file);
    return `/uploads/${filename}`;
  },
};
