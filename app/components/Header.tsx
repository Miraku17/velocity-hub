"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const LOGO_URL =
  "https://lh3.googleusercontent.com/aida/ADBb0uh3ZE7MyDSIXVrH4wEurM-BCLoSHOAu6XRNPv7Hd_Vbxitg0mOl8SSicVemvmXsPTHSbQe9VFDm0WxSSgB3H0I5qVamnlFw1jSanMW2Oxfp0DkmGO_8tckV0TJXdRfSQvRrhLrjwdRYYPY5bAwVISp1ICJ0sCBKK8sYHpdVHkbXruYw3kwdSFMRzA2_4xRw3ErvuF48h-U_SLyA8xLgbompY69Q6LKLlqiJAbL7diMW18tHZEuktuGYOabOLKc0p_SlM4MrX7eMsgU";

const NAV_LINKS = [
  { href: "#services", label: "Services" },
  { href: "#booking", label: "Book Now" },
  { href: "#facility", label: "Facility" },
  { href: "#community", label: "Community" },
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
        scrolled
          ? "bg-surface/95 backdrop-blur-xl shadow-[0_4px_40px_rgba(24,41,22,0.06)]"
          : "bg-transparent"
      }`}
    >
      <nav className="flex justify-between items-center w-full px-6 md:px-8 py-4 max-w-7xl mx-auto">
        <Link
          href="/"
          className="text-2xl font-black text-primary tracking-[-0.06em] font-headline flex items-center gap-3 group"
        >
          <Image
            src={LOGO_URL}
            alt="Velocity Logo"
            width={40}
            height={40}
            className="h-10 w-auto group-hover:rotate-[-4deg] transition-transform duration-300"
          />
          <span className="relative">
            Velocity
            <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-primary group-hover:w-full transition-all duration-300" />
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-10">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative text-secondary font-medium hover:text-primary transition-colors font-headline tracking-tight uppercase text-sm group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-primary/40 group-hover:w-full transition-all duration-300" />
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="#booking"
            className="hidden sm:inline-flex bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-2.5 rounded-md font-label text-sm font-bold tracking-wide transition-all duration-300 hover:shadow-[0_8px_30px_rgba(24,41,22,0.25)] hover:translate-y-[-1px]"
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
          mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-surface/98 backdrop-blur-xl px-6 pb-6 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-3 text-on-surface font-headline uppercase text-sm tracking-wide hover:text-primary hover:pl-2 transition-all duration-200"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="#booking"
            onClick={() => setMobileOpen(false)}
            className="block mt-4 bg-primary text-on-primary text-center py-3 rounded-md font-label font-bold text-sm uppercase tracking-widest"
          >
            Reserve Now
          </Link>
        </div>
      </div>
    </header>
  );
}
