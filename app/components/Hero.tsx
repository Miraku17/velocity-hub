"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import RotatingText from "@/components/RotatingText";

const HERO_IMAGE = "/hero.png";
const ease = [0.16, 1, 0.3, 1] as const;

const STATS = [
  { value: "06", label: "Pro Courts" },
  { value: "500+", label: "Players" },
  { value: "", label: "Open Everyday" },
];

export default function Hero() {
  const containerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.5], ["0%", "10%"]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-svh flex flex-col overflow-hidden bg-primary"
    >
      {/* ── Background ── */}
      <div className="absolute inset-0">
        <motion.div style={{ y: imgY, scale: imgScale }} className="absolute inset-[-15%]">
          <Image
            src={HERO_IMAGE}
            alt="Velocity Pickleball Courts"
            fill
            className="object-cover"
            priority
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/70 to-primary/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/40 to-transparent" />
        <div className="absolute inset-0 grain-overlay opacity-10" />
      </div>

      {/* ── Main Content ── */}
      <motion.div
        style={{ opacity: contentOpacity, y: contentY }}
        className="relative z-10 flex-1 flex flex-col justify-end pb-24 sm:pb-40 pt-28 sm:pt-40 px-5 sm:px-10 lg:px-16 max-w-screen-2xl mx-auto w-full"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 sm:gap-3 bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08] px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full">
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-fixed opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-primary-fixed" />
            </span>
            <span className="font-[Poppins] text-[8px] sm:text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.35em] text-white/50 font-semibold">
              Cebu&apos;s Premier Pickleball Hub
            </span>
          </div>
        </motion.div>

        {/* Title Block */}
        <div className="mb-6 sm:mb-8">
          <motion.h1
            style={{ fontFamily: "'Clash Display', sans-serif" }}
            className="text-[clamp(2.75rem,12vw,10rem)] font-bold text-white leading-[0.9] tracking-[0.05em] flex"
          >
            {"VELOCITY".split("").map((char, i) => {
              const isGreen = i >= 4;
              return (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 60, filter: "blur(12px)", scaleY: 0.3 }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)", scaleY: 1 }}
                  transition={{
                    duration: 0.7,
                    delay: 0.2 + i * 0.06,
                    ease,
                  }}
                  className={`inline-block origin-bottom ${isGreen ? "text-primary-fixed" : ""}`}
                >
                  {char}
                </motion.span>
              );
            })}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45, ease }}
            className="mt-4 flex items-center gap-4"
          >
            <div className="h-px w-12 bg-primary-fixed/40" />
            <span className="font-['Clash_Display'] text-sm sm:text-base uppercase tracking-[0.4em] text-white/30 font-semibold">
              Pickleball Hub
            </span>
          </motion.div>
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55, ease }}
          className="font-[Poppins] text-base sm:text-lg md:text-xl text-white/35 font-light max-w-xl leading-relaxed mb-8 sm:mb-10"
        >
          Where every game is built on{" "}
          <RotatingText
            texts={["Precision.", "Power.", "Momentum.", "Velocity."]}
            mainClassName="text-white font-medium inline-block"
            staggerDuration={0.02}
            rotationInterval={2500}
          />
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.65, ease }}
          className="flex flex-col sm:flex-row items-start gap-4"
        >
          <Link
            href="#booking"
            className="group relative w-full sm:w-auto text-center px-8 sm:px-10 py-4 sm:py-5 bg-white text-primary font-[Poppins] font-bold text-xs sm:text-sm uppercase tracking-[0.15em] rounded-full overflow-hidden transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_20px_60px_rgba(255,255,255,0.12)] active:scale-[0.97]"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              Reserve a Court
              <span className="material-symbols-outlined text-lg group-hover:translate-x-1.5 transition-transform duration-500">
                arrow_forward
              </span>
            </span>
            <div className="absolute inset-0 bg-primary-fixed scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
          </Link>

          <Link
            href="#facility"
            className="w-full sm:w-auto text-center px-8 sm:px-10 py-4 sm:py-5 text-white/50 font-[Poppins] font-semibold text-xs sm:text-sm uppercase tracking-[0.15em] rounded-full border border-white/[0.08] hover:bg-white/[0.05] hover:text-white/80 hover:border-white/15 transition-all duration-400"
          >
            Explore Facility
          </Link>
        </motion.div>
      </motion.div>

      {/* ── Bottom Stats Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.9, ease }}
        className="relative z-10 border-t border-white/[0.06]"
      >
        <div className="max-w-screen-2xl mx-auto w-full px-5 sm:px-10 lg:px-16">
          <div className="flex items-stretch divide-x divide-white/[0.06]">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 + i * 0.1, ease }}
                className="flex-1 py-4 sm:py-8 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4 group"
              >
                {stat.value && (
                  <span className="font-['Clash_Display'] text-xl sm:text-3xl md:text-4xl font-bold text-white leading-none">
                    {stat.value}
                  </span>
                )}
                <span className="font-[Poppins] text-[7px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.25em] text-white/25 font-semibold text-center">
                  {stat.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

    </section>
  );
}
