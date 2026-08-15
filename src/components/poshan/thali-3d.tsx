"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useLang } from "./lang-provider";
import { usePrefersReducedMotion } from "@/lib/use-media-query";
import type { Band, Plan } from "@/lib/poshan-data";
import { isDropped } from "@/lib/poshan-data";
import { MaskedHeading } from "@/components/ui/masked-heading";

/**
 * The photograph that shows through the "Turn the plate over." heading.
 *
 * Empty until Daksh supplies imagery — MaskedHeading falls back to plain text
 * when this is "", so the section works today. To switch it on: drop an
 * overhead thali shot (2400px+ wide) at public/thali-hero.jpg and set this to
 * "/thali-hero.jpg". Nothing else needs to change.
 */
const THALI_PHOTO = "/thali-hero.jpg";

/* Resolve a CSS custom property to a THREE colour. The palette lives in
   globals.css, so the 3D scene stays in step with the rest of the page,
   including the dark-mode swap. */
function cssColor(varName: string, fallback: string) {
  if (typeof window === "undefined") return new THREE.Color(fallback);
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  try {
    return new THREE.Color(raw || fallback);
  } catch {
    return new THREE.Color(fallback);
  }
}

const KATORI_ANGLES = [200, 240, 300, 340].map((d) => (d * Math.PI) / 180);
const KATORI_R = 1.05;

/**
 * Steel only looks like steel if it has something to reflect. A metalness
 * material with no environment renders black, which is exactly what happened
 * on the first pass. This generates a small studio environment in memory —
 * no asset to download.
 */
function StudioEnvironment() {
  const gl = useThree((s) => s.gl);

  const texture = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const t = pmrem.fromScene(room, 0.04).texture;
    pmrem.dispose();
    room.dispose?.();
    return t;
  }, [gl]);

  useEffect(() => () => texture.dispose(), [texture]);

  /* Attached declaratively rather than assigning scene.environment, which
     would be mutating a value handed back by a hook. */
  return <primitive attach="environment" object={texture} />;
}

function Katori({
  angle,
  fill,
  color,
}: {
  angle: number;
  fill: number;
  color: THREE.Color;
}) {
  const fillRef = useRef<THREE.Mesh>(null);
  const x = Math.cos(angle) * KATORI_R;
  const z = Math.sin(angle) * KATORI_R;
  const target = Math.max(0.04, fill);

  /* Ease the food level toward the plan rather than snapping. */
  useFrame((_, dt) => {
    const m = fillRef.current;
    if (!m) return;
    const k = 1 - Math.pow(0.005, dt);
    m.scale.y += (target - m.scale.y) * k;
    m.position.y = 0.09 + (m.scale.y * 0.18) / 2;
  });

  return (
    <group position={[x, 0.1, z]}>
      {/* steel bowl */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.3, 0.22, 40, 1, true]} />
        <meshStandardMaterial
          color="#B9BEC4"
          metalness={0.92}
          roughness={0.22}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* the food inside it */}
      <mesh ref={fillRef} position={[0, 0.15, 0]} scale={[1, 0.5, 1]}>
        <cylinderGeometry args={[0.37, 0.28, 0.18, 36]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0.02} />
      </mesh>
    </group>
  );
}

function ThaliMesh({ band, plan }: { band: Band; plan: Plan }) {
  const group = useRef<THREE.Group>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  /* The camera already supplies the three-quarter view, so the group starts
     level. Tipping it here as well put the plate edge-on. */
  const [rot, setRot] = useState({ x: 0, y: 0.5 });
  const { invalidate } = useThree();

  const colors = useMemo(
    () => ({
      dal: cssColor("--haldi", "#E0A81C"),
      sabzi: cssColor("--elaichi", "#4A7C4E"),
      dahi: new THREE.Color("#E7EBEE"),
      chutney: cssColor("--mirch", "#B33A20"),
      band: cssColor(band.color.replace("var(", "").replace(")", ""), "#4A7C4E"),
    }),
    [band.color]
  );

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.rotation.x += (rot.x - g.rotation.x) * 0.12;
    g.rotation.y += (rot.y - g.rotation.y) * 0.12;
  });

  function onDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    drag.current = { x: e.clientX, y: e.clientY };
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
  }
  function onMove(e: ThreeEvent<PointerEvent>) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    setRot((r) => ({
      /* Keep the plate readable: never let the visitor flip it past edge-on. */
      x: Math.max(-0.5, Math.min(0.7, r.x + dy * 0.006)),
      y: r.y + dx * 0.008,
    }));
    invalidate();
  }
  const onUp = () => {
    drag.current = null;
  };

  const fills = plan.fills;
  const riceOff = isDropped(plan.qty.rice);

  return (
    <group
      ref={group}
      rotation={[0, 0.5, 0]}
      scale={1.12}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
    >
      {/* band ring — the BMI category, as light rather than a label */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <torusGeometry args={[2.02, 0.045, 16, 96]} />
        <meshStandardMaterial
          color={colors.band}
          emissive={colors.band}
          emissiveIntensity={0.75}
          roughness={0.4}
        />
      </mesh>

      {/* steel plate */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[1.85, 1.72, 0.16, 96]} />
        <meshStandardMaterial color="#C6CBD0" metalness={0.94} roughness={0.18} />
      </mesh>
      {/* raised rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <torusGeometry args={[1.83, 0.075, 16, 96]} />
        <meshStandardMaterial color="#AEB4BA" metalness={0.96} roughness={0.15} />
      </mesh>

      <Katori angle={KATORI_ANGLES[0]} fill={fills[0]} color={colors.dal} />
      <Katori angle={KATORI_ANGLES[1]} fill={fills[1]} color={colors.sabzi} />
      <Katori angle={KATORI_ANGLES[2]} fill={fills[2]} color={colors.dahi} />
      <Katori angle={KATORI_ANGLES[3]} fill={fills[3]} color={colors.chutney} />

      {/* roti stack — height follows the plan */}
      {Array.from({ length: plan.rotis }).map((_, i) => (
        <mesh key={i} position={[-0.55, 0.1 + i * 0.055, 0.78]} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.05, 48]} />
          <meshStandardMaterial
            color={i % 2 ? "#EFDCB4" : "#F7E7C6"}
            roughness={0.94}
            metalness={0}
          />
        </mesh>
      ))}

      {/* Rice mound — steps aside on the tightest plan.
          Seated ON the plate: the plate is 0.16 tall centred at 0, so its top
          face is y=0.08, and a hemisphere's flat side sits at its own origin.
          It used to sit at 0.13 and floated 0.05 above the steel. Scaled to
          0.62 in y so it reads as a served mound rather than half a ball. */}
      {!riceOff && (
        <group position={[0.72, 0.08, 0.82]}>
          <mesh scale={[1, 0.62, 1]} castShadow>
            <sphereGeometry args={[0.44, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#F6F2E8" roughness={0.95} metalness={0} />
          </mesh>
          {/* Caps the open hemisphere. Without this the mound is hollow and
              you can see straight through it once the plate is tilted. */}
          <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[0.44, 40]} />
            <meshStandardMaterial color="#EFEADF" roughness={0.95} metalness={0} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** Mount the canvas only while it is on screen, so rAF never runs for a
 *  section the visitor is nowhere near. */
function useInView<T extends HTMLElement>() {
  const supported = typeof IntersectionObserver !== "undefined";
  const [node, setNode] = useState<T | null>(null);
  /* Without observer support, treat the section as permanently visible —
     derived at init rather than set inside the effect, which would cascade. */
  const [inView, setInView] = useState(!supported);

  useEffect(() => {
    if (!node || !supported) return;
    const io = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { rootMargin: "200px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [node, supported]);

  return { ref: setNode, inView };
}

export default function Thali3D({ band, plan }: { band: Band; plan: Plan }) {
  const { T } = useLang();
  const calm = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section className="py-14 md:py-24">
      <div className="w-[min(1180px,100%-2.5rem)] mx-auto">
        <div
          className="on-panel rounded-3xl overflow-hidden relative"
          style={{ background: "var(--panel)" }}
        >
          <div className="grid md:grid-cols-2">
            <div className="p-8 md:p-11 flex flex-col justify-center">
              <p
                className="text-[0.72rem] font-extrabold uppercase mb-4"
                style={{ letterSpacing: "0.16em", color: "var(--haldi)" }}
              >
                {T({ en: "Poshan in three dimensions", hi: "पोषण तीन आयामों में" })}
              </p>
              {/* The heading is a window onto the thali photograph. With no
                  photo present MaskedHeading renders as ordinary text, so this
                  is safe to ship before any imagery exists — drop a file at
                  THALI_PHOTO below and the letters fill with it. */}
              <MaskedHeading
                text={T({ en: "Turn the plate over.", hi: "थाली को घुमाकर देखें।" })}
                src={THALI_PHOTO}
                reveal="wipe"
                trigger="view"
                align="left"
                textScale={0.13}
                tracking={-0.02}
                lineHeight={1.08}
                parallax={30}
                drift={14}
                brightness={1.06}
                saturation={1.12}
                className="max-w-[16ch]"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--panel-ink)",
                }}
              />
              <p
                className="mt-4 max-w-lg"
                style={{ color: "color-mix(in srgb, var(--roti) 72%, transparent)" }}
              >
                {T({
                  en: "Drag the thali to look at it from any angle. It is the same plate as above, not a picture of one — the bowls hold your portions and the ring is lit in your band's colour.",
                  hi: "थाली को खींचकर हर कोण से देखें। यह ऊपर वाली ही थाली है, उसकी तस्वीर नहीं — कटोरियों में आपकी मात्रा है और छल्ला आपके वर्ग के रंग में जगमगाता है।",
                })}
              </p>
            </div>

            <div ref={ref} className="h-[380px] md:h-[460px] relative">
              {inView && (
                <Canvas
                  aria-hidden
                  dpr={[1, 2]}
                  shadows={!calm}
                  /* Pulled back and narrowed: the ring is 4.04 across, and the
                     earlier framing clipped it on portrait-ish canvases. */
                  camera={{ position: [0, 5.0, 5.6], fov: 38 }}
                  gl={{ antialias: true }}
                >
                  <color attach="background" args={["#14100c"]} />
                  <StudioEnvironment />
                  <ambientLight intensity={0.35} />
                  <directionalLight
                    position={[3, 6, 3]}
                    intensity={1.6}
                    castShadow={!calm}
                    shadow-mapSize={[1024, 1024]}
                  />
                  <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#E0A81C" />
                  <ThaliMesh band={band} plan={plan} />
                </Canvas>
              )}

              <p
                className="absolute bottom-4 left-0 right-0 text-center text-[0.72rem] pointer-events-none"
                style={{ color: "color-mix(in srgb, var(--roti) 64%, transparent)" }}
              >
                {T({ en: "Drag to rotate", hi: "घुमाने के लिए खींचें" })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
