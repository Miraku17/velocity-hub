"use client";

import { Suspense, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { BookingFooter } from "./BookingFooter";
import { LoadingPage } from "@/components/ui/loading";
import { useCourts } from "@/lib/hooks/useCourts";
import { useBookingCart } from "@/lib/stores/bookingCartStore";
import { colors, ease, STEPS } from "./utils";
import { StepCustomerDetails } from "./components/StepCustomerDetails";
import { StepCourtGrid } from "./components/StepCourtGrid";
import { StepReviewConfirm } from "./components/StepReviewConfirm";

export default function BookingPageWrapper() {
  return (
    <Suspense fallback={<LoadingPage message="Loading..." />}>
      <BookingPage />
    </Suspense>
  );
}

function BookingPage() {
  const { isLoading } = useCourts({ status: "available" });
  const { step, setStep: setCartStep, items, customer } = useBookingCart();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Sync step from URL on mount, clamped to what the user has actually earned
  useEffect(() => {
    const customerFilled = !!(customer.name.trim() && customer.email.trim() && customer.phone.trim());
    const cartHasItems = items.length > 0;

    const maxValidStep = customerFilled && cartHasItems ? 3 : customerFilled ? 2 : 1;

    const urlStep = Number(searchParams.get("step"));
    const target = urlStep >= 1 && urlStep <= 3 ? urlStep : step;
    const clamped = Math.min(target, maxValidStep);

    if (clamped !== step) {
      setCartStep(clamped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStep = useCallback(
    (newStep: number) => {
      setCartStep(newStep);
      const params = new URLSearchParams(window.location.search);
      params.set("step", String(newStep));
      router.replace(`/booking?${params.toString()}`, { scroll: false });
    },
    [router, setCartStep]
  );

  const { bg, accent, accentDim, surface } = colors;

  return (
    <div className="min-h-svh relative" style={{ backgroundColor: surface }}>
      {/* Background Static Text */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-[0.04] md:opacity-[0.06]">
        {[
          { top: "8%", text: "✦ BOOK NOW ✦ BOOK NOW ✦ BOOK NOW ✦ BOOK NOW ✦ BOOK NOW ", tracking: "0.4em" },
          { top: "28%", text: "VELOCITY PICKLEBALL HUB — VELOCITY PICKLEBALL HUB — VELOCITY PICKLEBALL HUB — ", tracking: "0.5em" },
          { top: "48%", text: "✦ BOOK NOW ✦ VELOCITY ✦ BOOK NOW ✦ VELOCITY ✦ BOOK NOW ✦ VELOCITY ", tracking: "0.3em" },
          { top: "68%", text: "PICKLEBALL HUB — RESERVE YOUR COURT — PICKLEBALL HUB — RESERVE YOUR COURT — ", tracking: "0.4em" },
          { top: "85%", text: "✦ BOOK NOW ✦ BOOK NOW ✦ BOOK NOW ✦ BOOK NOW ✦ BOOK NOW ", tracking: "0.3em" },
        ].map((row, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 whitespace-nowrap overflow-hidden"
            style={{ top: row.top }}
          >
            <span
              className="font-['Clash_Display'] font-black uppercase text-3xl md:text-5xl"
              style={{ color: bg, letterSpacing: row.tracking }}
            >
              {row.text.repeat(4)}
            </span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ borderColor: `${bg}08`, backgroundColor: `${surface}ee`, backdropFilter: "blur(20px)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Velocity"
              width={50}
              height={50}
              className="w-auto h-10 group-hover:rotate-[-4deg] transition-transform"
            />
            <span className="font-['Clash_Display'] text-lg font-bold hidden sm:block" style={{ color: bg }}>
              Velocity
            </span>
          </Link>
          <Link
            href="/"
            className="font-[Poppins] text-xs flex items-center gap-1.5 transition-colors"
            style={{ color: `${bg}66` }}
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Home
          </Link>
        </div>
      </header>

      {/* Page Title */}
      <div className="relative z-10 overflow-hidden" style={{ backgroundColor: bg }}>
        <div className="absolute inset-0 grain-overlay opacity-15 pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-8 md:py-10 relative z-10">
          <div className="flex items-center gap-3 mb-2 sm:mb-3">
            <div className="w-6 sm:w-8 h-px" style={{ backgroundColor: accentDim }} />
            <span
              className="font-[Poppins] text-[9px] sm:text-[10px] uppercase tracking-[0.35em] font-semibold"
              style={{ color: accentDim }}
            >
              Velocity Pickleball Hub
            </span>
          </div>
          <h1 className="font-['Clash_Display'] text-xl sm:text-3xl md:text-4xl font-bold text-white">
            Book Your Court
          </h1>
          <p className="font-[Poppins] text-[10px] sm:text-xs mt-2 sm:mt-3 opacity-60 text-white">
            * Prices are subject to change without prior notice.
          </p>
        </div>
      </div>

      {/* Steps */}
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
                      <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check
                      </span>
                    ) : (
                      s.num
                    )}
                  </div>
                  <span
                    className="font-[Poppins] text-[10px] sm:text-xs font-semibold hidden sm:block"
                    style={{ color: `${bg}99` }}
                  >
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className="w-5 sm:w-8 md:w-16 h-px mx-0.5 sm:mx-1 transition-all"
                    style={{ backgroundColor: step > s.num ? bg : `${bg}0d` }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking Policy */}
      <div className="relative z-10 w-full" style={{ backgroundColor: bg }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-8 flex items-start gap-4 sm:gap-5">
          <div
            className="shrink-0 flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full mt-0.5"
            style={{ backgroundColor: "#ff4d4d18", border: "1px solid #ff4d4d40" }}
          >
            <span
              className="material-symbols-outlined text-lg sm:text-xl"
              style={{ color: "#ff6b6b", fontVariationSettings: "'FILL' 1" }}
            >
              warning
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-['Clash_Display'] text-base sm:text-lg md:text-xl font-extrabold uppercase tracking-[0.2em] mb-1.5"
              style={{ color: "#ff6b6b" }}
            >
              No Cancellation Policy
            </p>
            <p
              className="font-[Poppins] text-sm sm:text-base md:text-lg leading-relaxed"
              style={{ color: "#d3e9cb99" }}
            >
              Once confirmed, no cancellations or refunds. Can&apos;t make it? Find someone to take
              your slot and settle payment directly.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10">
        {isLoading ? (
          <LoadingPage message="Loading courts..." />
        ) : (
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease }}
              >
                <StepCustomerDetails onNext={() => setStep(2)} />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease }}
              >
                <StepCourtGrid onNext={() => setStep(3)} onBack={() => setStep(1)} />
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease }}
              >
                <StepReviewConfirm onBack={() => setStep(2)} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <BookingFooter bg={bg} surface={surface} />
    </div>
  );
}
