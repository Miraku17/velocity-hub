"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { ScrollVelocity } from "@/components/ScrollVelocity";

const COURT_IMAGE = "/hero.png";
const ease = [0.16, 1, 0.3, 1] as const;

const AMENITIES = [
  { icon: "local_parking", label: "Free Parking" },
  { icon: "wc", label: "Restrooms" },
  { icon: "local_drink", label: "Water Station" },
  { icon: "weekend", label: "Lounge Area" },
  { icon: "storefront", label: "Pro Shop" },
  { icon: "wifi", label: "Free WiFi" },
];

export default function Facility() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      id="facility"
      ref={sectionRef}
      className="relative bg-surface overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pt-32 pb-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={headerInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, ease }}
              className="flex items-center gap-3 mb-5"
            >
              <div className="w-10 h-px bg-primary" />
              <span className="font-[Poppins] text-[11px] uppercase tracking-[0.4em] text-primary font-bold">
                The Facility
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={headerInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.15, ease }}
              className="font-['Clash_Display'] text-[clamp(2.5rem,7vw,5.5rem)] font-bold text-primary leading-[1] tracking-tight"
            >
              WHERE THE
              <br />
              <span className="text-primary-container">GAME LIVES</span>
            </motion.h2>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease }}
            className="font-[Poppins] text-on-surface-variant text-base md:text-lg max-w-md leading-relaxed font-light md:text-right"
          >
            Six professional courts under one roof. Built for performance,
            designed for every level of player.
          </motion.p>
        </div>
      </div>

      {/* ── Bento Grid ── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px] sm:auto-rows-[220px] md:auto-rows-[200px]">

          {/* Cell 1 — Wide hero shot (spans 2 cols, 2 rows) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 1, ease }}
            className="col-span-2 row-span-2 relative rounded-3xl overflow-hidden group cursor-default"
          >
            <Image
              src={COURT_IMAGE}
              alt="Velocity Courts Overview"
              fill
              className="object-cover group-hover:scale-[1.03] transition-transform duration-[2000ms]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <span className="font-['Clash_Display'] text-3xl sm:text-4xl font-bold text-white leading-none">
                06
              </span>
              <p className="font-[Poppins] text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mt-1">
                Professional Courts
              </p>
            </div>
          </motion.div>

          {/* Cell 2 — Court close-up (cropped view) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease }}
            className="relative rounded-3xl overflow-hidden group cursor-default"
          >
            <Image
              src={COURT_IMAGE}
              alt="Court Surface Detail"
              fill
              className="object-cover object-right-bottom group-hover:scale-[1.05] transition-transform duration-[2000ms]"
            />
            <div className="absolute inset-0 bg-primary/30" />
            <div className="absolute bottom-4 left-4">
              <span
                className="material-symbols-outlined text-white/80 text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                sports_tennis
              </span>
            </div>
          </motion.div>

          {/* Cell 3 — Stat cell (dark) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2, ease }}
            className="relative rounded-3xl overflow-hidden bg-primary p-6 flex flex-col justify-between cursor-default group"
          >
            <div className="absolute inset-0 grain-overlay opacity-10 pointer-events-none" />
            <span
              className="material-symbols-outlined text-primary-fixed-dim text-3xl relative z-10"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              roofing
            </span>
            <div className="relative z-10">
              <p className="font-['Clash_Display'] text-lg font-bold text-white leading-tight">
                Covered
              </p>
              <p className="font-[Poppins] text-[10px] text-white/30 uppercase tracking-[0.2em] font-semibold">
                Weather Protected
              </p>
            </div>
          </motion.div>

          {/* Cell 4 — Lighting angle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.25, ease }}
            className="relative rounded-3xl overflow-hidden group cursor-default"
          >
            <Image
              src={COURT_IMAGE}
              alt="Court Lighting"
              fill
              className="object-cover object-top group-hover:scale-[1.05] transition-transform duration-[2000ms]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/50 to-primary/20" />
            <div className="absolute bottom-4 left-4">
              <span
                className="material-symbols-outlined text-white/80 text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lightbulb
              </span>
            </div>
          </motion.div>

          {/* Cell 5 — Hours stat cell (accent) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3, ease }}
            className="relative rounded-3xl overflow-hidden bg-primary-fixed p-6 flex flex-col justify-between cursor-default"
          >
            <span
              className="material-symbols-outlined text-primary text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              schedule
            </span>
            <div>
              <p className="font-['Clash_Display'] text-2xl font-bold text-primary leading-none">
                7AM–12AM
              </p>
              <p className="font-[Poppins] text-[10px] text-primary/50 uppercase tracking-[0.2em] font-semibold mt-1">
                Open Daily
              </p>
            </div>
          </motion.div>

          {/* Cell 6 — Wide bottom shot (spans 2 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.35, ease }}
            className="col-span-2 relative rounded-3xl overflow-hidden group cursor-default"
          >
            <Image
              src={COURT_IMAGE}
              alt="Courts Panorama"
              fill
              className="object-cover object-center group-hover:scale-[1.03] transition-transform duration-[2000ms]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/60 via-primary/20 to-transparent" />
            <div className="absolute bottom-5 left-6 flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/[0.1] backdrop-blur-xl border border-white/[0.1] rounded-full px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="font-[Poppins] text-[10px] uppercase tracking-[0.2em] text-white/70 font-semibold">
                  Courts Available Now
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Amenities Strip ── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease }}
          className="rounded-3xl bg-primary p-8 sm:p-10"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-px bg-primary-fixed-dim/40" />
            <span className="font-[Poppins] text-[10px] uppercase tracking-[0.35em] text-primary-fixed-dim font-bold">
              Amenities Included
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {AMENITIES.map((a, i) => (
              <motion.div
                key={a.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.05, ease }}
                className="flex flex-col items-center gap-3 py-5 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-colors"
              >
                <span
                  className="material-symbols-outlined text-primary-fixed-dim text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {a.icon}
                </span>
                <span className="font-[Poppins] text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold text-center">
                  {a.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── ScrollVelocity Marquee ── */}
      <div className="border-y border-primary/5 py-10">
        <ScrollVelocity
          texts={[
            "VELOCITY PICKLEBALL HUB",
            "6 PRO COURTS",
            "CEBU'S FINEST",
          ]}
          velocity={25}
          className="font-headline text-primary opacity-[0.07] font-black"
        />
      </div>
    </section>
  );
}
