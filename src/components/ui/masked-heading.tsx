"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
} from "react";
import { gsap } from "gsap";

import "./masked-heading.css";

/**
 * Heading whose letters are a window onto a photograph or video.
 *
 * Ported from React Bits (JS + CSS) to TypeScript. Four changes, all of which
 * matter on a page this long:
 *
 *  1. The rAF loop is now gated on visibility. The original started a frame
 *     loop on mount and never stopped it: on an ~18,000px page that is a
 *     permanent render loop for a heading nobody is looking at.
 *  2. prefers-reduced-motion now also disables the idle drift and pointer
 *     parallax. The original honoured it for the entrance tween only, so a
 *     reduced-motion visitor still got perpetual movement.
 *  3. With no `src`, it degrades to an ordinary heading instead of rendering
 *     transparent letters over nothing. Poshan has no photography yet, so
 *     without this the section would simply go blank.
 *  4. Ref arrays are trimmed when the word count changes, rather than keeping
 *     stale nodes from a previous render.
 */

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

export type MaskedHeadingProps = {
  text?: string;
  tag?: ElementType;
  mediaType?: "image" | "video";
  src?: string;
  poster?: string;
  fillScale?: number;
  parallax?: number;
  drift?: number;
  brightness?: number;
  saturation?: number;
  grayscale?: boolean;
  reveal?: "rise" | "wipe" | "fade" | "none";
  trigger?: "view" | "mount" | "hover";
  duration?: number;
  stagger?: number;
  align?: "left" | "center" | "right";
  weight?: number;
  tracking?: number;
  lineHeight?: number;
  textScale?: number;
  className?: string;
  style?: CSSProperties;
};

export function MaskedHeading({
  text = "Designed in the details",
  tag = "h2",
  mediaType = "image",
  src = "",
  poster = "",
  fillScale = 1.25,
  parallax = 26,
  drift = 18,
  brightness = 1,
  saturation = 1,
  grayscale = false,
  reveal = "rise",
  duration = 1.1,
  stagger = 0.09,
  trigger = "view",
  align = "center",
  weight = 700,
  tracking = -0.03,
  lineHeight = 1.06,
  textScale = 0.115,
  className = "",
  style,
  ...rest
}: MaskedHeadingProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const revealRef = useRef<HTMLSpanElement | null>(null);
  const mediaRef = useRef<HTMLSpanElement | null>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const baseRefs = useRef<(HTMLElement | null)[]>([]);
  const glyphRefs = useRef<(SVGTextElement | null)[]>([]);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const offsetRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const clipId = `mh-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const words = useMemo(() => String(text).split(/\s+/).filter(Boolean), [text]);

  /* No media means nothing to mask through; render as a plain heading.
     `failed` covers the dangerous case: the measure text is transparent while
     masked, so a 404 or a decode error would leave an invisible heading. If
     the media cannot load we fall back to plain text rather than nothing. */
  /* Stores WHICH src failed rather than a boolean. A new src is then
     automatically un-failed, with no resetting effect, and setState in an
     effect body is a React 19 compiler lint error anyway. */
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const masked = Boolean(src) && failedSrc !== src;

  const settingsRef = useRef({
    fillScale,
    parallax,
    drift,
    brightness,
    saturation,
    grayscale,
    textScale,
  });
  /* Kept fresh in an effect with no dep array, so it runs after every render.
     The original assigned to the ref during render, which React 19's compiler
     lint rejects: a ref write during render is not safe under concurrent
     rendering, where a render can be thrown away. */
  useEffect(() => {
    settingsRef.current = {
      fillScale,
      parallax,
      drift,
      brightness,
      saturation,
      grayscale,
      textScale,
    };
  });

  /* Drop refs beyond the current word count so a shorter heading cannot leave
     detached nodes behind for sync() to measure. Done in an effect, not during
     render: touching a ref while rendering is a React 19 compiler lint error. */
  useEffect(() => {
    wordRefs.current.length = words.length;
    baseRefs.current.length = words.length;
    glyphRefs.current.length = words.length;
  }, [words.length]);

  const place = useCallback(() => {
    const root = rootRef.current;
    const media = mediaRef.current;
    if (!root || !media) return;
    const s = settingsRef.current;
    const W = root.clientWidth;
    const H = root.clientHeight;
    const off = offsetRef.current;

    const maxX = Math.max(0, ((s.fillScale - 1) / 2) * W);
    const maxY = Math.max(0, ((s.fillScale - 1) / 2) * H);

    media.style.transform = `translate3d(${clamp(off.x, -maxX, maxX).toFixed(
      2
    )}px, ${clamp(off.y, -maxY, maxY).toFixed(2)}px, 0) scale(${s.fillScale})`;
    media.style.filter = `brightness(${s.brightness}) saturate(${s.saturation})${
      s.grayscale ? " grayscale(1)" : ""
    }`;
  }, []);

  const sync = useCallback(() => {
    const root = rootRef.current;
    const measure = measureRef.current;
    if (!root || !measure) return;
    const s = settingsRef.current;

    root.style.fontSize = `${clamp(root.clientWidth * s.textScale, 20, 200).toFixed(1)}px`;

    const cs = window.getComputedStyle(measure);
    for (let i = 0; i < wordRefs.current.length; i += 1) {
      const box = wordRefs.current[i];
      const base = baseRefs.current[i];
      const glyph = glyphRefs.current[i];
      if (!box || !base || !glyph) continue;
      glyph.setAttribute("x", `${box.offsetLeft}`);
      glyph.setAttribute("y", `${base.offsetTop}`);
      glyph.style.fontFamily = cs.fontFamily;
      glyph.style.fontSize = cs.fontSize;
      glyph.style.fontWeight = cs.fontWeight;
      glyph.style.fontStyle = cs.fontStyle;
      glyph.style.letterSpacing = cs.letterSpacing;
    }
    place();
  }, [place]);

  /* Layout + the idle/parallax loop. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(root);
    if (document.fonts?.ready) document.fonts.ready.then(sync).catch(() => {});

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* Reduced motion, or no media to move: lay it out once and stop. No frame
       loop, no pointer listeners. */
    if (reduce || !masked) {
      place();
      return () => ro.disconnect();
    }

    let raf = 0;
    let last = performance.now();
    let clock = 0;
    let running = false;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      const s = settingsRef.current;
      const off = offsetRef.current;

      const dx = Math.sin(clock * 0.21) * s.drift;
      const dy = Math.cos(clock * 0.17) * s.drift * 0.6;

      const ease = 1 - Math.exp(-dt / 0.18);
      off.x += (off.tx + dx - off.x) * ease;
      off.y += (off.ty + dy - off.y) * ease;

      place();
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    };

    /* Only animate while on screen. */
    const io = new IntersectionObserver(
      (entries) => (entries.some((e) => e.isIntersecting) ? start() : stop()),
      { rootMargin: "120px" }
    );
    io.observe(root);

    const onMove = (e: PointerEvent) => {
      const s = settingsRef.current;
      if (s.parallax <= 0) return;
      const r = root.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / (r.width || 1)) * 2 - 1;
      const ny = ((e.clientY - r.top) / (r.height || 1)) * 2 - 1;
      offsetRef.current.tx = clamp(nx, -1, 1) * -s.parallax;
      offsetRef.current.ty = clamp(ny, -1, 1) * -s.parallax;
    };
    const onLeave = () => {
      offsetRef.current.tx = 0;
      offsetRef.current.ty = 0;
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [place, sync, masked]);

  useEffect(() => {
    sync();
  }, [sync, words, tag, align, weight, tracking, lineHeight, textScale]);

  /* Entrance. */
  useEffect(() => {
    const root = rootRef.current;
    const layer = revealRef.current;
    if (!root || !layer || !masked) return;
    const glyphs = glyphRefs.current.filter(Boolean) as SVGTextElement[];
    if (!glyphs.length) return;

    const riseDistance = () =>
      (parseFloat(window.getComputedStyle(root).fontSize) || 48) * 1.15;

    const settle = () => {
      gsap.set(glyphs, { y: 0 });
      gsap.set(layer, { opacity: 1, scale: 1, clipPath: "inset(0% 0% 0% 0%)" });
    };

    const rest = () => {
      if (reveal === "rise") gsap.set(glyphs, { y: riseDistance() });
      else if (reveal === "wipe") gsap.set(layer, { clipPath: "inset(0% 100% 0% 0%)" });
      else if (reveal === "fade") gsap.set(layer, { opacity: 0, scale: 1.08 });
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reveal === "none" || reduce) {
      settle();
      return;
    }

    const play = () => {
      tweenRef.current?.kill();
      if (reveal === "rise") {
        gsap.set(layer, { opacity: 1, scale: 1, clipPath: "inset(0% 0% 0% 0%)" });
        tweenRef.current = gsap.fromTo(
          glyphs,
          { y: riseDistance() },
          { y: 0, duration, stagger, ease: "power4.out", overwrite: "auto" }
        );
      } else if (reveal === "wipe") {
        gsap.set(glyphs, { y: 0 });
        const state = { p: 100 };
        tweenRef.current = gsap.to(state, {
          p: 0,
          duration,
          ease: "power3.inOut",
          overwrite: "auto",
          onUpdate: () => {
            layer.style.clipPath = `inset(0% ${state.p}% 0% 0%)`;
          },
        });
      } else {
        gsap.set(glyphs, { y: 0 });
        tweenRef.current = gsap.fromTo(
          layer,
          { opacity: 0, scale: 1.08 },
          { opacity: 1, scale: 1, duration, ease: "power3.out", overwrite: "auto" }
        );
      }
    };

    if (trigger === "hover") {
      settle();
      root.addEventListener("pointerenter", play);
      return () => {
        root.removeEventListener("pointerenter", play);
        tweenRef.current?.kill();
      };
    }

    if (trigger === "view") {
      settle();
      rest();
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            play();
            io.disconnect();
          }
        },
        { threshold: 0.25 }
      );
      io.observe(root);
      return () => {
        io.disconnect();
        tweenRef.current?.kill();
      };
    }

    play();
    return () => {
      tweenRef.current?.kill();
    };
  }, [reveal, trigger, duration, stagger, words, masked]);

  /* A bare ElementType collapses its props to `never` in JSX, so it is cast to
     a component that actually accepts what we pass. In React 19 `ref` is an
     ordinary prop, which is why it can sit in this type at all. */
  const Tag = tag as React.ComponentType<
    React.HTMLAttributes<HTMLElement> & {
      ref?: React.Ref<HTMLElement>;
      "data-masked"?: string;
    }
  >;

  return (
    <Tag
      ref={rootRef}
      data-masked={masked ? "true" : "false"}
      className={`masked-heading ${className}`.trim()}
      style={{
        textAlign: align,
        fontWeight: weight,
        letterSpacing: `${tracking}em`,
        lineHeight,
        ...style,
      }}
      {...rest}
    >
      <span ref={measureRef} className="masked-heading__measure">
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            ref={(el: HTMLSpanElement | null) => {
              wordRefs.current[i] = el;
            }}
            className="masked-heading__word"
          >
            {/* Real space in the DOM, not a CSS ::after. The original spaced
                words with a pseudo-element, so textContent came out as
                "Turntheplateover.": unselectable, uncopyable, and not
                dependably announced by screen readers. white-space: pre on
                this span preserves the trailing space, and word offsetLeft
                is unaffected because the space widens this box, not its own
                left edge. */}
            {i < words.length - 1 ? `${word} ` : word}
            <i
              ref={(el: HTMLElement | null) => {
                baseRefs.current[i] = el;
              }}
              className="masked-heading__baseline"
            />
          </span>
        ))}
      </span>

      {masked && (
        <>
          <svg className="masked-heading__defs" aria-hidden="true" focusable="false">
            <defs>
              <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                {words.map((word, i) => (
                  <text
                    key={`${word}-${i}`}
                    ref={(el: SVGTextElement | null) => {
                      glyphRefs.current[i] = el;
                    }}
                  >
                    {word}
                  </text>
                ))}
              </clipPath>
            </defs>
          </svg>

          <span ref={revealRef} className="masked-heading__reveal">
            <span
              className="masked-heading__clip"
              style={{ clipPath: `url(#${clipId})` }}
            >
              <span ref={mediaRef} className="masked-heading__media">
                {mediaType === "video" ? (
                  <video
                    className="masked-heading__source"
                    src={src}
                    poster={poster}
                    autoPlay
                    muted
                    loop
                    playsInline
                    onError={() => setFailedSrc(src)}
                  />
                ) : (
                  /* Deliberately a plain <img>, not next/image: the element is
                     purely decorative fill inside an SVG clip-path, and
                     next/image's wrapper markup breaks the absolute-inset
                     layout the mask depends on. */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="masked-heading__source"
                    src={src}
                    alt=""
                    draggable={false}
                    onError={() => setFailedSrc(src)}
                  />
                )}
              </span>
            </span>
          </span>
        </>
      )}
    </Tag>
  );
}

export default MaskedHeading;
