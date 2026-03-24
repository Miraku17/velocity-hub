"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "motion/react";
import { Coffee, Leaf, Clock, UtensilsCrossed } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const HIGHLIGHTS = [
  {
    icon: Coffee,
    title: "Specialty Drinks",
    description: "Freshly brewed coffee, smoothies, and post-game refreshments to keep you going.",
  },
  {
    icon: Leaf,
    title: "Healthy Bites",
    description: "Light meals and energy snacks crafted to fuel your best performance on court.",
  },
  {
    icon: Clock,
    title: "Open Court-Side",
    description: "Grab a drink between matches without ever leaving the venue.",
  },
  {
    icon: UtensilsCrossed,
    title: "The Hangout Spot",
    description: "Chill with your crew, watch live matches, and soak in the vibe after games.",
  },
];

export default function Cafe() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const watermarkY = useTransform(scrollYProgress, [0, 1], [-60, 60]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-primary py-16 sm:py-24 md:py-40"
    >
      {/* ── Background Layers ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_60%,rgba(183,205,176,0.06)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(45,63,42,0.4)_0%,transparent_50%)]" />
        <div className="absolute inset-0 grain-overlay opacity-20" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* ── Floating Watermark ── */}
      <motion.div
        style={{ y: watermarkY }}
        className="absolute right-[-5%] top-1/2 -translate-y-1/2 pointer-events-none select-none"
      >
        <span className="font-['Clash_Display'] text-[18vw] font-bold text-white/[0.015] whitespace-nowrap leading-none">
          CAFE
        </span>
      </motion.div>

      {/* ── Decorative Lines ── */}
      <motion.div
        className="absolute left-0 top-[30%] w-1/4 h-px bg-gradient-to-r from-primary-fixed-dim/20 to-transparent"
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.5, ease }}
        style={{ transformOrigin: "left" }}
      />
      <motion.div
        className="absolute right-0 bottom-[35%] w-1/5 h-px bg-gradient-to-l from-primary-fixed-dim/15 to-transparent"
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.5, delay: 0.3, ease }}
        style={{ transformOrigin: "right" }}
      />

      <div className="relative z-10 px-5 sm:px-10 lg:px-16 max-w-7xl mx-auto">
        {/* ── Header ── */}
        <div className="max-w-3xl mb-16 sm:mb-24">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="w-10 h-px bg-primary-fixed-dim" />
            <span className="font-[Poppins] text-[11px] uppercase tracking-[0.4em] text-primary-fixed-dim font-bold">
              Coming Soon
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease }}
            className="font-['Clash_Display'] text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[1.05] tracking-tight text-white mb-6"
          >
            CAFE <span className="text-primary-fixed italic">Opening Soon</span>
          </motion.h2>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease }}
            className="font-[Poppins] text-base sm:text-lg md:text-xl text-white/40 font-light leading-relaxed border-l-2 border-white/10 pl-6"
          >
            Fuel your game with fresh coffee and healthy bites &mdash; right beside the courts.
          </motion.p>
        </div>

        {/* ── Feature Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {HIGHLIGHTS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 + i * 0.12, ease }}
              className="group relative flex flex-col p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] bg-white/[0.02] border border-white/[0.05] transition-all duration-500 hover:bg-white/[0.05] hover:border-white/10 hover:-translate-y-1"
            >
              {/* Number */}
              <span className="absolute top-5 right-5 sm:top-7 sm:right-7 font-['Clash_Display'] text-5xl sm:text-6xl font-bold text-white/[0.03] leading-none select-none">
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="mb-5 p-3 w-fit rounded-xl sm:rounded-2xl bg-white/[0.03] text-white/40 group-hover:text-primary-fixed-dim transition-colors duration-500">
                <item.icon size={22} strokeWidth={1.5} />
              </div>

              <h3 className="font-['Clash_Display'] text-lg sm:text-xl font-bold text-white mb-2">
                {item.title}
              </h3>
              <p className="font-[Poppins] text-sm text-white/35 font-light leading-relaxed">
                {item.description}
              </p>

              {/* Bottom accent line on hover */}
              <div className="mt-auto pt-6">
                <div className="h-px w-full bg-gradient-to-r from-primary-fixed-dim/0 via-primary-fixed-dim/20 to-primary-fixed-dim/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
