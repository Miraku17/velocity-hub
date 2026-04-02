"use client";

import { useState, useMemo } from "react";
import { useBookingCart, getTotalAmount, groupItemsByCourt } from "@/lib/stores/bookingCartStore";
import { formatCurrency, formatTime12, colors } from "../utils";

interface BookingCartProps {
  onProceed: () => void;
  onBack: () => void;
  isCheckingAvailability?: boolean;
}

export function BookingCart({ onProceed, onBack, isCheckingAvailability }: BookingCartProps) {
  const { items, removeItem, clearCart } = useBookingCart();
  const [expanded, setExpanded] = useState(false);

  const total = useMemo(() => getTotalAmount(items), [items]);
  const groups = useMemo(() => groupItemsByCourt(items), [items]);
  const hasItems = items.length > 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Cart card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm" style={{ border: `1px solid ${colors.bg}08` }}>
        <div className="flex items-center justify-between mb-4">
          <label
            className="font-[Poppins] text-[10px] sm:text-xs font-semibold uppercase tracking-wider"
            style={{ color: `${colors.bg}80` }}
          >
            <span
              className="material-symbols-outlined text-sm align-middle mr-1"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shopping_cart
            </span>
            Selected Slots
          </label>
          {hasItems && (
            <button
              onClick={clearCart}
              className="font-[Poppins] text-[10px] uppercase tracking-wider text-red-400 hover:text-red-500 font-semibold transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {!hasItems ? (
          <div className="flex flex-col items-center py-8">
            <span
              className="material-symbols-outlined text-3xl mb-2"
              style={{ color: `${colors.bg}15`, fontVariationSettings: "'FILL' 0, 'wght' 300" }}
            >
              touch_app
            </span>
            <p className="font-[Poppins] text-xs text-center" style={{ color: `${colors.bg}30` }}>
              Tap cells on the grid to<br />select your time slots
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.court_id}
                className="rounded-xl p-3"
                style={{ backgroundColor: `${colors.bg}04` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="material-symbols-outlined text-sm"
                    style={{ color: `${colors.bg}40`, fontVariationSettings: "'FILL' 1" }}
                  >
                    {group.court_type === "indoor" ? "roofing" : "park"}
                  </span>
                  <span
                    className="font-['Clash_Display'] text-sm font-bold"
                    style={{ color: colors.bg }}
                  >
                    {group.court_name}
                  </span>
                  <span
                    className="font-[Poppins] text-[9px] uppercase tracking-wider font-medium"
                    style={{ color: `${colors.bg}40` }}
                  >
                    {group.court_type === "indoor" ? "Covered" : "Outdoor"}
                  </span>
                </div>

                {group.ranges.map((range, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5"
                    style={{ borderTop: i > 0 ? `1px solid ${colors.bg}08` : undefined }}
                  >
                    <span
                      className="font-[Poppins] text-[11px] font-medium"
                      style={{ color: `${colors.bg}80` }}
                    >
                      {formatTime12(range.start_time)} – {formatTime12(range.end_time)}
                    </span>
                    <span
                      className="font-[Poppins] text-[11px] font-bold"
                      style={{ color: colors.bg }}
                    >
                      {formatCurrency(range.total)}
                    </span>
                  </div>
                ))}

                {/* Per-slot remove buttons */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {group.ranges.flatMap((range) => {
                    // Find individual items in this range to show remove buttons
                    const rangeItems = items.filter(
                      (item) => item.court_id === group.court_id
                    );
                    return rangeItems.map((item) => (
                      <button
                        key={`${item.court_id}-${item.start_time}`}
                        onClick={() => removeItem(item.court_id, item.start_time)}
                        className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-[Poppins] font-semibold transition-colors hover:bg-red-50"
                        style={{ backgroundColor: `${colors.accent}50`, color: colors.bg }}
                      >
                        {formatTime12(item.start_time)}
                        <span className="material-symbols-outlined text-[10px]">close</span>
                      </button>
                    ));
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Running total */}
      {hasItems && (
        <div
          className="rounded-2xl p-5 sm:p-6 relative overflow-hidden"
          style={{ backgroundColor: colors.bg }}
        >
          <div className="absolute inset-0 grain-overlay opacity-15 pointer-events-none" />
          <div className="relative z-10">
            <p
              className="font-[Poppins] text-[10px] uppercase tracking-wider font-semibold mb-1"
              style={{ color: `${colors.accentDim}80` }}
            >
              {items.length} slot{items.length > 1 ? "s" : ""} · {groups.length} court{groups.length > 1 ? "s" : ""}
            </p>
            <p className="font-['Clash_Display'] text-3xl font-bold text-white">
              {formatCurrency(total)}
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onProceed}
          disabled={!hasItems || isCheckingAvailability}
          className="w-full px-8 py-3.5 rounded-xl font-[Poppins] font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          style={{
            backgroundColor: hasItems && !isCheckingAvailability ? colors.bg : `${colors.bg}0a`,
            color: hasItems && !isCheckingAvailability ? "white" : `${colors.bg}30`,
            cursor: hasItems && !isCheckingAvailability ? "pointer" : "not-allowed",
          }}
        >
          {isCheckingAvailability ? "Checking availability..." : "Review Booking"}
          {!isCheckingAvailability && (
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          )}
        </button>
        <button
          onClick={onBack}
          className="w-full px-6 py-3 rounded-xl font-[Poppins] font-semibold text-sm transition-all flex items-center justify-center gap-2"
          style={{ border: `1px solid ${colors.bg}0d`, color: `${colors.bg}80` }}
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back
        </button>
      </div>
    </div>
  );
}

/** Mobile floating cart bar — shown at the bottom of the screen */
export function MobileCartBar({ onProceed }: { onProceed: () => void }) {
  const { items } = useBookingCart();
  const total = useMemo(() => getTotalAmount(items), [items]);

  if (items.length === 0) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{ backgroundColor: colors.bg }}
    >
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-[Poppins] text-[10px] uppercase tracking-wider font-semibold" style={{ color: `${colors.accentDim}80` }}>
            {items.length} slot{items.length > 1 ? "s" : ""} selected
          </p>
          <p className="font-['Clash_Display'] text-lg font-bold text-white">
            {formatCurrency(total)}
          </p>
        </div>
        <button
          onClick={onProceed}
          className="px-5 py-2.5 rounded-xl font-[Poppins] font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98]"
          style={{ backgroundColor: colors.accent, color: colors.bg }}
        >
          Review
        </button>
      </div>
    </div>
  );
}
