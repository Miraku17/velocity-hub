"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useBookingCart, getTotalAmount, groupItemsByCourt, buildBookingPayload } from "@/lib/stores/bookingCartStore";
import { usePaymentQrCodes } from "@/lib/hooks/usePaymentQrCodes";
import { useCreateReservation } from "@/lib/hooks/useReservations";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency, formatTime12, colors, ease, STORAGE_KEY } from "../utils";

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

interface StepReviewConfirmProps {
  onBack: () => void;
}

export function StepReviewConfirm({ onBack }: StepReviewConfirmProps) {
  const { items, customer, clearCart, setStep } = useBookingCart();
  const { data: paymentQrCodes = [] } = usePaymentQrCodes();
  const createReservation = useCreateReservation();
  const queryClient = useQueryClient();

  const total = useMemo(() => getTotalAmount(items), [items]);
  const groups = useMemo(() => groupItemsByCourt(items), [items]);
  const date = items[0]?.date ?? "";

  // Receipt state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // QR state
  const [selectedQrIndex, setSelectedQrIndex] = useState(0);
  const [qrLightbox, setQrLightbox] = useState(false);

  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [showSlots, setShowSlots] = useState(false);

  // Snapshot of cart data captured before clearCart() — used in receipt
  const [confirmedGroups, setConfirmedGroups] = useState<ReturnType<typeof groupItemsByCourt>>([]);
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const [confirmedDate, setConfirmedDate] = useState("");

  // Turnstile
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  // Render Turnstile widget when confirmation modal opens
  useEffect(() => {
    if (!showConfirmModal || !TURNSTILE_SITE_KEY) return;
    setTurnstileToken(null);

    const renderWidget = () => {
      if (!window.turnstile || !turnstileContainerRef.current) return;
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

    if (window.turnstile) {
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

  function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const url = URL.createObjectURL(file);
    setReceiptUrl(url);
    if (receiptInputRef.current) receiptInputRef.current.value = "";
  }

  async function handleConfirmBooking() {
    if (items.length === 0) return;

    // if (TURNSTILE_SITE_KEY && !turnstileToken) {
    //   toast.error("Please complete the human verification before confirming.");
    //   return;
    // }

    // Snapshot cart data now, before any async work or clearCart()
    setConfirmedGroups(groups);
    setConfirmedTotal(total);
    setConfirmedDate(formattedDate);

    const bookingsPayload = buildBookingPayload(items);

    createReservation.mutate(
      {
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        date,
        bookings: bookingsPayload,
        turnstile_token: turnstileToken || undefined,
        receipt: receiptFile || undefined,
      },
      {
        onSuccess: (data) => {
          setShowConfirmModal(false);
          setReservationId(data.id);
          setBookingConfirmed(true);
          sessionStorage.removeItem(STORAGE_KEY);
          clearCart();
          queryClient.invalidateQueries({ queryKey: ["calendar-availability"] });
          queryClient.invalidateQueries({ queryKey: ["grid-availability"] });
        },
        onError: (err) => {
          toast.error(err.message || "Something went wrong. Please try again.");
          queryClient.invalidateQueries({ queryKey: ["grid-availability"] });
          queryClient.invalidateQueries({ queryKey: ["calendar-availability"] });
        },
      }
    );
  }

  const formattedDate = date
    ? new Date(date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  if (bookingConfirmed) {
    return <BookingConfirmation
      customer={customer}
      groups={confirmedGroups}
      total={confirmedTotal}
      formattedDate={confirmedDate}
      receiptUrl={receiptUrl}
      showSlots={showSlots}
      setShowSlots={setShowSlots}
    />;
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-8">
        {/* Action card — on mobile show first */}
        <div className="lg:col-span-2 lg:order-2 space-y-4 sm:space-y-6">
          {/* Payment QR Codes */}
          {paymentQrCodes.length > 0 && (
            <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm" style={{ border: `1px solid ${colors.bg}08` }}>
              <h3 className="font-[Poppins] text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: `${colors.bg}60` }}>
                Scan to Pay
              </h3>
              {paymentQrCodes.length > 1 && (
                <div className="flex gap-1.5 mb-4 overflow-x-auto">
                  {paymentQrCodes.map((qr, i) => (
                    <button
                      key={qr.id}
                      onClick={() => setSelectedQrIndex(i)}
                      className="shrink-0 rounded-lg px-3 py-1.5 font-[Poppins] text-[10px] font-bold uppercase tracking-wider transition-all"
                      style={{
                        backgroundColor: selectedQrIndex === i ? colors.bg : `${colors.bg}08`,
                        color: selectedQrIndex === i ? colors.accent : `${colors.bg}80`,
                      }}
                    >
                      {qr.name}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setQrLightbox(true)}
                className="w-full flex justify-center rounded-xl bg-white p-4 border cursor-zoom-in transition-shadow hover:shadow-md"
                style={{ borderColor: `${colors.bg}10` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={paymentQrCodes[selectedQrIndex]?.image_url}
                  alt={paymentQrCodes[selectedQrIndex]?.name}
                  className="h-64 w-64 sm:h-72 sm:w-72 object-contain"
                />
              </button>
              <p className="mt-3 text-center font-[Poppins] text-[10px] font-semibold uppercase tracking-wider" style={{ color: `${colors.bg}60` }}>
                {paymentQrCodes[selectedQrIndex]?.name}
                <span className="block mt-1 text-[9px] font-normal" style={{ color: `${colors.bg}30` }}>Tap to enlarge</span>
              </p>
            </div>
          )}

          {/* QR Lightbox */}
          {qrLightbox && paymentQrCodes[selectedQrIndex] && createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
              onClick={() => setQrLightbox(false)}
            >
              <div className="flex flex-col items-center p-4" onClick={(e) => e.stopPropagation()}>
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
          <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm" style={{ border: `1px solid ${colors.bg}08` }}>
            <h3 className="font-[Poppins] text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: `${colors.bg}60` }}>
              Upload Payment Receipt
            </h3>
            <p className="font-[Poppins] text-[11px] mb-4" style={{ color: `${colors.bg}40` }}>
              After paying, upload a screenshot as proof of payment.
            </p>
            <input
              ref={receiptInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleReceiptUpload}
              disabled={createReservation.isPending}
              className="hidden"
            />
            {receiptUrl ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border" style={{ borderColor: `${colors.bg}15` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={receiptUrl} alt="Receipt" className="w-full max-h-48 object-contain bg-white" />
                  <div className="absolute top-2 right-2 flex h-7 items-center gap-1 rounded-full px-2.5" style={{ backgroundColor: `${colors.accent}e0` }}>
                    <span className="material-symbols-outlined text-[14px]" style={{ color: colors.bg, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-[Poppins] text-[10px] font-bold" style={{ color: colors.bg }}>Uploaded</span>
                  </div>
                </div>
                <button
                  onClick={() => receiptInputRef.current?.click()}
                  disabled={createReservation.isPending}
                  className="font-[Poppins] text-xs font-semibold underline"
                  style={{ color: `${colors.bg}80` }}
                >
                  Replace receipt
                </button>
              </div>
            ) : (
              <button
                onClick={() => receiptInputRef.current?.click()}
                disabled={createReservation.isPending}
                className="w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed py-8 transition-all hover:bg-white/80"
                style={{ borderColor: `${colors.bg}15`, backgroundColor: colors.surface }}
              >
                <span className="material-symbols-outlined text-2xl" style={{ color: `${colors.bg}30`, fontVariationSettings: "'FILL' 0, 'wght' 300" }}>cloud_upload</span>
                <span className="font-[Poppins] text-xs font-semibold" style={{ color: `${colors.bg}60` }}>Tap to upload receipt</span>
                <span className="font-[Poppins] text-[10px]" style={{ color: `${colors.bg}30` }}>JPEG, PNG, WebP — max 10MB</span>
              </button>
            )}
          </div>

          {/* Total + confirm */}
          <div className="rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden" style={{ backgroundColor: colors.bg }}>
            <div className="absolute inset-0 grain-overlay opacity-15 pointer-events-none" />
            <div className="relative z-10">
              <span className="material-symbols-outlined text-3xl sm:text-4xl mb-3 sm:mb-4 block" style={{ color: colors.accent, fontVariationSettings: "'FILL' 1" }}>
                sports_tennis
              </span>
              <p className="font-['Clash_Display'] text-2xl sm:text-3xl font-bold text-white mb-1">
                {formatCurrency(total)}
              </p>
              <p className="font-[Poppins] text-[10px] sm:text-xs uppercase tracking-wider font-semibold mb-6 sm:mb-8" style={{ color: `${colors.accentDim}80` }}>
                {items.length} slot{items.length > 1 ? "s" : ""} · {groups.length} court{groups.length > 1 ? "s" : ""}
              </p>
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={createReservation.isPending || !receiptFile}
                className="w-full py-3.5 sm:py-4 rounded-xl font-[Poppins] font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: colors.accent, color: colors.bg }}
              >
                {createReservation.isPending ? "Confirming..." : "Confirm Reservation"}
              </button>
              {!receiptFile && (
                <p className="mt-3 font-[Poppins] text-[11px] flex items-center justify-center gap-1.5" style={{ color: `${colors.accentDim}90` }}>
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
            onClick={onBack}
            className="w-full py-3 sm:py-3.5 rounded-xl font-[Poppins] font-semibold text-sm transition-all flex items-center justify-center gap-2"
            style={{ border: `1px solid ${colors.bg}0d`, color: `${colors.bg}66` }}
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Edit Reservation
          </button>
        </div>

        {/* Summary */}
        <div className="lg:col-span-3 lg:order-1 bg-white rounded-2xl p-5 sm:p-8 md:p-10 shadow-sm" style={{ border: `1px solid ${colors.bg}08` }}>
          <h2 className="font-['Clash_Display'] text-lg sm:text-xl font-bold mb-4 sm:mb-6" style={{ color: colors.bg }}>
            Booking Summary
          </h2>

          {/* Contact details */}
          <div className="mb-5 sm:mb-8 p-4 sm:p-5 rounded-xl" style={{ backgroundColor: colors.surface }}>
            <h3 className="font-[Poppins] text-[10px] font-bold uppercase tracking-[0.2em] mb-2 sm:mb-3" style={{ color: `${colors.bg}40` }}>
              Contact Details
            </h3>
            <div className="space-y-1 sm:space-y-1.5">
              <p className="font-[Poppins] text-sm font-medium" style={{ color: colors.bg }}>{customer.name}</p>
              <p className="font-[Poppins] text-xs sm:text-sm" style={{ color: `${colors.bg}80` }}>{customer.email}</p>
              <p className="font-[Poppins] text-xs sm:text-sm" style={{ color: `${colors.bg}80` }}>{customer.phone}</p>
            </div>
          </div>

          {/* Reservation details — grouped by court */}
          <div className="mb-5 sm:mb-8 p-4 sm:p-5 rounded-xl" style={{ backgroundColor: colors.surface }}>
            <h3 className="font-[Poppins] text-[10px] font-bold uppercase tracking-[0.2em] mb-2 sm:mb-3" style={{ color: `${colors.bg}40` }}>
              Reservation Details
            </h3>
            <div className="space-y-2 sm:space-y-3 text-sm font-[Poppins]">
              <div className="flex justify-between gap-2">
                <span className="shrink-0" style={{ color: `${colors.bg}66` }}>Date</span>
                <span className="font-medium text-right text-xs sm:text-sm" style={{ color: colors.bg }}>{formattedDate}</span>
              </div>

              {groups.map((group) => (
                <div key={group.court_id} className="pt-2" style={{ borderTop: `1px solid ${colors.bg}0a` }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="material-symbols-outlined text-sm" style={{ color: `${colors.bg}40`, fontVariationSettings: "'FILL' 1" }}>
                      {group.court_type === "indoor" ? "roofing" : "park"}
                    </span>
                    <span className="font-semibold text-xs sm:text-sm" style={{ color: colors.bg }}>
                      {group.court_name}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider font-medium" style={{ color: `${colors.bg}40` }}>
                      {group.court_type === "indoor" ? "Covered" : "Outdoor"}
                    </span>
                  </div>
                  {group.ranges.map((range, i) => (
                    <div key={i} className="flex justify-between pl-6 py-0.5">
                      <span style={{ color: `${colors.bg}80` }} className="text-xs">
                        {formatTime12(range.start_time)} – {formatTime12(range.end_time)}
                      </span>
                      <span className="font-semibold text-xs" style={{ color: colors.bg }}>
                        {formatCurrency(range.total)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="mb-4 sm:mb-6">
            <h3 className="font-[Poppins] text-[10px] font-bold uppercase tracking-[0.2em] mb-2 sm:mb-3" style={{ color: `${colors.bg}80` }}>
              Payment Breakdown
            </h3>
            <div>
              {items.map((item) => (
                <div
                  key={`${item.court_id}-${item.start_time}`}
                  className="flex justify-between py-2.5 sm:py-3 text-xs sm:text-sm font-[Poppins]"
                  style={{ borderBottom: `1px solid ${colors.bg}0a` }}
                >
                  <span style={{ color: `${colors.bg}b3` }}>
                    {item.court_name} · {formatTime12(item.start_time)}
                  </span>
                  <span className="font-semibold" style={{ color: colors.bg }}>
                    {formatCurrency(item.price)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-3 sm:pt-4 mt-2" style={{ borderTop: `2px solid ${colors.bg}20` }}>
              <span className="font-['Clash_Display'] text-base sm:text-lg font-bold" style={{ color: colors.bg }}>Total</span>
              <span className="font-['Clash_Display'] text-xl sm:text-2xl font-bold" style={{ color: colors.bg }}>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
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
                style={{ border: `1px solid ${colors.bg}08` }}
              >
                <div className="flex justify-center mb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: `${colors.bg}0a` }}>
                    <span className="material-symbols-outlined text-3xl" style={{ color: colors.bg, fontVariationSettings: "'FILL' 0, 'wght' 300" }}>task_alt</span>
                  </div>
                </div>

                <h3 className="font-['Clash_Display'] text-lg font-bold text-center mb-1" style={{ color: colors.bg }}>
                  Confirm Your Reservation?
                </h3>
                <p className="font-[Poppins] text-xs text-center mb-5" style={{ color: `${colors.bg}60` }}>
                  Please review the details below before confirming.
                </p>

                <div className="rounded-xl p-4 space-y-2.5 mb-4" style={{ backgroundColor: colors.surface }}>
                  <div className="flex justify-between font-[Poppins] text-xs">
                    <span style={{ color: `${colors.bg}66` }}>Name</span>
                    <span className="font-semibold" style={{ color: colors.bg }}>{customer.name}</span>
                  </div>
                  <div className="flex justify-between font-[Poppins] text-xs">
                    <span style={{ color: `${colors.bg}66` }}>Email</span>
                    <span className="font-semibold" style={{ color: colors.bg }}>{customer.email}</span>
                  </div>
                  <div className="flex justify-between font-[Poppins] text-xs">
                    <span style={{ color: `${colors.bg}66` }}>Phone</span>
                    <span className="font-semibold" style={{ color: colors.bg }}>{customer.phone}</span>
                  </div>
                  <div className="border-t my-1" style={{ borderColor: `${colors.bg}0a` }} />
                  <div className="flex justify-between font-[Poppins] text-xs">
                    <span style={{ color: `${colors.bg}66` }}>Courts</span>
                    <span className="font-semibold text-right" style={{ color: colors.bg }}>
                      {groups.map((g) => g.court_name).join(", ")}
                    </span>
                  </div>
                  <div className="flex justify-between font-[Poppins] text-xs">
                    <span style={{ color: `${colors.bg}66` }}>Date</span>
                    <span className="font-semibold" style={{ color: colors.bg }}>{formattedDate}</span>
                  </div>
                  <div className="flex justify-between font-[Poppins] text-xs">
                    <span style={{ color: `${colors.bg}66` }}>Slots</span>
                    <span className="font-semibold" style={{ color: colors.bg }}>
                      {items.length} hr{items.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="border-t my-1" style={{ borderColor: `${colors.bg}0a` }} />
                  <div className="flex justify-between font-[Poppins] text-sm">
                    <span className="font-semibold" style={{ color: colors.bg }}>Total</span>
                    <span className="font-['Clash_Display'] font-bold text-base" style={{ color: colors.bg }}>
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl px-4 py-3 mb-5 flex items-start gap-2.5" style={{ backgroundColor: `${colors.bg}06`, border: `1px solid ${colors.bg}10` }}>
                  <span className="material-symbols-outlined text-base mt-0.5 shrink-0" style={{ color: `${colors.bg}50`, fontVariationSettings: "'FILL' 0, 'wght' 300" }}>info</span>
                  <p className="font-[Poppins] text-[11px] leading-relaxed" style={{ color: `${colors.bg}70` }}>
                    By confirming, you agree that your contact details are{" "}
                    <strong style={{ color: `${colors.bg}90` }}>correct and reachable</strong>.
                    Your reservation will be reviewed and confirmed by our team.
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

                {/* {TURNSTILE_SITE_KEY && (
                  <div className="flex justify-center mb-4">
                    <div ref={turnstileContainerRef} />
                  </div>
                )} */}

                <div className="flex gap-3">
                  {createReservation.isPending ? (
                    <button
                      disabled
                      className="w-full py-3 rounded-xl font-[Poppins] font-bold text-xs sm:text-sm uppercase tracking-wider transition-all disabled:opacity-80"
                      style={{ backgroundColor: colors.bg, color: "white" }}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Confirming...
                      </span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowConfirmModal(false)}
                        className="flex-1 py-3 rounded-xl font-[Poppins] font-semibold text-sm transition-all"
                        style={{ border: `1px solid ${colors.bg}12`, color: `${colors.bg}80` }}
                      >
                        Go Back
                      </button>
                      <button
                        onClick={handleConfirmBooking}
                        disabled={false}
                        className="flex-1 py-3 rounded-xl font-[Poppins] font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-60"
                        style={{ backgroundColor: colors.bg, color: "white" }}
                      >
                        Confirm
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/** Post-confirmation receipt card */
function BookingConfirmation({
  customer,
  groups,
  total,
  formattedDate,
  receiptUrl,
  showSlots,
  setShowSlots,
}: {
  customer: { name: string; email: string; phone: string };
  groups: ReturnType<typeof groupItemsByCourt>;
  total: number;
  formattedDate: string;
  receiptUrl: string | null;
  showSlots: boolean;
  setShowSlots: (v: boolean) => void;
}) {
  const router = useRouter();
  const { setStep } = useBookingCart();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) {
      setStep(1);
      router.push("/");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, router, setStep]);

  const totalSlots = groups.reduce((sum, g) => sum + g.ranges.reduce((s, r) => {
    const startH = parseInt(r.start_time.split(":")[0], 10);
    const endH = parseInt(r.end_time.split(":")[0], 10);
    return s + (endH > startH ? endH - startH : 24 - startH + endH);
  }, 0), 0);

  return (
    <div className="mx-auto max-w-md">
      <div className="relative">
        {/* Top zigzag edge */}
        <div className="h-4 overflow-hidden">
          <svg viewBox="0 0 400 16" preserveAspectRatio="none" className="w-full h-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <circle key={i} cx={i * 20 + 10} cy="16" r="8" fill={colors.surface} />
            ))}
            <rect x="0" y="0" width="400" height="16" fill="white" />
            {Array.from({ length: 20 }).map((_, i) => (
              <circle key={`b${i}`} cx={i * 20 + 10} cy="16" r="8" fill={colors.surface} />
            ))}
          </svg>
        </div>

        <div className="bg-white px-6 sm:px-8" style={{ border: `1px solid ${colors.bg}06`, borderTop: "none", borderBottom: "none" }}>
          <div className="text-center pt-6 pb-5" style={{ borderBottom: `1px dashed ${colors.bg}15` }}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-3" style={{ backgroundColor: `${colors.accent}50` }}>
              <span className="material-symbols-outlined text-2xl" style={{ color: colors.bg, fontVariationSettings: "'FILL' 1" }}>check</span>
            </div>
            <h2 className="font-['Clash_Display'] text-lg sm:text-xl font-bold" style={{ color: colors.bg }}>Booking Submitted</h2>
            <p className="font-[Poppins] text-[11px] mt-1" style={{ color: `${colors.bg}60` }}>
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          </div>

          <div className="py-5 space-y-3" style={{ borderBottom: `1px dashed ${colors.bg}15` }}>
            <div className="flex justify-between items-start">
              <span className="font-[Poppins] text-[10px] font-semibold uppercase tracking-wider" style={{ color: `${colors.bg}50` }}>Customer</span>
              <div className="text-right">
                <p className="font-[Poppins] text-sm font-semibold" style={{ color: colors.bg }}>{customer.name}</p>
                <p className="font-[Poppins] text-[11px]" style={{ color: `${colors.bg}60` }}>{customer.email}</p>
                <p className="font-[Poppins] text-[11px]" style={{ color: `${colors.bg}60` }}>{customer.phone}</p>
              </div>
            </div>

            <div className="flex justify-between">
              <span className="font-[Poppins] text-[10px] font-semibold uppercase tracking-wider" style={{ color: `${colors.bg}50` }}>Courts</span>
              <span className="font-[Poppins] text-sm font-semibold text-right" style={{ color: colors.bg }}>
                {groups.map((g) => g.court_name).join(", ")}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="font-[Poppins] text-[10px] font-semibold uppercase tracking-wider" style={{ color: `${colors.bg}50` }}>Date</span>
              <span className="font-[Poppins] text-sm font-medium" style={{ color: colors.bg }}>
                {formattedDate}
              </span>
            </div>

            <div>
              <button type="button" onClick={() => setShowSlots(!showSlots)} className="flex w-full justify-between items-center">
                <span className="font-[Poppins] text-[10px] font-semibold uppercase tracking-wider" style={{ color: `${colors.bg}50` }}>Time</span>
                <span className="flex items-center gap-1 font-[Poppins] text-sm font-medium" style={{ color: colors.bg }}>
                  {totalSlots} slot{totalSlots > 1 ? "s" : ""}
                  <span className="material-symbols-outlined text-[14px] transition-transform" style={{ color: `${colors.bg}50`, transform: showSlots ? "rotate(180deg)" : "rotate(0deg)" }}>expand_more</span>
                </span>
              </button>
              {showSlots && (
                <div className="mt-2 space-y-2">
                  {groups.map((group) => (
                    <div key={group.court_id}>
                      <p className="font-[Poppins] text-[10px] font-bold" style={{ color: `${colors.bg}60` }}>{group.court_name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {group.ranges.map((range, i) => (
                          <span key={i} className="rounded-md px-2 py-1 font-[Poppins] text-[10px] font-semibold" style={{ backgroundColor: `${colors.accent}50`, color: colors.bg }}>
                            {formatTime12(range.start_time)} – {formatTime12(range.end_time)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="py-4 flex justify-between items-center" style={{ borderBottom: `1px dashed ${colors.bg}15` }}>
            <span className="font-['Clash_Display'] text-base font-bold" style={{ color: colors.bg }}>Total</span>
            <span className="font-['Clash_Display'] text-2xl font-bold" style={{ color: colors.bg }}>{formatCurrency(total)}</span>
          </div>

          {receiptUrl && (
            <div className="py-4" style={{ borderBottom: `1px dashed ${colors.bg}15` }}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="material-symbols-outlined text-[14px]" style={{ color: `${colors.bg}50`, fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                <span className="font-[Poppins] text-[10px] font-semibold uppercase tracking-wider" style={{ color: `${colors.bg}50` }}>Payment Receipt</span>
                <div className="ml-auto flex items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: `${colors.accent}80` }}>
                  <span className="material-symbols-outlined text-[10px]" style={{ color: colors.bg, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span className="font-[Poppins] text-[9px] font-bold" style={{ color: colors.bg }}>Attached</span>
                </div>
              </div>
              <div className="rounded-lg overflow-hidden border" style={{ borderColor: `${colors.bg}10` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={receiptUrl} alt="Receipt" className="w-full max-h-36 object-contain bg-white" />
              </div>
            </div>
          )}

          <div className="py-5">
            <div className="flex gap-3 rounded-xl p-3.5" style={{ backgroundColor: `${colors.accent}30` }}>
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5" style={{ color: colors.bg, fontVariationSettings: "'FILL' 0, 'wght' 400" }}>info</span>
              <div>
                <p className="font-[Poppins] text-[11px] font-semibold leading-relaxed" style={{ color: colors.bg }}>
                  Pending Verification
                </p>
                <p className="font-[Poppins] text-[10px] leading-relaxed mt-0.5" style={{ color: `${colors.bg}80` }}>
                  Our team will verify your booking and payment details. You&apos;ll receive a confirmation at <strong>{customer.email}</strong> once approved. This usually takes a few minutes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom zigzag edge */}
        <div className="h-4 overflow-hidden">
          <svg viewBox="0 0 400 16" preserveAspectRatio="none" className="w-full h-4">
            <rect x="0" y="0" width="400" height="16" fill="white" />
            {Array.from({ length: 20 }).map((_, i) => (
              <circle key={i} cx={i * 20 + 10} cy="0" r="8" fill={colors.surface} />
            ))}
          </svg>
        </div>
      </div>

      <div className="text-center mt-6 space-y-2">
        <button
          onClick={() => { setStep(1); router.push("/"); }}
          className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 font-[Poppins] font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.98] shadow-sm"
          style={{ backgroundColor: colors.bg, color: colors.accent }}
        >
          <span className="material-symbols-outlined text-[16px]">home</span>
          Back to Home
        </button>
        <p className="font-[Poppins] text-[11px]" style={{ color: `${colors.bg}50` }}>
          Redirecting in {countdown}s…
        </p>
      </div>
    </div>
  );
}
