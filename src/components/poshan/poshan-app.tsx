"use client";

import { useMemo } from "react";
import {
  useBodySource,
  useBodyState,
  type Body,
} from "@/lib/use-body-profile";
import { Nav } from "./nav";
import { Hero } from "./hero";
import { Premium } from "./premium";
import { MealLibrary } from "./meal-library";
import { FoodScanner } from "./food-scanner";
import { Conditions } from "./conditions";
import { MotionLayer } from "./motion-layer";
import { Clinics } from "./clinics";
import { TodayRecommendation } from "./today-recommendation";
import { PantryTracker } from "./pantry-tracker";
import { WeightTracker } from "./weight-tracker";
import { WeeklyReview } from "./weekly-review";
/* hero-cinematic.tsx is the previous photographic hero. It is kept, not
   deleted: swapping these two imports and the tag below reverts the hero. */
import { HeroVideo } from "./hero-video";
import { CursorPicker } from "./cursor-picker";
import { PaletteControl } from "./palette-control";
import { PointerLight } from "./pointer-light";
import { StickyCta } from "./sticky-cta";
import { Consent } from "./consent";
import { ChatWidget } from "./chat-widget";
import { GlassFilter } from "@/components/ui/glass-filter";
import { MagneticCursor } from "@/components/ui/magnetic-cursor";
import { TabProvider, TabPanel, useSwipeNav } from "./tabs";
import { Bands, Meals, Biomarkers, Testimonials, ClosingCta, Footer } from "./sections";
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
      <Nav signedIn={signedIn} />
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
          switch tab to reach it from anywhere else. */}
      {/* Bottom-left. These were taken off the page because the cursor chip
          sat directly under the logo; it lives in the opposite bottom corner
          now, so it is reachable without landing on the composition. */}
      <CursorPicker />
      {/* Fixed chrome, not nav furniture: the header stows over the hero,
          which used to take the only palette control off screen with it.
          Dev-only: this was always meant to be removed once a palette was
          chosen (sindoor, the bare :root, already is that choice) — a raw
          theme-tester floating on every page reads as unfinished to a real
          visitor, not premium. Kept for the team, gone from production. */}
      {process.env.NODE_ENV === "development" && <PaletteControl />}
      {/* The hero's pointer spotlight, carried down the whole page. */}
      <PointerLight />
      <StickyCta />
      <ChatWidget signedIn={signedIn} />
      {/* Nothing is loaded and no id is set until this is accepted. */}
      <Consent />
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
      <TabPanel tab="home">
        {/* Photographic opener. The BMI tool below is untouched: it is the
            core interaction and does not belong buried under a hero. */}
        <HeroVideo />
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
        />
        <Bands />
      </TabPanel>

      <TabPanel tab="plate">
        {/* Signed-in visitors get the real Daily Decision Engine — built
            from their actual account (goal, conditions, logged history,
            pantry, today's context), not the generic band-based plan below.
            Signed-out visitors are untouched: same static Meals plan as
            always, since there is no account for the engine to read from. */}
        {signedIn && (
          <div className="w-[min(1180px,100%-2.5rem)] mx-auto pt-14 md:pt-24 space-y-8">
            <TodayRecommendation />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <PantryTracker />
              <WeeklyReview />
            </div>
          </div>
        )}
        <Meals band={band} plan={plan} />
      </TabPanel>

      <TabPanel tab="meals">
        <MealLibrary goal={goal} />
        <FoodScanner />
      </TabPanel>

      <TabPanel tab="health">
        <Biomarkers />
        {signedIn && (
          <div className="w-[min(1180px,100%-2.5rem)] mx-auto pb-14 md:pb-24">
            <WeightTracker />
          </div>
        )}
        <Conditions />
      </TabPanel>

      <TabPanel tab="premium">
        {/* diet and region now live here too, so all five values persist
            together rather than the customiser holding two of them privately. */}
        <Premium
          baseKcal={plan.kcal}
          goal={goal}
          setGoal={setGoal}
          diet={diet}
          setDiet={setDiet}
          region={region}
          setRegion={setRegion}
          signedIn={signedIn}
        />
        <Clinics />
        <Testimonials />
        <ClosingCta />
      </TabPanel>
    </main>
  );
}
