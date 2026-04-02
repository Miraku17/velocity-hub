"use client";

import { useBookingCart } from "@/lib/stores/bookingCartStore";
import { colors } from "../utils";

interface StepCustomerDetailsProps {
  onNext: () => void;
}

export function StepCustomerDetails({ onNext }: StepCustomerDetailsProps) {
  const { customer, setCustomer } = useBookingCart();
  const { name, email, phone } = customer;

  const isValid = name.trim() !== "" && email.trim() !== "" && phone.trim() !== "";

  const fields = [
    { label: "Full Name", value: name, key: "name" as const, type: "text", placeholder: "Juan Dela Cruz" },
    { label: "Email", value: email, key: "email" as const, type: "email", placeholder: "juan@email.com" },
    { label: "Phone Number", value: phone, key: "phone" as const, type: "tel", placeholder: "+63 917 123 4567" },
  ];

  return (
    <div
      className="bg-white rounded-2xl p-5 sm:p-8 md:p-10 max-w-2xl shadow-sm"
      style={{ border: `1px solid ${colors.bg}08` }}
    >
      <h2
        className="font-['Clash_Display'] text-lg sm:text-xl font-bold mb-1"
        style={{ color: colors.bg }}
      >
        Your Information
      </h2>
      <p
        className="font-[Poppins] text-xs sm:text-sm mb-6 sm:mb-8"
        style={{ color: `${colors.bg}66` }}
      >
        No account needed. We&apos;ll use this to send your booking confirmation.
      </p>

      <div
        className="rounded-xl px-4 py-3 mb-6 sm:mb-8 flex items-start gap-2.5"
        style={{ backgroundColor: "#fff8e6", border: "1px solid #f59e0b40" }}
      >
        <span
          className="material-symbols-outlined text-base mt-0.5 shrink-0"
          style={{ color: "#f59e0b", fontVariationSettings: "'FILL' 1, 'wght' 500" }}
        >
          info
        </span>
        <p
          className="font-[Poppins] text-[11px] sm:text-xs font-semibold leading-relaxed"
          style={{ color: "#92400e" }}
        >
          Please ensure your email and phone number are{" "}
          <strong style={{ color: "#b45309" }}>correct and reachable</strong>. We may contact you
          for booking updates, schedule changes, or payment issues.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-5">
        {fields.map((f) => (
          <div key={f.label}>
            <label
              className="font-[Poppins] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1.5 sm:mb-2 block"
              style={{ color: `${colors.bg}80` }}
            >
              {f.label} <span className="text-red-400">*</span>
            </label>
            <input
              type={f.type}
              value={f.value}
              onChange={(e) => setCustomer({ [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full rounded-lg sm:rounded-xl px-3 sm:px-4 py-3 sm:py-3.5 font-[Poppins] text-sm focus:outline-none transition-all"
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.bg}12`,
                color: colors.bg,
              }}
            />
          </div>
        ))}
      </div>

      <div className="mt-8 sm:mt-10 flex justify-end">
        <button
          onClick={() => isValid && onNext()}
          disabled={!isValid}
          className="w-full sm:w-auto px-8 py-3 sm:py-3.5 rounded-xl font-[Poppins] font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          style={{
            backgroundColor: isValid ? colors.bg : `${colors.bg}0a`,
            color: isValid ? "white" : `${colors.bg}30`,
            cursor: isValid ? "pointer" : "not-allowed",
          }}
        >
          Next
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
