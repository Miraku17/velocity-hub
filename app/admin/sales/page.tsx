"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  useReservations,
  type PaymentStatus,
  type Reservation,
} from "@/lib/hooks/useReservations"
import { LoadingPage } from "@/components/ui/loading"

/* ── Helpers ── */

const PAGE_SIZE = 20

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(time: string) {
  const [h, m] = time.split(":")
  const hour = parseInt(h, 10)
  const ampm = hour < 12 ? "AM" : "PM"
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12}:${m} ${ampm}`
}

function getPaymentBadge(status: string) {
  switch (status) {
    case "paid":
      return { bg: "bg-[#16A34A]/10", text: "text-[#16A34A]", label: "Paid" }
    case "pending":
      return { bg: "bg-[#F59E0B]/10", text: "text-[#D97706]", label: "Pending" }
    case "refunded":
      return { bg: "bg-error/10", text: "text-error", label: "Refunded" }
    case "declined":
      return { bg: "bg-error/10", text: "text-error", label: "Declined" }
    default:
      return { bg: "bg-surface-container", text: "text-on-surface-variant", label: status }
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return { bg: "bg-[#F59E0B]/10", text: "text-[#D97706]" }
    case "confirmed":
      return { bg: "bg-[#2563EB]/10", text: "text-[#2563EB]" }
    case "completed":
      return { bg: "bg-primary/10", text: "text-primary" }
    case "cancelled":
      return { bg: "bg-error/10", text: "text-error" }
    case "no-show":
      return { bg: "bg-[#7C3AED]/10", text: "text-[#7C3AED]" }
    default:
      return { bg: "bg-surface-container", text: "text-on-surface-variant" }
  }
}

/* ── Print Receipt ── */

function buildPrintHTML(sales: Reservation[], summary: { total: number; paid: number; pending: number; refunded: number; declined: number }, filters: { date: string; paymentFilter: string }) {
  const rows = sales
    .map(
      (s) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-family:monospace;font-size:12px;">${s.reservation_code}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${formatDate(s.reservation_date)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${s.customer_name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${s.court_name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${formatTime(s.start_time)} – ${formatTime(s.end_time)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-transform:capitalize;">${s.payment_status}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:right;font-weight:600;">₱${s.total_amount.toFixed(2)}</td>
    </tr>`
    )
    .join("")

  const filterLabel = filters.date
    ? formatDate(filters.date)
    : filters.paymentFilter
      ? filters.paymentFilter.charAt(0).toUpperCase() + filters.paymentFilter.slice(1)
      : "All"

  return `<!DOCTYPE html>
<html>
<head>
  <title>Velocity Pickleball Hub — Sales Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 40px; color: #1a1a1a; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;">
    <div>
      <h1 style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Sales Report</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#666;">Velocity Pickleball Hub</p>
    </div>
    <div style="text-align:right;">
      <p style="margin:0;font-size:12px;color:#666;">Filter: ${filterLabel}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#666;">Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
    </div>
  </div>

  <div style="display:flex;gap:16px;margin-bottom:28px;">
    <div style="flex:1;padding:14px 18px;background:#f8f8f8;border-radius:8px;">
      <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:600;">Total Revenue</p>
      <p style="margin:6px 0 0;font-size:20px;font-weight:800;">₱${summary.total.toFixed(2)}</p>
    </div>
    <div style="flex:1;padding:14px 18px;background:#f8f8f8;border-radius:8px;">
      <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:600;">Paid</p>
      <p style="margin:6px 0 0;font-size:20px;font-weight:800;color:#16A34A;">₱${summary.paid.toFixed(2)}</p>
    </div>
    <div style="flex:1;padding:14px 18px;background:#f8f8f8;border-radius:8px;">
      <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:600;">Pending</p>
      <p style="margin:6px 0 0;font-size:20px;font-weight:800;color:#D97706;">₱${summary.pending.toFixed(2)}</p>
    </div>
    <div style="flex:1;padding:14px 18px;background:#f8f8f8;border-radius:8px;">
      <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:600;">Refunded</p>
      <p style="margin:6px 0 0;font-size:20px;font-weight:800;color:#DC2626;">₱${summary.refunded.toFixed(2)}</p>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr style="border-bottom:2px solid #e5e5e5;">
        <th style="padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:600;">Code</th>
        <th style="padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:600;">Date</th>
        <th style="padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:600;">Customer</th>
        <th style="padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:600;">Court</th>
        <th style="padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:600;">Time</th>
        <th style="padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:600;">Payment</th>
        <th style="padding:8px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:600;">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="6" style="padding:12px;text-align:right;font-size:13px;font-weight:700;border-top:2px solid #e5e5e5;">Total</td>
        <td style="padding:12px;text-align:right;font-size:15px;font-weight:800;border-top:2px solid #e5e5e5;">₱${summary.total.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>

  <p style="margin-top:40px;font-size:10px;color:#aaa;text-align:center;">Velocity Pickleball Hub — Sales Report</p>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`
}

/* ── Sale Detail Modal ── */

function SaleDetailModal({
  reservation: res,
  onClose,
}: {
  reservation: Reservation | null
  onClose: () => void
}) {
  const stableOnClose = useCallback(onClose, [onClose])

  useEffect(() => {
    if (!res) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") stableOnClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [res, stableOnClose])

  if (!res) return null

  const pb = getPaymentBadge(res.payment_status)
  const sb = getStatusBadge(res.status)

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xl pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant/15 bg-surface-container-lowest px-6 py-5">
            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface">Sale Details</h3>
              <p className="mt-0.5 font-mono text-xs text-on-surface-variant">#{res.reservation_code}</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="space-y-5 p-6">
            {/* Status & Payment badges */}
            <div className="flex items-center gap-2">
              <span className={`rounded px-2 py-1 font-label text-[10px] font-extrabold uppercase tracking-widest ${sb.bg} ${sb.text}`}>
                {res.status}
              </span>
              <span className={`rounded px-2 py-1 font-label text-[10px] font-extrabold uppercase tracking-widest ${pb.bg} ${pb.text}`}>
                {pb.label}
              </span>
            </div>

            {/* Customer Info */}
            <div className="rounded-lg bg-surface-container-low p-4">
              <p className="mb-3 font-label text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">
                Customer
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim/20 font-nav text-xs font-bold text-primary">
                    {res.customer_name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="font-body text-sm font-semibold text-on-surface">{res.customer_name}</p>
                    <p className="font-body text-[11px] text-on-surface-variant">{res.customer_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-12">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant/60">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span className="font-body text-[11px] text-on-surface-variant">{res.customer_phone}</span>
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div className="rounded-lg bg-surface-container-low p-4">
              <p className="mb-3 font-label text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">
                Booking Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-body text-[10px] text-on-surface-variant">Court</span>
                  <p className="font-body text-sm font-semibold text-on-surface">
                    {res.court_name} <span className="font-normal text-xs text-on-surface-variant capitalize">({res.court_type})</span>
                  </p>
                </div>
                <div>
                  <span className="font-body text-[10px] text-on-surface-variant">Type</span>
                  <p className="font-body text-sm font-semibold capitalize text-on-surface">{res.reservation_type}</p>
                </div>
                <div>
                  <span className="font-body text-[10px] text-on-surface-variant">Date</span>
                  <p className="font-body text-sm font-semibold text-on-surface">{formatDate(res.reservation_date)}</p>
                </div>
                <div>
                  <span className="font-body text-[10px] text-on-surface-variant">Time</span>
                  <p className="font-body text-sm font-semibold text-on-surface">{formatTime(res.start_time)} – {formatTime(res.end_time)}</p>
                </div>
                <div>
                  <span className="font-body text-[10px] text-on-surface-variant">Duration</span>
                  <p className="font-body text-sm font-semibold text-on-surface">{res.duration_hours}h</p>
                </div>
                <div>
                  <span className="font-body text-[10px] text-on-surface-variant">Booked</span>
                  <p className="font-body text-xs text-on-surface-variant">
                    {new Date(res.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{" "}
                    {new Date(res.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              {res.notes && (
                <div className="mt-3 border-t border-outline-variant/15 pt-3">
                  <span className="font-body text-[10px] text-on-surface-variant">Notes</span>
                  <p className="mt-0.5 font-body text-xs text-on-surface">{res.notes}</p>
                </div>
              )}
            </div>

            {/* Receipt */}
            <div className="rounded-lg border border-outline-variant/20 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-headline text-xs font-bold text-on-surface">Velocity Pickleball Hub</p>
                  <p className="font-body text-[9px] text-on-surface-variant">Official Receipt</p>
                </div>
                <p className="font-mono text-[9px] text-on-surface-variant">#{res.reservation_code}</p>
              </div>
              <div className="border-t border-dashed border-outline-variant/30 pt-2.5 space-y-1.5">
                <div className="flex justify-between font-body text-[11px]">
                  <span className="text-on-surface-variant">{res.court_name}</span>
                </div>
                <div className="flex justify-between font-body text-[11px]">
                  <span className="text-on-surface-variant">Rate</span>
                  <span className="text-on-surface">₱{res.price_per_hour.toFixed(2)}/hr</span>
                </div>
                <div className="flex justify-between font-body text-[11px]">
                  <span className="text-on-surface-variant">Duration</span>
                  <span className="text-on-surface">{res.duration_hours} hour{res.duration_hours !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <div className="border-t border-outline-variant/30 mt-2.5 pt-2.5 flex justify-between items-center">
                <span className="font-headline text-xs font-bold text-on-surface">Total</span>
                <span className="font-headline text-lg font-extrabold text-primary">₱{res.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Page ── */

export default function SalesPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [dateFilter, setDateFilter] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("")
  const [detailSale, setDetailSale] = useState<Reservation | null>(null)

  const filters = {
    payment_status: (paymentFilter || undefined) as PaymentStatus | undefined,
    date: dateFilter || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
  }

  const { data: result, isLoading } = useReservations(filters)

  // For print: fetch ALL matching records (no pagination)
  const { data: allResult } = useReservations({
    ...filters,
    page: 1,
    limit: 9999,
  })

  const sales = result?.data ?? []
  const allSales = allResult?.data ?? []
  const pagination = result?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 }

  const summary = useMemo(() => {
    const s = { total: 0, paid: 0, pending: 0, refunded: 0, declined: 0 }
    for (const r of allSales) {
      if (r.payment_status === "paid") {
        s.paid += r.total_amount
        s.total += r.total_amount
      } else if (r.payment_status === "pending") {
        s.pending += r.total_amount
      } else if (r.payment_status === "refunded") {
        s.refunded += r.total_amount
      } else if ((r.payment_status as string) === "declined") {
        s.declined += r.total_amount
      }
    }
    return s
  }, [allSales])

  const totalPages = pagination.totalPages
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
    return start + i
  })

  function handlePrint() {
    const html = buildPrintHTML(allSales, summary, { date: dateFilter, paymentFilter })
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
    }
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Detail Modal */}
      <SaleDetailModal reservation={detailSale} onClose={() => setDetailSale(null)} />

      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-primary lg:text-4xl">
            Sales
          </h2>
          <p className="mt-1 font-body text-sm font-medium text-secondary">
            Track revenue and payment history
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="ml-1 font-label text-[10px] font-bold uppercase tracking-widest text-outline">
              Date
            </span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1) }}
              className="h-[38px] rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="ml-1 font-label text-[10px] font-bold uppercase tracking-widest text-outline">
              Payment
            </span>
            <select
              value={paymentFilter}
              onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1) }}
              className="h-[38px] rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 pr-8 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary"
            >
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
              <option value="declined">Declined</option>
            </select>
          </div>

          {(dateFilter || paymentFilter) && (
            <button
              onClick={() => { setDateFilter(""); setPaymentFilter(""); setCurrentPage(1) }}
              className="mt-auto flex h-[38px] items-center gap-1.5 rounded-md bg-surface-container-high px-3 font-nav text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Clear
            </button>
          )}

          <button
            onClick={handlePrint}
            className="mt-auto flex h-[38px] items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-4 font-nav text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-outline">
            Total Revenue
          </p>
          <p className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-on-surface">
            ₱{summary.total.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-[#16A34A]">
            Paid
          </p>
          <p className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-[#16A34A]">
            ₱{summary.paid.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-[#D97706]">
            Pending
          </p>
          <p className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-[#D97706]">
            ₱{summary.pending.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-error">
            Refunded
          </p>
          <p className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-error">
            ₱{summary.refunded.toFixed(2)}
          </p>
        </div>
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <LoadingPage />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant/15 bg-surface-container-lowest">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-outline-variant/15">
                <th className="px-6 py-4 text-left font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Code
                </th>
                <th className="px-6 py-4 text-left font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Date
                </th>
                <th className="px-6 py-4 text-left font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Customer
                </th>
                <th className="px-6 py-4 text-left font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Court
                </th>
                <th className="px-6 py-4 text-left font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Time
                </th>
                <th className="px-6 py-4 text-left font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Status
                </th>
                <th className="px-6 py-4 text-left font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Payment
                </th>
                <th className="px-6 py-4 text-right font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {sales.length > 0 ? (
                sales.map((s) => {
                  const pb = getPaymentBadge(s.payment_status)
                  const sb = getStatusBadge(s.status)
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setDetailSale(s)}
                      className="cursor-pointer border-b border-outline-variant/10 transition-colors hover:bg-surface-container-low/50"
                    >
                      <td className="px-6 py-5">
                        <span className="font-mono text-xs font-semibold text-on-surface">
                          {s.reservation_code}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-body text-sm text-on-surface">
                          {formatDate(s.reservation_date)}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-body text-sm font-medium text-on-surface">{s.customer_name}</p>
                        <p className="mt-0.5 font-body text-[11px] text-on-surface-variant">{s.customer_email}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-body text-sm text-on-surface">{s.court_name}</p>
                        <p className="mt-0.5 font-body text-[10px] capitalize text-on-surface-variant">{s.court_type}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-body text-sm text-on-surface">
                          {formatTime(s.start_time)} – {formatTime(s.end_time)}
                        </span>
                        <p className="mt-0.5 font-body text-[10px] text-on-surface-variant">
                          {s.duration_hours}h
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`rounded px-1.5 py-0.5 font-label text-[9px] font-extrabold uppercase tracking-widest ${sb.bg} ${sb.text}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`rounded px-1.5 py-0.5 font-label text-[9px] font-extrabold uppercase tracking-widest ${pb.bg} ${pb.text}`}>
                          {pb.label}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="font-headline text-sm font-bold text-on-surface">
                          ₱{s.total_amount.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-outline/40">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      <p className="font-nav text-sm font-semibold text-on-surface-variant">
                        No sales found
                      </p>
                      <p className="font-body text-xs text-outline">
                        {dateFilter || paymentFilter
                          ? "Try adjusting your filters"
                          : "Sales will appear here once payments are processed"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {!isLoading && pagination.total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="font-body text-xs font-medium tracking-tight text-on-surface-variant">
            Showing{" "}
            <span className="font-bold text-on-surface">
              {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-bold text-on-surface">{pagination.total}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-outline transition-colors disabled:opacity-50 hover:text-primary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            {pageNumbers.map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg font-nav text-xs font-bold transition-colors ${
                  page === currentPage
                    ? "bg-primary text-on-primary shadow-sm"
                    : "border border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-outline transition-colors disabled:opacity-50 hover:text-primary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
