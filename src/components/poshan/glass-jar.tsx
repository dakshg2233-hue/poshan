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
 * The vessel is kept, as asked: same round-bellied jar, same held-in-light
 * feel. What is inside changes from figurines to the things an Indian kitchen
 * actually keeps in glass — layered grain and dal, whole spices, a curl of
 * curry leaf. Food, and the sentiment of feeding people, instead of anime.
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
 * A layer of loose grain. Rendered as one InstancedMesh rather than hundreds
 * of meshes — at ~260 grains a layer, separate draw calls would cost more
 * than the whole rest of the scene.
 */
function GrainLayer({
  count,
  color,
  yBase,
  ySpread,
  radius,
  seed,
  size,
}: {
  count: number;
  color: THREE.Color;
  yBase: number;
  ySpread: number;
  radius: number;
  seed: number;
  size: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    /* Deterministic pseudo-random: the jar must look identical on the server
       render and the client, or hydration paints two different jars. */
    let n = seed;
    const rnd = () => {
      n = (n * 1664525 + 1013904223) % 4294967296;
      return n / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      /* sqrt keeps the scatter even across the disc instead of clumping
         everything at the centre. */
      const r = Math.sqrt(rnd()) * radius;
      const a = rnd() * Math.PI * 2;
      e.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
      q.setFromEuler(e);
      const sc = size * (0.75 + rnd() * 0.5);
      s.set(sc, sc * 0.62, sc);
      m.compose(
        new THREE.Vector3(Math.cos(a) * r, yBase + rnd() * ySpread, Math.sin(a) * r),
        q,
        s
      );
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, yBase, ySpread, radius, seed, size]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow>
      <sphereGeometry args={[1, 7, 5]} />
      <meshStandardMaterial color={color} roughness={0.88} metalness={0} />
    </instancedMesh>
  );
}

function JarContents() {
  /* Read once. Palette changes remount the canvas via its key, so live
     subscription here would be machinery for nothing. */
  const c = useMemo(
    () => ({
      rice: new THREE.Color("#F3EEE2"),
      dal: cssColor("--haldi", "#E0A81C"),
      chana: new THREE.Color("#B07A2E"),
      chilli: cssColor("--mirch", "#B3261E"),
      leaf: cssColor("--elaichi", "#356B46"),
    }),
    []
  );

  return (
    <group>
      {/* Layered like a kitchen jar filled over weeks: heaviest at the base. */}
      <GrainLayer count={300} color={c.chana} yBase={-0.92} ySpread={0.3} radius={0.86} seed={11} size={0.055} />
      <GrainLayer count={320} color={c.dal} yBase={-0.66} ySpread={0.34} radius={0.9} seed={29} size={0.045} />
      <GrainLayer count={340} color={c.rice} yBase={-0.36} ySpread={0.38} radius={0.92} seed={47} size={0.036} />

      {/* Whole dried chillies, resting on the top of the grain. */}
      {[
        [0.3, -0.02, 0.18, 0.5],
        [-0.34, 0.01, -0.12, -1.1],
        [0.05, 0.04, -0.36, 2.2],
      ].map(([x, y, z, rot], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[Math.PI / 2.3, 0, rot]} castShadow>
          <coneGeometry args={[0.05, 0.36, 10]} />
          <meshStandardMaterial color={c.chilli} roughness={0.6} metalness={0.02} />
        </mesh>
      ))}

      {/* A curry-leaf sprig laid over the top — the green that says kitchen. */}
      <group position={[-0.1, 0.1, 0.22]} rotation={[0, 0.6, 0.12]}>
        {[-0.26, -0.12, 0.02, 0.16, 0.3].map((z, i) => (
          <mesh key={i} position={[i % 2 ? 0.07 : -0.07, 0, z]} rotation={[Math.PI / 2, 0, i % 2 ? 0.5 : -0.5]}>
            <circleGeometry args={[0.09, 12]} />
            <meshStandardMaterial
              color={c.leaf}
              roughness={0.7}
              metalness={0}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
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
