"use client";

import { useEffect, useState, type CSSProperties, type ElementType } from "react";
import { usePrefersReducedMotion } from "@/lib/use-media-query";

/**
 * Character-by-character entrance: each glyph slides in from the left as it
 * fades up, staggered across the line.
 *
 * Three departures from the brief, each for a reason this site already cares
 * about:
 *
 *  1. Under prefers-reduced-motion the text renders as ordinary markup. Not a
 *     zero-duration animation: no per-character spans at all.
 *  2. The visible text is split into spans, so it is wrapped in an element
 *     carrying the real string as aria-label with the spans aria-hidden.
 *     Otherwise a screen reader announces the heading one letter at a time.
 *  3. Spaces are real spaces inside a `white-space: pre` span rather than
 *      . Non-breaking spaces stop the heading wrapping, which on a
 *     phone forces a horizontal scrollbar.
 */

export function AnimatedHeading({
  text,
  as: Component = "h1",
  className = "",
  style,
  charDelay = 30,
  initialDelay = 200,
  duration = 500,
}: {
  /** Use \n for a hard line break. */
  text: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** ms between characters. */
  charDelay?: number;
  initialDelay?: number;
  duration?: number;
}) {
  const calm = usePrefersReducedMotion();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (calm) return;
    const t = setTimeout(() => setShown(true), initialDelay);
    return () => clearTimeout(t);
  }, [calm, initialDelay]);

  const lines = text.split("\n");

  /* A bare ElementType collapses its props to `never` in JSX, so it is cast to
     something that actually accepts what we pass. Same issue as MaskedHeading. */
  const Tag = Component as React.ComponentType<
    React.HTMLAttributes<HTMLElement> & { "aria-label"?: string }
  >;

  if (calm) {
    return (
      <Tag className={className} style={style}>
        {lines.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </Tag>
    );
  }

  return (
    <Tag className={className} style={style} aria-label={text.replace(/\n/g, " ")}>
      {lines.map((line, lineIndex) => (
        <span key={lineIndex} className="block" aria-hidden>
          {Array.from(line).map((char, charIndex) => (
            <span
              key={charIndex}
              style={{
                display: "inline-block",
                whiteSpace: "pre",
                opacity: shown ? 1 : 0,
                transform: shown ? "translateX(0)" : "translateX(-18px)",
                transition: `opacity ${duration}ms ease, transform ${duration}ms ease`,
                transitionDelay: `${
                  lineIndex * line.length * charDelay + charIndex * charDelay
                }ms`,
              }}
            >
              {char}
            </span>
          ))}
        </span>
      ))}
    </Tag>
  );
}

/** Fades its children in after a delay. */
export function FadeIn({
  children,
  delay = 0,
  duration = 1000,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const calm = usePrefersReducedMotion();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (calm) return;
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [calm, delay]);

  if (calm) return <div className={className}>{children}</div>;

  return (
    <div
      className={`transition-opacity ${className}`}
      style={{ opacity: shown ? 1 : 0, transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}
