import type { Cat, FilterTag } from "@/lib/types";

const IMG_1 = "https://media.ourwebprojects.pro/wp-content/uploads/2026/05/1.png";
const IMG_2 = "https://media.ourwebprojects.pro/wp-content/uploads/2026/05/2.png";
const IMG_3 = "https://media.ourwebprojects.pro/wp-content/uploads/2026/05/3.png";

const PLACEHOLDER_IMAGES = [IMG_1, IMG_2, IMG_3];
const pickImage = (index: number) => PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];

// Mock external story domain — clearly placeholder so it's obvious where the
// real story links will plug in later. Browsers will simply open the new tab;
// no real server is hit until these URLs are replaced.
const STORY_BASE = "https://siamesecatcafe.example.com/cats";
const storyFor = (name: string) =>
  `${STORY_BASE}/${name.toLowerCase().replace(/\s+/g, "-")}`;

// Filter chip set shown in the UI. "All" is handled in code, not here.
export const FILTER_TAGS: FilterTag[] = [
  "Gentle",
  "Playful",
  "Brave",
  "Calm",
  "Funny",
  "Loyal",
  "Elegant",
];

export const cats: Cat[] = [
  {
    id: 1,
    rank: 1,
    name: "Lucy",
    title: "The Angel Boy",
    personality: "Sweet & Gentle",
    description:
      "A halo-soft soul who greets every visitor with quiet eyes and a slow blink. Lucy curls into laps like he was made for them.",
    image: pickImage(0),
    storyUrl: storyFor("Lucy"),
    tags: ["Gentle", "Calm"],
    quote: "Every heart you give makes my day softer.",
    favoriteThings: [
      "Cozy naps",
      "Warm sunlight",
      "Gentle visitors",
      "Slow blinks",
      "Lap time",
    ],
  },
  {
    id: 2,
    rank: 2,
    name: "Charlie",
    title: "The Comedian King",
    personality: "Funny & Playful",
    description:
      "The café's resident jester. Charlie will absolutely steal your hair tie, your pen, and your heart — in that order.",
    image: pickImage(1),
    storyUrl: storyFor("Charlie"),
    tags: ["Funny", "Playful"],
    quote: "Life's better when you're laughing — preferably at me.",
    favoriteThings: [
      "Hair ties",
      "Pen caps",
      "Surprise pounces",
      "Belly rubs",
      "Loud purring",
    ],
  },
  {
    id: 3,
    rank: 3,
    name: "Feli",
    title: "The Shy Princess",
    personality: "Calm & Elegant",
    description:
      "Watchful and refined, Feli observes the world from her velvet cushion and only graces the brave with her purr.",
    image: pickImage(2),
    storyUrl: storyFor("Feli"),
    tags: ["Calm", "Elegant"],
    quote: "Speak softly, sit gently — and I might let you visit.",
    favoriteThings: [
      "Velvet cushions",
      "Quiet corners",
      "Curtain shade",
      "Slow afternoons",
      "Polite humans",
    ],
  },
  {
    id: 4,
    rank: 4,
    name: "Cleo",
    title: "The First Lady",
    personality: "Graceful & Smart",
    description:
      "Composed, regal, impossibly poised. Cleo runs the café's social hour with the grace of a seasoned diplomat.",
    image: pickImage(0),
    storyUrl: storyFor("Cleo"),
    tags: ["Elegant", "Calm"],
    quote: "Hello, darling. Please follow café etiquette.",
    favoriteThings: [
      "Tall shelves",
      "Bow-tie hour",
      "Soft greetings",
      "Tea-time aroma",
      "Brushed fur",
    ],
  },
  {
    id: 5,
    rank: 5,
    name: "Siam",
    title: "The Curious Explorer",
    personality: "Brave & Adventurous",
    description:
      "If there's a shelf, Siam has climbed it. If there's a box, Siam has investigated it — twice. Born to chart new territory.",
    image: pickImage(1),
    storyUrl: storyFor("Siam"),
    tags: ["Brave", "Playful"],
    quote: "There's a new corner today. I must investigate.",
    favoriteThings: [
      "Empty boxes",
      "High shelves",
      "Open doors",
      "Window birds",
      "Rolling toys",
    ],
  },
  {
    id: 6,
    rank: 6,
    name: "Muezza",
    title: "The Little Star",
    personality: "Cute & Mischievous",
    description:
      "A pocket-sized sparkle of trouble. Muezza was born to be photographed and absolutely knows it.",
    image: pickImage(2),
    storyUrl: storyFor("Muezza"),
    tags: ["Playful", "Funny"],
    quote: "If it sparkles, it's mine. Sorry, not sorry.",
    favoriteThings: [
      "Tinsel",
      "Mirror time",
      "Photo poses",
      "Tiny treats",
      "All attention",
    ],
  },
  {
    id: 7,
    rank: 7,
    name: "Comet",
    title: "The Softie",
    personality: "Loves Cuddles",
    description:
      "A cloud with whiskers. Comet's superpower is melting straight into your arms within four seconds flat.",
    image: pickImage(0),
    storyUrl: storyFor("Comet"),
    tags: ["Gentle", "Calm"],
    quote: "Bring your arms. I'll do the rest.",
    favoriteThings: [
      "Soft hugs",
      "Cozy blankets",
      "Pillow forts",
      "Forehead kisses",
      "Slow strokes",
    ],
  },
  {
    id: 8,
    rank: 8,
    name: "Malee",
    title: "The Talkative",
    personality: "Loves Attention",
    description:
      "Malee has a lot to say and absolutely will say it. Bring snacks, bring patience, bring an audience.",
    image: pickImage(1),
    storyUrl: storyFor("Malee"),
    tags: ["Playful", "Funny"],
    quote: "Did I tell you about my morning? Let me tell you again.",
    favoriteThings: [
      "Long chats",
      "Eye contact",
      "Snack negotiations",
      "New visitors",
      "Reply meows",
    ],
  },
  {
    id: 9,
    rank: 9,
    name: "Lila",
    title: "The Independent",
    personality: "Confident & Cool",
    description:
      "Lila walks alone — by choice, not by chance. Earn her trust and you've earned a quiet, unshakable friend.",
    image: pickImage(2),
    storyUrl: storyFor("Lila"),
    tags: ["Brave", "Elegant"],
    quote: "I'll come when I'm ready. Maybe.",
    favoriteThings: [
      "Solo perches",
      "Cool tile",
      "Slow stretches",
      "Earned trust",
      "Quiet evenings",
    ],
  },
  {
    id: 10,
    rank: 10,
    name: "Luca",
    title: "The Brave Heart",
    personality: "Strong & Loyal",
    description:
      "Guardian of the front window. Luca was rescued from the street and has been protecting his family ever since.",
    image: pickImage(0),
    storyUrl: storyFor("Luca"),
    tags: ["Loyal", "Brave"],
    quote: "I keep watch. Always.",
    favoriteThings: [
      "Window posts",
      "Family time",
      "Long naps after patrol",
      "Treat rewards",
      "Loyal humans",
    ],
  },
  {
    id: 11,
    rank: 11,
    name: "Pho",
    title: "The Sweetheart",
    personality: "Kind & Gentle",
    description:
      "Pho greets every cat and every human with the same patient warmth. The café's quiet healer.",
    image: pickImage(1),
    storyUrl: storyFor("Pho"),
    tags: ["Gentle", "Calm"],
    quote: "There's room on this cushion for both of us.",
    favoriteThings: [
      "Soft welcomes",
      "Gentle paws",
      "Shared sunbeams",
      "Quiet kittens",
      "Calm music",
    ],
  },
  {
    id: 12,
    rank: 12,
    name: "Mia",
    title: "The Foodie",
    personality: "Always Hungry",
    description:
      "Mia has a sixth sense for treat jars. Approach with snacks and prepare for full-court diplomatic negotiation.",
    image: pickImage(2),
    storyUrl: storyFor("Mia"),
    tags: ["Funny", "Playful"],
    quote: "Excuse me — is that for me? It is now.",
    favoriteThings: [
      "Treat jars",
      "Sniff time",
      "Crinkly bags",
      "Snack hour",
      "Hopeful eyes",
    ],
  },
  {
    id: 13,
    rank: 13,
    name: "Nina",
    title: "The Dancer",
    personality: "Playful & Energetic",
    description:
      "Spins, leaps, twirls — Nina turns every laser-pointer game into a one-cat ballet.",
    image: pickImage(0),
    storyUrl: storyFor("Nina"),
    tags: ["Playful"],
    quote: "Watch this leap. Then watch the next one.",
    favoriteThings: [
      "Laser pointers",
      "Feather wands",
      "Zoomie hour",
      "Twirling on shelves",
      "Pounce practice",
    ],
  },
  {
    id: 14,
    rank: 14,
    name: "Mira",
    title: "The Dreamer",
    personality: "Calm & Thoughtful",
    description:
      "Mira spends her afternoons watching the rain. A quiet philosopher with very strong opinions about sunbeams.",
    image: pickImage(1),
    storyUrl: storyFor("Mira"),
    tags: ["Calm"],
    quote: "Rain is just the sky thinking out loud.",
    favoriteThings: [
      "Rain on the window",
      "Long sunbeams",
      "Soft music",
      "Slow afternoons",
      "Daydreaming",
    ],
  },
  {
    id: 15,
    rank: 15,
    name: "Flow",
    title: "The Queen",
    personality: "Elegant & Regal",
    description:
      "Flow holds court from the highest shelf. Subjects may approach if invited — and only if their hands are clean.",
    image: pickImage(2),
    storyUrl: storyFor("Flow"),
    tags: ["Elegant"],
    quote: "Approach with clean hands and gentle praise.",
    favoriteThings: [
      "Highest shelf",
      "Royal naps",
      "Silk ribbons",
      "Quiet admiration",
      "Brushed fur",
    ],
  },
  {
    id: 16,
    rank: 16,
    name: "Soul",
    title: "The Protector",
    personality: "Strong & Caring",
    description:
      "Soul keeps watch over the youngest kittens. Big heart, bigger paws, biggest sense of duty.",
    image: pickImage(0),
    storyUrl: storyFor("Soul"),
    tags: ["Loyal", "Brave"],
    quote: "Little ones first. Always.",
    favoriteThings: [
      "Kitten patrol",
      "Warm corners",
      "Watchful naps",
      "Quiet courage",
      "Reliable humans",
    ],
  },
];
