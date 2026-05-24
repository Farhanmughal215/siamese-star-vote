/**
 * Barrel file for the Supabase service layer.
 *
 * Import everything from "@/lib/supabase/services" so callers don't have
 * to know which sub-file each helper lives in.
 */

export {
  slugForCat,
  getCatUuid,
  getCatUuidByName,
  hasCatIdMap,
} from "./catIdMap";

export {
  validateInvitationCode,
  getOrCreateVoter,
  type VoterServiceProfile,
} from "./voters";

export { getCats, loadCatsAndCacheIds } from "./cats";

export {
  getActiveCooldownsForVoter,
  canHeartCat,
  saveHeart,
  deleteHeart,
  type SaveHeartArgs,
} from "./hearts";

export {
  getAffectionForVoter,
  updateCatAffection,
  decrementCatAffection,
} from "./affection";

export {
  hasSpunForHeart,
  saveWheelSpin,
  type SaveWheelSpinArgs,
} from "./wheelSpins";

export {
  createCoupon,
  getCouponsForVoter,
  DEFAULT_COUPON_EXPIRY_MS,
  type CreateCouponArgs,
} from "./coupons";

export { getMemoryBookData, type MemoryBookData } from "./memoryBook";
