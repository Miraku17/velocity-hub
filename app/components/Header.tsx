"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const LOGO_URL = "/logo.png";

const NAV_LINKS = [
  { href: "/booking", label: "Book Now" },
  { href: "#facility", label: "Facility" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "top-4 px-4 sm:px-6" : "top-0 px-0"
      }`}
    >
      <nav
        className={`flex justify-between items-center w-full max-w-7xl mx-auto font-['Clash_Display'] transition-all duration-500 ${
          scrolled
            ? "bg-surface/90 backdrop-blur-2xl shadow-[0_8px_40px_rgba(24,41,22,0.08),0_1px_3px_rgba(24,41,22,0.05)] rounded-2xl px-6 md:px-8 py-3 border border-outline-variant/30"
            : "bg-transparent px-6 md:px-8 py-4 rounded-none"
        }`}
      >
        <Link href="/" className="group">
          <Image
            src={LOGO_URL}
            alt="Velocity Logo"
            width={80}
            height={80}
            className={`w-auto group-hover:rotate-[-4deg] transition-all duration-300 ${
              scrolled ? "h-14" : "h-20"
            }`}
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-10">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative text-secondary font-medium hover:text-primary transition-colors font-['Clash_Display'] tracking-tight uppercase text-sm group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-primary/40 group-hover:w-full transition-all duration-300" />
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/booking"
            className="hidden sm:inline-flex bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-2.5 rounded-md font-['Clash_Display'] text-sm font-bold tracking-wide transition-all duration-300 hover:shadow-[0_8px_30px_rgba(24,41,22,0.25)] hover:translate-y-[-1px]"
          >
            Reserve Now
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 group"
            aria-label="Toggle menu"
          >
            <span
              className={`block w-6 h-[2px] bg-primary transition-all duration-300 ${
                mobileOpen ? "rotate-45 translate-y-[5px]" : ""
              }`}
            />
            <span
              className={`block w-6 h-[2px] bg-primary transition-all duration-300 ${
                mobileOpen ? "opacity-0 scale-x-0" : ""
              }`}
            />
            <span
              className={`block w-6 h-[2px] bg-primary transition-all duration-300 ${
                mobileOpen ? "-rotate-45 -translate-y-[5px]" : ""
              }`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-500 ${
          scrolled ? "px-4 sm:px-6" : "px-0"
        }`}
      >
        <div
          className={`max-w-7xl mx-auto overflow-hidden transition-all duration-500 ${
            mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div
            className={`backdrop-blur-2xl px-6 pb-6 pt-2 space-y-1 transition-all duration-500 ${
              scrolled
                ? "bg-surface/90 rounded-b-2xl border-x border-b border-outline-variant/30 mt-0 shadow-[0_8px_40px_rgba(24,41,22,0.08)]"
                : "bg-surface/98 mt-0"
            }`}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block py-3 text-on-surface font-['Clash_Display'] uppercase text-sm tracking-wide hover:text-primary hover:pl-2 transition-all duration-200"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/booking"
              onClick={() => setMobileOpen(false)}
              className="block mt-4 bg-primary text-on-primary text-center py-3 rounded-md font-['Clash_Display'] font-bold text-sm uppercase tracking-widest"
            >
              Reserve Now
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
