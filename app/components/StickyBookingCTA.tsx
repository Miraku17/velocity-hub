"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function StickyBookingCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs sm:max-w-md px-4 transition-all duration-500 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="bg-surface-container-lowest/95 backdrop-blur-xl rounded-full shadow-[0_8px_40px_rgba(24,41,22,0.15)] p-2 flex items-center justify-between">
        <div className="flex items-center gap-3 pl-4">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-label text-[10px] font-black uppercase tracking-widest text-primary">
            Live Availability
          </span>
        </div>
        <Link
          href="#booking"
          className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-3 rounded-full font-label text-xs font-bold uppercase tracking-[0.2em] shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 transition-all duration-300"
        >
          Book Now
        </Link>
      </div>
    </div>
  );
}
