"use client";

import Image from "next/image";
import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "motion/react";
import {
  Users,
  Trophy,
  Star,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Quote,
  TrendingUp,
} from "lucide-react";
import CountUp from "@/components/CountUp";

const ease = [0.16, 1, 0.3, 1] as const;

interface Testimonial {
  title: string;
  quote: string;
  name: string;
  role: string;
  image: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    title: "Best courts in the city",
    quote:
      "The court surface here is top-notch — great grip, perfect bounce, and well-maintained lines. I've played at a lot of venues around Cebu and nothing compares to the quality of these courts.",
    name: "Earll",
    role: "Regular Player",
    image: "/hero.png",
  },
  {
    title: "Perfect venue for evening games",
    quote:
      "The lighting is incredible — even during late-night sessions, visibility is crystal clear with zero glare. The covered courts mean we never have to worry about the weather. It's hands down the best place to play after work.",
    name: "Jun",
    role: "Regular Player",
    image: "/hero.png",
  },
  {
    title: "Clean, spacious, and well-kept",
    quote:
      "Everything about this venue is well thought out — clean restrooms, plenty of seating for spectators, and the courts are always swept and ready to go. You can tell the team really takes pride in keeping the facility in great shape.",
    name: "Mark",
    role: "Regular Player",
    image: "/hero.png",
  },
];

const STATS = [
  { value: 500, suffix: "+", label: "Active Players", icon: Users, color: "text-blue-400" },
  { value: 6, suffix: "", label: "Pro Courts", icon: Trophy, color: "text-amber-400" },
  { value: 50, suffix: "+", label: "Monthly Events", icon: TrendingUp, color: "text-emerald-400" },
  { value: 4.9, suffix: "/5", label: "Player Rating", icon: Star, color: "text-primary-fixed" },
];

function StatBlock({
  stat,
  index,
  inView,
}: {
  stat: (typeof STATS)[0];
  index: number;
  inView: boolean;
}) {
  return (
    <motion.div
      className="relative group"
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: 0.1 + index * 0.1, ease }}
    >
      <div className="flex flex-col items-center p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] bg-white/[0.02] border border-white/[0.05] transition-all duration-500 hover:bg-white/[0.04] hover:border-white/10">
        <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] text-white/40 group-hover:text-primary-fixed-dim transition-colors">
          <stat.icon size={18} strokeWidth={1.5} className="sm:w-5 sm:h-5" />
        </div>

        <div className="text-center">
          <div className="flex items-baseline justify-center gap-0.5 mb-1">
            <span className="font-['Clash_Display'] text-3xl sm:text-5xl font-bold text-white tracking-tight">
              <CountUp
                to={stat.value}
                from={0}
                duration={2.5}
                delay={0.4 + index * 0.1}
              />
            </span>
            <span className="font-['Clash_Display'] text-lg sm:text-2xl font-bold text-primary-fixed-dim">
              {stat.suffix}
            </span>
          </div>
          <p className="font-[Poppins] text-[8px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/30 font-medium">
            {stat.label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const testimonial = TESTIMONIALS[current];

  const go = useCallback((dir: 1 | -1) => {
    setDirection(dir);
    setCurrent((prev) => (prev + dir + TESTIMONIALS.length) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => go(1), 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, go]);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
        {/* Left: Image & Navigation */}
        <div className="lg:col-span-5 relative">
          <div className="relative aspect-[3/4] sm:aspect-[4/5] rounded-2xl sm:rounded-[2.5rem] overflow-hidden group">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current}
                initial={{ opacity: 0, scale: 1.1, x: direction * 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -direction * 20 }}
                transition={{ duration: 0.7, ease }}
                className="absolute inset-0"
              >
                <Image
                  src={testimonial.image}
                  alt={testimonial.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
              </motion.div>
            </AnimatePresence>

            {/* Quote Icon Overlay */}
            <div className="absolute top-5 left-5 sm:top-8 sm:left-8 w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
              <Quote size={16} className="sm:w-5 sm:h-5" fill="currentColor" />
            </div>

            {/* Navigation Buttons */}
            <div className="absolute bottom-5 right-5 sm:bottom-8 sm:right-8 flex gap-2">
              <button
                onClick={() => go(-1)}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-95"
              >
                <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={() => go(1)}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center hover:scale-105 transition-all active:scale-95"
              >
                <ArrowRight size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Text Content */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: 40 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="h-1 bg-primary-fixed-dim" 
                />
                <h3 className="font-['Clash_Display'] text-2xl sm:text-3xl md:text-5xl font-bold text-white leading-tight">
                  &ldquo;{testimonial.title}&rdquo;
                </h3>
              </div>

              <p className="font-[Poppins] text-white/50 text-base sm:text-lg md:text-xl leading-relaxed font-light">
                {testimonial.quote}
              </p>

              <div className="pt-2 sm:pt-4">
                <p className="font-['Clash_Display'] text-base sm:text-xl font-bold text-white">{testimonial.name}</p>
                <p className="font-[Poppins] text-xs sm:text-sm text-primary-fixed-dim font-medium uppercase tracking-wider">
                  {testimonial.role}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Progress Indicators */}
          <div className="flex gap-3 mt-8 sm:mt-12">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > current ? 1 : -1);
                  setCurrent(i);
                }}
                className="relative h-1 bg-white/10 overflow-hidden rounded-full transition-all duration-500"
                style={{ width: i === current ? '60px' : '30px' }}
              >
                {i === current && (
                  <motion.div
                    layoutId="active-dot"
                    className="absolute inset-0 bg-primary-fixed"
                    initial={{ x: '-100%' }}
                    animate={{ x: '0%' }}
                    transition={{ duration: 6, ease: "linear" }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Community() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const watermarkY = useTransform(scrollYProgress, [0, 1], [-100, 100]);

  return (
    <section
      id="community"
      ref={sectionRef}
      className="relative overflow-hidden bg-primary py-16 sm:py-24 md:py-40"
    >
      {/* ── Background Elements ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-40 bg-linear-to-b from-black/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(183,205,176,0.03)_0%,transparent_70%)]" />
        <div className="absolute inset-0 grain-overlay opacity-20" />
      </div>

      {/* Large Watermark Text */}
      <motion.div 
        style={{ y: watermarkY }}
        className="absolute left-0 top-1/4 -translate-x-1/4 pointer-events-none select-none"
      >
        <span className="font-['Clash_Display'] text-[20vw] font-bold text-white/[0.02] whitespace-nowrap leading-none">
          VELOCITY HUB
        </span>
      </motion.div>

      <div className="relative z-10 px-5 sm:px-10 lg:px-16 max-w-7xl mx-auto">
        {/* ── Header Section ── */}
        <div className="max-w-3xl mb-12 sm:mb-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="w-10 h-px bg-primary-fixed-dim" />
            <span className="font-[Poppins] text-[11px] uppercase tracking-[0.4em] text-primary-fixed-dim font-bold">
              Player Stories
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-['Clash_Display'] text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[1.05] tracking-tight text-white mb-8"
          >
            JOIN THE <span className="text-primary-fixed">MOVEMENT</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="font-[Poppins] text-base sm:text-lg md:text-xl text-white/40 font-light leading-relaxed"
          >
            More than just a facility—it&apos;s a vibrant community where players of all 
            skill levels come together to elevate their game and build lasting connections.
          </motion.p>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 md:gap-8 mb-16 sm:mb-32">
          {STATS.map((stat, i) => (
            <StatBlock key={stat.label} stat={stat} index={i} inView={inView} />
          ))}
        </div>

        {/* ── Carousel Section ── */}
        <TestimonialCarousel />

      </div>
    </section>
  );
}
