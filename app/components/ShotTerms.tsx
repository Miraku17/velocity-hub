"use client";

import { motion } from "motion/react";

const SHOT_TERMS = [
  "Serve",
  "Return",
  "Forehand",
  "Backhand",
  "Volley",
  "Smash",
  "Dink",
  "Lob",
  "Drive",
  "Drop Shot",
];

export default function ShotTerms() {
  const items = [...SHOT_TERMS, ...SHOT_TERMS, ...SHOT_TERMS, ...SHOT_TERMS];

  return (
    <section className="h-24 md:h-36 overflow-hidden bg-primary flex items-center w-full">
      <div className="relative w-full overflow-hidden">
        <motion.div
          className="flex items-center gap-10 whitespace-nowrap font-['Clash_Display'] text-4xl md:text-7xl font-semibold tracking-tight text-white/90"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            x: {
              duration: 30,
              repeat: Infinity,
              ease: "linear",
            },
          }}
        >
          {items.map((term, i) => (
            <span key={i} className="flex items-center gap-8 shrink-0">
              <span>{term}</span>
              <span className="text-primary-fixed-dim/40 text-lg md:text-2xl">●</span>
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
