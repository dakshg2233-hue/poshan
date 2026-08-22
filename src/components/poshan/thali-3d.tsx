"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useLang } from "./lang-provider";
import { usePrefersReducedMotion } from "@/lib/use-media-query";
import type { Band, Plan } from "@/lib/poshan-data";
import {
  MAX_PORTION,
  optionFor,
  PLATE_SLOTS,
  type PlateState,
  type SlotId,
} from "@/lib/plate";
import { isDropped } from "@/lib/poshan-data";
import { MaskedHeading } from "@/components/ui/masked-heading";

/**
 * The photograph that shows through the "Turn the plate over." heading.
 *
 * Empty until Daksh supplies imagery: MaskedHeading falls back to plain text
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

/* Five seats now, evenly spread around the back and sides of the plate so
   the extra achar katori does not crowd the roti and rice at the front. */
const KATORI_ANGLES = [186, 222, 258, 300, 342].map((d) => (d * Math.PI) / 180);
const KATORI_R = 1.05;

/**
 * Steel only looks like steel if it has something to reflect. A metalness
 * material with no environment renders black, which is exactly what happened
 * on the first pass. This generates a small studio environment in memory:
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

/**
 * One katori, editable.
 *
 * A single gesture carries both edits, which is what keeps the plate from
 * needing a control panel bolted to it:
 *   drag up/down  → how much is in the bowl (portion)
 *   tap           → swap the dish for the next one that belongs in this slot
 *
 * The two are told apart by distance travelled, so a tap that wobbles by a
 * pixel still counts as a tap. Pointer events stop here rather than bubbling,
 * or dragging food would also spin the plate underneath it.
 */
function Katori({
  angle,
  portion,
  color,
  active,
  onPortion,
  onSwap,
  onHover,
}: {
  angle: number;
  portion: number;
  color: THREE.Color;
  active: boolean;
  onPortion: (p: number) => void;
  onSwap: () => void;
  onHover: (over: boolean) => void;
}) {
  const fillRef = useRef<THREE.Mesh>(null);
  const drag = useRef<{ y: number; moved: number; from: number } | null>(null);
  const { invalidate } = useThree();
  const x = Math.cos(angle) * KATORI_R;
  const z = Math.sin(angle) * KATORI_R;
  /* Never fully empty visually: a bowl scaled to 0 disappears and there is
     then nothing left to grab to put food back in. */
  const target = Math.max(0.04, portion / MAX_PORTION);

  useFrame((_, dt) => {
    const m = fillRef.current;
    if (!m) return;
    const k = 1 - Math.pow(0.005, dt);
    m.scale.y += (target - m.scale.y) * k;
    m.position.y = 0.09 + (m.scale.y * 0.18) / 2;
  });

  function down(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    drag.current = { y: e.clientY, moved: 0, from: portion };
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
  }
  function move(e: ThreeEvent<PointerEvent>) {
    if (!drag.current) return;
    e.stopPropagation();
    const dy = drag.current.y - e.clientY;
    drag.current.moved += Math.abs(e.movementY || 0);
    /* 160px of travel spans the full range, so a portion is a deliberate
       movement rather than something you set by accident. */
    const next = Math.max(0, Math.min(MAX_PORTION, drag.current.from + (dy / 160) * MAX_PORTION));
    onPortion(next);
    invalidate();
  }
  function up(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    const d = drag.current;
    drag.current = null;
    if (d && d.moved < 4) onSwap();
    invalidate();
  }

  return (
    <group
      position={[x, 0.1, z]}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerOver={() => onHover(true)}
      onPointerOut={() => {
        onHover(false);
        drag.current = null;
      }}
    >
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
      {/* Rim light on hover, so it is discoverable that these can be touched. */}
      {active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.115, 0]}>
          <torusGeometry args={[0.42, 0.018, 12, 48]} />
          <meshStandardMaterial
            color="#FFD9A0"
            emissive="#FFB861"
            emissiveIntensity={1.4}
            roughness={0.4}
          />
        </mesh>
      )}
      {/* the food inside it */}
      <mesh ref={fillRef} position={[0, 0.15, 0]} scale={[1, 0.5, 1]}>
        <cylinderGeometry args={[0.37, 0.28, 0.18, 36]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0.02} />
      </mesh>
    </group>
  );
}

function ThaliMesh({
  band,
  plate,
  setSlot,
  swapSlot,
  onHover,
}: {
  band: Band;
  plate: PlateState;
  setSlot: (id: SlotId, portion: number) => void;
  swapSlot: (id: SlotId) => void;
  onHover: (id: SlotId | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  /* The camera already supplies the three-quarter view, so the group starts
     level. Tipping it here as well put the plate edge-on. */
  const [rot, setRot] = useState({ x: 0, y: 0.5 });
  const [hovered, setHovered] = useState<SlotId | null>(null);
  const { invalidate } = useThree();

  /* Dish colours now come from the plate, so swapping dal for rajma actually
     changes what is in the bowl rather than only the label beside it. */
  const bandColor = useMemo(
    () => cssColor(band.color.replace("var(", "").replace(")", ""), "#4A7C4E"),
    [band.color]
  );
  const dishColor = (id: SlotId) =>
    new THREE.Color(optionFor(id, plate[id].dish).color);

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

  const riceOff = plate.rice.portion <= 0.02;
  /* Five katoris now: achar has its own bowl rather than sharing with the
     fresh chutney. It is a live lacto-ferment, which is a different thing
     from a relish, and it belongs on the plate in its own right. */
  const KATORI_SLOTS: SlotId[] = ["katori1", "katori2", "katori3", "katori4", "achar"];

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
      {/* band ring: the BMI category, as light rather than a label */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <torusGeometry args={[2.02, 0.045, 16, 96]} />
        <meshStandardMaterial
          color={bandColor}
          emissive={bandColor}
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

      {KATORI_SLOTS.map((id, i) => (
        <Katori
          key={id}
          angle={KATORI_ANGLES[i]}
          portion={plate[id].portion}
          color={dishColor(id)}
          active={hovered === id}
          onPortion={(p) => setSlot(id, p)}
          onSwap={() => swapSlot(id)}
          onHover={(over) => onHover(over ? id : null)}
        />
      ))}

      {/* roti stack: height follows the portion you set */}
      {Array.from({ length: Math.max(0, Math.round(plate.roti.portion * 4)) }).map((_, i) => (
        <mesh key={i} position={[-0.55, 0.1 + i * 0.055, 0.78]} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.05, 48]} />
          <meshStandardMaterial
            color={i % 2 ? "#EFDCB4" : "#F7E7C6"}
            roughness={0.94}
            metalness={0}
          />
        </mesh>
      ))}

      {/* Rice mound: steps aside on the tightest plan.
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
  /* Without observer support, treat the section as permanently visible:
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

export default function Thali3D({
  band,
  plan,
  plate,
  setPlate,
}: {
  band: Band;
  plan: Plan;
  plate: PlateState;
  setPlate: (next: PlateState) => void;
}) {
  const { T } = useLang();
  const calm = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const [hovered, setHovered] = useState<SlotId | null>(null);

  const setSlot = (id: SlotId, portion: number) =>
    setPlate({ ...plate, [id]: { ...plate[id], portion } });

  /* Tap cycles to the next dish that belongs in this slot, wrapping round. */
  const swapSlot = (id: SlotId) => {
    const slot = PLATE_SLOTS.find((s) => s.id === id);
    if (!slot) return;
    const i = slot.options.findIndex((o) => o.key === plate[id].dish);
    const next = slot.options[(i + 1) % slot.options.length];
    setPlate({ ...plate, [id]: { ...plate[id], dish: next.key } });
  };

  return (
    <section className="py-14 md:py-24">
      <div className="w-[min(1180px,100%-2.5rem)] mx-auto">
        <div
          className="on-panel liquid-glass refract backdrop-blur-sm rounded-3xl overflow-hidden relative"
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
                  is safe to ship before any imagery exists: drop a file at
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
                  en: "Drag the thali to look at it from any angle. It is the same plate as above, not a picture of one: the bowls hold your portions and the ring is lit in your band's colour.",
                  hi: "थाली को खींचकर हर कोण से देखें। यह ऊपर वाली ही थाली है, उसकी तस्वीर नहीं: कटोरियों में आपकी मात्रा है और छल्ला आपके वर्ग के रंग में जगमगाता है।",
                })}
              </p>
            </div>

            <div ref={ref} className="h-[380px] md:h-[460px] relative">
              {inView && (
                <Canvas
                  aria-hidden
                  /* Render on demand rather than every frame. The scene only
                     changes while you drag or the plan updates, and both call
                     invalidate(). Without this the canvas ran a continuous
                     render loop for a static plate. */
                  frameloop="demand"
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
                  <ThaliMesh
                    band={band}
                    plate={plate}
                    setSlot={setSlot}
                    swapSlot={swapSlot}
                    onHover={setHovered}
                  />
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
