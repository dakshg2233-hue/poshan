"use client";

import { useMemo } from "react";
import {
  useBodySource,
  useBodyState,
  type Body,
} from "@/lib/use-body-profile";
import { Nav } from "./nav";
import { BottomBar } from "./bottom-bar";
import { Dashboard } from "./dashboard";
import { Hero } from "./hero";
import { Premium } from "./premium";
import { MealLibrary } from "./meal-library";
import { ScannerPage } from "./scanner-page";
import { Conditions } from "./conditions";
import { MotionLayer } from "./motion-layer";
import { Clinics } from "./clinics";
/* The Daily Decision Engine's signed-in widgets — grafted into the
   restructured tabs below (yourmeals, health) rather than the "plate"/
   "meals" tabs they originally shipped on, which this branch had already
   merged into "yourmeals" by the time these landed on main. */
import { TodayRecommendation } from "./today-recommendation";
import { PantryTracker } from "./pantry-tracker";
import { WeightTracker } from "./weight-tracker";
import { WeeklyReview } from "./weekly-review";
import { GroceryList } from "./grocery-list";
import { WeeklyPlan } from "./weekly-plan";
import { PortionCalibration } from "./portion-calibration";
import { StreakBadges } from "./streak-badges";
import { HouseholdStreaks } from "./household-streaks";
import { Leaderboard } from "./leaderboard";
import { GamificationSettings } from "./gamification-settings";
import { EatingOutAdvisor } from "./eating-out-advisor";
import { SymptomJournal } from "./symptom-journal";
import { AdherenceOutcome } from "./adherence-outcome";
import { ReminderOptIn } from "./reminder-optin";
import { PointerLight } from "./pointer-light";
import { StickyCta } from "./sticky-cta";
import { Consent } from "./consent";
import { ChatWidget, ChatProvider } from "./chat-widget";
import { GlassFilter } from "@/components/ui/glass-filter";
import { MagneticCursor } from "@/components/ui/magnetic-cursor";
import { TabProvider, TabPanel, useSwipeNav } from "./tabs";
import { Bands, Biomarkers, Testimonials, ClosingCta, Footer } from "./sections";
import {
  bandFor,
  PLANS,
  type GoalKey,
  type DietKey,
  type RegionKey,
  type Band,
  type Plan,
} from "@/lib/poshan-data";
import type { Sex, ActivityLevel } from "@/lib/energy-requirement";

/**
 * Resolves stored values first, then mounts the app seeded from them.
 *
 * The two-step matters: seeding state from defaults and correcting it in an
 * effect would both flash the wrong BMI for a frame and trip React 19's
 * setState-in-effect lint. Keyed on sourceKey so signing in or out remounts
 * with the right numbers.
 */
export function PoshanApp() {
  const { ready, sourceKey, initial, save, signedIn } = useBodySource();

  if (!ready) {
    return (
      <div
        className="min-h-screen"
        style={{ background: "var(--roti)" }}
        aria-busy="true"
      />
    );
  }

  return (
    <PoshanAppInner
      key={sourceKey}
      initial={initial}
      save={save}
      signedIn={signedIn}
    />
  );
}

function PoshanAppInner({
  initial,
  save,
  signedIn,
}: {
  initial: Body;
  save: (b: Body) => void;
  signedIn: boolean;
}) {
  const { body, set } = useBodyState(initial, save);
  const { height, weight, goal, diet, region, age, sex, activityLevel } = body;

  const setHeight = (v: number) => set("height", v);
  const setWeight = (v: number) => set("weight", v);
  const setGoal = (v: GoalKey) => set("goal", v);
  const setDiet = (v: DietKey) => set("diet", v);
  const setRegion = (v: RegionKey) => set("region", v);
  const setAge = (v: number) => set("age", v);
  const setSex = (v: Sex) => set("sex", v);
  const setActivityLevel = (v: ActivityLevel) => set("activityLevel", v);

  const bmi = useMemo(() => weight / Math.pow(height / 100, 2), [height, weight]);
  const band = useMemo(() => bandFor(bmi), [bmi]);
  const plan = PLANS[band.key];

  return (
    /* Cursor is site-wide, not login-only. It disables itself on touch devices
       and eases to lerp 1 under reduced motion.
     *
     * blendMode goes to "normal" here: exclusion inverts whatever is beneath
     * it, which turned a warm ladoo into a cyan blob over pale grounds. A food
     * cursor has to keep its own colour to be a ladoo at all. */
    <MagneticCursor
      magneticFactor={0.3}
      cursorSize={30}
      blendMode="normal"
      cursorClassName="food-cursor"
      cursorColor="transparent"
      contrastBoost={1}
    >
      {/* One copy for the document: filters are referenced by id. */}
      <GlassFilter />
      <MotionLayer />
      {/* Wraps Nav as well as main, because the tab strip and the site search
          both live in the bar and both drive the same active tab. */}
      <TabProvider>
      {/* Shared open/kind state for the chat panel: the floating bubble and
          <BottomBar>'s small chat icon both toggle the same conversation. */}
      <ChatProvider>
      <Nav />
      <MainContent
        height={height}
        weight={weight}
        setHeight={setHeight}
        setWeight={setWeight}
        age={age}
        setAge={setAge}
        sex={sex}
        setSex={setSex}
        activityLevel={activityLevel}
        setActivityLevel={setActivityLevel}
        bmi={bmi}
        band={band}
        plan={plan}
        goal={goal}
        setGoal={setGoal}
        diet={diet}
        setDiet={setDiet}
        region={region}
        setRegion={setRegion}
        signedIn={signedIn}
      />
      {/* Inside the provider: the footer links switch tabs too. */}
      <Footer />
      {/* Chrome, not content, so it sits outside <main>. Still inside the
          provider, because the sticky CTA points at the BMI tool and has to
          switch tab to reach it from anywhere else.
          Cursor picker and (dev-only) palette control now live inside
          <BottomBar> as small icons, rather than floating independently. */}
      {/* The hero's pointer spotlight, carried down the whole page. */}
      <PointerLight />
      <StickyCta />
      <ChatWidget signedIn={signedIn} />
      <BottomBar signedIn={signedIn} />
      {/* Nothing is loaded and no id is set until this is accepted. */}
      <Consent />
      </ChatProvider>
      </TabProvider>
    </MagneticCursor>
  );
}

/**
 * Split out from PoshanAppInner for one reason: useSwipeNav() reads tab
 * context, and a component can't consume the context that its own render
 * also creates — the TabProvider has to be an ancestor of the component
 * calling the hook, not the same function that renders <TabProvider>.
 */
function MainContent({
  height,
  weight,
  setHeight,
  setWeight,
  age,
  setAge,
  sex,
  setSex,
  activityLevel,
  setActivityLevel,
  bmi,
  band,
  plan,
  goal,
  setGoal,
  diet,
  setDiet,
  region,
  setRegion,
  signedIn,
}: {
  height: number;
  weight: number;
  setHeight: (v: number) => void;
  setWeight: (v: number) => void;
  age?: number;
  setAge: (v: number) => void;
  sex?: Sex;
  setSex: (v: Sex) => void;
  activityLevel?: ActivityLevel;
  setActivityLevel: (v: ActivityLevel) => void;
  bmi: number;
  band: Band;
  plan: Plan;
  goal: GoalKey;
  setGoal: (v: GoalKey) => void;
  diet: DietKey;
  setDiet: (v: DietKey) => void;
  region: RegionKey;
  setRegion: (v: RegionKey) => void;
  signedIn: boolean;
}) {
  const swipeRef = useSwipeNav<HTMLElement>();

  return (
    <main id="top" className="flex-1" ref={swipeRef}>
      {/* One tab mounts at a time. The sections themselves are unchanged;
          only which of them is in the document at once has moved. */}
      <TabPanel tab="dashboard">
        <Dashboard />
      </TabPanel>

      <TabPanel tab="home">
        <Hero
          height={height}
          weight={weight}
          setHeight={setHeight}
          setWeight={setWeight}
          age={age}
          setAge={setAge}
          sex={sex}
          setSex={setSex}
          activityLevel={activityLevel}
          setActivityLevel={setActivityLevel}
          bmi={bmi}
          band={band}
          plan={plan}
          goal={goal}
          diet={diet}
        />
        <Bands />
      </TabPanel>

      <TabPanel tab="yourmeals">
        {/* Signed-in visitors get the real Daily Decision Engine — built
            from their actual account (goal, conditions, logged history,
            pantry, today's context) — ahead of the general meal builder
            below. Signed-out visitors go straight to the builder: there is
            no account yet for the engine to read from. */}
        {signedIn && (
          <div className="w-[min(1180px,100%-2.5rem)] mx-auto pt-14 md:pt-24 space-y-8">
            <ReminderOptIn />
            <TodayRecommendation />
            <WeeklyPlan />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <GroceryList />
              <EatingOutAdvisor />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <PantryTracker />
              <WeeklyReview />
            </div>
            <StreakBadges />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <HouseholdStreaks />
              <Leaderboard />
            </div>
            <GamificationSettings />
          </div>
        )}
        <MealLibrary goal={goal} plan={plan} bandName={band.name} />
      </TabPanel>

      <TabPanel tab="scanner">
        <ScannerPage
          baseKcal={plan.kcal}
          goal={goal}
          setGoal={setGoal}
          diet={diet}
          setDiet={setDiet}
          region={region}
          setRegion={setRegion}
          signedIn={signedIn}
          isPremium={false}
        />
      </TabPanel>

      <TabPanel tab="health">
        <Biomarkers />
        {signedIn && (
          <div className="w-[min(1180px,100%-2.5rem)] mx-auto pb-14 md:pb-24 space-y-8">
            <WeightTracker />
            <PortionCalibration />
            <SymptomJournal />
            <AdherenceOutcome />
          </div>
        )}
        <Conditions />
      </TabPanel>

      <TabPanel tab="premium">
        <Premium signedIn={signedIn} />
        <Clinics />
        <Testimonials />
        <ClosingCta />
      </TabPanel>
    </main>
  );
}
