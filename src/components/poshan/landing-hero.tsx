"use client";

import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";

const ArrowUpRight = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M7 7h10v10" />
  </svg>
);

const PlayIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <polygon points="6,4 20,12 6,20" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 000 18M12.5 3a17 17 0 010 18" />
  </svg>
);

const BlurText = ({ text }: { text: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const words = text.split(" ");

  return (
    <p ref={ref} className="flex flex-wrap justify-center m-0 p-0 gap-x-1">
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ filter: "blur(10px)", opacity: 0, y: 50 }}
          animate={
            isInView
              ? {
                  filter: ["blur(10px)", "blur(5px)", "blur(0px)"],
                  opacity: [0, 0.5, 1],
                  y: [50, -5, 0],
                }
              : {}
          }
          transition={{
            duration: 0.7,
            times: [0, 0.5, 1],
            delay: (i * 100) / 1000,
            ease: "easeOut",
          }}
        >
          {word}
        </motion.span>
      ))}
    </p>
  );
};

const FadingVideo = ({
  src,
  className,
}: {
  src: string;
  className: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafIdRef = useRef<number>();
  const fadingOutRef = useRef(false);
  const FADE_MS = 500;
  const FADE_OUT_LEAD = 0.55;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.style.opacity = "0";

    const fadeTo = (targetOpacity: number, duration = FADE_MS) => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      const startOpacity = parseFloat(video.style.opacity || "0");
      const startTime = performance.now();

      const updateFade = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = startOpacity + (targetOpacity - startOpacity) * progress;
        video.style.opacity = String(current);
        if (progress < 1) {
          rafIdRef.current = requestAnimationFrame(updateFade);
        }
      };
      rafIdRef.current = requestAnimationFrame(updateFade);
    };

    const handleLoadedData = () => {
      video.style.opacity = "0";
      video.play().catch(() => {});
      fadeTo(1);
    };

    const handleTimeUpdate = () => {
      if (!fadingOutRef.current && video.duration) {
        const timeLeft = video.duration - video.currentTime;
        if (timeLeft <= FADE_OUT_LEAD && timeLeft > 0) {
          fadingOutRef.current = true;
          fadeTo(0, FADE_MS);
        }
      }
    };

    const handleEnded = () => {
      video.style.opacity = "0";
      setTimeout(() => {
        video.currentTime = 0;
        video.play().catch(() => {});
        fadingOutRef.current = false;
        fadeTo(1);
      }, 100);
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      muted
      playsInline
      preload="auto"
      className={className}
      style={{ transition: "none" }}
    />
  );
};

export function LandingHero() {
  const currentPalette = typeof window !== "undefined"
    ? localStorage.getItem("poshan-palette") || "kaali"
    : "kaali";

  return (
    <section id="home" className="relative w-full min-h-screen bg-black overflow-hidden flex flex-col justify-between">
      {/* Background Video */}
      <FadingVideo
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4"
        className="absolute left-1/2 top-0 -translate-x-1/2 object-cover object-top z-0 w-[120%] h-[120%]"
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 z-5 bg-gradient-to-b from-black/70 via-black/80 to-black/90" />

      {/* Nav + Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 pt-24">
        {/* Badge */}
        <motion.div
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="liquid-glass rounded-full p-1 pr-4 flex items-center gap-3 mb-6"
        >
          <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-semibold">New</span>
          <span className="text-sm text-white/90">India's Premier Health Intelligence & Diet Platform</span>
        </motion.div>

        {/* Main Headline: POSHAN */}
        <motion.h1
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-7xl md:text-8xl lg:text-9xl font-heading italic text-white leading-[0.9] tracking-tighter mb-2"
        >
          POSHAN
        </motion.h1>

        {/* Subheading */}
        <motion.div
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-xl md:text-2xl lg:text-3xl font-heading italic text-white/80 leading-[1.2] max-w-3xl tracking-tight flex justify-center mb-6"
        >
          <BlurText text="Nurturing Indian Wellness Through Precision" />
        </motion.div>

        {/* Subheading */}
        <motion.p
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-sm md:text-base text-white/90 max-w-2xl font-light leading-tight mb-8"
        >
          Discover customized meal plans, advanced BMI and metabolic metrics, and seamless subscriptions designed for individuals and leading hospitals across India.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="flex items-center gap-6 mb-10"
        >
          <a
            href="#metrics"
            className="liquid-glass-strong rounded-full px-6 py-3 text-sm font-medium text-white flex items-center gap-2 hover:bg-white/10 transition-colors"
          >
            <span>Start Your Plan</span>
            <ArrowUpRight className="h-5 w-5" />
          </a>
          <a
            href="#preview"
            className="text-white text-sm font-medium flex items-center gap-2 hover:text-white/80 transition-colors"
          >
            <div className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center">
              <PlayIcon className="h-4 w-4" />
            </div>
            <span>Watch Platform Tour</span>
          </a>
        </motion.div>

        {/* Stats Row - Only 100% Authentic */}
        <motion.div
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.3 }}
          className="flex items-stretch"
        >
          <div className="liquid-glass p-5 w-full md:w-[220px] rounded-[1.25rem] text-left flex flex-col justify-between">
            <div className="text-white">
              <ClockIcon />
            </div>
            <div>
              <div className="font-heading italic text-4xl tracking-tight leading-none text-white mt-4">100%</div>
              <div className="text-xs text-white/80 font-light mt-1">Authentic Regional Indian Diets</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
