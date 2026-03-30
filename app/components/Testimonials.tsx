"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";

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

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const testimonial = TESTIMONIALS[current];

  const go = (dir: 1 | -1) => {
    setDirection(dir);
    setCurrent(
      (prev) => (prev + dir + TESTIMONIALS.length) % TESTIMONIALS.length
    );
  };

  const variants = {
    enter: (d: number) => ({
      x: d > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (d: number) => ({
      x: d > 0 ? -80 : 80,
      opacity: 0,
    }),
  };

  const imageVariants = {
    enter: (d: number) => ({
      x: d > 0 ? 40 : -40,
      opacity: 0,
      scale: 1.05,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (d: number) => ({
      x: d > 0 ? -40 : 40,
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <section
      ref={ref}
      className="relative bg-surface py-24 md:py-32 lg:py-40 overflow-hidden"
    >
      <div className="relative z-10 px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto">
        {/* ── Top row: eyebrow + title + arrows ── */}
        <div className="flex items-start justify-between mb-14 md:mb-20">
          <div>
            <motion.div
              className="inline-block px-5 py-2 rounded-full border border-primary/10 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, ease }}
            >
              <span className="font-[Poppins] text-xs uppercase tracking-[0.3em] text-primary/60 font-semibold">
                Testimonials
              </span>
            </motion.div>

            <motion.h2
              className="font-['Clash_Display'] text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1] tracking-tight text-primary"
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.1, ease }}
            >
              What Our Players Say
            </motion.h2>
          </div>

          {/* Nav arrows */}
          <motion.div
            className="flex items-center gap-3 mt-8"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease }}
          >
            <button
              onClick={() => go(-1)}
              className="w-12 h-12 rounded-full border border-primary/15 flex items-center justify-center hover:border-primary/40 transition-colors duration-300 cursor-pointer"
              aria-label="Previous testimonial"
            >
              <ArrowLeft className="w-5 h-5 text-primary/50" />
            </button>
            <button
              onClick={() => go(1)}
              className="w-12 h-12 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors duration-300 cursor-pointer"
              aria-label="Next testimonial"
            >
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        </div>

        {/* ── Testimonial content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center min-h-[400px] md:min-h-[480px]">
          {/* Left: Image */}
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-primary/5">
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
          </div>

          {/* Right: Quote content */}
          <div className="relative">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease }}
              >
                {/* Quote mark */}
                <svg
                  className="w-12 h-12 text-primary/10 mb-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M11 7.05C7.28 7.56 4.5 10.72 4.5 14.5c0 2.48 2.02 4.5 4.5 4.5s4.5-2.02 4.5-4.5h-3c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5c0-2.72 2.02-4.94 4.5-5.27V7.05zM19 7.05c-3.72.51-6.5 3.67-6.5 7.45 0 2.48 2.02 4.5 4.5 4.5s4.5-2.02 4.5-4.5h-3c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5c0-2.72 2.02-4.94 4.5-5.27V7.05z" />
                </svg>

                {/* Title */}
                <h3 className="font-['Clash_Display'] text-2xl md:text-3xl font-bold text-primary mb-5">
                  {testimonial.title}
                </h3>

                {/* Quote text */}
                <p className="font-[Poppins] text-primary/40 font-light text-base md:text-lg leading-relaxed mb-10">
                  {testimonial.quote}
                </p>

                {/* Author */}
                <div>
                  <h5 className="font-['Clash_Display'] font-bold text-base text-primary">
                    {testimonial.name}
                  </h5>
                  <p className="font-[Poppins] text-sm text-primary/40">
                    {testimonial.role}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dots indicator */}
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
                      ? "w-8 bg-primary"
                      : "w-4 bg-primary/15 hover:bg-primary/30"
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
