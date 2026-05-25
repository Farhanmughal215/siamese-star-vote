"use client";

/**
 * Siamese Star Vote — main page orchestrator.
 *
 * ── Phase 2.5 QA checklist ─────────────────────────────────────────────
 *  [✓] Mobile layout (360, 390, 430) — modals scroll internally; live feed
 *      uses single compact pill bottom-center; ambient particles trimmed
 *      to 5 on <640px.
 *  [✓] Full voting flow — cards → confirmation → voter details (if new)
 *      → success → fortune wheel → reward result → coupon reveal → PDF /
 *      print → share → countdown.
 *  [✓] "Already voted today" — modal in place (canVoteToday is temporarily
 *      relaxed for testing; rule body preserved in voterStorage.ts).
 *  [✓] Coupon win flow — animated envelope reveal, then redemption info +
 *      actions fade in.
 *  [✓] "Try tomorrow" no-win branch — NoWinPanel with countdown chip.
 *  [✓] PDF download — html2canvas + jsPDF, dynamic-imported, friendly
 *      inline error toast on failure.
 *  [✓] Print — @media print isolates the offscreen PrintableCoupon.
 *  [✓] Refresh state — hydrate voterProfile, deviceId, lastVote, visitor
 *      stats on mount; "already voted today" derived from local-date match.
 *  [✓] localStorage corruption-safe — every reader is wrapped in
 *      safeParseJSON + a validator that returns null/empty on bad data;
 *      writes are try/catch'd (private mode + quota).
 *  [✓] Reduced motion — useReducedMotion in CouponReveal, MoodBackground,
 *      AmbientEffects, StorybookCatModal, LiveHeartsFeed; globals.css
 *      additionally clamps all animations to 0.001ms when the OS asks.
 * ──────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import GameHeader from "@/components/GameHeader";
import SeasonBanner, { VotingClosedNotice } from "@/components/SeasonBanner";
import IntroCard from "@/components/IntroCard";
import UserWelcomeCard from "@/components/UserWelcomeCard";
import RescueSupportSection from "@/components/RescueSupportSection";
import SearchAndFilters, {
  type FilterValue,
} from "@/components/SearchAndFilters";
import CatGrid from "@/components/CatGrid";
import VoteConfirmationModal from "@/components/VoteConfirmationModal";
import VoterDetailsModal from "@/components/VoterDetailsModal";
import AlreadyVotedModal from "@/components/AlreadyVotedModal";
import SuccessModal from "@/components/SuccessModal";
import FortuneWheel from "@/components/FortuneWheel";
import RewardResultModal from "@/components/RewardResultModal";
import ShareCardPreview from "@/components/ShareCardPreview";
import StorybookCatModal from "@/components/StorybookCatModal";
import CatChat from "@/components/CatChat";
import CatCooldownModal from "@/components/CatCooldownModal";
import CatMemoryBook from "@/components/CatMemoryBook";
import AmbientEffects from "@/components/AmbientEffects";
import MoodBackground from "@/components/MoodBackground";
import MoodChip from "@/components/MoodChip";
import PremiumLoader from "@/components/PremiumLoader";
import MilestoneToast from "@/components/MilestoneToast";
import FlyingHeart from "@/components/FlyingHeart";
import ScreenPulse from "@/components/ScreenPulse";
import LiveHeartsFeed from "@/components/LiveHeartsFeed";
import ErrorToast from "@/components/ErrorToast";
import type { GiveHeartContext } from "@/components/CatCard";
import { cats as allCats } from "@/data/cats";
import type { CatRow } from "@/lib/supabase/database.types";
import {
  rollFromConfig,
  rollWheelOutcome,
  sectionFromReward,
} from "@/data/rewards";
import { getWheelConfig } from "@/lib/supabase/services/wheelRewards";
import {
  getSeasonState,
  type CurrentSeason,
  type SeasonStatus,
} from "@/lib/supabase/services/seasons";
import type { WheelRewardRow } from "@/lib/supabase/database.types";
import type { Cat, VoteFlow, WheelOutcome } from "@/lib/types";
import {
  canVoteToday,
  generateCouponId,
  generateVoteId,
  getCouponHistory,
  getHeartedCats,
  getHeartId,
  getLocalDateString,
  getOrCreateDeviceId,
  getStartOfTomorrowLocal,
  getStoredLastVote,
  getStoredVoterId,
  getStoredVoterProfile,
  getVoteHistory,
  hasSpunForVote,
  removeHeartId,
  saveCoupon,
  saveHeartedCat,
  saveVote,
  saveVoterId,
  saveVoterProfile,
  saveWheelSpin,
  setHeartId,
  undoMostRecentVoteForCat,
  type CouponRecord,
  type HeartedCatsMap,
  type LastVote,
  type VoteRecord,
  type VoterProfile,
  type WheelSpinRecord,
} from "@/lib/voterStorage";
import {
  canHeartCat as canHeartCatRemote,
  createCoupon as createCouponRemote,
  deleteHeart as deleteHeartRemote,
  decrementCatAffection as decrementCatAffectionRemote,
  getActiveCooldownsForVoter,
  getAffectionForVoter,
  getCatUuidByName,
  getHeartCountsByCatId,
  getMemoryBookData,
  getOrCreateVoter,
  loadCatsAndCacheIds,
  saveHeart as saveHeartRemote,
  saveWheelSpin as saveWheelSpinRemote,
  updateCatAffection as updateCatAffectionRemote,
  validateInvitationCode,
} from "@/lib/supabase/services";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createBrowserSupabaseClient } from "@/lib/supabase/ssr/client";
import { useRouter } from "next/navigation";
import { playSound } from "@/lib/sound";
import {
  awardMilestone,
  decrementCoupon,
  decrementVote,
  getVisitorStats,
  pendingCouponMilestones,
  pendingVisitMilestones,
  pendingVoteMilestones,
  recordCoupon,
  recordVisitIfNewDay,
  recordVote,
  type Milestone,
} from "@/lib/visitorStats";
import {
  decrementHeart,
  getAffectionLevelMeta,
  getCatAffection,
  recordHeart,
  type AffectionMap,
} from "@/lib/catAffection";

/**
 * Merge Supabase cat rows (the live, admin-editable source) with the static
 * data file (which still owns tags/quote/favoriteThings — not yet in DB).
 * Match strategy: Supabase `slug` vs static `name.toLowerCase()`.
 *
 *   - Static-matched cat → keep the static's numeric `id`, `rank`, `tags`,
 *     `quote`, `favoriteThings`; everything else (name, title, personality,
 *     description, image, storyUrl) comes from Supabase.
 *   - New admin-added cat → assign a synthetic id past the static range and
 *     fill in friendly defaults so the UI still renders nicely.
 *
 * Optional `heartCounts` (uuid → number) attaches the total hearts received
 * to each cat so the home page can sort the grid as a live leaderboard.
 */
function mergeLiveCats(
  rows: CatRow[],
  statics: Cat[],
  heartCounts?: Map<string, number>,
): Cat[] {
  const staticBySlug = new Map(
    statics.map((c) => [c.name.toLowerCase(), c] as const),
  );
  const maxStaticId = statics.reduce((m, c) => Math.max(m, c.id), 0);
  let nextSynth = maxStaticId + 1;

  return rows.map((row) => {
    const fallback = staticBySlug.get(row.slug);
    return {
      id: fallback?.id ?? nextSynth++,
      rank: fallback?.rank ?? 99,
      name: row.name,
      title: row.title,
      personality: row.personality,
      description: row.description,
      image: row.image_url,
      storyUrl: row.story_url ?? fallback?.storyUrl ?? "#",
      tags: fallback?.tags ?? ["Gentle"],
      quote: fallback?.quote ?? `Hi, I'm ${row.name}. So glad you're here.`,
      favoriteThings:
        fallback?.favoriteThings ?? [
          "Sunny windows",
          "Soft blankets",
          "Quiet visitors",
          "Slow blinks",
        ],
      hearts: heartCounts?.get(row.id) ?? 0,
      slug: row.slug,
    };
  });
}

export default function Home() {
  const router = useRouter();

  // ---- Voter identity ----
  const [voterProfile, setVoterProfile] = useState<VoterProfile | null>(null);
  const [deviceId, setDeviceId] = useState<string>("");
  // Supabase voter UUID — set after getOrCreateVoter succeeds. Null when
  // the user has no profile yet, or when Supabase isn't reachable.
  const [voterId, setVoterId] = useState<string | null>(null);
  // True once we've checked Supabase auth on mount. Used to gate the Give
  // Heart click so we don't open the vote flow for a logged-out visitor.
  const [isAuthed, setIsAuthed] = useState<boolean>(false);

  // ---- Error toast ----
  // Single-string queue is enough: errors are rare and we'd rather replace
  // an old message than stack them.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const showError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);
  const dismissError = useCallback(() => setErrorMessage(null), []);

  // ---- Voter details flow ----
  const [voterDetailsOpen, setVoterDetailsOpen] = useState(false);
  const [pendingVoteCat, setPendingVoteCat] = useState<Cat | null>(null);

  // ---- Auxiliary modals ----
  const [profileCat, setProfileCat] = useState<Cat | null>(null);
  // AI chat with a cat — opened from the storybook modal via the
  // "Chat with [name]" button.
  const [chatCat, setChatCat] = useState<Cat | null>(null);
  const [alreadyVotedOpen, setAlreadyVotedOpen] = useState(false);
  // The cat shown in the per-cat cooldown popup (when the user taps a
  // "Hearted" button while the 5-hour cooldown is still active).
  const [cooldownCat, setCooldownCat] = useState<Cat | null>(null);
  // Memory book modal — opened from the user welcome card.
  const [memoryBookOpen, setMemoryBookOpen] = useState(false);
  // Coupon count for the memory book stat tile. Hydrated on mount and
  // bumped after every coupon win so the modal always shows fresh totals
  // without re-reading localStorage on every open.
  const [totalCoupons, setTotalCoupons] = useState(0);

  // ---- Per-cat cooldown ----
  // Live map of cats currently on their 5-hour cooldown. Hydrated from
  // localStorage on mount (with auto-prune) and updated locally after each
  // successful vote so the UI reflects the lock instantly.
  const [heartedCats, setHeartedCats] = useState<HeartedCatsMap>({});

  // ---- Per-cat affection ----
  // Long-term relationship layer. Each successful heart increments the
  // per-cat heartsGiven counter and may push the affection level up.
  const [catAffection, setCatAffection] = useState<AffectionMap>({});

  // ---- Vote flow state machine ----
  const [voteFlow, setVoteFlow] = useState<VoteFlow>({ stage: "idle" });

  const [votedCatId, setVotedCatId] = useState<number | null>(null);
  const [nextVoteAt, setNextVoteAt] = useState<number | null>(null);
  const [lastVote, setLastVoteState] = useState<LastVote | null>(null);
  const [currentVoteId, setCurrentVoteId] = useState<string | null>(null);
  const [voteCounter, setVoteCounter] = useState(0);

  const [pendingOutcome, setPendingOutcome] = useState<WheelOutcome | null>(null);

  // ---- Search / filter state ----
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("All");

  // ---- Live cats roster ----
  // Starts as the static `allCats` so the UI has data before Supabase
  // responds. Replaced on mount with the Supabase-merged list (active cats
  // only, admin edits applied).
  const [liveCats, setLiveCats] = useState<Cat[]>(allCats);

  // ---- Live wheel rewards + win rate (admin-managed) ----
  // Null = not loaded yet → roll falls back to the static reward set in
  // data/rewards.ts. Once loaded, every spin uses the live catalog.
  const [liveRewards, setLiveRewards] = useState<WheelRewardRow[] | null>(null);
  const [liveWinRate, setLiveWinRate] = useState<number | null>(null);

  // ---- Current voting season state ----
  // `status` distinguishes three cases:
  //   'unconfigured' → no seasons ever created → site behaves as before
  //                    (always open), no banner, no closed notice
  //   'live'         → a season is currently running → show banner +
  //                    countdown
  //   'closed'       → seasons exist but none active → show closed notice
  //                    + block the heart flow
  const [seasonStatus, setSeasonStatus] = useState<SeasonStatus>(
    "unconfigured",
  );
  const [currentSeason, setCurrentSeason] = useState<CurrentSeason | null>(
    null,
  );

  // ---- Premium loader ----
  const [loader, setLoader] = useState<{ open: boolean; text: string }>({
    open: true,
    text: "Gathering the cats…",
  });

  // ---- Milestone toast queue ----
  const [milestoneQueue, setMilestoneQueue] = useState<Milestone[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);

  // ---- Give-Heart click animation ----
  // Holds the flying-heart + card-reaction state during the ~900ms
  // pre-modal animation sequence.
  const [giveHeartAnim, setGiveHeartAnim] = useState<{
    cat: Cat;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const reducedMotion = useReducedMotion();

  // ---- Hydrate from localStorage on mount ----
  useEffect(() => {
    const did = getOrCreateDeviceId();
    setDeviceId(did);

    const profile = getStoredVoterProfile();
    if (profile) setVoterProfile(profile);
    const storedVoterId = getStoredVoterId();
    if (storedVoterId) setVoterId(storedVoterId);

    const stored = getStoredLastVote();
    if (stored) {
      setLastVoteState(stored);
      if (stored.voteDate === getLocalDateString()) {
        setVotedCatId(stored.catId);
        setNextVoteAt(getStartOfTomorrowLocal());
      }
    }

    // Hydrate the per-cat cooldown map. getHeartedCats() auto-prunes any
    // entries whose 5-hour cooldown has already elapsed, so refresh after
    // a long break shows cats correctly unlocked.
    setHeartedCats(getHeartedCats());

    // Hydrate the long-term affection map.
    setCatAffection(getCatAffection());

    // Coupon count for the memory book stat tile.
    setTotalCoupons(getCouponHistory().length);

    // ---- Supabase background sync (Phase 3B + 4A) ----
    if (isSupabaseConfigured) {
      void (async () => {
        // Live cats roster: replace the static initial list with the live
        // Supabase rows (admin-editable; inactive cats already filtered out
        // by getCats). Merged with the static fallback so we still get
        // tags/quote/favoriteThings until those move to the DB.
        const [supabaseCats, wheelCfg, seasonState, heartCounts] =
          await Promise.all([
            loadCatsAndCacheIds(),
            getWheelConfig(),
            getSeasonState(),
            getHeartCountsByCatId(),
          ]);
        if (supabaseCats && supabaseCats.length > 0) {
          setLiveCats(mergeLiveCats(supabaseCats, allCats, heartCounts));
        }
        if (wheelCfg) {
          setLiveRewards(wheelCfg.rewards);
          setLiveWinRate(wheelCfg.winRatePercent);
        }
        setSeasonStatus(seasonState.status);
        setCurrentSeason(seasonState.current);

        // ---- Phase 4A: sync auth session with local voter state ----
        // If the user has an active Supabase session, fetch their voter
        // row by user_id and use that as the source of truth (overrides
        // anything stale in localStorage). If no session, clear local
        // voter data so the "Sign in to vote" CTA shows.
        const browserClient = createBrowserSupabaseClient();
        const { data: authData } = await browserClient.auth.getUser();
        if (authData.user) {
          setIsAuthed(true);
          const { data: voterRow } = await browserClient
            .from("voters")
            .select("*")
            .eq("user_id", authData.user.id)
            .maybeSingle();
          if (voterRow) {
            const syncedProfile: VoterProfile = {
              name: voterRow.name,
              email: voterRow.email,
              phone: voterRow.phone ?? "",
              invitationCode: voterRow.invitation_code,
              createdAt: new Date(voterRow.created_at).getTime(),
            };
            saveVoterProfile(syncedProfile);
            saveVoterId(voterRow.id);
            setVoterProfile(syncedProfile);
            setVoterId(voterRow.id);
          }
        } else {
          // No session — make sure stale auth-linked state isn't shown.
          setIsAuthed(false);
        }

        // Subscribe to subsequent auth changes (sign-out from another tab,
        // sign-in after redirect, etc.) so the UI stays in sync.
        const { data: authSub } = browserClient.auth.onAuthStateChange(
          (_event, session) => {
            setIsAuthed(!!session?.user);
            if (!session?.user) {
              // Sign-out: clear the voter state. localStorage stays for now
              // so a future sign-in with the same email can rehydrate.
              setVoterProfile(null);
              setVoterId(null);
            }
          },
        );
        // Cleanup is fine on unmount since this effect runs once at mount.
        // (We could return a cleanup but the page unmounts only on full
        // navigation away, which is rare for a SPA-style root page.)
        void authSub;

        // Backfill: if the user has a localStorage profile but no Supabase
        // voterId (typical when they registered BEFORE we wired Supabase),
        // create the voter row now so future votes can write through.
        let activeVoterId = storedVoterId;
        if (!activeVoterId && profile && did) {
          const newVoterId = await getOrCreateVoter({
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            invitationCode: profile.invitationCode,
            deviceId: did,
          });
          if (newVoterId) {
            saveVoterId(newVoterId);
            setVoterId(newVoterId);
            activeVoterId = newVoterId;
          }
        }

        if (activeVoterId) {
          const mb = await getMemoryBookData(activeVoterId);
          if (mb) setTotalCoupons(mb.coupons.length);
        }
      })();
    }

    // Bump visit count (once per local day) and seed any milestone toasts.
    const stats = recordVisitIfNewDay();
    setTotalVotes(stats.totalVotes);
    const visitMs = pendingVisitMilestones(stats);
    if (visitMs.length > 0) {
      const awarded = visitMs
        .map((m) => awardMilestone(m.id))
        .filter((m): m is Milestone => m !== null);
      if (awarded.length > 0) {
        setMilestoneQueue((q) => [...q, ...awarded]);
      }
    }

    // Dismiss splash loader after a brief beat.
    const t = window.setTimeout(
      () => setLoader({ open: false, text: "" }),
      1200,
    );
    return () => window.clearTimeout(t);
  }, []);

  // ---- Helpers ----
  const showLoader = useCallback((text: string, ms: number) => {
    setLoader({ open: true, text });
    window.setTimeout(() => setLoader({ open: false, text: "" }), ms);
  }, []);

  const queueMilestones = useCallback((items: Milestone[]) => {
    if (items.length === 0) return;
    const awarded = items
      .map((m) => awardMilestone(m.id))
      .filter((m): m is Milestone => m !== null);
    if (awarded.length > 0) setMilestoneQueue((q) => [...q, ...awarded]);
  }, []);

  // ---- Derived ----
  // Always sorted by hearts descending so the grid acts as a live
  // leaderboard. Ties broken by the original static `rank` so the order is
  // stable when no one has voted yet.
  const visibleCats = useMemo(() => {
    const query = search.trim().toLowerCase();
    return liveCats
      .filter((cat) => {
        const matchesQuery =
          query.length === 0 ||
          cat.name.toLowerCase().includes(query) ||
          cat.title.toLowerCase().includes(query);
        const matchesFilter =
          activeFilter === "All" || cat.tags.includes(activeFilter);
        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => {
        const ha = a.hearts ?? 0;
        const hb = b.hearts ?? 0;
        if (hb !== ha) return hb - ha;
        return a.rank - b.rank;
      });
  }, [liveCats, search, activeFilter]);

  const votedCat = useMemo(
    () => liveCats.find((c) => c.id === votedCatId) ?? null,
    [liveCats, votedCatId],
  );

  const favoriteCat = useMemo(
    () =>
      lastVote ? liveCats.find((c) => c.id === lastVote.catId) ?? null : null,
    [liveCats, lastVote],
  );

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setActiveFilter("All");
  }, []);

  // ---- Vote flow handlers ----

  /**
   * Click handler for the Give-Heart card button.
   *
   * If we have a button + card rect AND motion isn't reduced AND no
   * animation is already in flight, run the pre-modal heart sequence:
   *   t=0      heart appears at the button, flies upward in an arc
   *   t≈500ms  heart lands on the cat image; card bounces, glows, wiggles;
   *            sparkle burst fires; screen pulses pink
   *   t≈900ms  vote confirmation modal opens
   *
   * Otherwise (no rects, reduced motion, or animation in progress) we
   * fall back to opening the modal immediately.
   */
  const handleGiveHeart = useCallback(
    (cat: Cat, ctx?: GiveHeartContext) => {
      // Per-cat 5-hour cooldown — if this cat is still on cooldown, open
      // the cooldown info modal instead of starting the vote flow.
      const cooldownEntry = heartedCats[String(cat.id)];
      if (cooldownEntry && cooldownEntry.nextAvailableAt > Date.now()) {
        setCooldownCat(cat);
        return;
      }

      playSound("pawTap");

      if (giveHeartAnim || reducedMotion || !ctx) {
        setVoteFlow({ stage: "confirming", cat });
        return;
      }

      const { buttonRect, cardRect } = ctx;
      const startX = buttonRect.left + buttonRect.width / 2;
      const startY = buttonRect.top + buttonRect.height / 2;
      // Target the upper third of the card — where the cat image lives.
      const endX = cardRect.left + cardRect.width / 2;
      const endY = cardRect.top + cardRect.height * 0.3;

      setGiveHeartAnim({ cat, startX, startY, endX, endY });

      // Modal opens once the heart has landed and the reaction has had
      // a beat to play. Sparkle sound fires alongside the burst.
      window.setTimeout(() => playSound("sparkle"), 520);
      window.setTimeout(() => {
        setGiveHeartAnim(null);
        setVoteFlow({ stage: "confirming", cat });
      }, 950);
    },
    [giveHeartAnim, reducedMotion, heartedCats],
  );

  /**
   * Persist the vote, bump visitor stats, and step into celebration.
   * Wrapped by a 450ms loader to give the transition a premium beat.
   */
  const proceedVote = useCallback(
    (cat: Cat) => {
      if (!voterProfile) return;
      const voteId = generateVoteId();
      const votedAt = Date.now();
      const voteDate = getLocalDateString(new Date(votedAt));

      const record: VoteRecord = {
        voteId,
        catId: cat.id,
        catName: cat.name,
        voterEmail: voterProfile.email,
        deviceId,
        votedAt,
        voteDate,
      };
      saveVote(record);

      // Update visitor stats + collect any newly earned milestones.
      const stats = recordVote(cat.id);
      setTotalVotes(stats.totalVotes);
      queueMilestones(pendingVoteMilestones(stats));

      setVotedCatId(cat.id);
      setNextVoteAt(getStartOfTomorrowLocal());
      setLastVoteState({
        catId: record.catId,
        catName: record.catName,
        votedAt: record.votedAt,
        voteDate: record.voteDate,
      });
      setCurrentVoteId(voteId);
      setVoteCounter((c) => c + 1);

      // Start this cat's 5-hour cooldown. Persisted to localStorage and
      // mirrored into local state so the UI flips to "Hearted" immediately.
      const heartedEntry = saveHeartedCat(cat.id, cat.name);
      setHeartedCats((prev) => ({
        ...prev,
        [String(cat.id)]: heartedEntry,
      }));

      // Bump long-term affection. If this heart pushed the cat into a new
      // affection level, queue a celebration toast through the existing
      // milestone toast queue (synthetic, not persisted via awardMilestone
      // — affection level-ups are derived state and don't need that gate).
      const affectionResult = recordHeart(cat.id, cat.name);
      setCatAffection((prev) => ({
        ...prev,
        [String(cat.id)]: affectionResult.entry,
      }));
      if (affectionResult.leveledUp) {
        const meta = getAffectionLevelMeta(affectionResult.entry.affectionLevel);
        setMilestoneQueue((q) => [
          ...q,
          {
            id: `affection_${cat.id}_${affectionResult.entry.affectionLevel}_${Date.now()}`,
            emoji: meta.emoji || "💖",
            title: `New bond unlocked with ${cat.name} 💖`,
            description: `${cat.name} now sees you as a ${meta.label}.`,
          },
        ]);
      }

      // ---- Supabase mirror (Phase 3B) ----
      // Read voterId from localStorage (not React state) so we pick up the
      // value that was just persisted by getOrCreateVoter, even if React
      // hasn't re-rendered yet. Closes the race on the first vote right
      // after voter creation.
      const currentVoterId = getStoredVoterId();
      if (isSupabaseConfigured && currentVoterId) {
        const catUuid = getCatUuidByName(cat.name);
        if (catUuid) {
          void (async () => {
            const heartRow = await saveHeartRemote({
              voterId: currentVoterId,
              catUuid,
              deviceId,
              seasonId: currentSeason?.id ?? null,
            });
            if (heartRow) {
              setHeartId(voteId, heartRow.id);
            } else {
              showError(
                "Heart saved locally. Cloud sync will retry on your next vote.",
              );
            }
            // Affection mirror — fire-and-forget; UI already updated.
            await updateCatAffectionRemote(currentVoterId, catUuid);
          })();
        }
      }

      // Loader → celebration. The sparkle sound fires once the celebration
      // modal mounts so it lines up with the visual flourish.
      showLoader("Preparing your daily heart…", 450);
      window.setTimeout(() => {
        playSound("sparkle");
        setVoteFlow({ stage: "celebrating", cat });
      }, 460);
    },
    [voterProfile, deviceId, queueMilestones, showLoader],
  );

  const handleConfirmVote = useCallback(
    (cat: Cat) => {
      playSound("pawTap");
      // Voting-period gate: only block when an admin has configured seasons
      // AND none is currently active. 'unconfigured' means the admin hasn't
      // used the feature yet → behave as always-open.
      if (seasonStatus === "closed") {
        setVoteFlow({ stage: "idle" });
        showError(
          "Voting for this season has ended. Stay tuned for the next race!",
        );
        return;
      }
      // Phase 4A: route unsigned-in visitors to /signup so they can create
      // a real account instead of filling the lightweight inline form.
      if (!voterProfile || !isAuthed) {
        setVoteFlow({ stage: "idle" });
        router.push(`/signup?next=/`);
        return;
      }
      const eligibility = canVoteToday(voterProfile.email, deviceId);
      if (!eligibility.allowed) {
        setVoteFlow({ stage: "idle" });
        if (eligibility.nextVoteAt) setNextVoteAt(eligibility.nextVoteAt);
        setAlreadyVotedOpen(true);
        return;
      }
      proceedVote(cat);
    },
    [voterProfile, isAuthed, deviceId, proceedVote, router, seasonStatus, showError],
  );

  const handleVoterDetailsSubmit = useCallback(
    async (profile: VoterProfile) => {
      // 1. Persist locally first — keeps the UI working even when Supabase
      //    is offline.
      saveVoterProfile(profile);
      setVoterProfile(profile);
      setVoterDetailsOpen(false);

      // 2. Capture the pending vote NOW so we can clear pendingVoteCat
      //    without racing the proceedVote step below.
      const cat = pendingVoteCat;
      if (cat) setPendingVoteCat(null);

      // 3. Run the Supabase voter creation AND the UI delay in PARALLEL,
      //    then await both. This guarantees that by the time we call
      //    proceedVote, the new voterId is persisted in localStorage so
      //    the Supabase mirror inside proceedVote can find it.
      //    (Previously this was fire-and-forget, which raced with the
      //    450ms setTimeout — losing the first vote's hearts row.)
      const voterPromise: Promise<string | null> = isSupabaseConfigured
        ? getOrCreateVoter({
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            invitationCode: profile.invitationCode,
            deviceId,
          })
        : Promise.resolve(null);
      const uiDelayPromise = new Promise<void>((resolve) =>
        window.setTimeout(resolve, 450),
      );

      const [remoteId] = await Promise.all([voterPromise, uiDelayPromise]);

      if (remoteId) {
        saveVoterId(remoteId);
        setVoterId(remoteId);
      } else if (isSupabaseConfigured) {
        showError(
          "We saved your details on this device. Cloud sync will resume when the connection is back.",
        );
      }

      // 4. Now proceed with the vote, with localStorage primed.
      if (cat) {
        const eligibility = canVoteToday(profile.email, deviceId);
        if (!eligibility.allowed) {
          if (eligibility.nextVoteAt) setNextVoteAt(eligibility.nextVoteAt);
          setAlreadyVotedOpen(true);
          return;
        }
        proceedVote(cat);
      }
    },
    [pendingVoteCat, proceedVote, deviceId, showError],
  );

  const handleVoterDetailsClose = useCallback(() => {
    setVoterDetailsOpen(false);
    setPendingVoteCat(null);
  }, []);

  const handleSpinFortune = useCallback(
    (cat: Cat) => {
      if (!currentVoteId || hasSpunForVote(currentVoteId)) {
        setVoteFlow({ stage: "idle" });
        return;
      }
      playSound("wheelSpin");

      const outcome =
        liveRewards && liveRewards.length > 0 && liveWinRate !== null
          ? rollFromConfig(cat.name, liveRewards, liveWinRate)
          : rollWheelOutcome(cat.name);
      setPendingOutcome(outcome);

      const spinRecord: WheelSpinRecord = {
        voteId: currentVoteId,
        spunAt: Date.now(),
        resultType: outcome.section.type,
        rewardTitle: outcome.section.label,
        couponCode: outcome.coupon?.code,
      };
      saveWheelSpin(spinRecord);

      if (outcome.coupon && voterProfile) {
        const couponRecord: CouponRecord = {
          couponId: generateCouponId(),
          voteId: currentVoteId,
          couponCode: outcome.coupon.code,
          rewardTitle: outcome.coupon.title,
          catName: cat.name,
          voterName: voterProfile.name,
          voterEmail: voterProfile.email,
          issuedAt: Date.now(),
          expiresAt: outcome.coupon.validUntil,
          status: "active",
        };
        saveCoupon(couponRecord);
        setTotalCoupons((c) => c + 1);

        // Track coupon stats + milestones.
        const stats = recordCoupon();
        queueMilestones(pendingCouponMilestones(stats));
      }

      // ---- Supabase mirror (Phase 3B) ----
      // Persist the spin (and coupon if won) to Supabase. Same localStorage-
      // read pattern as proceedVote — guarantees we see the latest voterId
      // even if React state hasn't propagated.
      const currentVoterId = getStoredVoterId();
      if (isSupabaseConfigured && currentVoterId) {
        const catUuid = getCatUuidByName(cat.name);
        const heartId = getHeartId(currentVoteId);
        if (catUuid && heartId) {
          void (async () => {
            let supabaseCouponId: string | null = null;
            if (outcome.coupon && voterProfile) {
              const couponRow = await createCouponRemote({
                voterId: currentVoterId,
                catUuid,
                couponCode: outcome.coupon.code,
                rewardTitle: outcome.coupon.title,
                expiresAt: new Date(outcome.coupon.validUntil),
              });
              if (couponRow) {
                supabaseCouponId = couponRow.id;
              } else {
                showError(
                  "Your coupon is saved on this device. Show it to staff as usual — cloud sync will catch up.",
                );
              }
            }
            await saveWheelSpinRemote({
              voterId: currentVoterId,
              catUuid,
              heartId,
              resultType: outcome.section.type,
              rewardTitle: outcome.section.label,
              couponId: supabaseCouponId,
            });
          })();
        }
      }

      // Loader → wheel modal. The wheel's own entrance covers the rest.
      showLoader("Opening Paw Fortune…", 600);
      window.setTimeout(() => setVoteFlow({ stage: "spinning", cat }), 610);
    },
    [
      currentVoteId,
      voterProfile,
      voterId,
      queueMilestones,
      showLoader,
      showError,
      liveRewards,
      liveWinRate,
    ],
  );

  const handleWheelComplete = useCallback(() => {
    if (voteFlow.stage !== "spinning" || !pendingOutcome) return;
    if (pendingOutcome.coupon) playSound("couponWin");
    else playSound("softMeow");
    setVoteFlow({
      stage: "result",
      cat: voteFlow.cat,
      outcome: pendingOutcome,
    });
  }, [voteFlow, pendingOutcome]);

  const handleShareFromResult = useCallback((cat: Cat) => {
    setVoteFlow((prev) =>
      prev.stage === "result"
        ? { stage: "share", cat, outcome: prev.outcome }
        : { stage: "share", cat },
    );
  }, []);

  const handleShareFromStatus = useCallback((cat: Cat) => {
    setVoteFlow({ stage: "share", cat });
  }, []);

  const handleBackToCats = useCallback(() => {
    setVoteFlow({ stage: "idle" });
    setPendingOutcome(null);
  }, []);

  const handleCloseVoteFlow = useCallback(() => {
    setVoteFlow({ stage: "idle" });
  }, []);

  const handleChangeCat = useCallback(() => {
    setVoteFlow({ stage: "idle" });
  }, []);

  const handleViewStoryFromPopup = useCallback((cat: Cat) => {
    setVoteFlow({ stage: "idle" });
    setProfileCat(cat);
  }, []);

  const handleHeaderCta = useCallback(() => {
    // Phase 4A: route header CTA to the new signup page (or profile if
    // the user is already signed in).
    router.push(isAuthed ? "/profile" : "/signup");
  }, [router, isAuthed]);

  const handleDismissMilestone = useCallback((id: string) => {
    setMilestoneQueue((q) => q.filter((m) => m.id !== id));
  }, []);

  // ---- Stable handlers for child components ----
  // Inline arrow functions were re-creating each render and busting CatCard's
  // memo (16 cards all re-rendering for any unrelated state change).
  const handleOpenProfile = useCallback(
    (c: Cat) => setProfileCat(c),
    [],
  );
  const handleCloseProfile = useCallback(() => setProfileCat(null), []);
  const handleNavigateProfile = useCallback(
    (nextCat: Cat) => setProfileCat(nextCat),
    [],
  );
  const handleCloseAlreadyVoted = useCallback(
    () => setAlreadyVotedOpen(false),
    [],
  );
  const handleGiveHeartFromStory = useCallback(
    (c: Cat) => {
      // Per-cat cooldown — if this cat is still on cooldown, close the
      // storybook and route to the cooldown info modal instead of starting
      // the vote flow.
      const entry = heartedCats[String(c.id)];
      if (entry && entry.nextAvailableAt > Date.now()) {
        setProfileCat(null);
        setCooldownCat(c);
        return;
      }
      // Click came from inside the storybook — no rect context for the
      // flying-heart animation, so close the storybook and open the
      // vote confirmation directly.
      setProfileCat(null);
      playSound("pawTap");
      setVoteFlow({ stage: "confirming", cat: c });
    },
    [heartedCats],
  );

  // Cooldown modal handlers
  const handleCloseCooldown = useCallback(() => setCooldownCat(null), []);
  const handleViewStoryFromCooldown = useCallback((c: Cat) => {
    setCooldownCat(null);
    setProfileCat(c);
  }, []);

  /**
   * Undo the most recent heart for a cat within the 15-minute window.
   * Rolls back every storage shelf that vote touched, plus mirrors that
   * cleanup into the React state tree:
   *   - voteHistory + lastVote      (via undoMostRecentVoteForCat)
   *   - heartedCats                  (cooldown entry cleared)
   *   - lastWheelSpin                (only if it belonged to this vote)
   *   - couponHistory + totalCoupons (only if a coupon was issued)
   *   - catAffection.heartsGiven     (decrement + maybe level drop)
   *   - visitorStats.totalVotes      (decrement)
   *
   * Closes the cooldown modal. No confirmation step — the button is
   * intentionally tucked under the primary actions and self-disappears
   * after 15 minutes, so a stray tap is unlikely.
   */
  const handleUndoHeart = useCallback(
    (c: Cat) => {
      // Capture the Supabase heart UUID BEFORE the local undo wipes the
      // voteId mapping. We look up the most-recent VoteRecord for this
      // cat in voteHistory, find its voteId, then map → heartId.
      const history = getVoteHistory();
      let supabaseHeartId: string | null = null;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].catId === c.id) {
          supabaseHeartId = getHeartId(history[i].voteId);
          if (history[i].voteId) removeHeartId(history[i].voteId);
          break;
        }
      }

      const result = undoMostRecentVoteForCat(c.id);
      if (!result.removed) {
        // Eligible vote already aged out (or never existed) — just close.
        setCooldownCat(null);
        return;
      }

      // ---- Supabase mirror (Phase 3B) ----
      // Best-effort: delete the heart (cascades wheel_spin + coupon at the
      // DB level via ON DELETE CASCADE) and decrement affection. Failures
      // leave server state slightly stale until the next sync but don't
      // break the UI — local state already reflects the undo.
      const currentVoterId = getStoredVoterId();
      if (isSupabaseConfigured && currentVoterId) {
        const catUuid = getCatUuidByName(c.name);
        void (async () => {
          if (supabaseHeartId) {
            await deleteHeartRemote(supabaseHeartId);
          }
          if (catUuid) {
            await decrementCatAffectionRemote(currentVoterId, catUuid);
          }
        })();
      }

      // 1. Cooldown map — drop this cat's entry.
      setHeartedCats((prev) => {
        const next = { ...prev };
        delete next[String(c.id)];
        return next;
      });

      // 2. Affection — decrement heartsGiven (may drop level or remove entry).
      const nextAffectionEntry = decrementHeart(c.id);
      setCatAffection((prev) => {
        const next = { ...prev };
        if (nextAffectionEntry) {
          next[String(c.id)] = nextAffectionEntry;
        } else {
          delete next[String(c.id)];
        }
        return next;
      });

      // 3. Visitor stats — decrement totalVotes (+ totalCoupons if needed).
      const decremented = decrementVote();
      setTotalVotes(decremented.totalVotes);
      if (result.hadCoupon) {
        const couponStats = decrementCoupon();
        setTotalCoupons(couponStats.totalCoupons);
      }

      // 4. Page-level mirrors of vote state.
      //    votedCatId tracks the most-recent vote — if it was this one,
      //    fall back to whatever's now last in voteHistory (via lastVote).
      const refreshedLast = getStoredLastVote();
      setLastVoteState(refreshedLast);
      if (
        refreshedLast &&
        refreshedLast.voteDate === getLocalDateString()
      ) {
        setVotedCatId(refreshedLast.catId);
      } else {
        setVotedCatId(null);
      }
      // currentVoteId guarded the wheel — clear it so a stale ID can't be
      // re-used on a future spin.
      setCurrentVoteId(null);
      setPendingOutcome(null);

      setCooldownCat(null);
    },
    [],
  );

  // Memory book handlers
  const handleOpenMemoryBook = useCallback(() => {
    setMemoryBookOpen(true);

    // Refresh server-backed totals on open. The Memory Book itself still
    // renders from React state (catAffection + totalCoupons), so this just
    // keeps that state honest if the user has voted on another device.
    if (isSupabaseConfigured && voterId) {
      void (async () => {
        const mb = await getMemoryBookData(voterId);
        if (mb) setTotalCoupons(mb.coupons.length);
      })();
    }
  }, [voterId]);
  const handleCloseMemoryBook = useCallback(() => setMemoryBookOpen(false), []);
  const handleOpenCatFromMemoryBook = useCallback((c: Cat) => {
    setMemoryBookOpen(false);
    setProfileCat(c);
  }, []);

  // ---- Stage-derived props ----
  const confirmingCat =
    voteFlow.stage === "confirming" ? voteFlow.cat : null;
  const celebratingCat =
    voteFlow.stage === "celebrating" ? voteFlow.cat : null;
  const spinningCat = voteFlow.stage === "spinning" ? voteFlow.cat : null;
  const resultCat = voteFlow.stage === "result" ? voteFlow.cat : null;
  const resultOutcome = voteFlow.stage === "result" ? voteFlow.outcome : null;
  const shareCat = voteFlow.stage === "share" ? voteFlow.cat : null;

  return (
    <main className="relative min-h-screen">
      <MoodBackground />
      <AmbientEffects />

      <GameHeader
        onCtaClick={handleHeaderCta}
        isAuthed={isAuthed}
        userName={voterProfile?.name ?? null}
      />

      <SeasonBanner season={currentSeason} />

      <MoodChip />

      {voterProfile ? (
        <UserWelcomeCard
          voter={voterProfile}
          votedCat={votedCat}
          favoriteCat={favoriteCat}
          lastVote={lastVote}
          totalVotes={totalVotes}
          onShare={handleShareFromStatus}
          onOpenMemoryBook={handleOpenMemoryBook}
        />
      ) : (
        <IntroCard />
      )}

      <SearchAndFilters
        search={search}
        onSearchChange={setSearch}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        resultsCount={visibleCats.length}
      />

      {seasonStatus === "closed" && <VotingClosedNotice />}

      <CatGrid
        cats={visibleCats}
        heartedCats={heartedCats}
        catAffection={catAffection}
        animatingCatId={giveHeartAnim?.cat.id ?? null}
        onView={handleOpenProfile}
        onGiveHeart={handleGiveHeart}
        onResetFilters={handleResetFilters}
      />

      <RescueSupportSection pulseKey={voteCounter} />

      <footer className="mt-10 border-t border-brown/10 bg-white/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-center sm:flex-row sm:text-left">
          <p className="font-display text-sm text-brown">
            Siamese Star Vote ·{" "}
            <span className="italic text-brown/60">
              The Cat Mayor Election of Siamese Cat Café
            </span>
          </p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-brown/45">
            Season 1 · Prototype
          </p>
        </div>
      </footer>

      {/* ---- Vote flow modals ---- */}
      <VoteConfirmationModal
        cat={confirmingCat}
        onClose={handleCloseVoteFlow}
        onConfirm={handleConfirmVote}
        onChangeCat={handleChangeCat}
        onViewStory={handleViewStoryFromPopup}
      />

      <VoterDetailsModal
        open={voterDetailsOpen}
        pendingCatName={pendingVoteCat?.name ?? null}
        initialProfile={voterProfile}
        onClose={handleVoterDetailsClose}
        onSubmit={handleVoterDetailsSubmit}
        validateInvitationCode={
          isSupabaseConfigured ? validateInvitationCode : undefined
        }
      />

      <AlreadyVotedModal
        open={alreadyVotedOpen}
        catName={lastVote?.catName ?? null}
        nextVoteAt={nextVoteAt ?? getStartOfTomorrowLocal()}
        onClose={handleCloseAlreadyVoted}
      />

      <SuccessModal
        cat={celebratingCat}
        affectionLevel={
          celebratingCat
            ? catAffection[String(celebratingCat.id)]?.affectionLevel ?? 0
            : 0
        }
        voterFirstName={voterProfile?.name.trim().split(" ")[0] ?? null}
        onClose={handleBackToCats}
        onSpinFortune={handleSpinFortune}
        onContinue={handleBackToCats}
      />

      <FortuneWheel
        cat={spinningCat}
        outcome={spinningCat ? pendingOutcome : null}
        sections={
          liveRewards && liveRewards.length > 0
            ? liveRewards.map(sectionFromReward)
            : undefined
        }
        onComplete={handleWheelComplete}
        onClose={handleBackToCats}
      />

      <RewardResultModal
        cat={resultCat}
        outcome={resultOutcome}
        nextVoteAt={nextVoteAt}
        voterName={voterProfile?.name}
        voterFirstName={voterProfile?.name.trim().split(" ")[0] ?? null}
        affectionLevel={
          resultCat
            ? catAffection[String(resultCat.id)]?.affectionLevel ?? 0
            : 0
        }
        onClose={handleBackToCats}
        onShare={handleShareFromResult}
        onBackToCats={handleBackToCats}
      />

      <ShareCardPreview cat={shareCat} onClose={handleBackToCats} />

      <StorybookCatModal
        cat={profileCat}
        cats={liveCats}
        heartedCats={heartedCats}
        catAffection={catAffection}
        voterFirstName={voterProfile?.name.trim().split(" ")[0] ?? null}
        onClose={handleCloseProfile}
        onNavigate={handleNavigateProfile}
        onGiveHeart={handleGiveHeartFromStory}
        onStartChat={setChatCat}
      />

      <CatChat cat={chatCat} onClose={() => setChatCat(null)} />

      <CatMemoryBook
        open={memoryBookOpen}
        voter={voterProfile}
        catAffection={catAffection}
        totalCoupons={totalCoupons}
        onClose={handleCloseMemoryBook}
        onOpenCat={handleOpenCatFromMemoryBook}
      />

      <CatCooldownModal
        cat={cooldownCat}
        nextAvailableAt={
          cooldownCat
            ? heartedCats[String(cooldownCat.id)]?.nextAvailableAt ?? null
            : null
        }
        heartedAt={
          cooldownCat
            ? heartedCats[String(cooldownCat.id)]?.heartedAt ?? null
            : null
        }
        affectionLevel={
          cooldownCat
            ? catAffection[String(cooldownCat.id)]?.affectionLevel ?? 0
            : 0
        }
        voterFirstName={voterProfile?.name.trim().split(" ")[0] ?? null}
        onClose={handleCloseCooldown}
        onViewStory={handleViewStoryFromCooldown}
        onUndo={handleUndoHeart}
      />

      {/* ---- Give-Heart click animation (flying heart + screen pulse) ---- */}
      {giveHeartAnim && (
        <>
          <FlyingHeart
            startX={giveHeartAnim.startX}
            startY={giveHeartAnim.startY}
            endX={giveHeartAnim.endX}
            endY={giveHeartAnim.endY}
          />
          <ScreenPulse />
        </>
      )}

      {/* ---- Premium loader (top-layer) ---- */}
      <PremiumLoader open={loader.open} text={loader.text} />

      {/* ---- Milestone toasts ---- */}
      <MilestoneToast
        queue={milestoneQueue}
        onDismiss={handleDismissMilestone}
      />

      {/* ---- Error toast (Supabase failures, etc.) ---- */}
      <ErrorToast message={errorMessage} onClose={dismissError} />

      {/* ---- Live activity feed (mock) ----
          Pauses when any modal stage is active or the loader is open, so
          new toasts don't appear behind a backdrop the user can't see them
          on. */}
      <LiveHeartsFeed
        paused={
          voteFlow.stage !== "idle" ||
          loader.open ||
          voterDetailsOpen ||
          alreadyVotedOpen ||
          profileCat !== null
        }
      />
    </main>
  );
}
