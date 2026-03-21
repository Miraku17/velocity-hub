"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import CurvedLoop from "@/components/CurvedLoop";
import { Calendar } from "@/components/ui/calendar";

const ease = [0.16, 1, 0.3, 1] as const;

const COURTS = [
  { id: 1, name: "Court 1", type: "Covered" },
  { id: 2, name: "Court 2", type: "Covered" },
  { id: 3, name: "Court 3", type: "Covered" },
  { id: 4, name: "Court 4", type: "Covered" },
  { id: 5, name: "Court 5", type: "Outdoor" },
  { id: 6, name: "Court 6", type: "Outdoor" },
];

const TIME_SLOTS = [
  "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM",
  "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM",
  "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM",
];

function getRate(type: string, time: string): number {
  const hour = parseInt(time);
  const isPM = time.includes("PM");
  const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
  const isDaytime = hour24 >= 7 && hour24 < 16;
  if (type === "Covered") return isDaytime ? 550 : 600;
  return isDaytime ? 450 : 500;
}

const STEPS = [
  { num: 1, label: "Your Details" },
  { num: 2, label: "Court & Schedule" },
  { num: 3, label: "Review & Confirm" },
];

export default function BookingPage() {
  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const today = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 30);
    return d;
  }, [today]);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  const court = COURTS.find((c) => c.id === selectedCourt);
  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const breakdown = useMemo(() => {
    if (!court) return [];
    return selectedSlots.map((t) => ({ time: t, rate: getRate(court.type, t) }));
  }, [court, selectedSlots]);

  const total = breakdown.reduce((sum, b) => sum + b.rate, 0);

  const toggleSlot = (t: string) => {
    setSelectedSlots((prev) =>
      prev.includes(t) ? prev.filter((s) => s !== t) : [...prev, t]
    );
  };

  const step1Valid = name.trim() !== "" && email.trim() !== "" && phone.trim() !== "";
  const step2Valid = selectedCourt !== null && selectedSlots.length > 0;

  // Colors
  const bg = "#182916";
  const accent = "#d3e9cb";
  const accentDim = "#b7cdb0";
  const surface = "#f5f4ed";

  return (
    <div className="min-h-svh relative" style={{ backgroundColor: surface }}>
      {/* ── Background CurvedLoop ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-[0.06] [&>div>div]:!min-h-0">
        <div className="absolute top-[8%] left-0 right-0 h-[200px] hidden md:block">
          <CurvedLoop
            marqueeText="✦BOOK NOW✦BOOK NOW✦BOOK NOW✦BOOK NOW✦"
            speed={1}
            curveAmount={200}
            direction="left"
            interactive={false}
            className={`font-['Clash_Display'] font-black uppercase tracking-[0.4em] fill-[#182916]`}
          />
        </div>
        <div className="absolute top-[40%] left-0 right-0 h-[200px] hidden md:block">
          <CurvedLoop
            marqueeText="VELOCITY PICKLEBALL HUB — VELOCITY PICKLEBALL HUB — "
            speed={0.8}
            curveAmount={150}
            direction="right"
            interactive={false}
            className={`font-['Clash_Display'] font-black uppercase tracking-[0.5em] fill-[#182916]`}
          />
        </div>
        <div className="absolute top-[72%] left-0 right-0 h-[200px] hidden md:block">
          <CurvedLoop
            marqueeText="✦BOOK NOW✦BOOK NOW✦BOOK NOW✦BOOK NOW✦"
            speed={1.2}
            curveAmount={250}
            direction="left"
            interactive={false}
            className={`font-['Clash_Display'] font-black uppercase tracking-[0.3em] fill-[#182916]`}
          />
        </div>
      </div>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b" style={{ borderColor: `${bg}08`, backgroundColor: `${surface}ee`, backdropFilter: "blur(20px)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-3">
            <Image src="/logo.png" alt="Velocity" width={50} height={50} className="w-auto h-10 group-hover:rotate-[-4deg] transition-transform" />
            <span className="font-['Clash_Display'] text-lg font-bold hidden sm:block" style={{ color: bg }}>Velocity</span>
          </Link>
          <Link href="/" className="font-[Poppins] text-xs flex items-center gap-1.5 transition-colors" style={{ color: `${bg}66` }}>
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Home
          </Link>
        </div>
      </header>

      {/* ── Page Title ── */}
      <div className="relative z-10 overflow-hidden" style={{ backgroundColor: bg }}>
        <div className="absolute inset-0 grain-overlay opacity-15 pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-8 md:py-10 relative z-10">
          <div className="flex items-center gap-3 mb-2 sm:mb-3">
            <div className="w-6 sm:w-8 h-px" style={{ backgroundColor: accentDim }} />
            <span className="font-[Poppins] text-[9px] sm:text-[10px] uppercase tracking-[0.35em] font-semibold" style={{ color: accentDim }}>
              Velocity Pickleball Hub
            </span>
          </div>
          <h1 className="font-['Clash_Display'] text-xl sm:text-3xl md:text-4xl font-bold text-white">
            Book Your Court
          </h1>
        </div>
      </div>

      {/* ── Steps ── */}
      <div className="relative z-10 border-b" style={{ backgroundColor: "white", borderColor: `${bg}08` }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-3 sm:py-5">
          <div className="flex items-center gap-1 sm:gap-2">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => s.num < step && setStep(s.num)}
                  disabled={s.num > step}
                  className={`flex items-center gap-1.5 sm:gap-2.5 transition-all ${s.num > step ? "opacity-25 cursor-default" : "cursor-pointer"}`}
                >
                  <div
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all shrink-0"
                    style={{
                      backgroundColor: step >= s.num ? bg : `${bg}0a`,
                      color: step >= s.num ? "white" : `${bg}40`,
                    }}
                  >
                    {step > s.num ? (
                      <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                    ) : s.num}
                  </div>
                  <span className="font-[Poppins] text-[10px] sm:text-xs font-semibold hidden sm:block" style={{ color: `${bg}99` }}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className="w-5 sm:w-8 md:w-16 h-px mx-0.5 sm:mx-1 transition-all" style={{ backgroundColor: step > s.num ? bg : `${bg}0d` }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10">
        <AnimatePresence mode="wait">
          {/* ═══ STEP 1 ═══ */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.35, ease }}>
              <div className="bg-white rounded-2xl p-5 sm:p-8 md:p-10 max-w-2xl shadow-sm" style={{ border: `1px solid ${bg}08` }}>
                <h2 className="font-['Clash_Display'] text-lg sm:text-xl font-bold mb-1" style={{ color: bg }}>Your Information</h2>
                <p className="font-[Poppins] text-xs sm:text-sm mb-6 sm:mb-8" style={{ color: `${bg}66` }}>
                  No account needed. We&apos;ll use this to send your booking confirmation.
                </p>

                <div className="space-y-4 sm:space-y-5">
                  {[
                    { label: "Full Name", value: name, set: setName, type: "text", placeholder: "Juan Dela Cruz" },
                    { label: "Email", value: email, set: setEmail, type: "email", placeholder: "juan@email.com" },
                    { label: "Phone Number", value: phone, set: setPhone, type: "tel", placeholder: "+63 917 123 4567" },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="font-[Poppins] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1.5 sm:mb-2 block" style={{ color: `${bg}80` }}>
                        {f.label} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type={f.type}
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full rounded-lg sm:rounded-xl px-3 sm:px-4 py-3 sm:py-3.5 font-[Poppins] text-sm focus:outline-none transition-all"
                        style={{
                          backgroundColor: surface,
                          border: `1px solid ${bg}12`,
                          color: bg,
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-8 sm:mt-10 flex justify-end">
                  <button
                    onClick={() => step1Valid && setStep(2)}
                    disabled={!step1Valid}
                    className="w-full sm:w-auto px-8 py-3 sm:py-3.5 rounded-xl font-[Poppins] font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    style={{
                      backgroundColor: step1Valid ? bg : `${bg}0a`,
                      color: step1Valid ? "white" : `${bg}30`,
                      cursor: step1Valid ? "pointer" : "not-allowed",
                    }}
                  >
                    Next
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 2 ═══ */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.35, ease }}>
              <div className="bg-white rounded-2xl p-5 sm:p-8 md:p-10 shadow-sm" style={{ border: `1px solid ${bg}08` }}>
                <h2 className="font-['Clash_Display'] text-lg sm:text-xl font-bold mb-1" style={{ color: bg }}>Select Court & Schedule</h2>
                <p className="font-[Poppins] text-xs sm:text-sm mb-6 sm:mb-8" style={{ color: `${bg}66` }}>
                  Pick a date, choose your court, then select one or more time slots.
                </p>

                {/* Date */}
                <div className="mb-6 sm:mb-8">
                  <label className="font-[Poppins] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: `${bg}80` }}>Date</label>
                  <div className="rounded-xl overflow-hidden inline-block max-w-full" style={{ border: `1px solid ${bg}0d` }}>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      disabled={{ before: today, after: maxDate }}
                      className="bg-white"
                    />
                  </div>
                  <p className="font-[Poppins] text-[10px] sm:text-[11px] mt-2" style={{ color: `${bg}40` }}>
                    Selected: <span className="font-semibold" style={{ color: `${bg}99` }}>{formattedDate}</span>
                  </p>
                </div>

                {/* Court */}
                <div className="mb-6 sm:mb-8">
                  <label className="font-[Poppins] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: `${bg}80` }}>Court</label>
                  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
                    {COURTS.map((c) => {
                      const active = selectedCourt === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCourt(c.id)}
                          className="p-2.5 sm:p-4 rounded-lg sm:rounded-xl text-center transition-all"
                          style={{
                            backgroundColor: active ? bg : "white",
                            color: active ? "white" : bg,
                            border: `1px solid ${active ? bg : `${bg}0d`}`,
                          }}
                        >
                          <span
                            className="material-symbols-outlined text-base sm:text-lg mb-0.5 sm:mb-1 block"
                            style={{ color: active ? accent : `${bg}40`, fontVariationSettings: "'FILL' 1" }}
                          >
                            {c.type === "Covered" ? "roofing" : "park"}
                          </span>
                          <p className="font-['Clash_Display'] text-xs sm:text-sm font-bold">{c.name}</p>
                          <p className="text-[8px] sm:text-[10px] font-[Poppins] font-semibold uppercase tracking-wider mt-0.5" style={{ opacity: 0.4 }}>
                            {c.type}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="font-[Poppins] text-[10px] sm:text-xs font-semibold uppercase tracking-wider" style={{ color: `${bg}80` }}>
                      Time Slots <span className="normal-case tracking-normal font-normal hidden sm:inline" style={{ color: `${bg}40` }}>(select multiple)</span>
                    </label>
                    {selectedSlots.length > 0 && (
                      <button onClick={() => setSelectedSlots([])} className="font-[Poppins] text-[10px] uppercase tracking-wider text-red-400 hover:text-red-500 font-semibold transition-colors">
                        Clear All
                      </button>
                    )}
                  </div>

                  {selectedCourt && (
                    <div className="flex flex-wrap gap-3 sm:gap-4 mb-4">
                      <span className="font-[Poppins] text-[9px] sm:text-[10px] flex items-center gap-1 sm:gap-1.5" style={{ color: `${bg}40` }}>
                        <span className="material-symbols-outlined text-xs">light_mode</span>
                        7AM–3PM: ₱{court?.type === "Covered" ? "550" : "450"}/hr
                      </span>
                      <span className="font-[Poppins] text-[9px] sm:text-[10px] flex items-center gap-1 sm:gap-1.5" style={{ color: `${bg}40` }}>
                        <span className="material-symbols-outlined text-xs">dark_mode</span>
                        4PM–12AM: ₱{court?.type === "Covered" ? "600" : "500"}/hr
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 sm:gap-2">
                    {TIME_SLOTS.map((t) => {
                      const isSelected = selectedSlots.includes(t);
                      const rate = selectedCourt ? getRate(court!.type, t) : 0;
                      return (
                        <button
                          key={t}
                          onClick={() => selectedCourt && toggleSlot(t)}
                          disabled={!selectedCourt}
                          className="py-2.5 sm:py-3 px-1.5 sm:px-2 rounded-lg sm:rounded-xl text-center transition-all"
                          style={{
                            backgroundColor: !selectedCourt ? `${bg}03` : isSelected ? bg : "white",
                            color: !selectedCourt ? `${bg}20` : isSelected ? "white" : `${bg}b3`,
                            border: `1px solid ${!selectedCourt ? `${bg}06` : isSelected ? bg : `${bg}0d`}`,
                            cursor: selectedCourt ? "pointer" : "not-allowed",
                          }}
                        >
                          <span className="block text-[10px] sm:text-xs font-semibold font-[Poppins]">{t}</span>
                          {selectedCourt && (
                            <span className="block text-[9px] sm:text-[10px] mt-0.5" style={{ opacity: isSelected ? 0.5 : 0.3 }}>₱{rate}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8 sm:mt-10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 sm:py-3.5 rounded-xl font-[Poppins] font-semibold text-sm transition-all flex items-center justify-center gap-2"
                    style={{ border: `1px solid ${bg}0d`, color: `${bg}80` }}
                  >
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Back
                  </button>
                  <button
                    onClick={() => step2Valid && setStep(3)}
                    disabled={!step2Valid}
                    className="px-8 py-3 sm:py-3.5 rounded-xl font-[Poppins] font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    style={{
                      backgroundColor: step2Valid ? bg : `${bg}0a`,
                      color: step2Valid ? "white" : `${bg}30`,
                      cursor: step2Valid ? "pointer" : "not-allowed",
                    }}
                  >
                    Next
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 3 ═══ */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.35, ease }}>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-8">
                {/* Action card — on mobile show first */}
                <div className="lg:col-span-2 lg:order-2 space-y-4 sm:space-y-6">
                  <div className="rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden" style={{ backgroundColor: bg }}>
                    <div className="absolute inset-0 grain-overlay opacity-15 pointer-events-none" />
                    <div className="relative z-10">
                      <span className="material-symbols-outlined text-3xl sm:text-4xl mb-3 sm:mb-4 block" style={{ color: accent, fontVariationSettings: "'FILL' 1" }}>
                        sports_tennis
                      </span>
                      <p className="font-['Clash_Display'] text-2xl sm:text-3xl font-bold text-white mb-1">
                        ₱{total.toLocaleString()}
                      </p>
                      <p className="font-[Poppins] text-[10px] sm:text-xs uppercase tracking-wider font-semibold mb-6 sm:mb-8" style={{ color: `${accentDim}80` }}>
                        {selectedSlots.length} slot{selectedSlots.length > 1 ? "s" : ""} · {court?.name}
                      </p>

                      <button
                        onClick={() => alert("Booking confirmed! We'll send a confirmation to " + email)}
                        className="w-full py-3.5 sm:py-4 rounded-xl font-[Poppins] font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.98]"
                        style={{ backgroundColor: accent, color: bg }}
                      >
                        Confirm Reservation
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-3 sm:py-3.5 rounded-xl font-[Poppins] font-semibold text-sm transition-all flex items-center justify-center gap-2"
                    style={{ border: `1px solid ${bg}0d`, color: `${bg}66` }}
                  >
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Edit Reservation
                  </button>
                </div>

                {/* Summary */}
                <div className="lg:col-span-3 lg:order-1 bg-white rounded-2xl p-5 sm:p-8 md:p-10 shadow-sm" style={{ border: `1px solid ${bg}08` }}>
                  <h2 className="font-['Clash_Display'] text-lg sm:text-xl font-bold mb-4 sm:mb-6" style={{ color: bg }}>Booking Summary</h2>

                  <div className="mb-5 sm:mb-8 p-4 sm:p-5 rounded-xl" style={{ backgroundColor: surface }}>
                    <h3 className="font-[Poppins] text-[10px] font-bold uppercase tracking-[0.2em] mb-2 sm:mb-3" style={{ color: `${bg}40` }}>Contact Details</h3>
                    <div className="space-y-1 sm:space-y-1.5">
                      <p className="font-[Poppins] text-sm font-medium" style={{ color: bg }}>{name}</p>
                      <p className="font-[Poppins] text-xs sm:text-sm" style={{ color: `${bg}80` }}>{email}</p>
                      <p className="font-[Poppins] text-xs sm:text-sm" style={{ color: `${bg}80` }}>{phone}</p>
                    </div>
                  </div>

                  <div className="mb-5 sm:mb-8 p-4 sm:p-5 rounded-xl" style={{ backgroundColor: surface }}>
                    <h3 className="font-[Poppins] text-[10px] font-bold uppercase tracking-[0.2em] mb-2 sm:mb-3" style={{ color: `${bg}40` }}>Reservation Details</h3>
                    <div className="space-y-2 sm:space-y-3 text-sm font-[Poppins]">
                      <div className="flex justify-between gap-2">
                        <span className="shrink-0" style={{ color: `${bg}66` }}>Date</span>
                        <span className="font-medium text-right text-xs sm:text-sm" style={{ color: bg }}>{formattedDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: `${bg}66` }}>Court</span>
                        <span className="font-medium text-xs sm:text-sm" style={{ color: bg }}>{court?.name} ({court?.type})</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: `${bg}66` }}>Slots</span>
                        <span className="font-medium text-xs sm:text-sm" style={{ color: bg }}>{selectedSlots.length} hr{selectedSlots.length > 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 sm:mb-6">
                    <h3 className="font-[Poppins] text-[10px] font-bold uppercase tracking-[0.2em] mb-2 sm:mb-3" style={{ color: `${bg}40` }}>Payment Breakdown</h3>
                    <div style={{ borderColor: `${bg}06` }}>
                      {breakdown.map((b) => (
                        <div key={b.time} className="flex justify-between py-2.5 sm:py-3 text-xs sm:text-sm font-[Poppins]" style={{ borderBottom: `1px solid ${bg}06` }}>
                          <span style={{ color: `${bg}99` }}>{b.time}</span>
                          <span className="font-medium" style={{ color: bg }}>₱{b.rate.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between pt-3 sm:pt-4 mt-2" style={{ borderTop: `2px solid ${bg}12` }}>
                      <span className="font-['Clash_Display'] text-base sm:text-lg font-bold" style={{ color: bg }}>Total</span>
                      <span className="font-['Clash_Display'] text-xl sm:text-2xl font-bold" style={{ color: bg }}>₱{total.toLocaleString()}</span>
                    </div>
                  </div>

                  <p className="font-[Poppins] text-[10px] sm:text-[11px] italic leading-relaxed" style={{ color: `${bg}33` }}>
                    Free cancellation up to 24 hours before your reserved time. A confirmation will be sent to your email.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <footer className="relative z-10 mt-6 sm:mt-10" style={{ borderTop: `1px solid ${bg}08` }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-4 sm:py-6 flex items-center justify-between">
          <p className="font-[Poppins] text-[9px] sm:text-[10px]" style={{ color: `${bg}30` }}>
            &copy; {new Date().getFullYear()} Velocity Pickleball Hub
          </p>
          <Link href="https://www.facebook.com/velocitypickleballhub" target="_blank" rel="noopener noreferrer" className="font-[Poppins] text-[9px] sm:text-[10px] transition-colors" style={{ color: `${bg}30` }}>
            Facebook
          </Link>
        </div>
      </footer>
    </div>
  );
}
