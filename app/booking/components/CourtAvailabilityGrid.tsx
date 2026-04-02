"use client";

import { useMemo } from "react";
import type { GridAvailabilityResponse } from "@/app/api/grid-availability/route";
import { useBookingCart, type CartItem } from "@/lib/stores/bookingCartStore";
import { getHourRate, hour24ToLabel, colors } from "../utils";
import { GridCell } from "./GridCell";
import { GridLegend } from "./GridLegend";

interface CourtAvailabilityGridProps {
  data: GridAvailabilityResponse;
  date: string;
  isLoading?: boolean;
}

export function CourtAvailabilityGrid({ data, date, isLoading }: CourtAvailabilityGridProps) {
  const { items, toggleItem } = useBookingCart();

  // Generate the time rows from earliest open to latest close
  const timeRows = useMemo(() => {
    const rows: number[] = [];
    for (let h = data.time_range.earliest_open; h < data.time_range.latest_close; h++) {
      rows.push(h % 24);
    }
    return rows;
  }, [data.time_range]);

  // Open courts (those with a schedule for this day)
  const openCourts = useMemo(
    () => data.courts.filter((c) => c.schedule && !c.schedule.is_closed),
    [data.courts]
  );

  // Build a set of selected items for fast lookup
  const selectedSet = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.date === date) {
        set.add(`${item.court_id}:${item.start_time}`);
      }
    }
    return set;
  }, [items, date]);

  if (openCourts.length === 0) {
    return (
      <div className="flex flex-col items-center py-12">
        <span
          className="material-symbols-outlined text-3xl mb-2"
          style={{ color: `${colors.bg}15`, fontVariationSettings: "'FILL' 0, 'wght' 300" }}
        >
          event_busy
        </span>
        <p className="font-[Poppins] text-sm" style={{ color: `${colors.bg}40` }}>
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
          style={{ borderColor: `${colors.bg}20`, borderTopColor: colors.bg }}
        />
        <p className="font-[Poppins] text-xs font-medium" style={{ color: `${colors.bg}50` }}>
          Loading availability...
        </p>
      </div>
    );
  }

  const colCount = openCourts.length + 1; // +1 for time column

  return (
    <div className="space-y-3">
      <GridLegend />

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
            style={{ borderBottom: `2px solid ${colors.bg}10` }}
          >
            <span
              className="font-[Poppins] text-[10px] font-bold uppercase tracking-wider"
              style={{ color: `${colors.bg}50` }}
            >
              Time
            </span>
          </div>
          {openCourts.map((court, i) => (
            <div
              key={court.id}
              className={`flex flex-col items-center justify-center px-1 py-2 ${i === openCourts.length - 1 ? "rounded-tr-lg" : ""}`}
              style={{ borderBottom: `2px solid ${colors.bg}10` }}
            >
              <span
                className="font-['Clash_Display'] text-xs sm:text-sm font-bold leading-tight"
                style={{ color: colors.bg }}
              >
                {court.name}
              </span>
              <span
                className="font-[Poppins] text-[8px] sm:text-[9px] font-medium uppercase tracking-wider"
                style={{ color: `${colors.bg}40` }}
              >
                {court.court_type === "indoor" ? "Covered" : "Outdoor"}
              </span>
            </div>
          ))}

          {/* Time rows */}
          {timeRows.map((hour) => (
            <>
              {/* Time label — sticky left */}
              <div
                key={`time-${hour}`}
                className="sticky left-0 z-10 bg-white flex items-center justify-center px-1 py-0.5"
                style={{ borderBottom: `1px solid ${colors.bg}06` }}
              >
                <span
                  className="font-[Poppins] text-[10px] sm:text-[11px] font-semibold whitespace-nowrap"
                  style={{ color: `${colors.bg}70` }}
                >
                  {hour24ToLabel(hour)}
                </span>
              </div>

              {/* Court cells */}
              {openCourts.map((court) => {
                const slotStatus = data.slots[court.id]?.[String(hour)];
                const isClosed = !slotStatus;
                const startTime = `${String(hour).padStart(2, "0")}:00`;
                const endTime = hour === 23 ? "24:00" : `${String(hour + 1).padStart(2, "0")}:00`;
                const isSelected = selectedSet.has(`${court.id}:${startTime}`);
                const price = getHourRate(
                  hour,
                  court.schedule?.hourly_rates,
                  court.price_per_hour
                );

                return (
                  <div
                    key={`${court.id}-${hour}`}
                    className="p-0.5"
                    style={{ borderBottom: `1px solid ${colors.bg}06` }}
                  >
                    <GridCell
                      status={slotStatus ?? "open"}
                      isSelected={isSelected}
                      price={price}
                      isClosed={isClosed}
                      onToggle={() => {
                        const item: CartItem = {
                          court_id: court.id,
                          court_name: court.name,
                          court_type: court.court_type,
                          date,
                          start_time: startTime,
                          end_time: endTime,
                          price,
                        };
                        toggleItem(item);
                      }}
                    />
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
