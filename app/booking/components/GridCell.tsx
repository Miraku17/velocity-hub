"use client";

import type { SlotStatus } from "@/app/api/grid-availability/route";
import { formatCurrency } from "../utils";

interface GridCellProps {
  status: SlotStatus;
  isSelected: boolean;
  price: number;
  onToggle: () => void;
  isClosed?: boolean;
}

export function GridCell({ status, isSelected, price, onToggle, isClosed }: GridCellProps) {
  if (isClosed) {
    return <div className="h-full min-h-[44px]" />;
  }

  const isInteractive = status === "open";

  return (
    <button
      type="button"
      onClick={isInteractive ? onToggle : undefined}
      disabled={!isInteractive}
      className={`
        w-full min-h-[44px] rounded-md text-center transition-all text-[10px] sm:text-[11px] font-[Poppins] font-semibold
        flex flex-col items-center justify-center gap-0.5 px-1 py-1.5
        ${isSelected
          ? "bg-[#182916] text-white ring-2 ring-[#182916] ring-offset-1"
          : status === "open"
            ? "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 active:scale-[0.96] cursor-pointer"
            : status === "booked"
              ? "bg-gray-100 text-gray-400 cursor-default"
              : status === "pending"
                ? "bg-amber-50 text-amber-600 cursor-default"
                : "bg-slate-100 text-slate-400 cursor-default"
        }
      `}
    >
      {isSelected ? (
        <>
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
          <span>{formatCurrency(price)}</span>
        </>
      ) : status === "open" ? (
        <>
          <span>{formatCurrency(price)}</span>
        </>
      ) : (
        <span className="uppercase tracking-wider text-[9px]">
          {status === "booked" ? "Booked" : status === "pending" ? "Pending" : "Blocked"}
        </span>
      )}
    </button>
  );
}
