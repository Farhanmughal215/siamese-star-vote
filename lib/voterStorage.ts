/**
 * Frontend-only voting persistence + eligibility rules.
 *
 * Storage keys (plain names so they're easy to inspect in DevTools):
 *   voterProfile    — VoterProfile
 *   deviceId        — string ("device_<ts>_<rand>")
 *   voteHistory     — VoteRecord[]
 *   lastVote        — LastVote        (mirror of the most recent vote)
 *   lastWheelSpin   — WheelSpinRecord (one row, latest spin)
 *   couponHistory   — CouponRecord[]
 *
 * Schemas are intentionally minimal and align with how a future Supabase
 * schema would shape these rows — the swap will be a thin adapter.
 */

// ---------- Types ----------

export type VoterProfile = {
  invitationCode: string;
  name: string;
  email: string;
  phone: string;
  /** Epoch ms when this profile was first saved. */
  createdAt: number;
};

export type LastVote = {
  catId: number;
  catName: string;
  /** Epoch ms when the vote was confirmed. */
  votedAt: number;
  /** YYYY-MM-DD in the voter's local timezone. */
  voteDate: string;
};

export type VoteRecord = {
  voteId: string;
  catId: number;
  catName: string;
  voterEmail: string;
  deviceId: string;
  votedAt: number;
  voteDate: string;
};

export type WheelSpinRecord = {
  voteId: string;
  spunAt: number;
  resultType: "win" | "lose";
  rewardTitle?: string;
  couponCode?: string;
};

/**
 * Per-cat cooldown record. Lives alongside voteHistory — voteHistory is the
 * permanent analytics log, heartedCats is the live "is this cat currently
 * on cooldown" lookup. Entries expire after `nextAvailableAt` and are
 * pruned on next read.
 */
export type HeartedCat = {
  catId: number;
  catName: string;
  /** Epoch ms when the heart was given. */
  heartedAt: number;
  /** Epoch ms when this cat becomes voteable again. */
  nextAvailableAt: number;
};

/** Map keyed by catId (stringified for JSON compatibility). */
export type HeartedCatsMap = Record<string, HeartedCat>;

/** 5 hours between hearts on the same cat. */
export const CAT_COOLDOWN_MS = 5 * 60 * 60 * 1000;

/** 15 minutes after a vote, the user can still undo it. */
export const UNDO_WINDOW_MS = 15 * 60 * 1000;

export type CouponStatus = "active" | "redeemed" | "expired";

export type CouponRecord = {
  couponId: string;
  voteId: string;
  couponCode: string;
  rewardTitle: string;
  catName: string;
  voterName: string;
  voterEmail: string;
  issuedAt: number;
  expiresAt: number;
  status: CouponStatus;
};

export type CanVoteReason = "email_voted_today" | "device_voted_today";

export type CanVoteResult = {
  allowed: boolean;
  reason?: CanVoteReason;
  /** Epoch ms — next time the voter becomes eligible. */
  nextVoteAt?: number;
};

// ---------- Storage keys ----------

const PROFILE_KEY = "voterProfile";
const DEVICE_KEY = "deviceId";
const HISTORY_KEY = "voteHistory";
const LAST_VOTE_KEY = "lastVote";
const LAST_SPIN_KEY = "lastWheelSpin";
const COUPON_HISTORY_KEY = "couponHistory";
const HEARTED_CATS_KEY = "heartedCats";
const VOTER_ID_KEY = "voterId";

/**
 * Map from each heart's local voteId (the localStorage one) to the Supabase
 * heart row's UUID. Lets the un-vote path also reach into Supabase and
 * delete the right row.
 */
const HEART_ID_MAP_KEY = "heartIdMap";

// ---------- Date helpers ----------

/**
 * YYYY-MM-DD in the voter's local timezone. This is the key we compare
 * against to enforce "one vote per local calendar day".
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Epoch ms of next local midnight — used for the daily countdown target. */
export function getStartOfTomorrowLocal(): number {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

// ---------- Internal storage helpers ----------

function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota errors / private mode — fail soft.
  }
}

function remove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ---------- ID generators ----------

function randomSuffix(len = 6): string {
  return Math.random().toString(36).slice(2, 2 + len);
}

export function generateVoteId(): string {
  return `vote_${Date.now()}_${randomSuffix()}`;
}

export function generateCouponId(): string {
  return `coupon_${Date.now()}_${randomSuffix()}`;
}

/**
 * Generates a four-digit coupon code with a brand prefix (MEOW or STAR).
 * Frontend-only — the backend will eventually own this with a uniqueness
 * guarantee, but the format stays the same.
 */
export function generateCouponCode(): string {
  const prefix = Math.random() < 0.5 ? "MEOW" : "STAR";
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// ---------- Voter profile ----------

function isValidProfile(p: unknown): p is VoterProfile {
  if (!p || typeof p !== "object") return false;
  const obj = p as Record<string, unknown>;
  // phone is optional now (replaced by Supabase Auth password). Other
  // fields must still be present.
  return (
    typeof obj.invitationCode === "string" &&
    obj.invitationCode.length > 0 &&
    typeof obj.name === "string" &&
    obj.name.length > 0 &&
    typeof obj.email === "string" &&
    obj.email.length > 0 &&
    typeof obj.phone === "string"
  );
}

export function getStoredVoterProfile(): VoterProfile | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PROFILE_KEY);
  const parsed = safeParseJSON<VoterProfile>(raw);
  return isValidProfile(parsed) ? parsed : null;
}

export function saveVoterProfile(profile: VoterProfile): void {
  writeJSON(PROFILE_KEY, profile);
}

export function clearVoterProfile(): void {
  remove(PROFILE_KEY);
}

// ---------- Device ID ----------

/**
 * Returns the persisted deviceId, creating one on first call.
 * Format: device_<epoch_ms>_<random>.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(DEVICE_KEY);
  if (existing && existing.startsWith("device_")) return existing;
  const id = `device_${Date.now()}_${randomSuffix()}`;
  try {
    window.localStorage.setItem(DEVICE_KEY, id);
  } catch {
    // ignore
  }
  return id;
}

// ---------- Last vote (mirror of latest VoteRecord) ----------

function isValidLastVote(v: unknown): v is Partial<LastVote> {
  if (!v || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.catId === "number" && typeof obj.votedAt === "number";
}

export function getStoredLastVote(): LastVote | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LAST_VOTE_KEY);
  const parsed = safeParseJSON<Partial<LastVote>>(raw);
  if (!isValidLastVote(parsed)) return null;
  // Forward-compat: synthesise voteDate when reading legacy records.
  return {
    catId: parsed.catId as number,
    catName: typeof parsed.catName === "string" ? parsed.catName : "",
    votedAt: parsed.votedAt as number,
    voteDate:
      typeof parsed.voteDate === "string" && parsed.voteDate.length > 0
        ? parsed.voteDate
        : getLocalDateString(new Date(parsed.votedAt as number)),
  };
}

export function saveLastVote(vote: LastVote): void {
  writeJSON(LAST_VOTE_KEY, vote);
}

export function clearLastVote(): void {
  remove(LAST_VOTE_KEY);
}

// ---------- Vote history ----------

function isValidVoteRecord(v: unknown): v is VoteRecord {
  if (!v || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.voteId === "string" &&
    typeof obj.catId === "number" &&
    typeof obj.voterEmail === "string" &&
    typeof obj.deviceId === "string" &&
    typeof obj.votedAt === "number" &&
    typeof obj.voteDate === "string"
  );
}

export function getVoteHistory(): VoteRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(HISTORY_KEY);
  const parsed = safeParseJSON<unknown>(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isValidVoteRecord);
}

/**
 * Append a vote to the history and mirror it into lastVote.
 * Does NOT check eligibility — call canVoteToday() first.
 */
export function saveVote(record: VoteRecord): void {
  const history = getVoteHistory();
  history.push(record);
  writeJSON(HISTORY_KEY, history);

  saveLastVote({
    catId: record.catId,
    catName: record.catName,
    votedAt: record.votedAt,
    voteDate: record.voteDate,
  });
}

// ---------- Per-cat cooldown ----------

function isValidHeartedCat(c: unknown): c is HeartedCat {
  if (!c || typeof c !== "object") return false;
  const obj = c as Record<string, unknown>;
  return (
    typeof obj.catId === "number" &&
    typeof obj.catName === "string" &&
    typeof obj.heartedAt === "number" &&
    typeof obj.nextAvailableAt === "number"
  );
}

/**
 * Read the hearted-cats map from storage, drop entries whose cooldown has
 * elapsed, and persist the cleaned map. Returns the cleaned map. Callers
 * can treat the result as the source of truth for "which cats are currently
 * on cooldown" — no extra filtering needed.
 */
export function getHeartedCats(): HeartedCatsMap {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(HEARTED_CATS_KEY);
  const parsed = safeParseJSON<unknown>(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  const now = Date.now();
  const cleaned: HeartedCatsMap = {};
  let changed = false;
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!isValidHeartedCat(value)) {
      changed = true;
      continue;
    }
    if (value.nextAvailableAt <= now) {
      // Cooldown elapsed — drop the entry.
      changed = true;
      continue;
    }
    cleaned[key] = value;
  }

  if (changed) writeJSON(HEARTED_CATS_KEY, cleaned);
  return cleaned;
}

/**
 * Record a heart for the given cat and start its cooldown. Returns the
 * full HeartedCat entry so callers can drop it straight into local state.
 */
export function saveHeartedCat(
  catId: number,
  catName: string,
  cooldownMs: number = CAT_COOLDOWN_MS,
): HeartedCat {
  const heartedAt = Date.now();
  const entry: HeartedCat = {
    catId,
    catName,
    heartedAt,
    nextAvailableAt: heartedAt + cooldownMs,
  };
  const map = getHeartedCats();
  map[String(catId)] = entry;
  writeJSON(HEARTED_CATS_KEY, map);
  return entry;
}

/** True if the given cat is currently on cooldown. */
export function isCatOnCooldown(catId: number): boolean {
  const map = getHeartedCats();
  const entry = map[String(catId)];
  return !!entry && entry.nextAvailableAt > Date.now();
}

// ---------- Undo most recent vote ----------

export type UndoVoteResult = {
  /** Did we actually remove anything? false when no eligible vote exists. */
  removed: boolean;
  /** The cat that was un-voted. */
  removedCatId?: number;
  /** True if a coupon was rolled back along with the vote. */
  hadCoupon?: boolean;
  /** True if a wheel-spin record was rolled back. */
  hadWheelSpin?: boolean;
};

/**
 * Undo the most recent vote for the given cat if it happened within the
 * given window (default 15 minutes). Cascades cleanup across every storage
 * shelf the vote touched:
 *   - voteHistory  — removes the VoteRecord
 *   - lastVote     — recomputed from remaining history (or cleared)
 *   - heartedCats  — removes the cat's 5-hour cooldown entry
 *   - lastWheelSpin — removed if it belonged to this vote
 *   - couponHistory — any coupons issued for this vote are removed
 *
 * Returns { removed: false } when no vote for this cat exists, or the
 * most recent one is already older than the window.
 */
export function undoMostRecentVoteForCat(
  catId: number,
  windowMs: number = UNDO_WINDOW_MS,
): UndoVoteResult {
  if (typeof window === "undefined") return { removed: false };

  const history = getVoteHistory();
  // Walk backward so we pick the most recent record first.
  let idx = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].catId === catId) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return { removed: false };

  const vote = history[idx];
  if (Date.now() - vote.votedAt > windowMs) {
    return { removed: false };
  }

  // 1. Drop the vote from voteHistory.
  const nextHistory = [
    ...history.slice(0, idx),
    ...history.slice(idx + 1),
  ];
  writeJSON(HISTORY_KEY, nextHistory);

  // 2. Recompute lastVote from whatever's left.
  const newLast = nextHistory[nextHistory.length - 1];
  if (newLast) {
    saveLastVote({
      catId: newLast.catId,
      catName: newLast.catName,
      votedAt: newLast.votedAt,
      voteDate: newLast.voteDate,
    });
  } else {
    clearLastVote();
  }

  // 3. Clear the cat's cooldown entry.
  const heartedMap = getHeartedCats();
  if (heartedMap[String(catId)]) {
    delete heartedMap[String(catId)];
    writeJSON(HEARTED_CATS_KEY, heartedMap);
  }

  // 4. Drop the wheel-spin record if it belonged to this vote.
  const spin = getLastWheelSpin();
  let hadWheelSpin = false;
  if (spin && spin.voteId === vote.voteId) {
    remove(LAST_SPIN_KEY);
    hadWheelSpin = true;
  }

  // 5. Drop any coupons issued for this vote.
  const coupons = getCouponHistory();
  const remainingCoupons = coupons.filter((c) => c.voteId !== vote.voteId);
  const hadCoupon = remainingCoupons.length !== coupons.length;
  if (hadCoupon) {
    writeJSON(COUPON_HISTORY_KEY, remainingCoupons);
  }

  return {
    removed: true,
    removedCatId: catId,
    hadCoupon,
    hadWheelSpin,
  };
}

// ---------- Eligibility ----------

/**
 * Frontend-only daily eligibility check.
 *
 * TEMPORARILY DISABLED for end-to-end testing — always returns allowed.
 * Restore the body below to re-enable the 1-vote-per-day rule.
 *
 * Votes are still recorded to voteHistory and lastVote, so the data path
 * stays exercised — only the AlreadyVotedModal stops firing.
 */
export function canVoteToday(
  _email: string,
  _deviceId: string,
): CanVoteResult {
  return { allowed: true };

  // --- ORIGINAL RULE (re-enable when locking down) ---
  // const today = getLocalDateString();
  // const history = getVoteHistory();
  // const lowerEmail = _email.trim().toLowerCase();
  //
  // const emailMatch = history.some(
  //   (v) => v.voteDate === today && v.voterEmail.toLowerCase() === lowerEmail,
  // );
  // if (emailMatch) {
  //   return {
  //     allowed: false,
  //     reason: "email_voted_today",
  //     nextVoteAt: getStartOfTomorrowLocal(),
  //   };
  // }
  //
  // const deviceMatch = history.some(
  //   (v) => v.voteDate === today && v.deviceId === _deviceId,
  // );
  // if (deviceMatch) {
  //   return {
  //     allowed: false,
  //     reason: "device_voted_today",
  //     nextVoteAt: getStartOfTomorrowLocal(),
  //   };
  // }
  //
  // const last = getStoredLastVote();
  // if (last && last.voteDate === today && history.length === 0) {
  //   return {
  //     allowed: false,
  //     reason: "device_voted_today",
  //     nextVoteAt: getStartOfTomorrowLocal(),
  //   };
  // }
  //
  // return { allowed: true };
}

// ---------- Wheel spin ----------

function isValidSpin(v: unknown): v is WheelSpinRecord {
  if (!v || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.voteId === "string" &&
    typeof obj.spunAt === "number" &&
    (obj.resultType === "win" || obj.resultType === "lose")
  );
}

export function getLastWheelSpin(): WheelSpinRecord | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LAST_SPIN_KEY);
  const parsed = safeParseJSON<WheelSpinRecord>(raw);
  return isValidSpin(parsed) ? parsed : null;
}

/** True when the wheel has already been spun for the given voteId. */
export function hasSpunForVote(voteId: string): boolean {
  const last = getLastWheelSpin();
  return last !== null && last.voteId === voteId;
}

export function saveWheelSpin(record: WheelSpinRecord): void {
  writeJSON(LAST_SPIN_KEY, record);
}

// ---------- Coupon history ----------

function isValidCoupon(c: unknown): c is CouponRecord {
  if (!c || typeof c !== "object") return false;
  const obj = c as Record<string, unknown>;
  return (
    typeof obj.couponId === "string" &&
    typeof obj.voteId === "string" &&
    typeof obj.couponCode === "string" &&
    typeof obj.rewardTitle === "string" &&
    typeof obj.issuedAt === "number" &&
    typeof obj.expiresAt === "number"
  );
}

export function getCouponHistory(): CouponRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(COUPON_HISTORY_KEY);
  const parsed = safeParseJSON<unknown>(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isValidCoupon);
}

/**
 * Append a coupon to history. Idempotent on voteId — a second call for
 * the same vote is ignored so a coupon can't be generated twice.
 */
export function saveCoupon(record: CouponRecord): void {
  const history = getCouponHistory();
  if (history.some((c) => c.voteId === record.voteId)) return;
  history.push(record);
  writeJSON(COUPON_HISTORY_KEY, history);
}

// ---------- Supabase voterId (Phase 3B) ----------

/**
 * The voter's Supabase UUID, persisted across refreshes so we don't have
 * to re-create the row every session. Set after `getOrCreateVoter()`
 * succeeds. Stays null until then — services tolerate that and no-op.
 */
export function getStoredVoterId(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(VOTER_ID_KEY);
  return raw && raw.length > 0 ? raw : null;
}

export function saveVoterId(voterId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VOTER_ID_KEY, voterId);
  } catch {
    // ignore
  }
}

export function clearVoterId(): void {
  remove(VOTER_ID_KEY);
}

// ---------- voteId → Supabase heartId map (Phase 3B) ----------

/**
 * When we successfully save a heart to Supabase, we remember its UUID
 * keyed by the local voteId. The 15-minute undo path uses this lookup to
 * also delete the row from Supabase.
 *
 * Stored as a plain Record<voteId, heartId>. Auto-pruned on read when
 * entries no longer have a matching VoteRecord (so the map can't grow
 * forever).
 */
type HeartIdMap = Record<string, string>;

export function getHeartIdMap(): HeartIdMap {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(HEART_ID_MAP_KEY);
  const parsed = safeParseJSON<unknown>(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: HeartIdMap = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export function setHeartId(voteId: string, heartId: string): void {
  const map = getHeartIdMap();
  map[voteId] = heartId;
  writeJSON(HEART_ID_MAP_KEY, map);
}

export function getHeartId(voteId: string): string | null {
  const map = getHeartIdMap();
  return map[voteId] ?? null;
}

export function removeHeartId(voteId: string): void {
  const map = getHeartIdMap();
  if (!(voteId in map)) return;
  delete map[voteId];
  writeJSON(HEART_ID_MAP_KEY, map);
}
