"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "motion/react";
import {
  Users,
  Trophy,
  Star,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import CountUp from "@/components/CountUp";

const ease = [0.16, 1, 0.3, 1] as const;

interface Testimonial {
  title: string;
  quote: string;
  name: string;
  role: string;
  avatar: string;
  image: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    title: "Best courts in the city",
    quote:
      "I absolutely love playing here! The courts are always in excellent condition, and the location is super convenient. It's the perfect spot to unwind and enjoy a great game every weekend.",
    name: "Carlo S.",
    role: "Founding Member",
    avatar: "https://i.pravatar.cc/150?u=carlo",
    image: "/hero.png",
  },
  {
    title: "Transformed my game",
    quote:
      "I started as a total beginner and the coaching clinics here completely changed how I play. In just one month, my serves and volleys improved dramatically. The coaches genuinely care.",
    name: "Maya R.",
    role: "Tournament Player",
    avatar: "https://i.pravatar.cc/150?u=maya",
    image: "/hero.png",
  },
  {
    title: "Incredible community",
    quote:
      "Professional setup, great lighting, and the community is super welcoming. Whether you're a beginner or a competitive player, you'll feel right at home. My favorite place to play.",
    name: "James T.",
    role: "Weekend Warrior",
    avatar: "https://i.pravatar.cc/150?u=james",
    image: "/hero.png",
  },
];

const STATS = [
  { value: 500, suffix: "+", label: "Active Players", icon: Users },
  { value: 6, suffix: "", label: "Pro Courts", icon: Trophy },
  { value: 50, suffix: "+", label: "Events Monthly", icon: CheckCircle2 },
  { value: 4.9, suffix: "/5", label: "Player Rating", icon: Star },
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
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: 0.2 + index * 0.1, ease }}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative p-5 rounded-3xl bg-white/[0.03] border border-white/[0.06] group-hover:bg-primary-fixed-dim/10 group-hover:border-primary-fixed-dim/30 transition-all duration-700 group-hover:-translate-y-2">
          <stat.icon className="w-7 h-7 text-primary-fixed-dim group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute -inset-2 bg-primary-fixed-dim/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        </div>
        <div className="text-center space-y-1">
          <div className="flex items-baseline justify-center gap-1">
            <span className="font-['Clash_Display'] text-5xl sm:text-6xl md:text-7xl font-bold text-white tracking-tighter">
              <CountUp
                to={stat.value}
                from={0}
                duration={3}
                delay={0.5 + index * 0.15}
              />
            </span>
            <span className="font-['Clash_Display'] text-3xl sm:text-4xl font-bold text-primary-fixed-dim">
              {stat.suffix}
            </span>
          </div>
          <p className="font-[Poppins] text-[11px] sm:text-[12px] uppercase tracking-[0.4em] text-white/20 group-hover:text-white/60 font-black transition-all duration-700">
            {stat.label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function TestimonialCarousel({ inView }: { inView: boolean }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const testimonial = TESTIMONIALS[current];

  const go = (dir: 1 | -1) => {
    setDirection(dir);
    setCurrent(
      (prev) => (prev + dir + TESTIMONIALS.length) % TESTIMONIALS.length
    );
  };

  const contentVariants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  const imageVariants = {
    enter: (d: number) => ({ x: d > 0 ? 30 : -30, opacity: 0, scale: 1.05 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? -30 : 30, opacity: 0, scale: 0.95 }),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1, delay: 0.5, ease }}
    >
      {/* Header row */}
      <div className="flex items-end justify-between mb-12 md:mb-16">
        <div>
          <div className="inline-block px-4 py-1.5 rounded-full border border-white/10 mb-5">
            <span className="font-[Poppins] text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold">
              Testimonials
            </span>
          </div>
          <h3 className="font-['Clash_Display'] text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-[1]">
            What Our Players Say
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => go(-1)}
            className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center hover:border-white/40 hover:bg-white/5 transition-all duration-300 cursor-pointer"
            aria-label="Previous testimonial"
          >
            <ArrowLeft className="w-5 h-5 text-white/50" />
          </button>
          <button
            onClick={() => go(1)}
            className="w-12 h-12 rounded-full bg-primary-fixed-dim flex items-center justify-center hover:bg-primary-fixed transition-colors duration-300 cursor-pointer"
            aria-label="Next testimonial"
          >
            <ArrowRight className="w-5 h-5 text-primary" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center min-h-[380px] md:min-h-[420px]">
        {/* Image */}
        <div className="relative aspect-[4/3] rounded-3xl overflow-hidden">
          {/* Glow behind image */}
          <div className="absolute -inset-4 bg-primary-fixed-dim/10 blur-[60px] rounded-full pointer-events-none" />
          <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/[0.08]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.img
                key={current}
                src={testimonial.image}
                alt={testimonial.name}
                className="absolute inset-0 w-full h-full object-cover"
                custom={direction}
                variants={imageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease }}
              />
            </AnimatePresence>
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent" />
          </div>
        </div>

        {/* Quote */}
        <div className="relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={contentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease }}
            >
              {/* Quote mark */}
              <svg
                className="w-14 h-14 text-primary-fixed-dim/15 mb-6"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M11 7.05C7.28 7.56 4.5 10.72 4.5 14.5c0 2.48 2.02 4.5 4.5 4.5s4.5-2.02 4.5-4.5h-3c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5c0-2.72 2.02-4.94 4.5-5.27V7.05zM19 7.05c-3.72.51-6.5 3.67-6.5 7.45 0 2.48 2.02 4.5 4.5 4.5s4.5-2.02 4.5-4.5h-3c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5c0-2.72 2.02-4.94 4.5-5.27V7.05z" />
              </svg>

              <h4 className="font-['Clash_Display'] text-2xl md:text-3xl font-bold text-white mb-5">
                {testimonial.title}
              </h4>

              <p className="font-[Poppins] text-white/40 font-light text-base md:text-lg leading-relaxed mb-10">
                {testimonial.quote}
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-primary-fixed-dim/30 rounded-full blur-sm" />
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="relative w-12 h-12 rounded-full object-cover border-2 border-white/15"
                  />
                </div>
                <div>
                  <h5 className="font-['Clash_Display'] font-bold text-base text-white">
                    {testimonial.name}
                  </h5>
                  <p className="font-[Poppins] text-sm text-white/30">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div className="flex gap-2 mt-10">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > current ? 1 : -1);
                  setCurrent(i);
                }}
                className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                  i === current
                    ? "w-8 bg-primary-fixed-dim"
                    : "w-4 bg-white/15 hover:bg-white/30"
                }`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Community() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const watermarkScale = useTransform(scrollYProgress, [0, 1], [0.8, 1.2]);

  return (
    <section
      id="community"
      ref={sectionRef}
      className="relative overflow-hidden bg-primary py-32 md:py-48 lg:py-56"
    >
      {/* ── Background layers ── */}
      <motion.div className="absolute inset-0 z-0" style={{ y: bgY }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(183,205,176,0.1)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(45,63,42,0.6)_0%,transparent_50%)]" />
      </motion.div>

      {/* Grid */}
      <div
        className="absolute inset-0 z-0 opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: "120px 120px",
        }}
      />

      {/* Grain */}
      <div className="absolute inset-0 z-0 grain-overlay opacity-[0.5]" />

      {/* Watermark */}
      <motion.div
        className="absolute -right-40 top-1/2 -translate-y-1/2 w-[800px] md:w-[1200px] opacity-[0.02] pointer-events-none z-0"
        style={{ scale: watermarkScale, rotate: 15 }}
      >
        <Image
          src="/logo.png"
          alt=""
          width={1200}
          height={1200}
          className="w-full h-auto invert brightness-0"
          aria-hidden
        />
      </motion.div>

      <div className="relative z-10 px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto">
        {/* ── Header ── */}
        <div className="flex flex-col items-center text-center mb-32 md:mb-48">
          <motion.div
            className="flex items-center gap-4 mb-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1, ease }}
          >
            <div className="w-12 h-px bg-primary-fixed-dim/30" />
            <span className="font-[Poppins] text-[12px] uppercase tracking-[0.6em] text-primary-fixed-dim font-black">
              Player Community
            </span>
            <div className="w-12 h-px bg-primary-fixed-dim/30" />
          </motion.div>

          <motion.h2
            className="font-['Clash_Display'] text-[clamp(2.5rem,8vw,6.5rem)] font-bold leading-[0.85] tracking-tighter text-white mb-12"
            initial={{ opacity: 0, y: 60 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1.2, delay: 0.2, ease }}
          >
            Real Stories.
            <br />
            <span className="text-primary-fixed-dim italic">
              Infinite Momentum.
            </span>
          </motion.h2>

          <motion.p
            className="font-[Poppins] text-xl md:text-2xl text-white/40 font-light max-w-2xl leading-relaxed italic"
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.4, ease }}
          >
            &ldquo;Velocity is more than a court—it&apos;s where we find our
            rhythm and push the boundaries of the game.&rdquo;
          </motion.p>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-8 mb-32 md:mb-48">
          {STATS.map((stat, i) => (
            <StatBlock key={stat.label} stat={stat} index={i} inView={inView} />
          ))}
        </div>

        {/* ── Divider ── */}
        <motion.div
          className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-24 md:mb-32"
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.4, ease }}
        />

        {/* ── Testimonials Carousel ── */}
        <TestimonialCarousel inView={inView} />
      </div>

      {/* Bottom line */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}
