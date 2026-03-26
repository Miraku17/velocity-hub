"use client";

import { Suspense, useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import CurvedLoop from "@/components/CurvedLoop";
import { BookingFooter } from "./BookingFooter";
import { Calendar } from "@/components/ui/calendar";
import { LoadingPage } from "@/components/ui/loading";
import { useCourts, type Court } from "@/lib/hooks/useCourts";
import { usePaymentQrCodes } from "@/lib/hooks/usePaymentQrCodes";
import { useCreateReservation } from "@/lib/hooks/useReservations";
import { useQuery } from "@tanstack/react-query";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: string | HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const STORAGE_KEY = "velocity-booking-form";

const ease = [0.16, 1, 0.3, 1] as const;

/** Generate hourly time slots between open_time and close_time (supports overnight, e.g. 07:00–00:00) */
function generateTimeSlots(openTime: string, closeTime: string): string[] {
  const openHour = parseInt(openTime.split(":")[0], 10);
  let closeHour = parseInt(closeTime.split(":")[0], 10);
  // If close_time is midnight (0) or earlier than open, it wraps to the next day
  if (closeHour <= openHour) closeHour += 24;
  const slots: string[] = [];
  for (let h = openHour; h < closeHour; h++) {
    const displayHour = h % 24;
    const hour12 = displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour;
    const ampm = displayHour < 12 ? "AM" : "PM";
    slots.push(`${hour12}:00 ${ampm}`);
  }
  return slots;
}

/** Convert "HH:MM" or "HH:MM:SS" to "7:00 AM" format */
function formatTime12(time: string): string {
  const hour = parseInt(time.split(":")[0], 10);
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${hour12}:00 ${ampm}`;
}

/** Convert "7:00 AM" to 24h hour number (e.g. 7, or "12:00 AM" → 0) */
function parse12Hour(slot: string): number {
  const [timePart, ampm] = slot.split(" ");
  let hour = parseInt(timePart.split(":")[0], 10);
  if (ampm === "AM" && hour === 12) hour = 0;
  else if (ampm === "PM" && hour !== 12) hour += 12;
  return hour;
}

/** Get the per-hour rate for a slot, falling back to court base price */
function getSlotRate(
  slot: string,
  hourlyRates: Record<string, number> | null | undefined,
  basePrice: number
): number {
  if (!hourlyRates) return basePrice;
  const hour = parse12Hour(slot);
  return hourlyRates[String(hour)] ?? basePrice;
}

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const STEPS = [
  { num: 1, label: "Your Details" },
  { num: 2, label: "Court & Schedule" },
  { num: 3, label: "Review & Confirm" },
];

function loadSaved() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function BookingPageWrapper() {
  return (
    <Suspense fallback={<LoadingPage message="Loading..." />}>
      <BookingPage />
    </Suspense>
  );
}

function BookingPage() {
  const { data: courts = [], isLoading } = useCourts({ status: "available" });
  const { data: paymentQrCodes = [] } = usePaymentQrCodes();
  const createReservation = useCreateReservation();
  const searchParams = useSearchParams();
  const router = useRouter();

  const saved = useMemo(() => loadSaved(), []);

  const initialStep = Number(searchParams.get("step")) || saved?.step || 1;
  const [step, setStepState] = useState(initialStep);

  const [name, setName] = useState(saved?.name || "");
  const [email, setEmail] = useState(saved?.email || "");
  const [phone, setPhone] = useState(saved?.phone || "");

  // Payment & receipt state
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [selectedQrIndex, setSelectedQrIndex] = useState(0);
  const [qrLightbox, setQrLightbox] = useState(false);
  const [showSlots, setShowSlots] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Turnstile CAPTCHA
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  const today = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 30);
    return d;
  }, [today]);
  const [selectedDate, setSelectedDate] = useState<Date>(
    saved?.selectedDate ? new Date(saved.selectedDate) : today
  );
  const [selectedCourt, setSelectedCourt] = useState<string | null>(saved?.selectedCourt || null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>(saved?.selectedSlots || []);

  // Persist step to URL and all form data to sessionStorage
  const setStep = useCallback((newStep: number) => {
    setStepState(newStep);
    const params = new URLSearchParams(window.location.search);
    params.set("step", String(newStep));
    router.replace(`/booking?${params.toString()}`, { scroll: false });
  }, [router]);

  // Save form state to sessionStorage on every change
  useEffect(() => {
    const data = {
      step,
      name,
      email,
      phone,
      selectedDate: selectedDate.toISOString(),
      selectedCourt,
      selectedSlots,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [step, name, email, phone, selectedDate, selectedCourt, selectedSlots]);

  // Render Turnstile widget when confirmation modal opens
  useEffect(() => {
    if (!showConfirmModal || !TURNSTILE_SITE_KEY) return;

    // Reset token when modal opens
    setTurnstileToken(null);

    const renderWidget = () => {
      if (!window.turnstile || !turnstileContainerRef.current) return;
      // Remove previous widget if any
      if (turnstileWidgetId.current) {
        try { window.turnstile.remove(turnstileWidgetId.current); } catch {}
        turnstileWidgetId.current = null;
      }
      turnstileWidgetId.current = window.turnstile.render(
        turnstileContainerRef.current,
        {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(null),
          "error-callback": () => setTurnstileToken(null),
          theme: "light",
          size: "normal",
        }
      );
    };

    // Turnstile script may not be loaded yet — poll briefly
    if (window.turnstile) {
      // Small delay to ensure the container ref is mounted
      const t = setTimeout(renderWidget, 100);
      return () => clearTimeout(t);
    } else {
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [showConfirmModal, TURNSTILE_SITE_KEY]);

  const court = courts.find((c) => c.id === selectedCourt);

  // Get day of week for selected date (0=Sunday)
  const selectedDayOfWeek = selectedDate.getDay();

  // Get schedule for selected court + day
  const courtSchedule = useMemo(() => {
    if (!court?.court_schedules) return null;
    const sched = court.court_schedules.find((s) => s.day_of_week === selectedDayOfWeek);
    if (!sched || sched.is_closed) return null;
    return sched;
  }, [court, selectedDayOfWeek]);

  // Fetch existing reservations for selected court + date
  const dateStr = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [selectedDate]);
  const { data: existingReservations = [], isFetching: isFetchingSlots } = useQuery<
    { start_time: string; end_time: string; status: string }[]
  >({
    queryKey: ["slot-availability", selectedCourt, dateStr],
    queryFn: async () => {
      if (!selectedCourt) return [];
      const res = await fetch(
        `/api/reservations?court_id=${selectedCourt}&date=${dateStr}&fields=start_time,end_time,status`
      );
      if (!res.ok) return [];
      const json = await res.json();
      // API returns { data: [...] } with pagination
      return (json.data || []).filter(
        (r: { status: string }) => r.status !== "cancelled"
      );
    },
    enabled: !!selectedCourt,
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch blocked slots for selected court + date
  const { data: blockedSlots = [] } = useQuery<
    { id: string; court_id: string | null; start_time: string | null; end_time: string | null }[]
  >({
    queryKey: ["blocked-slots-booking", selectedCourt, dateStr],
    queryFn: async () => {
      if (!selectedCourt) return [];
      const res = await fetch(
        `/api/blocked-slots?date=${dateStr}&court_id=${selectedCourt}`
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedCourt,
    staleTime: 0,
    gcTime: 0,
  });

  // Check if the entire day is blocked for this court
  const isDayBlocked = useMemo(() => {
    return blockedSlots.some((b) => !b.start_time && !b.end_time);
  }, [blockedSlots]);

  // Map each time slot hour to its reservation status
  const slotStatusMap = useMemo(() => {
    const map: Record<string, "booked" | "pending" | "blocked"> = {};

    // Mark blocked time-range slots
    for (const b of blockedSlots) {
      if (!b.start_time || !b.end_time) continue; // entire-day blocks handled by isDayBlocked
      const startH = parseInt(b.start_time.split(":")[0], 10);
      let endH = parseInt(b.end_time.split(":")[0], 10);
      if (endH <= startH) endH += 24;
      for (let h = startH; h < endH; h++) {
        const displayHour = h % 24;
        const hour12 = displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour;
        const ampm = displayHour < 12 ? "AM" : "PM";
        map[`${hour12}:00 ${ampm}`] = "blocked";
      }
    }

    for (const r of existingReservations) {
      // start_time/end_time are like "06:00:00" or "6:00 AM" from the view
      const startH = parseInt(r.start_time.split(":")[0], 10);
      let endH = parseInt(r.end_time.split(":")[0], 10);
      if (endH <= startH) endH += 24;
      for (let h = startH; h < endH; h++) {
        const displayHour = h % 24;
        const hour12 = displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour;
        const ampm = displayHour < 12 ? "AM" : "PM";
        const key = `${hour12}:00 ${ampm}`;
        // "confirmed" or "completed" = booked, "pending" = pending
        if (!map[key]) {
          map[key] = r.status === "confirmed" || r.status === "completed" ? "booked" : "pending";
        }
      }
    }
    return map;
  }, [existingReservations, blockedSlots]);

  // Generate time slots from schedule
  const timeSlots = useMemo(() => {
    if (!courtSchedule) return [];
    return generateTimeSlots(courtSchedule.open_time, courtSchedule.close_time);
  }, [courtSchedule]);

  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const breakdown = useMemo(() => {
    if (!court) return [];
    return selectedSlots.map((t) => ({
      time: t,
      rate: getSlotRate(t, courtSchedule?.hourly_rates, court.price_per_hour),
    }));
  }, [court, courtSchedule, selectedSlots]);

  const total = breakdown.reduce((sum, b) => sum + b.rate, 0);

  const toggleSlot = (t: string) => {
    setSelectedSlots((prev) =>
      prev.includes(t) ? prev.filter((s) => s !== t) : [...prev, t]
    );
  };

  // Clear selected slots when court or date changes
  const handleCourtChange = (courtId: string) => {
    setSelectedCourt(courtId);
    setSelectedSlots([]);
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlots([]);
  };

  const step1Valid = name.trim() !== "" && email.trim() !== "" && phone.trim() !== "";
  const step2Valid = selectedCourt !== null && selectedSlots.length > 0;

  // Parse selected slots into start_time/end_time for the API
  const parsedTimeRange = useMemo(() => {
    if (!selectedSlots.length) return null;
    const parse12 = (t: string) => {
      const [timePart, ampm] = t.split(" ");
      let [h] = timePart.split(":").map(Number);
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return h;
    };
    const hours = selectedSlots.map(parse12).sort((a, b) => a - b);
    const startH = hours[0];
    const endH = hours[hours.length - 1] + 1;
    return {
      start_time: `${String(startH).padStart(2, "0")}:00:00`,
      end_time: `${String(endH).padStart(2, "0")}:00:00`,
    };
  }, [selectedSlots]);

  async function handleConfirmBooking() {
    if (!court || !parsedTimeRange) return;
    const y = selectedDate.getFullYear();
    const mo = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const dy = String(selectedDate.getDate()).padStart(2, "0");
    const dateStr = `${y}-${mo}-${dy}`;
    createReservation.mutate(
      {
        court_id: court.id,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        date: dateStr,
        start_time: parsedTimeRange.start_time,
        end_time: parsedTimeRange.end_time,
        ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
      },
      {
        onSuccess: async (data) => {
          setShowConfirmModal(false);
          setReservationId(data.id);
          setBookingConfirmed(true);
          sessionStorage.removeItem(STORAGE_KEY);
          // Upload receipt if user attached one
          if (receiptFile) {
            await uploadReceiptToServer(data.id);
          }
        },
      }
    );
  }

  // Store the receipt file to upload after booking is confirmed
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    // Show a local preview immediately
    const url = URL.createObjectURL(file);
    setReceiptUrl(url);
    if (receiptInputRef.current) receiptInputRef.current.value = "";
  }

  // Upload receipt to server after reservation is created
  async function uploadReceiptToServer(resId: string) {
    if (!receiptFile) return;
    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("file", receiptFile);
      formData.append("reservation_id", resId);
      const res = await fetch("/api/payment-receipts", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        console.error("Receipt upload failed:", err.error);
      } else {
        const data = await res.json();
        setReceiptUrl(data.image_url);
      }
    } catch {
      console.error("Receipt upload failed");
    }
    setUploadingReceipt(false);
  }

  // Colors
  const bg = "#182916";
  const accent = "#d3e9cb";
  const accentDim = "#b7cdb0";
  const surface = "#f5f4ed";

  const courtTypeLabel = (c: Court) => c.court_type === "indoor" ? "Covered" : "Outdoor";

  return (
    <div className="min-h-svh relative" style={{ backgroundColor: surface }}>
      {/* ── Background CurvedLoop (desktop) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-[0.06]">
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

      {/* ── Background Marquee (mobile) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-[0.04] md:hidden">
        {[
          { top: "10%", dir: "left" as const, text: "✦ BOOK NOW ✦ VELOCITY ✦ BOOK NOW ✦ VELOCITY " },
          { top: "35%", dir: "right" as const, text: "PICKLEBALL HUB — RESERVE YOUR COURT — " },
          { top: "60%", dir: "left" as const, text: "✦ BOOK NOW ✦ VELOCITY ✦ BOOK NOW ✦ VELOCITY " },
          { top: "85%", dir: "right" as const, text: "PICKLEBALL HUB — RESERVE YOUR COURT — " },
        ].map((row, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 whitespace-nowrap overflow-hidden"
            style={{ top: row.top }}
          >
            <div
              className="inline-block animate-[marquee_20s_linear_infinite]"
              style={{ animationDirection: row.dir === "right" ? "reverse" : "normal" }}
            >
              <span
                className="font-['Clash_Display'] font-black uppercase tracking-[0.3em] text-3xl"
                style={{ color: bg }}
              >
                {row.text.repeat(6)}
              </span>
            </div>
          </div>
        ))}
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

      {/* ── Booking Policy ── */}
      <div className="relative z-10 w-full" style={{ backgroundColor: "#182916" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-3 sm:py-4 flex items-start sm:items-center gap-3 sm:gap-4">
          <div className="shrink-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full mt-0.5 sm:mt-0" style={{ backgroundColor: "#ff4d4d18", border: "1px solid #ff4d4d40" }}>
            <span className="material-symbols-outlined text-sm sm:text-base" style={{ color: "#ff6b6b", fontVariationSettings: "'FILL' 1" }}>warning</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-['Clash_Display'] text-[10px] font-extrabold uppercase tracking-[0.2em] mr-2" style={{ color: "#ff6b6b" }}>No Cancellation Policy</span>
            <span className="font-[Poppins] text-[11px] sm:text-xs leading-relaxed" style={{ color: "#d3e9cb99" }}>
              Once confirmed, no cancellations or refunds. Can&apos;t make it? Find someone to take your slot and settle payment directly.
            </span>
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10">
        {isLoading ? (
          <LoadingPage message="Loading courts..." />
        ) : (
        <AnimatePresence mode="wait">
          {/* ═══ STEP 1 ═══ */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.35, ease }}>
              <div className="bg-white rounded-2xl p-5 sm:p-8 md:p-10 max-w-2xl shadow-sm" style={{ border: `1px solid ${bg}08` }}>
                <h2 className="font-['Clash_Display'] text-lg sm:text-xl font-bold mb-1" style={{ color: bg }}>Your Information</h2>
                <p className="font-[Poppins] text-xs sm:text-sm mb-6 sm:mb-8" style={{ color: `${bg}66` }}>
                  No account needed. We&apos;ll use this to send your booking confirmation.
                </p>
                <div className="rounded-xl px-4 py-3 mb-6 sm:mb-8 flex items-start gap-2.5" style={{ backgroundColor: "#fff8e6", border: "1px solid #f59e0b40" }}>
                  <span className="material-symbols-outlined text-base mt-0.5 shrink-0" style={{ color: "#f59e0b", fontVariationSettings: "'FILL' 1, 'wght' 500" }}>info</span>
                  <p className="font-[Poppins] text-[11px] sm:text-xs font-semibold leading-relaxed" style={{ color: "#92400e" }}>
                    Please ensure your email and phone number are <strong style={{ color: "#b45309" }}>correct and reachable</strong>. We may contact you for booking updates, schedule changes, or payment issues.
                  </p>
                </div>

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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* ── Left: Date & Court selection ── */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                  {/* Date picker card */}
                  <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm" style={{ border: `1px solid ${bg}08` }}>
                    <label className="font-[Poppins] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: `${bg}80` }}>
                      <span className="material-symbols-outlined text-sm align-middle mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
                      Select Date
                    </label>
                    <div className="rounded-xl overflow-hidden inline-block max-w-full" style={{ border: `1px solid ${bg}0d` }}>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && handleDateChange(date)}
                        disabled={{ before: today, after: maxDate }}
                        className="bg-white"
                      />
                    </div>
                    <p className="font-[Poppins] text-[10px] sm:text-[11px] mt-3" style={{ color: `${bg}40` }}>
                      Selected: <span className="font-semibold" style={{ color: `${bg}99` }}>{formattedDate}</span>
                    </p>
                  </div>

                  {/* Court selector card */}
                  <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm" style={{ border: `1px solid ${bg}08` }}>
                    <label className="font-[Poppins] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-4 block" style={{ color: `${bg}80` }}>
                      <span className="material-symbols-outlined text-sm align-middle mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>sports_tennis</span>
                      Choose Your Court
                    </label>
                    {courts.length === 0 ? (
                      <p className="font-[Poppins] text-sm" style={{ color: `${bg}40` }}>No courts available at the moment.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {courts.map((c) => {
                          const active = selectedCourt === c.id;
                          const daySched = c.court_schedules?.find((s) => s.day_of_week === selectedDayOfWeek);
                          const isOpenToday = daySched && !daySched.is_closed;
                          return (
                            <button
                              key={c.id}
                              onClick={() => isOpenToday && handleCourtChange(c.id)}
                              disabled={!isOpenToday}
                              className="relative overflow-hidden rounded-2xl p-4 sm:p-5 text-left transition-all"
                              style={{
                                backgroundColor: !isOpenToday ? `${bg}03` : active ? bg : "white",
                                color: !isOpenToday ? `${bg}20` : active ? "white" : bg,
                                border: `${active ? "2px" : "1px"} solid ${!isOpenToday ? `${bg}06` : active ? bg : `${bg}0d`}`,
                                cursor: isOpenToday ? "pointer" : "not-allowed",
                              }}
                            >
                              {/* Court type icon */}
                              <span
                                className="material-symbols-outlined text-xl sm:text-2xl mb-2 block"
                                style={{ color: !isOpenToday ? `${bg}15` : active ? accent : `${bg}30`, fontVariationSettings: "'FILL' 1" }}
                              >
                                {c.court_type === "indoor" ? "roofing" : "park"}
                              </span>

                              {/* Court name */}
                              <p className="font-['Clash_Display'] text-base sm:text-lg font-bold leading-tight">{c.name}</p>

                              {/* Type label */}
                              <p className="text-[9px] sm:text-[10px] font-[Poppins] font-semibold uppercase tracking-wider mt-0.5" style={{ opacity: isOpenToday ? 0.5 : 0.2 }}>
                                {isOpenToday ? courtTypeLabel(c) : "Closed today"}
                              </p>

                              {/* Price — prominent */}
                              {isOpenToday && (
                                <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${active ? "rgba(255,255,255,0.15)" : `${bg}0a`}` }}>
                                  <p className="font-['Clash_Display'] text-xl sm:text-2xl font-bold leading-none" style={{ color: active ? accent : bg }}>
                                    {formatCurrency(c.price_per_hour)}
                                  </p>
                                  <p className="text-[9px] font-[Poppins] font-medium uppercase tracking-wider mt-0.5" style={{ color: active ? "rgba(255,255,255,0.7)" : `${bg}80` }}>
                                    per hour
                                  </p>
                                </div>
                              )}

                              {/* Active check indicator */}
                              {active && (
                                <div className="absolute top-3 right-3">
                                  <span className="material-symbols-outlined text-base" style={{ color: accent, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Right: Time slots + summary sidebar ── */}
                <div className="space-y-4 sm:space-y-6">
                  {/* Time slots card */}
                  <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm" style={{ border: `1px solid ${bg}08` }}>
                    <div className="flex items-center justify-between mb-4">
                      <label className="font-[Poppins] text-[10px] sm:text-xs font-semibold uppercase tracking-wider" style={{ color: `${bg}80` }}>
                        <span className="material-symbols-outlined text-sm align-middle mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                        Time Slots
                      </label>
                      {selectedSlots.length > 0 && (
                        <button onClick={() => setSelectedSlots([])} className="font-[Poppins] text-[10px] uppercase tracking-wider text-red-400 hover:text-red-500 font-semibold transition-colors">
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Schedule info bar */}
                    {selectedCourt && court && courtSchedule && (
                      <div className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: `${bg}05` }}>
                        <span className="material-symbols-outlined text-sm" style={{ color: `${bg}40` }}>schedule</span>
                        <span className="font-[Poppins] text-[11px] font-medium" style={{ color: `${bg}60` }}>
                          {formatTime12(courtSchedule.open_time)} – {formatTime12(courtSchedule.close_time)}
                        </span>
                      </div>
                    )}

                    {!selectedCourt ? (
                      <div className="flex flex-col items-center py-10">
                        <span className="material-symbols-outlined text-3xl mb-2" style={{ color: `${bg}15`, fontVariationSettings: "'FILL' 0, 'wght' 300" }}>touch_app</span>
                        <p className="font-[Poppins] text-xs text-center" style={{ color: `${bg}30` }}>
                          Select a court to see<br />available time slots
                        </p>
                      </div>
                    ) : !courtSchedule ? (
                      <div className="flex flex-col items-center py-10">
                        <span className="material-symbols-outlined text-3xl mb-2" style={{ color: `${bg}15`, fontVariationSettings: "'FILL' 0, 'wght' 300" }}>event_busy</span>
                        <p className="font-[Poppins] text-xs text-center" style={{ color: `${bg}30` }}>
                          Closed on {selectedDate.toLocaleDateString("en-US", { weekday: "long" })}
                        </p>
                      </div>
                    ) : isDayBlocked ? (
                      <div className="flex flex-col items-center py-10">
                        <span className="material-symbols-outlined text-3xl mb-2" style={{ color: `${bg}15`, fontVariationSettings: "'FILL' 0, 'wght' 300" }}>block</span>
                        <p className="font-[Poppins] text-xs text-center" style={{ color: `${bg}30` }}>
                          This day is unavailable for booking
                        </p>
                      </div>
                    ) : timeSlots.length === 0 ? (
                      <p className="font-[Poppins] text-xs py-8 text-center" style={{ color: `${bg}30` }}>
                        No time slots available
                      </p>
                    ) : isFetchingSlots ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: `${bg}20`, borderTopColor: bg }} />
                        <p className="font-[Poppins] text-xs font-medium" style={{ color: `${bg}50` }}>
                          Checking availability...
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {timeSlots.map((t) => {
                          const isSelected = selectedSlots.includes(t);
                          const slotStatus = slotStatusMap[t]; // "booked" | "pending" | undefined
                          const isUnavailable = !!slotStatus;
                          return (
                            <button
                              key={t}
                              onClick={() => !isUnavailable && toggleSlot(t)}
                              disabled={isUnavailable}
                              className="py-3 px-3 rounded-xl text-center transition-all active:scale-[0.97] relative"
                              style={{
                                backgroundColor: isUnavailable
                                  ? `${bg}04`
                                  : isSelected ? bg : "white",
                                color: isUnavailable
                                  ? `${bg}25`
                                  : isSelected ? "white" : `${bg}b3`,
                                border: `1px solid ${isUnavailable ? `${bg}08` : isSelected ? bg : `${bg}0d`}`,
                                cursor: isUnavailable ? "not-allowed" : "pointer",
                              }}
                            >
                              <span
                                className="block text-xs sm:text-sm font-bold font-[Poppins]"
                                style={{ textDecoration: isUnavailable ? "line-through" : "none" }}
                              >
                                {t}
                              </span>
                              {isUnavailable ? (
                                <span
                                  className="block text-[10px] font-[Poppins] font-bold mt-0.5 uppercase tracking-wider"
                                  style={{ color: slotStatus === "pending" ? "#c97d00" : slotStatus === "blocked" ? "#666" : "#c44" }}
                                >
                                  {slotStatus === "pending" ? "Pending" : slotStatus === "blocked" ? "Blocked" : "Booked"}
                                </span>
                              ) : (
                                <span className="block text-[10px] font-[Poppins] font-semibold mt-0.5" style={{ color: isSelected ? "rgba(255,255,255,0.75)" : `${bg}66` }}>
                                  {formatCurrency(getSlotRate(t, courtSchedule?.hourly_rates, court!.price_per_hour))}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Running total card */}
                  {selectedSlots.length > 0 && court && (
                    <div className="rounded-2xl p-5 sm:p-6 relative overflow-hidden" style={{ backgroundColor: bg }}>
                      <div className="absolute inset-0 grain-overlay opacity-15 pointer-events-none" />
                      <div className="relative z-10">
                        <p className="font-[Poppins] text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: `${accentDim}80` }}>
                          {court.name} · {selectedSlots.length} hr{selectedSlots.length > 1 ? "s" : ""}
                        </p>
                        <p className="font-['Clash_Display'] text-3xl font-bold text-white">
                          {formatCurrency(total)}
                        </p>
                        <p className="font-[Poppins] text-[10px] mt-1" style={{ color: `${accentDim}60` }}>
                          {formattedDate}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Navigation buttons */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => step2Valid && setStep(3)}
                      disabled={!step2Valid}
                      className="w-full px-8 py-3.5 rounded-xl font-[Poppins] font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                      style={{
                        backgroundColor: step2Valid ? bg : `${bg}0a`,
                        color: step2Valid ? "white" : `${bg}30`,
                        cursor: step2Valid ? "pointer" : "not-allowed",
                      }}
                    >
                      Review Booking
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </button>
                    <button
                      onClick={() => setStep(1)}
                      className="w-full px-6 py-3 rounded-xl font-[Poppins] font-semibold text-sm transition-all flex items-center justify-center gap-2"
                      style={{ border: `1px solid ${bg}0d`, color: `${bg}80` }}
                    >
                      <span className="material-symbols-outlined text-base">arrow_back</span>
                      Back
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 3 ═══ */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.35, ease }}>
              {bookingConfirmed ? (
                /* ── Post-confirmation: Receipt-style card ── */
                <div className="mx-auto max-w-md">
                  {/* Receipt card with torn-edge effect */}
                  <div className="relative">
                    {/* Top zigzag edge */}
                    <div className="h-4 overflow-hidden">
                      <svg viewBox="0 0 400 16" preserveAspectRatio="none" className="w-full h-4" style={{ color: 'white' }}>
                        {Array.from({ length: 20 }).map((_, i) => (
                          <circle key={i} cx={i * 20 + 10} cy="16" r="8" fill={surface} />
                        ))}
                        <rect x="0" y="0" width="400" height="16" fill="white" />
                        {Array.from({ length: 20 }).map((_, i) => (
                          <circle key={`b${i}`} cx={i * 20 + 10} cy="16" r="8" fill={surface} />
                        ))}
                      </svg>
                    </div>

                    <div className="bg-white px-6 sm:px-8" style={{ border: `1px solid ${bg}06`, borderTop: 'none', borderBottom: 'none' }}>
                      {/* Header */}
                      <div className="text-center pt-6 pb-5" style={{ borderBottom: `1px dashed ${bg}15` }}>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-3" style={{ backgroundColor: `${accent}50` }}>
                          <span className="material-symbols-outlined text-2xl" style={{ color: bg, fontVariationSettings: "'FILL' 1" }}>check</span>
                        </div>
                        <h2 className="font-['Clash_Display'] text-lg sm:text-xl font-bold" style={{ color: bg }}>Booking Submitted</h2>
                        <p className="font-[Poppins] text-[11px] mt-1" style={{ color: `${bg}60` }}>
                          {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>

                      {/* Booking details */}
                      <div className="py-5 space-y-3" style={{ borderBottom: `1px dashed ${bg}15` }}>
                        <div className="flex justify-between items-start">
                          <span className="font-[Poppins] text-[10px] font-semibold uppercase tracking-wider" style={{ color: `${bg}50` }}>Customer</span>
                          <div className="text-right">
                            <p className="font-[Poppins] text-sm font-semibold" style={{ color: bg }}>{name}</p>
                            <p className="font-[Poppins] text-[11px]" style={{ color: `${bg}60` }}>{email}</p>
                            <p className="font-[Poppins] text-[11px]" style={{ color: `${bg}60` }}>{phone}</p>
                          </div>
                        </div>

                        <div className="flex justify-between">
                          <span className="font-[Poppins] text-[10px] font-semibold uppercase tracking-wider" style={{ color: `${bg}50` }}>Court</span>
                          <span className="font-[Poppins] text-sm font-semibold" style={{ color: bg }}>{court?.name}</span>
                        </div>

                        <div className="flex justify-between">
                          <span className="font-[Poppins] text-[10px] font-semibold uppercase tracking-wider" style={{ color: `${bg}50` }}>Date</span>
                          <span className="font-[Poppins] text-sm font-medium" style={{ color: bg }}>
                            {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          </span>
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() => setShowSlots((v) => !v)}
                            className="flex w-full justify-between items-center"
                          >
                            <span className="font-[Poppins] text-[10px] font-semibold uppercase tracking-wider" style={{ color: `${bg}50` }}>Time</span>
                            <span className="flex items-center gap-1 font-[Poppins] text-sm font-medium" style={{ color: bg }}>
                              {selectedSlots.length} slot{selectedSlots.length > 1 ? "s" : ""}
                              <span
                                className="material-symbols-outlined text-[14px] transition-transform"
                                style={{ color: `${bg}50`, transform: showSlots ? "rotate(180deg)" : "rotate(0deg)" }}
                              >
                                expand_more
                              </span>
                            </span>
                          </button>
                          {showSlots && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {selectedSlots.map((slot) => (
                                <span
                                  key={slot}
                                  className="rounded-md px-2 py-1 font-[Poppins] text-[10px] font-semibold"
                                  style={{ backgroundColor: `${accent}50`, color: bg }}
                                >
                                  {slot}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between">
                          <span className="font-[Poppins] text-[10px] font-semibold uppercase tracking-wider" style={{ color: `${bg}50` }}>Rate</span>
                          <span className="font-[Poppins] text-sm font-medium" style={{ color: bg }}>{court ? formatCurrency(court.price_per_hour) : ""}/hr</span>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="py-4 flex justify-between items-center" style={{ borderBottom: `1px dashed ${bg}15` }}>
                        <span className="font-['Clash_Display'] text-base font-bold" style={{ color: bg }}>Total</span>
                        <span className="font-['Clash_Display'] text-2xl font-bold" style={{ color: bg }}>{formatCurrency(total)}</span>
                      </div>

                      {/* Receipt image */}
                      {receiptUrl && (
                        <div className="py-4" style={{ borderBottom: `1px dashed ${bg}15` }}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="material-symbols-outlined text-[14px]" style={{ color: `${bg}50`, fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                            <span className="font-[Poppins] text-[10px] font-semibold uppercase tracking-wider" style={{ color: `${bg}50` }}>Payment Receipt</span>
                            <div className="ml-auto flex items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: `${accent}80` }}>
                              <span className="material-symbols-outlined text-[10px]" style={{ color: bg, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                              <span className="font-[Poppins] text-[9px] font-bold" style={{ color: bg }}>Attached</span>
                            </div>
                          </div>
                          <div className="rounded-lg overflow-hidden border" style={{ borderColor: `${bg}10` }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={receiptUrl} alt="Receipt" className="w-full max-h-36 object-contain bg-white" />
                          </div>
                        </div>
                      )}

                      {/* Status notice */}
                      <div className="py-5">
                        <div className="flex gap-3 rounded-xl p-3.5" style={{ backgroundColor: `${accent}30` }}>
                          <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5" style={{ color: bg, fontVariationSettings: "'FILL' 0, 'wght' 400" }}>info</span>
                          <div>
                            <p className="font-[Poppins] text-[11px] font-semibold leading-relaxed" style={{ color: bg }}>
                              Pending Verification
                            </p>
                            <p className="font-[Poppins] text-[10px] leading-relaxed mt-0.5" style={{ color: `${bg}80` }}>
                              Our team will verify your booking and payment details. You&apos;ll receive a confirmation at <strong>{email}</strong> once approved. This usually takes a few minutes.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom zigzag edge */}
                    <div className="h-4 overflow-hidden">
                      <svg viewBox="0 0 400 16" preserveAspectRatio="none" className="w-full h-4" style={{ color: 'white' }}>
                        <rect x="0" y="0" width="400" height="16" fill="white" />
                        {Array.from({ length: 20 }).map((_, i) => (
                          <circle key={i} cx={i * 20 + 10} cy="0" r="8" fill={surface} />
                        ))}
                      </svg>
                    </div>
                  </div>

                  {/* Back to home */}
                  <div className="text-center mt-6">
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 font-[Poppins] font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.98] shadow-sm"
                      style={{ backgroundColor: bg, color: accent }}
                    >
                      <span className="material-symbols-outlined text-[16px]">home</span>
                      Back to Home
                    </Link>
                  </div>
                </div>
              ) : (
                /* ── Pre-confirmation: summary + QR codes + receipt upload + confirm ── */
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-8">
                  {/* Action card — on mobile show first */}
                  <div className="lg:col-span-2 lg:order-2 space-y-4 sm:space-y-6">
                    {/* Payment QR Codes */}
                    {paymentQrCodes.length > 0 && (
                      <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm" style={{ border: `1px solid ${bg}08` }}>
                        <h3 className="font-[Poppins] text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: `${bg}60` }}>
                          Scan to Pay
                        </h3>

                        {/* QR type tabs */}
                        {paymentQrCodes.length > 1 && (
                          <div className="flex gap-1.5 mb-4 overflow-x-auto">
                            {paymentQrCodes.map((qr, i) => (
                              <button
                                key={qr.id}
                                onClick={() => setSelectedQrIndex(i)}
                                className="shrink-0 rounded-lg px-3 py-1.5 font-[Poppins] text-[10px] font-bold uppercase tracking-wider transition-all"
                                style={{
                                  backgroundColor: selectedQrIndex === i ? bg : `${bg}08`,
                                  color: selectedQrIndex === i ? accent : `${bg}80`,
                                }}
                              >
                                {qr.name}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* QR image */}
                        <button
                          type="button"
                          onClick={() => setQrLightbox(true)}
                          className="w-full flex justify-center rounded-xl bg-white p-4 border cursor-zoom-in transition-shadow hover:shadow-md"
                          style={{ borderColor: `${bg}10` }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={paymentQrCodes[selectedQrIndex]?.image_url}
                            alt={paymentQrCodes[selectedQrIndex]?.name}
                            className="h-64 w-64 sm:h-72 sm:w-72 object-contain"
                          />
                        </button>
                        <p className="mt-3 text-center font-[Poppins] text-[10px] font-semibold uppercase tracking-wider" style={{ color: `${bg}60` }}>
                          {paymentQrCodes[selectedQrIndex]?.name}
                          <span className="block mt-1 text-[9px] font-normal" style={{ color: `${bg}30` }}>Tap to enlarge</span>
                        </p>
                      </div>
                    )}

                    {/* QR Lightbox */}
                    {qrLightbox && paymentQrCodes[selectedQrIndex] && createPortal(
                      <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                        onClick={() => setQrLightbox(false)}
                      >
                        <div
                          className="flex flex-col items-center p-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={paymentQrCodes[selectedQrIndex].image_url}
                            alt={paymentQrCodes[selectedQrIndex].name}
                            className="max-h-[80vh] max-w-[90vw] rounded-xl object-contain bg-white p-4"
                          />
                          <button
                            onClick={() => setQrLightbox(false)}
                            className="mt-4 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-[Poppins] text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            Close
                          </button>
                        </div>
                      </div>,
                      document.body
                    )}

                    {/* Receipt upload */}
                    <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm" style={{ border: `1px solid ${bg}08` }}>
                      <h3 className="font-[Poppins] text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: `${bg}60` }}>
                        Upload Payment Receipt
                      </h3>
                      <p className="font-[Poppins] text-[11px] mb-4" style={{ color: `${bg}40` }}>
                        After paying, upload a screenshot as proof of payment.
                      </p>

                      <input
                        ref={receiptInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleReceiptUpload}
                        disabled={uploadingReceipt}
                        className="hidden"
                      />

                      {receiptUrl ? (
                        <div className="space-y-3">
                          <div className="relative rounded-xl overflow-hidden border" style={{ borderColor: `${bg}15` }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={receiptUrl} alt="Receipt" className="w-full max-h-48 object-contain bg-white" />
                            <div className="absolute top-2 right-2 flex h-7 items-center gap-1 rounded-full px-2.5" style={{ backgroundColor: `${accent}e0` }}>
                              <span className="material-symbols-outlined text-[14px]" style={{ color: bg, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                              <span className="font-[Poppins] text-[10px] font-bold" style={{ color: bg }}>Uploaded</span>
                            </div>
                          </div>
                          <button
                            onClick={() => receiptInputRef.current?.click()}
                            disabled={uploadingReceipt}
                            className="font-[Poppins] text-xs font-semibold underline"
                            style={{ color: `${bg}80` }}
                          >
                            Replace receipt
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => receiptInputRef.current?.click()}
                          disabled={uploadingReceipt}
                          className="w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed py-8 transition-all hover:bg-white/80"
                          style={{ borderColor: `${bg}15`, backgroundColor: `${surface}` }}
                        >
                          {uploadingReceipt ? (
                            <>
                              <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: `${bg}20`, borderTopColor: bg }} />
                              <span className="font-[Poppins] text-xs font-semibold" style={{ color: bg }}>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-2xl" style={{ color: `${bg}30`, fontVariationSettings: "'FILL' 0, 'wght' 300" }}>cloud_upload</span>
                              <span className="font-[Poppins] text-xs font-semibold" style={{ color: `${bg}60` }}>Tap to upload receipt</span>
                              <span className="font-[Poppins] text-[10px]" style={{ color: `${bg}30` }}>JPEG, PNG, WebP — max 10MB</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Total + confirm */}
                    <div className="rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden" style={{ backgroundColor: bg }}>
                      <div className="absolute inset-0 grain-overlay opacity-15 pointer-events-none" />
                      <div className="relative z-10">
                        <span className="material-symbols-outlined text-3xl sm:text-4xl mb-3 sm:mb-4 block" style={{ color: accent, fontVariationSettings: "'FILL' 1" }}>
                          sports_tennis
                        </span>
                        <p className="font-['Clash_Display'] text-2xl sm:text-3xl font-bold text-white mb-1">
                          {formatCurrency(total)}
                        </p>
                        <p className="font-[Poppins] text-[10px] sm:text-xs uppercase tracking-wider font-semibold mb-6 sm:mb-8" style={{ color: `${accentDim}80` }}>
                          {selectedSlots.length} slot{selectedSlots.length > 1 ? "s" : ""} · {court?.name}
                        </p>

                        <button
                          onClick={() => setShowConfirmModal(true)}
                          disabled={createReservation.isPending || !receiptFile}
                          className="w-full py-3.5 sm:py-4 rounded-xl font-[Poppins] font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                          style={{ backgroundColor: accent, color: bg }}
                        >
                          {createReservation.isPending ? "Confirming..." : "Confirm Reservation"}
                        </button>
                        {!receiptFile && (
                          <p className="mt-3 font-[Poppins] text-[11px] flex items-center justify-center gap-1.5" style={{ color: `${accentDim}90` }}>
                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>upload_file</span>
                            Please upload your payment receipt above to confirm
                          </p>
                        )}

                        {createReservation.isError && (
                          <p className="mt-3 font-[Poppins] text-xs text-red-300">
                            {createReservation.error?.message || "Something went wrong"}
                          </p>
                        )}
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
                          <span style={{ color: `${bg}99` }}>Court</span>
                          <span className="font-medium text-xs sm:text-sm" style={{ color: bg }}>{court?.name} ({court ? courtTypeLabel(court) : ""})</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: `${bg}99` }}>Rate</span>
                          <span className="font-medium text-xs sm:text-sm" style={{ color: bg }}>{court ? formatCurrency(court.price_per_hour) : ""}/hr</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: `${bg}99` }}>Slots</span>
                          <span className="font-medium text-xs sm:text-sm" style={{ color: bg }}>{selectedSlots.length} hr{selectedSlots.length > 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 sm:mb-6">
                      <h3 className="font-[Poppins] text-[10px] font-bold uppercase tracking-[0.2em] mb-2 sm:mb-3" style={{ color: `${bg}80` }}>Payment Breakdown</h3>
                      <div style={{ borderColor: `${bg}0a` }}>
                        {breakdown.map((b) => (
                          <div key={b.time} className="flex justify-between py-2.5 sm:py-3 text-xs sm:text-sm font-[Poppins]" style={{ borderBottom: `1px solid ${bg}0a` }}>
                            <span style={{ color: `${bg}b3` }}>{b.time}</span>
                            <span className="font-semibold" style={{ color: bg }}>{formatCurrency(b.rate)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between pt-3 sm:pt-4 mt-2" style={{ borderTop: `2px solid ${bg}20` }}>
                        <span className="font-['Clash_Display'] text-base sm:text-lg font-bold" style={{ color: bg }}>Total</span>
                        <span className="font-['Clash_Display'] text-xl sm:text-2xl font-bold" style={{ color: bg }}>{formatCurrency(total)}</span>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>

      {/* ── Confirmation Modal ── */}
      <AnimatePresence>
        {showConfirmModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
              onClick={() => !createReservation.isPending && setShowConfirmModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
                style={{ border: `1px solid ${bg}08` }}
              >
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: `${bg}0a` }}>
                    <span className="material-symbols-outlined text-3xl" style={{ color: bg, fontVariationSettings: "'FILL' 0, 'wght' 300" }}>task_alt</span>
                  </div>
                </div>

                <h3 className="font-['Clash_Display'] text-lg font-bold text-center mb-1" style={{ color: bg }}>
                  Confirm Your Reservation?
                </h3>
                <p className="font-[Poppins] text-xs text-center mb-5" style={{ color: `${bg}60` }}>
                  Please review the details below before confirming.
                </p>

                {/* Summary */}
                <div className="rounded-xl p-4 space-y-2.5 mb-4" style={{ backgroundColor: surface }}>
                  <div className="flex justify-between font-[Poppins] text-xs">
                    <span style={{ color: `${bg}66` }}>Name</span>
                    <span className="font-semibold" style={{ color: bg }}>{name}</span>
                  </div>
                  <div className="flex justify-between font-[Poppins] text-xs">
                    <span style={{ color: `${bg}66` }}>Email</span>
                    <span className="font-semibold" style={{ color: bg }}>{email}</span>
                  </div>
                  <div className="flex justify-between font-[Poppins] text-xs">
                    <span style={{ color: `${bg}66` }}>Phone</span>
                    <span className="font-semibold" style={{ color: bg }}>{phone}</span>
                  </div>
                  <div className="border-t my-1" style={{ borderColor: `${bg}0a` }} />
                  <div className="flex justify-between font-[Poppins] text-xs">
                    <span style={{ color: `${bg}66` }}>Court</span>
                    <span className="font-semibold" style={{ color: bg }}>{court?.name}</span>
                  </div>
                  <div className="flex justify-between font-[Poppins] text-xs">
                    <span style={{ color: `${bg}66` }}>Date</span>
                    <span className="font-semibold" style={{ color: bg }}>{formattedDate}</span>
                  </div>
                  <div className="flex justify-between font-[Poppins] text-xs">
                    <span style={{ color: `${bg}66` }}>Slots</span>
                    <span className="font-semibold" style={{ color: bg }}>{selectedSlots.length} hr{selectedSlots.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="border-t my-1" style={{ borderColor: `${bg}0a` }} />
                  <div className="flex justify-between font-[Poppins] text-sm">
                    <span className="font-semibold" style={{ color: bg }}>Total</span>
                    <span className="font-['Clash_Display'] font-bold text-base" style={{ color: bg }}>{formatCurrency(total)}</span>
                  </div>
                </div>

                {/* Info note */}
                <div className="rounded-xl px-4 py-3 mb-5 flex items-start gap-2.5" style={{ backgroundColor: `${bg}06`, border: `1px solid ${bg}10` }}>
                  <span className="material-symbols-outlined text-base mt-0.5 shrink-0" style={{ color: `${bg}50`, fontVariationSettings: "'FILL' 0, 'wght' 300" }}>info</span>
                  <p className="font-[Poppins] text-[11px] leading-relaxed" style={{ color: `${bg}70` }}>
                    By confirming, you agree that your contact details are <strong style={{ color: `${bg}90` }}>correct and reachable</strong>. Your reservation will be reviewed and confirmed by our team.
                  </p>
                </div>

                {createReservation.isError && (
                  <div className="rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5 bg-red-50 border border-red-100">
                    <span className="material-symbols-outlined text-base mt-0.5 shrink-0 text-red-500" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>error</span>
                    <p className="font-[Poppins] text-[11px] leading-relaxed text-red-600">
                      {createReservation.error?.message || "Something went wrong. Please try again."}
                    </p>
                  </div>
                )}

                {/* Turnstile CAPTCHA */}
                {TURNSTILE_SITE_KEY && (
                  <div className="flex justify-center mb-4">
                    <div ref={turnstileContainerRef} />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    disabled={createReservation.isPending}
                    className="flex-1 py-3 rounded-xl font-[Poppins] font-semibold text-sm transition-all disabled:opacity-40"
                    style={{ border: `1px solid ${bg}12`, color: `${bg}80` }}
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => { handleConfirmBooking(); }}
                    disabled={createReservation.isPending || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
                    className="flex-1 py-3 rounded-xl font-[Poppins] font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{ backgroundColor: bg, color: "white" }}
                  >
                    {createReservation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Confirming...
                      </span>
                    ) : (
                      "Confirm"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Footer ── */}
      <BookingFooter bg={bg} surface={surface} />
    </div>
  );
}
