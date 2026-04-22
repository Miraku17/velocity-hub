"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar } from "@/components/ui/calendar";
import { useGridAvailability } from "@/lib/hooks/useGridAvailability";
import { useQuery } from "@tanstack/react-query";
import { formatLocalDate, hour24ToLabel, formatCurrency, getHourRate, colors } from "@/app/booking/utils";
import type { GridAvailabilityResponse, SlotStatus } from "@/app/api/grid-availability/route";

const { bg, accent, accentDim, surface } = colors;

export default function SchedulesPage() {
  const today = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 30);
    return d;
  }, [today]);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const dateStr = useMemo(() => formatLocalDate(selectedDate), [selectedDate]);

  const { data: gridData, isLoading, isFetching } = useGridAvailability(dateStr);

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

  const formattedDateShort = selectedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="min-h-svh relative" style={{ backgroundColor: surface }}>
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
            Court Schedules
          </h1>
          <p className="font-[Poppins] text-[10px] sm:text-xs mt-2 sm:mt-3 opacity-60 text-white">
            Browse court availability. Ready to play? Book your slot!
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10">
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
              Court availability — {formattedDateShort}
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
              <ReadOnlyGrid data={gridData} isLoading={isFetching} />
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

        {/* Book Now CTA */}
        <div className="mt-6 text-center">
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 font-[Poppins] font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.98] shadow-sm"
            style={{ backgroundColor: bg, color: accent }}
          >
            <span className="material-symbols-outlined text-[16px]">sports_tennis</span>
            Book a Court
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Read-only grid — no selection, just shows availability status */
function ReadOnlyGrid({ data, isLoading }: { data: GridAvailabilityResponse; isLoading?: boolean }) {
  const timeRows = useMemo(() => {
    const rows: { hour: number; isNextDay: boolean }[] = [];
    for (let h = data.time_range.earliest_open; h < data.time_range.latest_close; h++) {
      rows.push({ hour: h % 24, isNextDay: h >= 24 });
    }
    return rows;
  }, [data.time_range]);

  const openCourts = useMemo(
    () => data.courts.filter((c) => c.schedule && !c.schedule.is_closed),
    [data.courts]
  );

  if (openCourts.length === 0) {
    return (
      <div className="flex flex-col items-center py-12">
        <span
          className="material-symbols-outlined text-3xl mb-2"
          style={{ color: `${bg}15`, fontVariationSettings: "'FILL' 0, 'wght' 300" }}
        >
          event_busy
        </span>
        <p className="font-[Poppins] text-sm" style={{ color: `${bg}40` }}>
          No courts are open on this day
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span
          className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: `${bg}20`, borderTopColor: bg }}
        />
        <p className="font-[Poppins] text-xs font-medium" style={{ color: `${bg}50` }}>
          Loading availability...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {[
          { color: "bg-emerald-100 border-emerald-300", label: "Open" },
          { color: "bg-gray-200", label: "Booked" },
          { color: "bg-amber-100", label: "Pending" },
          { color: "bg-slate-200", label: "Blocked" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded-sm border ${item.color}`} />
            <span
              className="font-[Poppins] text-[10px] font-medium"
              style={{ color: `${bg}60` }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto -mx-1 px-1 pb-2">
        <div
          className="grid gap-px min-w-max"
          style={{
            gridTemplateColumns: `auto repeat(${openCourts.length}, minmax(68px, 1fr))`,
          }}
        >
          {/* Header row */}
          <div
            className="sticky left-0 z-20 bg-white flex items-center justify-center rounded-tl-lg px-1 py-2"
            style={{ borderBottom: `2px solid ${bg}10` }}
          >
            <span
              className="font-[Poppins] text-[10px] font-bold uppercase tracking-wider"
              style={{ color: `${bg}50` }}
            >
              Time
            </span>
          </div>
          {openCourts.map((court, i) => (
            <div
              key={court.id}
              className={`flex flex-col items-center justify-center px-1 py-2 ${i === openCourts.length - 1 ? "rounded-tr-lg" : ""}`}
              style={{ borderBottom: `2px solid ${bg}10` }}
            >
              <span
                className="font-['Clash_Display'] text-xs sm:text-sm font-bold leading-tight"
                style={{ color: bg }}
              >
                {court.name}
              </span>
              <span
                className="font-[Poppins] text-[8px] sm:text-[9px] font-medium uppercase tracking-wider"
                style={{ color: `${bg}40` }}
              >
                {court.court_type === "indoor" ? "Covered" : "Outdoor"}
              </span>
            </div>
          ))}

          {/* Time rows */}
          {timeRows.map(({ hour, isNextDay }) => (
            <ReadOnlyRow
              key={`${hour}-${isNextDay ? "next" : "same"}`}
              hour={hour}
              isNextDay={isNextDay}
              openCourts={openCourts}
              data={data}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Single time row in the read-only grid */
function ReadOnlyRow({
  hour,
  isNextDay,
  openCourts,
  data,
}: {
  hour: number;
  isNextDay: boolean;
  openCourts: GridAvailabilityResponse["courts"];
  data: GridAvailabilityResponse;
}) {
  return (
    <>
      <div
        className="sticky left-0 z-10 bg-white flex flex-col items-center justify-center px-1 py-0.5"
        style={{ borderBottom: `1px solid ${bg}06` }}
      >
        <span
          className="font-[Poppins] text-[10px] sm:text-[11px] font-semibold whitespace-nowrap"
          style={{ color: `${bg}70` }}
        >
          {hour24ToLabel(hour)}
        </span>
        {isNextDay && (
          <span
            className="font-[Poppins] text-[8px] sm:text-[9px] font-bold uppercase tracking-wider leading-none mt-0.5 px-1 py-0.5 rounded"
            style={{
              color: "#9a3412",
              backgroundColor: "#fff7ed",
              border: "1px solid #fed7aa",
            }}
          >
            Next day
          </span>
        )}
      </div>

      {openCourts.map((court) => {
        const slotStatus: SlotStatus | undefined = data.slots[court.id]?.[String(hour)];
        const isClosed = !slotStatus;
        const price = getHourRate(hour, court.schedule?.hourly_rates, court.price_per_hour);

        return (
          <div
            key={`${court.id}-${hour}`}
            className="p-0.5"
            style={{ borderBottom: `1px solid ${bg}06` }}
          >
            {isClosed ? (
              <div className="h-full min-h-[44px]" />
            ) : (
              <div
                className={`
                  w-full min-h-[44px] rounded-md text-center text-[10px] sm:text-[11px] font-[Poppins] font-semibold
                  flex flex-col items-center justify-center gap-0.5 px-1 py-1.5
                  ${slotStatus === "open"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                    : slotStatus === "booked"
                      ? "bg-gray-100 text-gray-400"
                      : slotStatus === "pending"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-slate-100 text-slate-400"
                  }
                `}
              >
                {slotStatus === "open" ? (
                  <span>{formatCurrency(price)}</span>
                ) : (
                  <span className="uppercase tracking-wider text-[9px]">
                    {slotStatus === "booked" ? "Booked" : slotStatus === "pending" ? "Pending" : "Blocked"}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
