// Data-store contract shared by both backends.
//
// Every data method takes the owner's userId as its first argument:
//  - firebase: maps to users/{uid}/... subcollections (spec layout)
//  - sqlite: single-user sandbox schema — the id is accepted and ignored
//
// Rows keep Date objects on the server (they serialize to ISO strings in the
// JSON responses, exactly like the Prisma rows did) so that all existing
// domain logic (sorting by updatedAt.getTime() etc.) keeps working unchanged.

export interface UserRow {
  id: string;
  email: string;
  displayName: string;
  phone: string;
  bio: string;
  avatarUrl: string;
  // sqlite only — firebase holds passwords in Firebase Auth
  passwordHash?: string;
}

export interface ClientRow {
  id: string;
  name: string;
  niche: string;
  email: string;
  phone: string;
  socialLinkedin: string;
  socialInstagram: string;
  socialX: string;
  socialOther: string;
  imageUrl: string;
  icpScore: number;
  icpTier: string;
  icpHasPaidOffer: boolean;
  icpHasEmailList: boolean;
  icpRightAudience: boolean;
  icpGenericCopy: boolean;
  icpPostedRecently: boolean;
  status: string;
  scriptUsedInitial: string | null;
  scriptUsedFollowup1: string | null;
  scriptUsedFollowup2: string | null;
  outreachSentAt: Date | null;
  followUp1SentAt: Date | null;
  followUp2SentAt: Date | null;
  repliedAt: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewClientInput {
  name: string;
  niche: string;
  email: string;
  phone: string;
  socialLinkedin: string;
  socialInstagram: string;
  socialX: string;
  socialOther: string;
  imageUrl: string;
  notes: string;
  status: "new";
  icpScore: number;
  icpTier: string;
  icpHasPaidOffer: boolean;
  icpHasEmailList: boolean;
  icpRightAudience: boolean;
  icpGenericCopy: boolean;
  icpPostedRecently: boolean;
}

export type ClientUpdate = Partial<Omit<ClientRow, "id" | "createdAt">>;

export interface ScriptRow {
  id: string;
  title: string;
  body: string;
  type: string;
  tags: string; // comma-joined
  createdAt: Date;
  updatedAt: Date;
}

export interface NewScriptInput {
  title: string;
  body: string;
  type: string;
  tags: string;
}

export type ScriptUpdate = Partial<Omit<ScriptRow, "id" | "createdAt">>;

export interface CopyRow {
  id: string;
  title: string;
  body: string;
  nicheTag: string;
  framework: string;
  clientIdRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewCopyInput {
  title: string;
  body: string;
  nicheTag: string;
  framework: string;
  clientIdRef: string | null;
}

export type CopyUpdate = Partial<Omit<CopyRow, "id" | "createdAt">>;

export interface LessonRow {
  id: string;
  module: string;
  moduleOrder: number;
  lessonOrder: number;
  title: string;
  completed: boolean;
  isCustom: boolean;
  sourceUrl: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewLessonInput {
  title: string;
  module: string;
  moduleOrder: number;
  lessonOrder: number;
  completed: boolean;
  isCustom: boolean;
  sourceUrl: string | null;
  notes: string | null;
}

export type LessonUpdate = Partial<
  Pick<LessonRow, "completed" | "title" | "sourceUrl" | "notes">
>;

export interface UserProfileUpdate {
  displayName?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface DataStore {
  /**
   * Global bootstrap. sqlite: creates the single demo account + starter data.
   * firebase: no-op (accounts live in Firebase Auth and are created via the
   * console or `bun run seed:firebase`).
   */
  ensureSeed(): Promise<void>;

  /** Per-user starter data (starter scripts + curriculum). firebase only. */
  ensureUserSeed(userId: string): Promise<void>;

  // ---- users / profile ----
  getUserByEmail(email: string): Promise<UserRow | null>;
  getUserById(id: string): Promise<UserRow | null>;
  updateUserProfile(userId: string, patch: UserProfileUpdate): Promise<UserRow>;

  // ---- clients ----
  listClients(userId: string): Promise<ClientRow[]>;
  getClient(userId: string, id: string): Promise<ClientRow | null>;
  createClient(userId: string, input: NewClientInput): Promise<ClientRow>;
  updateClient(
    userId: string,
    id: string,
    data: ClientUpdate
  ): Promise<ClientRow | null>;
  /** Deletes the client and its uploaded photo. Returns the deleted row. */
  deleteClient(userId: string, id: string): Promise<ClientRow | null>;
  /** Danger zone: delete every client + photo. Returns the count. */
  deleteAllClients(userId: string): Promise<number>;
  /** Lazy 7-day cold-lead sweep. Returns the number of flipped rows. */
  sweepColdLeads(userId: string): Promise<number>;

  // ---- outreach scripts ----
  listScripts(userId: string): Promise<ScriptRow[]>;
  getScript(userId: string, id: string): Promise<ScriptRow | null>;
  createScript(userId: string, input: NewScriptInput): Promise<ScriptRow>;
  updateScript(
    userId: string,
    id: string,
    data: ScriptUpdate
  ): Promise<ScriptRow | null>;
  deleteScript(userId: string, id: string): Promise<void>;

  // ---- copy library ----
  listCopies(userId: string): Promise<CopyRow[]>;
  getCopy(userId: string, id: string): Promise<CopyRow | null>;
  createCopy(userId: string, input: NewCopyInput): Promise<CopyRow>;
  updateCopy(userId: string, id: string, data: CopyUpdate): Promise<CopyRow | null>;
  deleteCopy(userId: string, id: string): Promise<void>;

  // ---- learn progress ----
  listLessons(userId: string): Promise<LessonRow[]>;
  getLesson(userId: string, id: string): Promise<LessonRow | null>;
  createLesson(userId: string, input: NewLessonInput): Promise<LessonRow>;
  updateLesson(
    userId: string,
    id: string,
    data: LessonUpdate
  ): Promise<LessonRow | null>;
  /** Only custom lessons can be deleted. Returns false otherwise. */
  deleteLesson(userId: string, id: string): Promise<boolean>;

  // ---- uploads ----
  /** Persists an image and returns its public URL. */
  saveUpload(
    userId: string,
    file: Buffer,
    contentType: string,
    ext: string
  ): Promise<string>;
}
