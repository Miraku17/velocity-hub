"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

const HERO_IMAGE = "/hero.png";

export default function Hero() {
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!imageRef.current) return;
      const scrollY = window.scrollY;
      const rate = scrollY * 0.15;
      imageRef.current.style.transform = `scale(1.08) translateY(${rate}px)`;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="px-3 sm:px-4 mb-24">
      <div className="relative overflow-hidden bg-primary rounded-[1.8rem] min-h-[92vh] flex flex-col grain-overlay">
        {/* Background with parallax */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div ref={imageRef} className="absolute inset-[-8%] transition-transform duration-100 ease-out">
            <Image
              src={HERO_IMAGE}
              alt="Professional Pickleball Courts"
              fill
              className="object-cover"
              priority
            />
          </div>
          {/* Multi-layer gradient for cinematic depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/20" />
          <div className="absolute inset-0 kinetic-overlay opacity-30" />

          {/* Ambient glow */}
          <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-fixed-dim/8 rounded-full blur-[120px]" />
        </div>

        {/* Top decorative label */}
        <div className="relative z-10 flex justify-center pt-12 md:pt-16">
          <div className="animate-reveal-up inline-flex items-center gap-3 bg-white/[0.07] backdrop-blur-xl px-6 py-2.5 rounded-full border border-white/[0.12]">
            <div className="w-1.5 h-1.5 rounded-full bg-primary-fixed-dim animate-pulse" />
            <span className="font-label uppercase text-[10px] font-bold tracking-[0.35em] text-white/70">
              Cebu&apos;s Premier Pickleball Hub
            </span>
          </div>
        </div>

        {/* Center: massive title */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 -mt-8">
          {/* Decorative court line above title */}
          <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-white/30 to-white/60 mb-8 animate-reveal-up" />

          <h1 className="font-headline text-[clamp(4rem,15vw,13rem)] font-black tracking-[-0.05em] leading-[0.85] text-white text-center animate-reveal-up delay-100">
            <span className="block text-glow">VELOCITY</span>
          </h1>

          {/* Decorative line + tagline */}
          <div className="flex items-center gap-4 mt-6 mb-8 animate-reveal-up delay-200">
            <span className="w-8 h-[1px] bg-primary-fixed-dim/60" />
            <p className="font-body text-base sm:text-lg md:text-xl text-white/70 italic text-center">
              Play better, move stronger, connect deeper.
            </p>
            <span className="w-8 h-[1px] bg-primary-fixed-dim/60" />
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 animate-reveal-up delay-300">
            <Link
              href="#booking"
              className="group relative bg-white text-primary px-10 py-4 rounded-xl font-label font-bold uppercase tracking-[0.15em] text-sm overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
            >
              <span className="relative z-10 flex items-center gap-3">
                Book a Court
                <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform duration-300">arrow_forward</span>
              </span>
              <div className="absolute inset-0 bg-primary-fixed scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
              <span className="absolute inset-0 flex items-center justify-center gap-3 font-label font-bold uppercase tracking-[0.15em] text-sm text-on-primary-fixed scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500 delay-75">
                Book a Court
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </span>
            </Link>
            <Link
              href="#services"
              className="group bg-white/[0.06] backdrop-blur-lg text-white border border-white/[0.12] px-10 py-4 rounded-xl font-label font-bold uppercase tracking-[0.15em] text-sm hover:bg-white/[0.12] hover:border-white/25 transition-all duration-400 flex items-center justify-center gap-3"
            >
              Explore Services
              <span className="material-symbols-outlined text-base opacity-50 group-hover:opacity-100 group-hover:rotate-45 transition-all duration-300">north_east</span>
            </Link>
          </div>
        </div>

        {/* Bottom bar: stats + scroll hint */}
        <div className="relative z-10 px-6 sm:px-10 pb-8 sm:pb-10 flex items-end justify-between animate-reveal-up delay-500">
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-8">
            <div className="flex items-center gap-3">
              <span className="font-headline text-3xl font-black text-white">6</span>
              <div className="flex flex-col">
                <span className="font-label text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">Pro</span>
                <span className="font-label text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">Courts</span>
              </div>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div className="flex items-center gap-3">
              <span className="font-headline text-3xl font-black text-white">500+</span>
              <div className="flex flex-col">
                <span className="font-label text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">Active</span>
                <span className="font-label text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">Players</span>
              </div>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div className="flex items-center gap-3">
              <span className="font-headline text-3xl font-black text-white">24/7</span>
              <div className="flex flex-col">
                <span className="font-label text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">Open</span>
                <span className="font-label text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">Daily</span>
              </div>
            </div>
          </div>

          {/* Right: open hours badge */}
          <div className="ml-auto flex items-center gap-3 bg-white/[0.06] backdrop-blur-lg rounded-full px-5 py-2.5 border border-white/[0.1]">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-white/60 font-bold">
              Open Now
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
