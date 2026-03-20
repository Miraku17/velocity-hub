"use client";

import { useState } from "react";

const TIME_SLOTS = [
  { time: "08:00 AM", available: true },
  { time: "09:30 AM", available: true },
  { time: "11:00 AM", available: true },
  { time: "12:30 PM", available: true },
  { time: "02:00 PM", available: false },
  { time: "03:30 PM", available: true },
  { time: "05:00 PM", available: true },
  { time: "06:30 PM", available: true },
];

const PERKS = [
  "Premium Pro-Turf Surfacing",
  "Complimentary Paddle Rental",
  "Filtered Water & Lounge Access",
];

export default function Booking() {
  const [selectedSlot, setSelectedSlot] = useState("11:00 AM");

  return (
    <section
      id="booking"
      className="max-w-7xl mx-auto px-4 sm:px-8 py-24 scroll-mt-20"
    >
      <div className="bg-gradient-to-br from-primary via-primary to-primary-container text-on-primary rounded-[2rem] overflow-hidden flex flex-col lg:flex-row shadow-[0_30px_80px_rgba(24,41,22,0.3)] grain-overlay relative">
        {/* Left: Booking interface */}
        <div className="flex-1 p-8 sm:p-12 md:p-16 border-b lg:border-b-0 lg:border-r border-white/8 relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-[0.06] pointer-events-none" />
          <div className="relative z-10">
            <span className="font-label text-[10px] uppercase tracking-[0.3em] text-primary-fixed-dim font-bold mb-4 block">
              Secure Your Slot
            </span>
            <h2 className="font-headline text-4xl md:text-5xl font-black mb-6 uppercase tracking-[-0.03em]">
              Instant Booking
            </h2>
            <p className="font-body text-primary-fixed-dim text-lg mb-10 opacity-90 max-w-lg">
              Secure your elite court time in seconds. Choose your slot and get
              playing.
            </p>

            {/* Date & Time picker */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/8 mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-primary-fixed-dim">
                    calendar_today
                  </span>
                  <span className="font-label font-bold uppercase tracking-widest text-sm">
                    October 24, 2024
                  </span>
                </div>
                <button className="text-xs font-bold uppercase tracking-tight border-b border-primary-fixed-dim/50 pb-1 hover:text-white hover:border-white transition-colors">
                  Change Date
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => slot.available && setSelectedSlot(slot.time)}
                    className={`py-3 rounded-lg text-xs font-label font-bold transition-all duration-300 ${
                      !slot.available
                        ? "opacity-25 bg-white/5 cursor-not-allowed line-through"
                        : selectedSlot === slot.time
                          ? "bg-primary-fixed text-on-primary-fixed ring-4 ring-primary-fixed/20 scale-[1.02] shadow-lg"
                          : "bg-white/8 border border-white/8 hover:bg-white/15 hover:border-white/15 hover:scale-[1.02]"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <button className="w-full sm:w-auto bg-primary-fixed text-on-primary-fixed px-10 py-5 rounded-xl font-label font-black uppercase tracking-[0.2em] shadow-[0_8px_30px_rgba(211,233,203,0.2)] hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(211,233,203,0.3)] transition-all duration-300 active:translate-y-0">
                Reserve Now
              </button>
              <a
                href="https://wa.me/velocityph"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-primary-fixed-dim hover:text-white transition-colors group"
              >
                <span className="material-symbols-outlined bg-white/8 p-2.5 rounded-full group-hover:scale-110 group-hover:bg-white/15 transition-all">
                  chat
                </span>
                <span className="font-label font-bold uppercase tracking-widest text-sm">
                  Message on WhatsApp
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Right: Pricing sidebar */}
        <div className="lg:w-[35%] bg-primary-container/80 backdrop-blur-sm p-8 sm:p-12 md:p-16 flex flex-col justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          <div className="space-y-8 relative z-10">
            <div>
              <span className="font-label text-[10px] uppercase tracking-widest text-primary-fixed-dim mb-2 block">
                Standard Rate
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-5xl md:text-6xl font-black text-white tracking-tight">
                  PHP 500
                </span>
                <span className="font-body text-primary-fixed-dim opacity-50 text-sm">
                  /hour
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {PERKS.map((perk) => (
                <div key={perk} className="flex items-start gap-3">
                  <span
                    className="material-symbols-outlined text-primary-fixed-dim mt-0.5"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <p className="text-sm font-body text-white/80">{perk}</p>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-white/8">
              <p className="text-[10px] font-label uppercase tracking-widest text-primary-fixed-dim/50 italic leading-relaxed">
                Cancel for free up to 24 hours before your match. Membership
                discounts apply automatically at checkout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
