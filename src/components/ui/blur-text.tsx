"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/use-media-query";

/**
 * Words blur in one after another when the block scrolls into view.
 *
 * Three departures from the reference implementation, each for a reason:
 *
 *  1. Under prefers-reduced-motion the text renders as plain markup with no
 *     motion elements at all: not a zero-duration animation. There is no
 *     reason to mount 8 animating spans for someone who asked for stillness.
 *  2. Words carry a real trailing space rather than `marginRight`, so the
 *     heading stays selectable and copies as a sentence. The reference used a
 *     margin because non-breaking spaces collapse under tight letter-spacing;
 *     a real space plus `white-space: pre` on the span keeps both.
 *  3. The observer disconnects after firing once. A heading that re-animates
 *     every time it re-enters the viewport is a distraction on a long page.
 */

export function BlurText({
  text,
  className = "",
  style,
  stagger = 0.1,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  /** Seconds between words. */
  stagger?: number;
  as?: "span" | "h1" | "h2" | "h3" | "p";
}) {
  const calm = usePrefersReducedMotion();
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  const fired = useRef(false);

  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  useEffect(() => {
    if (!node || calm || fired.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          fired.current = true;
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [node, calm]);

  /* Reduced motion: plain text, no motion components mounted. */
  if (calm) {
    return (
      <Tag className={className} style={style}>
        {text}
      </Tag>
    );
  }

  return (
    <Tag
      ref={setNode as never}
      className={className}
      style={{ display: "flex", flexWrap: "wrap", rowGap: "0.1em", ...style }}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          style={{ display: "inline-block", whiteSpace: "pre" }}
          initial={{ filter: "blur(10px)", opacity: 0, y: 40 }}
          animate={
            shown
              ? {
                  filter: ["blur(10px)", "blur(5px)", "blur(0px)"],
                  opacity: [0, 0.5, 1],
                  y: [40, -4, 0],
                }
              : undefined
          }
          transition={{
            duration: 0.7,
            times: [0, 0.5, 1],
            ease: "easeOut",
            delay: i * stagger,
          }}
        >
          {/* Real space, so the heading copies as a sentence rather than
              asWordsRunTogether. */}
          {i < words.length - 1 ? `${word} ` : word}
        </motion.span>
      ))}
    </Tag>
  );
}
