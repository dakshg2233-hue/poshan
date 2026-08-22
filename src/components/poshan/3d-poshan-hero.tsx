"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export function ThreeDPoshanHero() {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const text = canvasRef.current.querySelector(".poshan-3d-text") as HTMLElement;
      if (text) {
        const rotateX = (y - 0.5) * 20;
        const rotateY = (x - 0.5) * 20;
        text.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section
      ref={canvasRef}
      id="poshan-3d"
      className="relative w-full min-h-screen bg-black overflow-hidden flex flex-col items-center justify-center"
    >
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-black/90 z-5" />

      {/* 3D POSHAN Text */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
        className="poshan-3d-text relative z-10 cursor-pointer"
        style={{
          perspective: "1200px",
          transformStyle: "preserve-3d",
          transition: "transform 0.1s ease-out",
        }}
      >
        <h1
          className="text-9xl md:text-[200px] lg:text-[280px] font-heading italic font-bold text-white"
          style={{
            textShadow: `
              0 10px 30px rgba(0,0,0,0.8),
              10px 20px 40px rgba(255,255,255,0.1),
              -10px 20px 40px rgba(255,255,255,0.05)
            `,
            letterSpacing: "-0.02em",
          }}
        >
          POSHAN
        </h1>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 z-10"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-white/60 text-sm">Scroll to continue</span>
          <svg
            className="w-6 h-6 text-white/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </motion.div>
    </section>
  );
}
