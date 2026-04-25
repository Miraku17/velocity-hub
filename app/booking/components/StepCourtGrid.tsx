"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { useGridAvailability } from "@/lib/hooks/useGridAvailability";
import { useBookingCart } from "@/lib/stores/bookingCartStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatLocalDate, colors } from "../utils";
import { CourtAvailabilityGrid } from "./CourtAvailabilityGrid";
import { BookingCart } from "./BookingCart";

interface StepCourtGridProps {
  onNext: () => void;
  onBack: () => void;
}

export function StepCourtGrid({ onNext, onBack }: StepCourtGridProps) {
  const queryClient = useQueryClient();
  const { items, clearCart } = useBookingCart();

  // Operating-day "today": before 6 AM, the previous calendar day is still the
  // current operating day (overnight slots run past midnight), so don't lock it.
  const today = useMemo(() => {
    const now = new Date();
    if (now.getHours() < 6) {
      now.setDate(now.getDate() - 1);
    }
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 30);
    return d;
  }, [today]);

  const cartDate = items[0]?.date;
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (cartDate) {
      const d = new Date(cartDate + "T00:00:00");
      if (!isNaN(d.getTime())) return d;
    }
    return today;
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const dateStr = useMemo(() => formatLocalDate(selectedDate), [selectedDate]);

  // Fetch grid availability for the selected date
  const { data: gridData, isLoading, isFetching } = useGridAvailability(dateStr);

  // Refetch availability data on mount to pick up any bookings made in prior steps
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["grid-availability"] });
    queryClient.invalidateQueries({ queryKey: ["calendar-availability"] });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Calendar availability for dot indicators
  const todayStr = useMemo(() => formatLocalDate(today), [today]);
  const maxDateStr = useMemo(() => formatLocalDate(maxDate), [maxDate]);

  const { data: calendarAvailability } = useQuery<
    Record<string, { total: number; booked: number; available: number }>
  >({
    queryKey: ["calendar-availability", todayStr, maxDateStr],
    queryFn: async () => {
      const params = new URLSearchParams({ date_from: todayStr, date_to: maxDateStr });
      const res = await fetch(`/api/calendar-availability?${params}`);
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 60_000,
  });

  const calendarModifiers = useMemo(() => {
    if (!calendarAvailability) return {};
    const hasSlots: Date[] = [];
    const fullyBooked: Date[] = [];
    for (const [ds, info] of Object.entries(calendarAvailability)) {
      if (info.total === 0 || info.available === 0) {
        fullyBooked.push(new Date(ds + "T00:00:00"));
      } else {
        hasSlots.push(new Date(ds + "T00:00:00"));
      }
    }
    return { hasSlots, fullyBooked };
  }, [calendarAvailability]);

  // Close calendar on outside click
  useEffect(() => {
    if (!calendarOpen) return;
    const handler = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [calendarOpen]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setCalendarOpen(false);
    clearCart();
  };

  const goDay = (offset: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + offset);
    if (next >= today && next <= maxDate) {
      handleDateChange(next);
    }
  };

  const canGoPrev = useMemo(() => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    return prev >= today;
  }, [selectedDate, today]);

  const canGoNext = useMemo(() => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    return next <= maxDate;
  }, [selectedDate, maxDate]);

  const isToday = useMemo(
    () => formatLocalDate(selectedDate) === formatLocalDate(today),
    [selectedDate, today]
  );

  // Re-check slot availability before proceeding
  const handleProceed = useCallback(async () => {
    if (items.length === 0 || checkingAvailability) return;
    setCheckingAvailability(true);

    try {
      const freshData = await queryClient.fetchQuery({
        queryKey: ["grid-availability", dateStr],
        staleTime: 0,
      }) as typeof gridData;

      if (!freshData) {
        toast.error("Unable to verify availability. Please try again.");
        setCheckingAvailability(false);
        return;
      }

      const conflicts: string[] = [];
      for (const item of items) {
        const hour = parseInt(item.start_time.split(":")[0], 10);
        const status = freshData.slots[item.court_id]?.[String(hour)];
        if (status !== "open") {
          const court = freshData.courts.find((c) => c.id === item.court_id);
          conflicts.push(`${court?.name ?? "Court"} at ${item.start_time}`);
        }
      }

      if (conflicts.length > 0) {
        toast.error(`Some slots are no longer available: ${conflicts.slice(0, 3).join(", ")}${conflicts.length > 3 ? "..." : ""}`);
        queryClient.invalidateQueries({ queryKey: ["grid-availability", dateStr] });
        setCheckingAvailability(false);
        return;
      }

      setCheckingAvailability(false);
      onNext();
    } catch {
      setCheckingAvailability(false);
      onNext();
    }
  }, [items, checkingAvailability, dateStr, queryClient, gridData, onNext]);

  const { bg } = colors;

  const formattedDateShort = selectedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: Date picker + Grid */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">

          {/* Grid card with integrated date nav */}
          <div
            className="bg-white rounded-2xl shadow-sm"
            style={{ border: `1px solid ${bg}08` }}
          >
            {/* Date navigation bar */}
            <div
              className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4"
              style={{ borderBottom: `1px solid ${bg}08` }}
            >
              <button
                onClick={() => goDay(-1)}
                disabled={!canGoPrev}
                className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all active:scale-95"
                style={{
                  backgroundColor: `${bg}05`,
                  border: `1px solid ${bg}0a`,
                  color: canGoPrev ? bg : `${bg}20`,
                }}
              >
                <span className="material-symbols-outlined text-xl">chevron_left</span>
              </button>

              {/* Calendar dropdown trigger */}
              <div className="relative" ref={calendarRef}>
                <button
                  onClick={() => setCalendarOpen(!calendarOpen)}
                  className="flex items-center gap-2 px-4 sm:px-5 h-10 sm:h-11 rounded-xl transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: `${bg}05`,
                    border: `1px solid ${bg}0a`,
                    color: bg,
                  }}
                >
                  <span
                    className="material-symbols-outlined text-lg"
                    style={{ color: `${bg}60`, fontVariationSettings: "'FILL' 1" }}
                  >
                    calendar_month
                  </span>
                  <span className="font-['Clash_Display'] text-sm sm:text-base font-bold">
                    {isToday
                      ? "Today"
                      : selectedDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                  </span>
                  <span
                    className="material-symbols-outlined text-base transition-transform"
                    style={{
                      color: `${bg}40`,
                      transform: calendarOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    expand_more
                  </span>
                </button>

                {/* Calendar dropdown */}
                {calendarOpen && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 bg-white rounded-2xl shadow-xl p-3"
                    style={{ border: `1px solid ${bg}10` }}
                  >
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && handleDateChange(date)}
                      disabled={{ before: today, after: maxDate }}
                      modifiers={calendarModifiers}
                      className="bg-white"
                    />
                    <div className="flex items-center gap-4 px-2 pt-2 pb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                        <span className="font-[Poppins] text-[10px]" style={{ color: `${bg}50` }}>
                          Available
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
                        <span className="font-[Poppins] text-[10px]" style={{ color: `${bg}50` }}>
                          Fully Booked
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => goDay(1)}
                disabled={!canGoNext}
                className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all active:scale-95"
                style={{
                  backgroundColor: `${bg}05`,
                  border: `1px solid ${bg}0a`,
                  color: canGoNext ? bg : `${bg}20`,
                }}
              >
                <span className="material-symbols-outlined text-xl">chevron_right</span>
              </button>
            </div>

            {/* Grid content */}
            <div className="p-4 sm:p-6">
              <label
                className="font-[Poppins] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 block"
                style={{ color: `${bg}80` }}
              >
                <span
                  className="material-symbols-outlined text-sm align-middle mr-1"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  grid_view
                </span>
                Tap to select slots — {formattedDateShort}
              </label>
              <p
                className="font-[Poppins] text-[11px] sm:text-xs font-semibold mb-4 flex items-start gap-1.5"
                style={{ color: "#c2410c" }}
              >
                <span
                  className="material-symbols-outlined text-sm shrink-0"
                  style={{ fontSize: "14px", color: "#c2410c", fontVariationSettings: "'FILL' 1" }}
                >
                  info
                </span>
                <span>
                  Slots from <strong style={{ color: "#9a3412" }}>12:00 AM onwards</strong> are on the following day.
                </span>
              </p>

              {gridData ? (
                <CourtAvailabilityGrid
                  data={gridData}
                  date={dateStr}
                  isLoading={isFetching}
                />
              ) : isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <span
                    className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
                    style={{ borderColor: `${bg}20`, borderTopColor: bg }}
                  />
                  <p className="font-[Poppins] text-xs font-medium" style={{ color: `${bg}50` }}>
                    Loading availability...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center py-12">
                  <span
                    className="material-symbols-outlined text-3xl mb-2"
                    style={{ color: `${bg}15`, fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                  >
                    error_outline
                  </span>
                  <p className="font-[Poppins] text-sm" style={{ color: `${bg}40` }}>
                    Unable to load availability
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Cart sidebar (desktop) */}
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <BookingCart
              onProceed={handleProceed}
              onBack={onBack}
              isCheckingAvailability={checkingAvailability}
            />
          </div>
        </div>

        {/* Mobile: Full cart (shown below grid) */}
        <div className="lg:hidden pb-20">
          <BookingCart
            onProceed={handleProceed}
            onBack={onBack}
            isCheckingAvailability={checkingAvailability}
          />
        </div>
      </div>

      {/* Mobile floating cart bar */}
      <MobileFloatingBar
        onProceed={handleProceed}
        onBack={onBack}
        isCheckingAvailability={checkingAvailability}
      />
    </>
  );
}

/** Mobile floating bar — visible when items are selected */
function MobileFloatingBar({
  onProceed,
  onBack,
  isCheckingAvailability,
}: {
  onProceed: () => void;
  onBack: () => void;
  isCheckingAvailability?: boolean;
}) {
  const { items } = useBookingCart();
  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price, 0);
  }, [items]);

  if (items.length === 0) return null;

  const { bg, accent } = colors;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{ backgroundColor: bg }}
    >
      <div className="absolute inset-0 grain-overlay opacity-15 pointer-events-none" />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p
            className="font-[Poppins] text-[10px] uppercase tracking-wider font-semibold"
            style={{ color: `${colors.accentDim}80` }}
          >
            {items.length} slot{items.length > 1 ? "s" : ""} selected
          </p>
          <p className="font-['Clash_Display'] text-lg font-bold text-white">
            ₱{total.toLocaleString("en-PH")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="px-3 py-2.5 rounded-xl font-[Poppins] font-bold text-[10px] uppercase tracking-wider transition-all active:scale-[0.98]"
            style={{ border: `1px solid ${accent}30`, color: accent }}
          >
            Back
          </button>
          <button
            onClick={onProceed}
            disabled={isCheckingAvailability}
            className="px-5 py-2.5 rounded-xl font-[Poppins] font-bold text-[10px] uppercase tracking-wider transition-all active:scale-[0.98]"
            style={{ backgroundColor: accent, color: bg }}
          >
            {isCheckingAvailability ? "Checking..." : "Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
