"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import RotatingText from "@/components/RotatingText";

const HERO_IMAGE = "/hero.png";

const ease = [0.16, 1, 0.3, 1] as const;
const d = (i: number) => 0.3 + i * 0.15;

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const fade = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen overflow-hidden bg-primary">
      {/* ── Full-bleed background ── */}
      <div className="absolute inset-0">
        <motion.div className="absolute inset-[-5%]" style={{ y: imgY, scale: imgScale }}>
          <Image
            src={HERO_IMAGE}
            alt="Velocity Pickleball Courts"
            fill
            className="object-cover"
            priority
          />
        </motion.div>
        <div className="absolute inset-0 bg-primary/25 mix-blend-multiply" />
        <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/20 to-black/80" />
        <div className="absolute inset-0 bg-linear-to-r from-black/60 via-transparent to-transparent" />
        <div className="absolute inset-0 grain-overlay" />
      </div>

      {/* ── Main grid layout ── */}
      <div className="relative z-10 min-h-screen flex flex-col justify-between px-6 sm:px-10 lg:px-16 pt-32 pb-10">

        {/* Top: Left-aligned content block */}
        <div className="flex-1 flex flex-col justify-center max-w-3xl">

          {/* Eyebrow */}
          <motion.div
            className="flex items-center gap-4 mb-8"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: d(0), ease }}
            style={{ y: textY }}
          >
            <motion.div
              className="w-12 h-px bg-primary-fixed-dim/60"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1, delay: d(0), ease }}
              style={{ transformOrigin: "left" }}
            />
            <span className="font-[Poppins] text-[11px] uppercase tracking-[0.4em] text-white/50 font-medium">
              Cebu&apos;s Premier Pickleball Hub
            </span>
          </motion.div>

          {/* Title */}
          <motion.div style={{ y: textY }}>
            <motion.h1
              className="font-['Clash_Display'] text-[clamp(3.5rem,12vw,9rem)] font-bold leading-[0.9] tracking-[-0.02em] text-white mb-6"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: d(1), ease }}
            >
              VELO<span className="text-primary-fixed-dim">CITY</span>
            </motion.h1>

            {/* Tagline */}
            <motion.p
              className="font-[Poppins] text-lg sm:text-xl md:text-2xl text-white/40 font-light max-w-lg leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: d(3), ease }}
            >
              Play at full{" "}
              <RotatingText
                texts={["velocity", "speed", "force", "intensity", "momentum"]}
                mainClassName="inline-flex text-white font-medium"
                staggerFrom="last"
                staggerDuration={0.02}
                rotationInterval={2500}
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
              />
              .{" "}
              <span className="text-white/30">Never slow down.</span>
            </motion.p>

            {/* CTA row */}
            <motion.div
              className="flex flex-wrap items-center gap-4 mt-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: d(4), ease }}
            >
              <Link
                href="#booking"
                className="group relative px-9 py-4 bg-white text-primary font-[Poppins] font-semibold text-sm uppercase tracking-[0.12em] rounded-full overflow-hidden transition-all duration-500 hover:shadow-[0_0_50px_rgba(211,233,203,0.3)] hover:scale-[1.03] active:scale-[0.97]"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Book a Court
                  <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform duration-300">
                    arrow_forward
                  </span>
                </span>
                <div className="absolute inset-0 bg-primary-fixed scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
              </Link>

              <Link
                href="#services"
                className="group flex items-center gap-2 px-1 py-3 font-[Poppins] font-medium text-sm uppercase tracking-[0.12em] text-white/50 hover:text-white transition-colors duration-300"
              >
                <span className="w-8 h-px bg-white/20 group-hover:w-12 group-hover:bg-white/50 transition-all duration-400" />
                Explore
                <span className="material-symbols-outlined text-sm opacity-40 group-hover:opacity-100 group-hover:rotate-45 transition-all duration-300">
                  north_east
                </span>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom bar */}
        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-8 border-t border-white/8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: d(6), ease }}
          style={{ opacity: fade }}
        >
          {/* Stats */}
          <div className="flex items-center gap-8 sm:gap-12">
            {[
              { num: "6", label: "Pro Courts" },
              { num: "500+", label: "Active Players" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="flex items-baseline gap-2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: d(7) + i * 0.1, ease }}
              >
                <span className="font-['Clash_Display'] text-3xl sm:text-4xl font-bold text-white">
                  {stat.num}
                </span>
                <span className="font-[Poppins] text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium">
                  {stat.label}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Location pill */}
          <motion.div
            className="flex items-center gap-3 bg-white/5 backdrop-blur-xl rounded-full px-5 py-2.5 border border-white/8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: d(8), ease }}
          >
            <motion.span
              className="material-symbols-outlined text-primary-fixed-dim text-base"
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              location_on
            </motion.span>
            <span className="font-[Poppins] text-[10px] sm:text-xs uppercase tracking-[0.18em] text-white/45 font-medium">
              Cebu City
            </span>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Right side vertical text (desktop) ── */}
      <motion.div
        className="hidden lg:flex absolute right-10 top-1/2 -translate-y-1/2 z-10 flex-col items-center gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: d(5) }}
        style={{ opacity: fade }}
      >
        <div className="w-px h-20 bg-linear-to-b from-transparent to-white/20" />
        <span className="font-[Poppins] text-[10px] uppercase tracking-[0.5em] text-white/25 font-medium [writing-mode:vertical-lr]">
          Scroll to explore
        </span>
        <motion.div
          className="w-px h-12 bg-white/15"
          animate={{ scaleY: [0, 1, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "top" }}
        />
      </motion.div>

      {/* ── Corner accent lines ── */}
      <motion.div
        className="hidden md:block absolute top-28 right-16 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: d(6) }}
      >
        <div className="w-20 h-px bg-white/10" />
        <div className="w-px h-20 bg-white/10 mt-0" />
      </motion.div>
    </section>
  );
}
