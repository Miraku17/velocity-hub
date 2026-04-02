"use client";

import { useState, useMemo, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { useGridAvailability } from "@/lib/hooks/useGridAvailability";
import { useBookingCart } from "@/lib/stores/bookingCartStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatLocalDate, colors } from "../utils";
import { CourtAvailabilityGrid } from "./CourtAvailabilityGrid";
import { BookingCart, MobileCartBar } from "./BookingCart";

interface StepCourtGridProps {
  onNext: () => void;
  onBack: () => void;
}

export function StepCourtGrid({ onNext, onBack }: StepCourtGridProps) {
  const queryClient = useQueryClient();
  const { items, clearCart } = useBookingCart();

  const today = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 30);
    return d;
  }, [today]);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const dateStr = useMemo(() => formatLocalDate(selectedDate), [selectedDate]);

  // Fetch grid availability for the selected date
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

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    // Clear cart when date changes since we're single-date
    clearCart();
  };

  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Re-check slot availability before proceeding
  const handleProceed = useCallback(async () => {
    if (items.length === 0 || checkingAvailability) return;
    setCheckingAvailability(true);

    try {
      // Refetch grid data to check for conflicts
      const freshData = await queryClient.fetchQuery({
        queryKey: ["grid-availability", dateStr],
        staleTime: 0,
      }) as typeof gridData;

      if (!freshData) {
        toast.error("Unable to verify availability. Please try again.");
        setCheckingAvailability(false);
        return;
      }

      // Check each selected item against fresh data
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
      onNext(); // Let the RPC guard handle it
    }
  }, [items, checkingAvailability, dateStr, queryClient, gridData, onNext]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Left: Date picker + Grid */}
      <div className="lg:col-span-2 space-y-4 sm:space-y-6">
        {/* Date picker card */}
        <div
          className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm"
          style={{ border: `1px solid ${colors.bg}08` }}
        >
          <label
            className="font-[Poppins] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-3 block"
            style={{ color: `${colors.bg}80` }}
          >
            <span
              className="material-symbols-outlined text-sm align-middle mr-1"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              calendar_today
            </span>
            Select Date
          </label>
          <div
            className="rounded-xl overflow-hidden inline-block max-w-full"
            style={{ border: `1px solid ${colors.bg}0d` }}
          >
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && handleDateChange(date)}
              disabled={{ before: today, after: maxDate }}
              modifiers={calendarModifiers}
              className="bg-white"
            />
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              <span className="font-[Poppins] text-[10px]" style={{ color: `${colors.bg}50` }}>
                Available
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
              <span className="font-[Poppins] text-[10px]" style={{ color: `${colors.bg}50` }}>
                Fully Booked
              </span>
            </div>
          </div>
          <p
            className="font-[Poppins] text-[10px] sm:text-[11px] mt-2"
            style={{ color: `${colors.bg}40` }}
          >
            Selected:{" "}
            <span className="font-semibold" style={{ color: `${colors.bg}99` }}>
              {formattedDate}
            </span>
          </p>
        </div>

        {/* Availability Grid card */}
        <div
          className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm"
          style={{ border: `1px solid ${colors.bg}08` }}
        >
          <label
            className="font-[Poppins] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-4 block"
            style={{ color: `${colors.bg}80` }}
          >
            <span
              className="material-symbols-outlined text-sm align-middle mr-1"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              grid_view
            </span>
            Court Availability — {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </label>

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
                style={{ borderColor: `${colors.bg}20`, borderTopColor: colors.bg }}
              />
              <p className="font-[Poppins] text-xs font-medium" style={{ color: `${colors.bg}50` }}>
                Loading availability...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-12">
              <span
                className="material-symbols-outlined text-3xl mb-2"
                style={{ color: `${colors.bg}15`, fontVariationSettings: "'FILL' 0, 'wght' 300" }}
              >
                error_outline
              </span>
              <p className="font-[Poppins] text-sm" style={{ color: `${colors.bg}40` }}>
                Unable to load availability
              </p>
            </div>
          )}
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

      {/* Mobile: Cart at bottom + floating bar */}
      <div className="lg:hidden">
        <BookingCart
          onProceed={handleProceed}
          onBack={onBack}
          isCheckingAvailability={checkingAvailability}
        />
      </div>
    </div>
  );
}
