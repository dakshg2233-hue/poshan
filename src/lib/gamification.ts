/**
 * The gamification layer: streaks with grace days, badges, and the data
 * shapes household/public leaderboards are built from. Deliberately
 * scored on neutral engagement only — logged days, not weight or
 * biomarkers — so nothing here ever turns a health outcome into a game
 * score. Reversible in two independent ways: GAMIFICATION_ENABLED
 * (dev-flags.ts) hides this app-wide, profiles.gamification_enabled
 * lets one person opt out without touching anyone else.
 */

export type BadgeId =
  | "streak_3"
  | "streak_7"
  | "streak_14"
  | "streak_30"
  | "streak_60"
  | "streak_100"
  | "streak_150"
  | "streak_200"
  | "thali_complete"
  | "vrat_warrior"
  | "festival_feaster"
  | "regional_explorer"
  | "kitchen_ready"
  | "family_table"
  | "voice_of_the_kitchen";

export interface BadgeDef {
  id: BadgeId;
  name: { en: string; hi: string };
  description: { en: string; hi: string };
  /** Premium-only badges — the extra tiers beyond what a free account can reach. */
  premiumOnly: boolean;
}

/** Indian-motif names first (per the brand's own "not generic" identity),
 *  a plain description underneath so the badge means something even to
 *  someone unfamiliar with the reference (Shatak = a cricket century). */
export const BADGES: BadgeDef[] = [
  { id: "streak_3", name: { en: "3 Din", hi: "3 दिन" }, description: { en: "Logged 3 days in a row", hi: "लगातार 3 दिन लॉग किया" }, premiumOnly: false },
  { id: "streak_7", name: { en: "Saptaah Siddhi", hi: "सप्ताह सिद्धि" }, description: { en: "A full week, logged", hi: "पूरा एक सप्ताह लॉग किया" }, premiumOnly: false },
  { id: "streak_14", name: { en: "Pakhwada Pro", hi: "पखवाड़ा प्रो" }, description: { en: "Two weeks running", hi: "लगातार दो सप्ताह" }, premiumOnly: false },
  { id: "streak_30", name: { en: "Mahina Master", hi: "महीना मास्टर" }, description: { en: "A full month, logged", hi: "पूरा एक महीना लॉग किया" }, premiumOnly: false },
  { id: "streak_60", name: { en: "Do Mahine", hi: "दो महीने" }, description: { en: "Two months running", hi: "लगातार दो महीने" }, premiumOnly: false },
  { id: "streak_100", name: { en: "Shatak", hi: "शतक" }, description: { en: "100 days — a century, same as cricket", hi: "100 दिन — क्रिकेट जैसा शतक" }, premiumOnly: false },
  { id: "streak_150", name: { en: "Shatak Plus", hi: "शतक प्लस" }, description: { en: "150 days running", hi: "लगातार 150 दिन" }, premiumOnly: true },
  { id: "streak_200", name: { en: "Do Shatak", hi: "दो शतक" }, description: { en: "200 days — a double century", hi: "200 दिन — दोहरा शतक" }, premiumOnly: true },
  { id: "thali_complete", name: { en: "Thali Complete", hi: "थाली पूरी" }, description: { en: "Logged all three meals in one day, 5 times", hi: "एक दिन में तीनों भोजन 5 बार लॉग किए" }, premiumOnly: false },
  { id: "vrat_warrior", name: { en: "Vrat Warrior", hi: "व्रत योद्धा" }, description: { en: "Used fasting mode 3 times", hi: "व्रत मोड 3 बार इस्तेमाल किया" }, premiumOnly: false },
  { id: "festival_feaster", name: { en: "Festival Feaster", hi: "त्योहार भोजन" }, description: { en: "Logged on a festival day", hi: "त्योहार के दिन लॉग किया" }, premiumOnly: false },
  { id: "regional_explorer", name: { en: "Regional Explorer", hi: "क्षेत्रीय खोजी" }, description: { en: "Logged dishes from 3 different regions", hi: "3 अलग क्षेत्रों के व्यंजन लॉग किए" }, premiumOnly: false },
  { id: "kitchen_ready", name: { en: "Kitchen Ready", hi: "रसोई तैयार" }, description: { en: "Marked 5 or more staples in stock", hi: "5 या अधिक सामग्री उपलब्ध बताई" }, premiumOnly: false },
  { id: "family_table", name: { en: "Family Table", hi: "पारिवारिक थाली" }, description: { en: "Two or more family members logging", hi: "दो या अधिक परिवार के सदस्य लॉग कर रहे हैं" }, premiumOnly: false },
  { id: "voice_of_the_kitchen", name: { en: "Voice of the Kitchen", hi: "रसोई की आवाज़" }, description: { en: "Logged a meal by voice", hi: "आवाज़ से भोजन लॉग किया" }, premiumOnly: false },
];

const STREAK_THRESHOLDS: { badge: BadgeId; days: number }[] = [
  { badge: "streak_3", days: 3 },
  { badge: "streak_7", days: 7 },
  { badge: "streak_14", days: 14 },
  { badge: "streak_30", days: 30 },
  { badge: "streak_60", days: 60 },
  { badge: "streak_100", days: 100 },
  { badge: "streak_150", days: 150 },
  { badge: "streak_200", days: 200 },
];

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  totalDaysLogged: number;
  graceDaysAllowed: number;
}

/**
 * Consecutive-day streak that tolerates gaps rather than resetting to
 * zero at the first missed day — free accounts survive a single missed
 * day between logged days, premium accounts survive up to two in a row.
 * A deterministic rule recomputed from raw log dates every time, not a
 * consumable "freeze" token stored anywhere: nothing to track, nothing
 * that can drift out of sync with what was actually logged.
 */
export function computeStreak(logDates: string[], isPremium: boolean): StreakResult {
  const graceDaysAllowed = isPremium ? 2 : 1;
  const days = Array.from(new Set(logDates)).sort();
  if (days.length === 0) return { currentStreak: 0, longestStreak: 0, totalDaysLogged: 0, graceDaysAllowed };

  const dayTime = (d: string) => new Date(d + "T00:00:00Z").getTime();

  let longest = 1;
  let running = 1;
  for (let i = 1; i < days.length; i++) {
    const gapDays = Math.round((dayTime(days[i]) - dayTime(days[i - 1])) / 86_400_000) - 1;
    if (gapDays <= graceDaysAllowed) {
      running += 1;
    } else {
      running = 1;
    }
    longest = Math.max(longest, running);
  }

  // Current streak: walk backward from today (or yesterday, so today not
  // yet being logged doesn't itself count as the streak-breaking gap).
  const today = toDateOnly(new Date());
  const lastLogged = days[days.length - 1];
  const daysSinceLast = Math.round((dayTime(today) - dayTime(lastLogged)) / 86_400_000);

  let current = 0;
  if (daysSinceLast <= graceDaysAllowed + 1) {
    current = 1;
    for (let i = days.length - 1; i > 0; i--) {
      const gapDays = Math.round((dayTime(days[i]) - dayTime(days[i - 1])) / 86_400_000) - 1;
      if (gapDays <= graceDaysAllowed) current += 1;
      else break;
    }
  }

  return { currentStreak: current, longestStreak: longest, totalDaysLogged: days.length, graceDaysAllowed };
}

/** Which streak-length badges a given streak result has earned. Premium
 *  tiers (150/200) only ever appear here when isPremium is true. */
export function earnedStreakBadges(longestStreak: number, isPremium: boolean): BadgeId[] {
  return STREAK_THRESHOLDS.filter((t) => longestStreak >= t.days && (!BADGES.find((b) => b.id === t.badge)?.premiumOnly || isPremium)).map(
    (t) => t.badge
  );
}

export interface ActivityBadgeInput {
  /** All-time (or a large-enough window) logs for the account owner only. */
  logs: { log_date: string; meal_time: string; dish_id: string; source: string }[];
  vratDaysUsed: number;
  festivalDaysUsed: number;
  pantryInStockCount: number;
  /** How many OTHER family members (besides the owner) have at least one log of their own. */
  familyMembersLogging: number;
}

/**
 * The non-streak badges — each computed from data this app already
 * persists (daily_meal_logs, daily_context, pantry_items, family_members)
 * rather than a new "achievement" ledger. dish→region lookup uses
 * MEAL_LIBRARY directly, same as the rest of the engine.
 */
export function earnedActivityBadges(input: ActivityBadgeInput, mealRegionOf: (dishId: string) => string | undefined): BadgeId[] {
  const earned: BadgeId[] = [];

  const byDate = new Map<string, Set<string>>();
  const regions = new Set<string>();
  let voiceLogged = false;
  for (const log of input.logs) {
    if (!byDate.has(log.log_date)) byDate.set(log.log_date, new Set());
    byDate.get(log.log_date)!.add(log.meal_time);
    const region = mealRegionOf(log.dish_id);
    if (region) regions.add(region);
    if (log.source === "voice") voiceLogged = true;
  }

  const fullDays = Array.from(byDate.values()).filter(
    (times) => times.has("breakfast") && times.has("lunch") && times.has("dinner")
  ).length;
  if (fullDays >= 5) earned.push("thali_complete");

  if (input.vratDaysUsed >= 3) earned.push("vrat_warrior");
  if (input.festivalDaysUsed >= 1) earned.push("festival_feaster");
  if (regions.size >= 3) earned.push("regional_explorer");
  if (input.pantryInStockCount >= 5) earned.push("kitchen_ready");
  if (input.familyMembersLogging >= 1) earned.push("family_table");
  if (voiceLogged) earned.push("voice_of_the_kitchen");

  return earned;
}

/** A small, deterministic pseudonym generator for the public leaderboard
 *  — no user-chosen display names (avoids impersonation/moderation
 *  entirely) and no PII, just a stable "adjective + Indian-food-noun +
 *  number" handle seeded from the account id so it's the same every time. */
const ADJECTIVES = ["Swift", "Steady", "Sunny", "Spicy", "Golden", "Quiet", "Bold", "Warm", "Bright", "Calm"];
const NOUNS = ["Thali", "Katori", "Tadka", "Chutney", "Masala", "Roti", "Sabzi", "Dal", "Chai", "Achaar"];

export function generateLeaderboardHandle(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const adjective = ADJECTIVES[hash % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(hash / ADJECTIVES.length) % NOUNS.length];
  const number = (hash % 9000) + 1000;
  return `${adjective} ${noun} #${number}`;
}
