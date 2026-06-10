"use client";

import { motion } from "framer-motion";

/** Orbe futurista com anéis orbitais e bola — peça central do hero. */
export function HeroOrb() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto aspect-square w-full max-w-[420px]"
    >
      {/* Glow central */}
      <div className="absolute inset-[18%] rounded-full bg-brand/25 blur-3xl animate-pulse-glow" />

      {/* Núcleo de vidro */}
      <div className="absolute inset-[26%] grid place-items-center rounded-full glass neon-border">
        <span className="text-6xl drop-shadow-[0_0_25px_rgba(0,245,160,0.5)]">⚽</span>
      </div>

      {/* Anéis orbitais */}
      <div className="absolute inset-0 animate-spin-slow">
        <div className="absolute inset-[8%] rounded-full border border-brand/30" />
        <div className="absolute left-[6%] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-brand shadow-[0_0_18px_4px_rgba(0,245,160,0.7)]" />
      </div>
      <div
        className="absolute inset-0 animate-spin-slow"
        style={{ animationDirection: "reverse", animationDuration: "26s" }}
      >
        <div className="absolute inset-[0%] rounded-full border border-brand-2/25" />
        <div className="absolute right-[4%] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-brand-2 shadow-[0_0_16px_4px_rgba(47,184,255,0.7)]" />
      </div>
      <div
        className="absolute inset-[16%] animate-spin-slow"
        style={{ animationDuration: "14s" }}
      >
        <div className="absolute inset-0 rounded-full border border-accent/25" />
        <div className="absolute left-1/2 top-[2%] h-2 w-2 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_14px_3px_rgba(255,45,120,0.7)]" />
      </div>
    </motion.div>
  );
}
