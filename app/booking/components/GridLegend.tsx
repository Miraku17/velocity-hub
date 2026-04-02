"use client";

import { colors } from "../utils";

export function GridLegend() {
  const items = [
    { color: "bg-emerald-100 border-emerald-300", label: "Open" },
    { color: "bg-[#182916]", label: "Selected", textWhite: true },
    { color: "bg-gray-200", label: "Booked" },
    { color: "bg-amber-100", label: "Pending" },
    { color: "bg-slate-200", label: "Blocked" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className={`inline-block h-3 w-3 rounded-sm border ${item.color}`}
          />
          <span
            className="font-[Poppins] text-[10px] font-medium"
            style={{ color: `${colors.bg}60` }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
