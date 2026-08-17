"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { usePrefersReducedMotion } from "@/lib/use-media-query";

/**
 * The glass jar, built rather than borrowed.
 *
 * It replaces a hosted image of a terrarium full of Studio Ghibli characters
 * — Totoro, the Catbus, the soot sprites. That was three external hosts
 * (images.higgs.ai, a stranger's Figma site, a CloudFront bucket) holding up
 * the hero of a paid product, and copyrighted characters doing it. Built here
 * there is no request to make, nothing to expire, and nothing to license.
 *
 * The vessel is kept, as asked. What is inside is deliberately NOT a picture
 * of food: modelled grains, chillies and a curry-leaf sprig were tried first
 * and read as a literal pantry jar. It is now three plain strata in the ICMR
 * plate ratio — half vegetables, a quarter grain, a quarter protein — the
 * argument the whole product makes, stood on its end. Symbolic, not scenic.
 */

/* Real glass needs something to refract. RoomEnvironment is generated in
   memory, so this costs no download — the same trick the thali scene uses. */
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
  return <primitive attach="environment" object={texture} />;
}

/** Resolve a palette token so the jar's contents shift with the theme. */
function cssColor(name: string, fallback: string) {
  if (typeof window === "undefined") return new THREE.Color(fallback);
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  try {
    return new THREE.Color(raw || fallback);
  } catch {
    return new THREE.Color(fallback);
  }
}

/**
 * A single stratum of the fill: a smooth disc of colour, not a heap of things.
 *
 * Slightly domed on top, because a dead-flat surface reads as a plastic
 * layer-cake and a faint crown reads as something settled.
 */
function Stratum({
  color,
  y,
  height,
  radius,
}: {
  color: THREE.Color;
  y: number;
  height: number;
  radius: number;
}) {
  return (
    <group position={[0, y, 0]}>
      <mesh>
        <cylinderGeometry args={[radius, radius * 0.97, height, 64]} />
        <meshStandardMaterial color={color} roughness={0.62} metalness={0} />
      </mesh>
      <mesh position={[0, height / 2, 0]} scale={[1, 0.18, 1]}>
        <sphereGeometry args={[radius, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.62} metalness={0} />
      </mesh>
    </group>
  );
}

/**
 * The fill, as three strata rather than a depiction of food.
 *
 * The literal version — nine hundred modelled grains, whole chillies, a
 * curry-leaf sprig — read as a picture of a pantry jar. This says the same
 * thing with less: half the height is vegetables, a quarter grain, a quarter
 * protein. That is the ICMR plate ratio the whole product argues for, stood
 * on its end. Simple enough to read at a glance from across a hero, and it
 * means something rather than just looking like food.
 *
 * It also costs three meshes instead of ~960 instanced grains.
 */
function JarContents() {
  const c = useMemo(
    () => ({
      veg: cssColor("--elaichi", "#356B46"),
      grain: new THREE.Color("#EFE7D6"),
      protein: cssColor("--haldi", "#E0A81C"),
    }),
    []
  );

  /* Proportions ARE the ratio: the fill spans FILL units and the bands take
     exactly 1/4 grain, 1/4 protein, 1/2 vegetables. */
  const R = 1.25;          // jar inner radius
  const FILL = 1.55;
  const base = -0.92;
  const bands = [
    { color: c.grain, frac: 0.25 },
    { color: c.protein, frac: 0.25 },
    { color: c.veg, frac: 0.5 },
  ];

  /* Radius is derived from the sphere's own profile, not hand-picked. A band
     at height y can only be as wide as sqrt(R² - y²); constants looked right
     at the middle and burst through the glass at the top, where the jar has
     curved in. Measured at whichever end of the band is further from centre,
     less a wall margin. */
  const safeRadius = (y0: number, y1: number) => {
    const yMax = Math.max(Math.abs(y0), Math.abs(y1));
    return Math.max(0.2, Math.sqrt(Math.max(0, R * R - yMax * yMax)) - 0.09);
  };

  let y = base;
  return (
    <group>
      {bands.map((b, i) => {
        const h = FILL * b.frac;
        const y0 = y;
        const y1 = y + h;
        /* The top band is crowned, so its dome has to fit too. */
        const domeAllowance = i === bands.length - 1 ? 0.16 : 0;
        const r = safeRadius(y0, y1 + domeAllowance);
        y = y1;
        return (
          <Stratum key={i} color={b.color} y={(y0 + y1) / 2} height={h} radius={r} />
        );
      })}
    </group>
  );
}

/**
 * Keeps the whole jar in frame at any shape of viewport.
 *
 * A fixed camera distance is only correct at one aspect ratio. On a tall
 * phone the horizontal field of view collapses and the jar is cropped to a
 * wall of grain — which is exactly what it did at 560×1522. Distance is
 * therefore derived from the aspect, and the jar is nudged up slightly on
 * portrait so it sits above the headline rather than behind it.
 */
function FitCamera() {
  const { camera, size } = useThree();

  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const cam = camera as THREE.PerspectiveCamera;
    /* Below ~1:1 the limiting dimension is width, so back off in proportion
       to how narrow it has become. Clamped so it never ends up in orbit. */
    const dist = aspect >= 1 ? 4.6 : Math.min(9.5, 4.6 / Math.max(0.42, aspect));
    cam.position.set(0, aspect >= 1 ? 0.35 : 0.15, dist);
    cam.lookAt(0, aspect >= 1 ? 0 : -0.1, 0);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  return null;
}

function Jar({ spin }: { spin: boolean }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    const g = group.current;
    if (!g || !spin) return;
    /* A slow drift, not a spin: enough that the glass catches light and reads
       as a real object, little enough that nobody has to watch it move. */
    g.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.22;
  });

  return (
    <group ref={group}>
      {/* The jar body. transmission (not opacity) is what makes this read as
          glass — it refracts what is behind it, so the grain inside distorts
          through the wall the way it does in a real jar. */}
      <mesh>
        <sphereGeometry args={[1.25, 64, 48]} />
        <meshPhysicalMaterial
          transmission={1}
          thickness={0.55}
          roughness={0.06}
          ior={1.5}
          /* A touch of tint, so the glass has body against a dark hero. */
          color="#eaf2f0"
          attenuationColor="#cfe3dd"
          attenuationDistance={3.2}
          clearcoat={1}
          clearcoatRoughness={0.08}
          transparent
        />
      </mesh>

      {/* Rolled rim. */}
      <mesh position={[0, 1.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.56, 0.075, 20, 64]} />
        <meshPhysicalMaterial
          transmission={0.92}
          thickness={0.3}
          roughness={0.12}
          ior={1.5}
          color="#eef5f3"
          transparent
        />
      </mesh>

      <JarContents />
    </group>
  );
}

/**
 * Mounted only while on screen, and never at all under reduced motion —
 * where a still, cheap fallback stands in instead of a live canvas.
 */
export function GlassJar({ className = "" }: { className?: string }) {
  const calm = usePrefersReducedMotion();
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const supported = typeof IntersectionObserver !== "undefined";
  /* Starts true. Gating the mount on the observer firing means that wherever
     IntersectionObserver is throttled or delayed, the hero renders with no
     jar at all — which is what happened here. The observer's job is to stand
     the canvas DOWN once you scroll away, not to grant permission to appear. */
  const [inView, setInView] = useState(true);

  useEffect(() => {
    if (!node || !supported) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      rootMargin: "200px",
    });
    io.observe(node);
    return () => io.disconnect();
  }, [node, supported]);

  return (
    <div ref={setNode} className={className} aria-hidden>
      {inView && (
        <Canvas
          /* demand: the scene only redraws when something asks it to, so an
             idle hero costs no frames. */
          frameloop={calm ? "demand" : "always"}
          dpr={[1, 2]}
          camera={{ position: [0, 0.35, 4.4], fov: 42 }}
          gl={{ antialias: true, alpha: true }}
        >
          <FitCamera />
          <StudioEnvironment />
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 5, 4]} intensity={1.5} />
          <directionalLight position={[-4, 1, -3]} intensity={0.6} color="#E0A81C" />
          <Jar spin={!calm} />
        </Canvas>
      )}
    </div>
  );
}
