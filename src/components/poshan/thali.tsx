"use client";

import { useRef, useState, type PointerEvent } from "react";
import type { Band, Plan } from "@/lib/poshan-data";
import { isDropped } from "@/lib/poshan-data";
import { useMediaQuery, usePrefersReducedMotion } from "@/lib/use-media-query";

const SEG_KEYS = ["under", "normal", "over", "obese"] as const;

/* Katori centres, arced across the top of the plate. */
const KATORI = [
  { cx: 106, cy: 166, fill: "var(--haldi)" },
  { cx: 150, cy: 113, fill: "var(--elaichi)" },
  { cx: 250, cy: 113, fill: "#DCE4E8" },
  { cx: 294, cy: 166, fill: "var(--mirch)" },
];

export function Thali({
  bmi,
  band,
  plan,
}: {
  bmi: number;
  band: Band;
  plan: Plan;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  /* Tilt is a pointer affordance, so it is off for touch and for anyone
     who asked for less motion. */
  const finePointer = useMediaQuery("(pointer: fine)");
  const calm = usePrefersReducedMotion();
  const tiltOn = finePointer && !calm;

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!tiltOn || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 16, y: px * 16 });
  }

  /* BMI 14→36 mapped across a 270° arc that starts at bottom-left. */
  const p = Math.max(0, Math.min(1, (bmi - 14) / 22));
  const theta = ((135 + p * 270) * Math.PI) / 180;
  const mx = 200 + 182 * Math.cos(theta);
  const my = 200 + 182 * Math.sin(theta);

  const riceOff = isDropped(plan.qty.rice);

  return (
    <div
      ref={wrapRef}
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      style={{ perspective: "1100px" }}
      className="select-none"
    >
      <svg
        viewBox="-30 -34 460 468"
        role="img"
        aria-labelledby="thali-t thali-d"
        className="w-full h-auto block max-w-[520px] mx-auto overflow-visible"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: "transform .35s var(--ease)",
          transformStyle: "preserve-3d",
        }}
      >
        <title id="thali-t">Your thali</title>
        <desc id="thali-d">
          A steel thali. Its rim is a Body Mass Index scale marked with the
          Asian-Indian cutoffs at 18.5, 23 and 25, with a marker at your value.
          Its bowls fill to your portion sizes.
        </desc>

        <defs>
          {KATORI.map((k, i) => (
            <clipPath key={i} id={`k${i}`}>
              <circle cx={k.cx} cy={k.cy} r={30} />
            </clipPath>
          ))}
          {/* Namespaced: a bare id="plate" collided with the <section
              id="plate"> anchor, and since this gradient comes first in the
              document the nav's "Your plate" link resolved to a <defs> node
              with no layout box instead of the thali section. */}
          <radialGradient id="thali-plate-fill" cx="40%" cy="32%">
            <stop offset="0" stopColor="var(--surface)" />
            <stop offset="1" stopColor="var(--roti-2)" />
          </radialGradient>
        </defs>

        {/* Body Mass Index scale: four band segments across a 3/4 ring */}
        <g transform="rotate(135 200 200)" fill="none" strokeLinecap="butt">
          {[
            { c: "var(--haldi)", d: "170.4", o: "0" },
            { c: "var(--elaichi)", d: "170.4", o: "-175.4" },
            { c: "var(--kesar)", d: "73.1", o: "-350.8" },
            { c: "var(--mirch)", d: "423.8", o: "-428.9" },
          ].map((s, i) => {
            const on = SEG_KEYS[i] === band.key;
            return (
              <circle
                key={i}
                cx={200}
                cy={200}
                r={182}
                stroke={s.c}
                strokeWidth={on ? 14 : 9}
                strokeDasharray={`${s.d} 1143.5`}
                strokeDashoffset={s.o}
                opacity={on ? 1 : 0.26}
                style={{ transition: "opacity .45s ease, stroke-width .45s var(--ease)" }}
              />
            );
          })}
        </g>

        {/* The numbers that make this an Indian scale, not a European one */}
        <g
          fill="var(--ink-soft)"
          fontSize="13"
          textAnchor="middle"
          stroke="var(--roti)"
          strokeWidth="4.5"
          paintOrder="stroke"
          strokeLinejoin="round"
          style={{ fontFamily: "var(--font-data)" }}
        >
          <text x={-5} y={167}>18.5</text>
          <text x={113} y={13}>23</text>
          <text x={200} y={-6}>25</text>
        </g>

        {/* you are here */}
        <g
          style={{
            transform: `translate(${mx.toFixed(1)}px, ${my.toFixed(1)}px)`,
            transition: "transform .7s var(--ease)",
          }}
        >
          <circle r={13.5} fill="var(--roti)" stroke="var(--ink)" strokeWidth={2.5} />
          <circle
            r={6.5}
            fill={band.color}
            style={{ transition: "fill .45s ease" }}
          />
        </g>

        {/* steel plate */}
        <circle cx={200} cy={200} r={162} fill="none" stroke="var(--steel)" strokeWidth={7} />
        <circle cx={200} cy={200} r={152} fill="url(#thali-plate-fill)" />
        <circle cx={200} cy={200} r={152} fill="none" stroke="var(--steel-lo)" strokeWidth={1.5} opacity={0.7} />

        {/* katoris, filling to the plan */}
        {KATORI.map((k, i) => (
          <g key={i}>
            <g clipPath={`url(#k${i})`}>
              <rect
                x={k.cx - 30}
                y={k.cy - 30}
                width={60}
                height={60}
                fill={k.fill}
                style={{
                  transform: `translateY(${((1 - plan.fills[i]) * 60).toFixed(1)}px)`,
                  transition: "transform .75s var(--ease)",
                }}
              />
            </g>
            <circle cx={k.cx} cy={k.cy} r={30} fill="none" stroke="var(--steel)" strokeWidth={3.5} />
          </g>
        ))}

        {/* kachumber: lemon wedge and green chilli */}
        <g>
          <path d="M172 226a17 17 0 0 1 34 0Z" fill="#F6D652" stroke="var(--imli)" strokeWidth={1.6} opacity={0.9} />
          <path d="M172 226h34M189 226v-17" stroke="var(--imli)" strokeWidth={1.2} opacity={0.55} />
          <path d="M222 228q14-4 18-16" stroke="var(--elaichi)" strokeWidth={6} fill="none" strokeLinecap="round" />
          <path d="M240 212q1-6 5-8" stroke="var(--imli)" strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </g>

        {/* roti stack: count follows the plan */}
        {[
          { y: 300, f: "#E8D4A8" },
          { y: 290, f: "#EFDCB4" },
          { y: 280, f: "#F5E4C0" },
          { y: 270, f: "#FAECCD" },
        ].map((r, i) => {
          const on = i < plan.rotis;
          return (
            <ellipse
              key={i}
              cx={152 - i * 2}
              cy={r.y}
              rx={54}
              ry={33}
              fill={r.f}
              stroke="var(--imli)"
              strokeWidth={2}
              style={{
                opacity: on ? 1 : 0,
                transform: on ? "none" : "translateY(8px) scale(.9)",
                transformOrigin: "center",
                transition: "opacity .45s ease, transform .45s var(--ease)",
              }}
            />
          );
        })}

        {/* rice mound: steps aside entirely on the tightest plan */}
        <g style={{ opacity: riceOff ? 0.18 : 1, transition: "opacity .5s ease" }}>
          {/* Heaped rice.
              The previous version was a single smooth arc with three dots in
              it, which read as a bun or a pebble: the silhouette carried no
              information that it was grain. A heap of rice is identifiable by
              its EDGE: lumpy rather than drawn, because thousands of grains
              never settle into a clean curve. Hence the scalloped contour and
              the loose grains sitting proud of it. */}
          <path
            d="M246 303
               C246 289 251 277 260 269
               C265 264 269 267 273 263
               C277 258 282 256 287 257
               C291 253 297 252 301 256
               C306 254 311 258 314 263
               C319 267 323 275 325 283
               C327 290 328 297 328 303
               Z"
            fill="#F5F1E6"
            stroke="var(--steel)"
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          {/* Where the heap meets the plate. */}
          <path d="M246 303q41 8 82 0" fill="none" stroke="var(--steel-lo)" strokeWidth={2} />
          {/* Individual grains: short ovals at mixed angles, a few breaking the
              outline so the heap has loose grains rather than a sealed shell. */}
          <g fill="none" stroke="var(--steel-lo)" strokeWidth={1.6} strokeLinecap="round">
            <path d="M263 288l6-3" />
            <path d="M276 279l7 2" />
            <path d="M291 272l6-3" />
            <path d="M305 281l6 3" />
            <path d="M283 292l7-1" />
            <path d="M300 293l6-2" />
            <path d="M270 275l5 3" />
            <path d="M312 272l5 4" />
          </g>
          <g fill="#F5F1E6" stroke="var(--steel)" strokeWidth={1.4}>
            <ellipse cx={268} cy={261} rx={4} ry={2.2} transform="rotate(-28 268 261)" />
            <ellipse cx={296} cy={250} rx={4.2} ry={2.2} transform="rotate(12 296 250)" />
            <ellipse cx={318} cy={266} rx={4} ry={2.2} transform="rotate(42 318 266)" />
          </g>
        </g>
      </svg>
    </div>
  );
}
