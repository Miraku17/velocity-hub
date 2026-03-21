"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useRef } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

export default function Booking() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <section
      id="booking"
      className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-24 scroll-mt-20 overflow-hidden"
    >
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1, ease }}
        className="relative bg-[#214d2e] rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_rgba(15,31,14,0.5)] border border-white/5"
      >
        {/* ── Court Background & Texture ── */}
        <div className="absolute inset-0">
          {/* Base color gradient */}
          <div className="absolute inset-0 bg-linear-to-br from-[#2a6b3a] via-[#214d2e] to-[#1a3d24]" />
          
          {/* Surface Texture (Grain) */}
          <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none grain-overlay" />
          
          {/* Subtle Wear/Scuff Marks (Radial Gradients) */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-black/10 rounded-full blur-[100px] pointer-events-none" />
        </div>

        {/* ── Court Lines (Animated) ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Outer boundary */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.2, ease }}
            className="absolute inset-4 sm:inset-6 md:inset-10 border-2 sm:border-[3px] border-white/80 rounded-sm"
          />

          {/* Center net line / Kitchen area */}
          <div className="absolute left-4 sm:left-6 md:left-10 right-4 sm:right-6 md:right-10 top-1/2 -translate-y-1/2 flex items-center justify-center">
            {/* Net Shadow */}
            <div className="absolute inset-x-0 h-16 bg-black/15 blur-2xl translate-y-6" />
            
            {/* The Net Line */}
            <motion.div 
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              transition={{ duration: 1.2, delay: 0.4, ease }}
              className="w-full h-[4px] bg-white shadow-[0_0_20px_rgba(255,255,255,0.4)] relative z-20"
            />

            {/* Net Mesh Texture (Center overlay) */}
            <div className="absolute inset-x-0 h-24 pointer-events-none opacity-20 overflow-hidden -translate-y-1/2">
              <div 
                className="w-full h-full"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%),
                    linear-gradient(-45deg, rgba(255,255,255,0.2) 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.2) 75%),
                    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.2) 75%)
                  `,
                  backgroundSize: '12px 12px',
                  backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px'
                }}
              />
            </div>
            
            {/* Net posts */}
            <div className="absolute -left-1 w-3 h-10 bg-white/95 rounded-sm shadow-xl z-20" />
            <div className="absolute -right-1 w-3 h-10 bg-white/95 rounded-sm shadow-xl z-20" />
          </div>

          {/* Non-Volley Zone (Kitchen) Lines */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 0.6, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="absolute left-4 sm:left-6 md:left-10 right-4 sm:right-6 md:right-10 h-px bg-white/40" style={{ top: "32%" }}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 0.6, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="absolute left-4 sm:left-6 md:left-10 right-4 sm:right-6 md:right-10 h-px bg-white/40" style={{ bottom: "32%" }} 
          />

          {/* Center service line */}
          <motion.div 
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            transition={{ duration: 1, delay: 0.5, ease }}
            className="absolute top-4 sm:top-6 md:top-10 bottom-4 sm:bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 w-[2px] bg-white/20 origin-center" 
          />
        </div>

        {/* ── Content ── */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-8 md:px-12 lg:px-20 py-14 sm:py-24 md:py-32">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center gap-3 mb-6"
          >
            <span className="w-8 h-px bg-primary-fixed-dim/40" />
            <span className="font-[Poppins] text-[9px] sm:text-[11px] uppercase tracking-[0.3em] sm:tracking-[0.4em] text-primary-fixed-dim font-bold">
              Instant Access
            </span>
            <span className="w-8 h-px bg-primary-fixed-dim/40" />
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease }}
            className="font-['Clash_Display'] text-[clamp(2.5rem,8vw,5.5rem)] font-bold text-white leading-[1.1] tracking-tight mb-6"
          >
            BOOK YOUR <span className="text-primary-fixed">COURT</span>
          </motion.h2>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease }}
            className="font-[Poppins] text-white/50 text-sm sm:text-lg md:text-xl mb-10 sm:mb-16 max-w-2xl leading-relaxed"
          >
            Secure your spot at Cebu&apos;s premier pickleball facility. 
            Professional-grade courts, available for instant reservation.
          </motion.p>

          {/* ── Rates Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-10 sm:mb-16 w-full max-w-4xl">
            {/* Covered Courts */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease }}
              className="group relative bg-white/[0.03] backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/10 p-5 sm:p-8 hover:bg-white/[0.06] hover:border-white/20 transition-all duration-500"
            >
              <div className="flex items-center justify-between mb-5 sm:mb-8">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-fixed/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-primary-fixed">
                    <span className="material-symbols-outlined text-xl sm:text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>roofing</span>
                  </div>
                  <h3 className="font-['Clash_Display'] text-xl sm:text-2xl font-semibold text-white">Covered</h3>
                </div>
                <span className="bg-primary-fixed/10 text-primary-fixed text-[8px] sm:text-[10px] font-bold uppercase tracking-widest px-2 sm:px-3 py-1 rounded-full border border-primary-fixed/20">
                  Most Popular
                </span>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between bg-black/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/5 group-hover:border-white/10 transition-colors">
                  <div className="text-left">
                    <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-1">Daytime (7AM - 3PM)</p>
                    <p className="text-white font-medium">₱550 <span className="text-white/30 font-normal">/ hour</span></p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm text-primary-fixed-dim">light_mode</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-black/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/5 group-hover:border-white/10 transition-colors">
                  <div className="text-left">
                    <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-1">Evening (4PM - 12AM)</p>
                    <p className="text-white font-medium">₱600 <span className="text-white/30 font-normal">/ hour</span></p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm text-primary-fixed-dim">dark_mode</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Outdoor Courts */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease }}
              className="group relative bg-white/[0.03] backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/10 p-5 sm:p-8 hover:bg-white/[0.06] hover:border-white/20 transition-all duration-500"
            >
              <div className="absolute -top-3 right-6 sm:right-8">
                <span className="bg-primary-fixed text-on-primary-fixed font-bold text-[9px] uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-xl">
                  Opening Soon
                </span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-8 text-left">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-xl sm:rounded-2xl flex items-center justify-center text-white/60">
                  <span className="material-symbols-outlined text-xl sm:text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>park</span>
                </div>
                <h3 className="font-['Clash_Display'] text-xl sm:text-2xl font-semibold text-white/80">Outdoor</h3>
              </div>

              <div className="space-y-3 sm:space-y-4 opacity-60 grayscale-[0.5]">
                <div className="flex items-center justify-between bg-black/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/5">
                  <div className="text-left">
                    <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-1">Daytime (7AM - 3PM)</p>
                    <p className="text-white font-medium">₱450 <span className="text-white/30 font-normal">/ hour</span></p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm text-white/40">light_mode</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-black/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/5">
                  <div className="text-left">
                    <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-1">Evening (4PM - 12AM)</p>
                    <p className="text-white font-medium">₱500 <span className="text-white/30 font-normal">/ hour</span></p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm text-white/40">dark_mode</span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-white/30 mt-6 leading-relaxed italic text-center">
                Pro-standard flooring. Enclosure work in progress.
              </p>
            </motion.div>
          </div>

          {/* ── Call to Action ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.7, ease }}
          >
            <Link
              href="/booking"
              className="group relative inline-flex items-center gap-4 sm:gap-6 bg-white text-primary font-[Poppins] font-bold text-sm sm:text-lg uppercase tracking-[0.1em] sm:tracking-[0.15em] px-8 sm:px-12 py-4 sm:py-6 rounded-full overflow-hidden transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_20px_60px_rgba(255,255,255,0.2)] active:scale-[0.97]"
            >
              <span className="relative z-10 flex items-center gap-4">
                Reserve Your Court
                <span className="material-symbols-outlined text-xl group-hover:translate-x-2 transition-transform duration-500">
                  arrow_forward
                </span>
              </span>
              <div className="absolute inset-0 bg-primary-fixed scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
            </Link>
          </motion.div>

        </div>

        {/* ── Decorative Pickleballs ── */}
        <motion.div 
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 45, 0]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-[15%] w-10 h-10 rounded-full border-2 border-white/10 flex items-center justify-center opacity-40 pointer-events-none"
        >
          <div className="w-6 h-6 rounded-full border border-white/5" />
        </motion.div>

        <motion.div 
          animate={{ 
            y: [0, 30, 0],
            rotate: [0, -30, 0]
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-40 left-[10%] w-14 h-14 rounded-full border-2 border-white/5 flex items-center justify-center opacity-30 pointer-events-none"
        >
          <div className="w-8 h-8 rounded-full border border-white/5" />
        </motion.div>
      </motion.div>
    </section>
  );
}
