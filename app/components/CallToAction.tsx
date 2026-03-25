"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "motion/react";
import { 
  ArrowRight, 
  Sparkles
} from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

export default function CallToAction() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const logoRotate = useTransform(scrollYProgress, [0, 1], [-12, 12]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-primary py-32 md:py-48 lg:py-64"
    >
      {/* ── Background layers ── */}
      <motion.div className="absolute inset-0 z-0" style={{ y: bgY }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_40%,rgba(183,205,176,0.1)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(45,63,42,0.6)_0%,transparent_50%)]" />
      </motion.div>

      {/* High-fidelity Grid */}
      <div className="absolute inset-0 z-0 opacity-[0.04]"
           style={{
             backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                               linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
             backgroundSize: '80px 80px'
           }} />

      {/* Texture grain */}
      <div className="absolute inset-0 z-0 grain-overlay opacity-[0.4]" />

      {/* ── Kinetic Watermark ── */}
      <motion.div
        className="absolute right-[-10%] md:right-[0%] top-1/2 -translate-y-1/2 w-[400px] md:w-[600px] lg:w-[800px] opacity-[0.03] pointer-events-none z-0"
        style={{ rotate: logoRotate }}
      >
        <Image
          src="/logo.png"
          alt=""
          width={800}
          height={800}
          className="w-full h-auto invert brightness-0"
          aria-hidden
        />
      </motion.div>

      {/* ── Dynamic Decorative Lines ── */}
      <motion.div
        className="absolute left-0 top-1/4 w-1/3 h-px bg-gradient-to-r from-primary-fixed-dim/30 to-transparent"
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.5, ease }}
        style={{ transformOrigin: "left" }}
      />
      <motion.div
        className="absolute right-0 bottom-1/4 w-1/4 h-px bg-gradient-to-l from-primary-fixed-dim/20 to-transparent"
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.5, delay: 0.3, ease }}
        style={{ transformOrigin: "right" }}
      />

      {/* ── Content Container ── */}
      <div className="relative z-10 px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto">
        <motion.div style={{ y: contentY }}>
          {/* Eyebrow */}
          <motion.div
            className="flex items-center gap-4 mb-12"
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease }}
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm">
              <span className="font-[Poppins] text-[10px] uppercase tracking-[0.4em] text-primary-fixed-dim font-bold">
                Limited Court Availability
              </span>
            </div>
          </motion.div>

          {/* Main Headline */}
          <div className="max-w-4xl mb-12">
            <motion.h2
              className="font-['Clash_Display'] text-[clamp(3rem,9vw,7.5rem)] font-bold leading-[0.85] tracking-tighter text-white"
              initial={{ opacity: 0, y: 60 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1.2, delay: 0.1, ease }}
            >
              Master the<br />
              <span className="text-primary-fixed-dim italic">Momentum.</span>
            </motion.h2>
          </div>

          {/* Editorial Subtitle */}
          <motion.p
            className="font-[Poppins] text-xl md:text-2xl text-white/40 font-light max-w-xl leading-relaxed mb-16 border-l-2 border-white/10 pl-8 italic"
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.3, ease }}
          >
            No memberships, no barriers. Just elite courts and the fastest-growing community in Cebu. Your next match starts here.
          </motion.p>

          {/* Action Row */}
          <motion.div
            className="flex flex-col sm:flex-row items-center gap-10"
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.5, ease }}
          >
            <Link
              href="/booking"
              className="group relative isolate flex items-center gap-4 px-12 py-6 rounded-2xl font-[Poppins] font-black uppercase tracking-[0.2em] text-sm overflow-hidden bg-white text-primary transition-all duration-500 hover:shadow-[0_20px_50px_rgba(255,255,255,0.2)] hover:bg-primary-fixed-dim hover:-translate-y-1 active:translate-y-0"
            >
              Reserve a Court
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-500" />
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Decorative Floor Gradient ── */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}
