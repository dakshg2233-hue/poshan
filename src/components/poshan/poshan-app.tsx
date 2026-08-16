"use client";

import { useMemo } from "react";
import {
  useBodySource,
  useBodyState,
  type Body,
} from "@/lib/use-body-profile";
import dynamic from "next/dynamic";
import { Nav } from "./nav";
import { Hero } from "./hero";
import { Premium } from "./premium";
import { MealLibrary } from "./meal-library";
import { FoodScanner } from "./food-scanner";
import { Features } from "@/components/ui/features-8";
import { Conditions } from "./conditions";
import { MotionLayer } from "./motion-layer";
import { Clinics } from "./clinics";
/* hero-cinematic.tsx is the previous photographic hero. It is kept, not
   deleted — swapping these two imports and the tag below reverts the hero. */
import { HeroVideo } from "./hero-video";
import { PaletteSwitcher } from "./palette-switcher";
import { CursorPicker } from "./cursor-picker";
import { GlassFilter } from "@/components/ui/glass-filter";
import { MagneticCursor } from "@/components/ui/magnetic-cursor";
import { Bands, Meals, Biomarkers, Testimonials, ClosingCta, Footer } from "./sections";
import {
  bandFor,
  PLANS,
  type GoalKey,
  type DietKey,
  type RegionKey,
} from "@/lib/poshan-data";

/* three.js is code-split and never server-rendered. The placeholder holds the
   exact box height so nothing shifts when it arrives. */
const Thali3D = dynamic(() => import("./thali-3d"), {
  ssr: false,
  loading: () => (
    <section className="py-14 md:py-24">
      <div className="w-[min(1180px,100%-2.5rem)] mx-auto">
        <div
          className="on-panel rounded-3xl h-[380px] md:h-[460px]"
          style={{ background: "var(--panel)" }}
        />
      </div>
    </section>
  ),
});

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
  const { height, weight, goal, diet, region } = body;

  const setHeight = (v: number) => set("height", v);
  const setWeight = (v: number) => set("weight", v);
  const setGoal = (v: GoalKey) => set("goal", v);
  const setDiet = (v: DietKey) => set("diet", v);
  const setRegion = (v: RegionKey) => set("region", v);

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
      {/* One copy for the document — filters are referenced by id. */}
      <GlassFilter />
      <MotionLayer />
      <Nav />
      <main id="top" className="flex-1">
        {/* Photographic opener. The BMI tool below is untouched — it is the
            core interaction and does not belong buried under a hero. */}
        <HeroVideo />
        <Hero
          height={height}
          weight={weight}
          setHeight={setHeight}
          setWeight={setWeight}
          bmi={bmi}
          band={band}
          plan={plan}
        />
        <Bands />
        <Meals band={band} plan={plan} />
        <MealLibrary goal={goal} />
        <FoodScanner />
        <Thali3D band={band} plan={plan} />
        <Features />
        <Conditions />
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
        <Biomarkers />
        <Testimonials />
        <ClosingCta />
      </main>
      <Footer />
      {/* Both are chrome, not content, so they sit outside <main>. Moved up
          from the footer — a cursor picker buried 23,000px down is a picker
          nobody finds. */}
      <CursorPicker />
      {/* Decision tool while Daksh picks a palette — remove once chosen. */}
      <PaletteSwitcher />
    </MagneticCursor>
  );
}
