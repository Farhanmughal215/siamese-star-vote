export type FilterTag =
  | "Gentle"
  | "Playful"
  | "Brave"
  | "Calm"
  | "Funny"
  | "Loyal"
  | "Elegant";

export type Cat = {
  id: number;
  rank: number;
  name: string;
  title: string;
  personality: string;
  /** Short emotional paragraph — used as the storybook preview. */
  description: string;
  image: string;
  /** External link opened by the Storybook "Read Full Story" button. */
  storyUrl: string;
  tags: FilterTag[];
  /** Cute first-person quote shown in the Storybook modal. */
  quote: string;
  /** 4–5 short phrases shown as bulleted favorites in the Storybook modal. */
  favoriteThings: string[];
  /**
   * Total hearts received — populated when cats are loaded from Supabase.
   * Used to sort the home-page grid as a live leaderboard.
   */
  hearts?: number;
  /**
   * Current position in the live leaderboard (1 = most hearts). Stamped
   * after the hearts-descending sort so any UI showing rank can display
   * the live position with ordinal formatting.
   */
  liveRank?: number;
  /** Supabase slug — set when the cat row comes from Supabase. */
  slug?: string;
  /**
   * Supabase UUID — stamped during merge so realtime heart events
   * (`payload.new.cat_id`) can be matched back to a local Cat.
   */
  uuid?: string;
};

export type EntryFormData = {
  invitationCode: string;
  name: string;
  email: string;
  phone: string;
};

// ---- Paw Fortune Wheel ----

export type WheelOutcomeType = "win" | "lose";

export type WheelSection = {
  id: string;
  label: string;
  wheelLabel: string;
  emoji: string;
  type: WheelOutcomeType;
  /** Title shown on the coupon card; only meaningful when type === "win". */
  couponTitle?: string;
};

export type Coupon = {
  title: string;
  code: string;
  /** Epoch ms — used by the result modal to render a relative validity. */
  validUntil: number;
  blurb: string;
};

export type WheelOutcome = {
  section: WheelSection;
  message: string;
  coupon?: Coupon;
};

// ---- Vote flow state machine ----

export type VoteFlow =
  | { stage: "idle" }
  | { stage: "confirming"; cat: Cat }
  | { stage: "celebrating"; cat: Cat }
  | { stage: "spinning"; cat: Cat }
  | { stage: "result"; cat: Cat; outcome: WheelOutcome }
  | { stage: "share"; cat: Cat; outcome?: WheelOutcome };
