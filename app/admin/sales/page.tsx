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

/* ── Print Report ── */

function buildPrintHTML(
  sales: Reservation[],
  summary: { total: number; paid: number; pending: number; refunded: number; declined: number },
  filters: { date: string; week: string; month: string; paymentFilter: string },
) {
  const filterParts: string[] = []
  if (filters.month) {
    const [y, m] = filters.month.split("-").map(Number)
    filterParts.push(new Date(y, m - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }))
  }
  if (filters.week) filterParts.push(`Week ${filters.week}`)
  if (filters.date) filterParts.push(formatDate(filters.date))
  if (filters.paymentFilter) filterParts.push(filters.paymentFilter.charAt(0).toUpperCase() + filters.paymentFilter.slice(1))
  const periodLabel = filterParts.length ? filterParts.join("  ·  ") : "All Time"
  const generatedAt = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

  /* ── Aggregate breakdowns ── */

  // By court
  const byCourt = new Map<string, { bookings: number; hours: number; revenue: number; paid: number }>()
  // By reservation status
  const byStatus = new Map<string, { bookings: number; revenue: number }>()
  // By reservation type
  const byType = new Map<string, { bookings: number; revenue: number }>()
  // By court type
  const byCourtType = new Map<string, { bookings: number; revenue: number; paid: number }>()

  for (const s of sales) {
    // court
    const court = byCourt.get(s.court_name) ?? { bookings: 0, hours: 0, revenue: 0, paid: 0 }
    court.bookings++
    court.hours += s.duration_hours
    if (s.payment_status === "paid") { court.revenue += s.total_amount; court.paid += s.total_amount }
    byCourt.set(s.court_name, court)

    // status
    const st = byStatus.get(s.status) ?? { bookings: 0, revenue: 0 }
    st.bookings++
    if (s.payment_status === "paid") st.revenue += s.total_amount
    byStatus.set(s.status, st)

    // type
    const tp = byType.get(s.reservation_type) ?? { bookings: 0, revenue: 0 }
    tp.bookings++
    if (s.payment_status === "paid") tp.revenue += s.total_amount
    byType.set(s.reservation_type, tp)

    // court type
    const ct = byCourtType.get(s.court_type) ?? { bookings: 0, revenue: 0, paid: 0 }
    ct.bookings++
    if (s.payment_status === "paid") { ct.revenue += s.total_amount; ct.paid += s.total_amount }
    byCourtType.set(s.court_type, ct)
  }

  const fmt = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
  const pct = (n: number, total: number) => total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "0%"

  const totalBookings = sales.length
  const totalHours = sales.reduce((a, s) => a + s.duration_hours, 0)

  const courtRows = [...byCourt.entries()]
    .sort((a, b) => b[1].paid - a[1].paid)
    .map(([name, d], i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"};">
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;color:#111827;">${name}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;text-align:center;">${d.bookings}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;text-align:center;">${d.hours}h</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:700;color:#15803d;text-align:right;">${fmt(d.paid)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#6b7280;text-align:right;">${pct(d.paid, summary.total)}</td>
      </tr>`).join("")

  const statusOrder = ["completed", "confirmed", "pending", "cancelled", "no-show"]
  const statusColors: Record<string, string> = {
    completed: "#15803d", confirmed: "#1d4ed8", pending: "#a16207", cancelled: "#dc2626", "no-show": "#7c3aed"
  }
  const statusRows = statusOrder
    .filter(s => byStatus.has(s))
    .map((s, i) => {
      const d = byStatus.get(s)!
      return `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"};">
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">
          <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${statusColors[s] ?? "#374151"};background:${statusColors[s] ?? "#374151"}18;">${s}</span>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;text-align:center;">${d.bookings}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#6b7280;text-align:center;">${pct(d.bookings, totalBookings)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:700;color:#111827;text-align:right;">${fmt(d.revenue)}</td>
      </tr>`
    }).join("")

  const typeLabels: Record<string, string> = { regular: "Regular", "walk-in": "Walk-in", priority: "Priority" }
  const typeRows = [...byType.entries()]
    .sort((a, b) => b[1].bookings - a[1].bookings)
    .map(([type, d], i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"};">
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;color:#111827;">${typeLabels[type] ?? type}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;text-align:center;">${d.bookings}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#6b7280;text-align:center;">${pct(d.bookings, totalBookings)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:700;color:#111827;text-align:right;">${fmt(d.revenue)}</td>
      </tr>`).join("")

  const courtTypeRows = [...byCourtType.entries()]
    .sort((a, b) => b[1].paid - a[1].paid)
    .map(([type, d], i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"};">
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;color:#111827;text-transform:capitalize;">${type}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;text-align:center;">${d.bookings}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#6b7280;text-align:center;">${pct(d.bookings, totalBookings)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:700;color:#111827;text-align:right;">${fmt(d.paid)}</td>
      </tr>`).join("")

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sales Summary — Velocity Pickleball Hub</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #fff; color: #111827; }
    @page { margin: 18mm 16mm; size: A4 portrait; }
    @media print { body { font-size: 11px; } tr { page-break-inside: avoid; } }
    .page { padding: 32px 40px 48px; max-width: 780px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 18px; border-bottom: 3px solid #111827; margin-bottom: 28px; }
    .brand-name { font-size: 18px; font-weight: 900; letter-spacing: -0.5px; }
    .brand-sub { font-size: 10px; color: #6b7280; margin-top: 3px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
    .meta-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; text-align: right; }
    .meta-line { font-size: 11px; color: #6b7280; margin-top: 3px; text-align: right; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
    .kpi { padding: 14px 16px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .kpi-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #6b7280; }
    .kpi-value { font-size: 22px; font-weight: 900; margin-top: 5px; letter-spacing: -0.5px; }
    .kpi-sub { font-size: 10px; color: #9ca3af; margin-top: 3px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #6b7280; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; margin-bottom: 0; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 8px 14px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; font-weight: 700; background: #f9fafb; }
    th:not(:first-child) { text-align: center; }
    th:last-child { text-align: right; }
    .cols-2grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
    .footer span { font-size: 9px; color: #d1d5db; text-transform: uppercase; letter-spacing: 1px; }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand-name">Velocity Pickleball Hub</div>
      <div class="brand-sub">Sales Summary Report</div>
    </div>
    <div>
      <div class="meta-title">Summary Report</div>
      <div class="meta-line">Period: ${periodLabel}</div>
      <div class="meta-line">Generated: ${generatedAt}</div>
    </div>
  </div>

  <!-- KPIs -->
  <div class="kpi-grid">
    <div class="kpi" style="border-color:#e5e7eb;">
      <div class="kpi-label">Total Revenue (Paid)</div>
      <div class="kpi-value" style="color:#111827;">${fmt(summary.total)}</div>
      <div class="kpi-sub">${totalBookings} booking${totalBookings !== 1 ? "s" : ""}  ·  ${totalHours}h total</div>
    </div>
    <div class="kpi" style="border-color:#bbf7d0;">
      <div class="kpi-label">Paid</div>
      <div class="kpi-value" style="color:#15803d;">${fmt(summary.paid)}</div>
      <div class="kpi-sub">${pct(summary.paid, summary.paid + summary.pending + summary.refunded + summary.declined)} of all charges</div>
    </div>
    <div class="kpi" style="border-color:#fde68a;">
      <div class="kpi-label">Pending</div>
      <div class="kpi-value" style="color:#a16207;">${fmt(summary.pending)}</div>
      <div class="kpi-sub">Awaiting payment</div>
    </div>
    <div class="kpi" style="border-color:#fecaca;">
      <div class="kpi-label">Refunded</div>
      <div class="kpi-value" style="color:#dc2626;">${fmt(summary.refunded)}</div>
      <div class="kpi-sub">&nbsp;</div>
    </div>
    <div class="kpi" style="border-color:#fecaca;">
      <div class="kpi-label">Declined</div>
      <div class="kpi-value" style="color:#dc2626;">${fmt(summary.declined)}</div>
      <div class="kpi-sub">&nbsp;</div>
    </div>
    <div class="kpi" style="border-color:#e5e7eb;">
      <div class="kpi-label">Avg. per Booking</div>
      <div class="kpi-value" style="color:#111827;">${fmt(totalBookings > 0 ? summary.total / totalBookings : 0)}</div>
      <div class="kpi-sub">Paid bookings only</div>
    </div>
  </div>

  <!-- Revenue by Court -->
  <div class="section">
    <div class="section-title">Revenue by Court</div>
    <table>
      <thead><tr>
        <th>Court</th><th>Bookings</th><th>Hours</th><th style="text-align:right;">Revenue (Paid)</th><th style="text-align:right;">Share</th>
      </tr></thead>
      <tbody>${courtRows || '<tr><td colspan="5" style="padding:12px 14px;font-size:12px;color:#9ca3af;">No data</td></tr>'}</tbody>
    </table>
  </div>

  <!-- Side-by-side: Status + Type -->
  <div class="cols-2grid">
    <div>
      <div class="section-title">Bookings by Status</div>
      <table>
        <thead><tr><th>Status</th><th>Bookings</th><th>%</th><th style="text-align:right;">Revenue</th></tr></thead>
        <tbody>${statusRows || '<tr><td colspan="4" style="padding:12px 14px;font-size:12px;color:#9ca3af;">No data</td></tr>'}</tbody>
      </table>
    </div>
    <div>
      <div class="section-title">Bookings by Type</div>
      <table>
        <thead><tr><th>Type</th><th>Bookings</th><th>%</th><th style="text-align:right;">Revenue</th></tr></thead>
        <tbody>${typeRows || '<tr><td colspan="4" style="padding:12px 14px;font-size:12px;color:#9ca3af;">No data</td></tr>'}</tbody>
      </table>
    </div>
  </div>

  <!-- By Court Type -->
  <div class="section">
    <div class="section-title">Revenue by Court Type</div>
    <table>
      <thead><tr><th>Court Type</th><th>Bookings</th><th>%</th><th style="text-align:right;">Revenue (Paid)</th></tr></thead>
      <tbody>${courtTypeRows || '<tr><td colspan="4" style="padding:12px 14px;font-size:12px;color:#9ca3af;">No data</td></tr>'}</tbody>
    </table>
  </div>

  <div class="footer">
    <span>Velocity Pickleball Hub</span>
    <span>Computer-generated — no signature required</span>
  </div>
</div>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`
}

/* ── CSV Export ── */

function exportCSV(sales: Reservation[], filters: { date: string; week: string; month: string; paymentFilter: string }) {
  const headers = [
    "Code", "Date", "Customer Name", "Email", "Phone",
    "Court", "Court Type", "Start Time", "End Time", "Duration (hrs)",
    "Reservation Type", "Status", "Payment Status",
    "Rate/hr (PHP)", "Total Amount (PHP)", "Notes", "Created At",
  ]

  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? "")
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const rows = sales.map((s) => [
    s.reservation_code,
    s.reservation_date,
    s.customer_name,
    s.customer_email,
    s.customer_phone,
    s.court_name,
    s.court_type,
    s.start_time,
    s.end_time,
    s.duration_hours,
    s.reservation_type,
    s.status,
    s.payment_status,
    s.price_per_hour.toFixed(2),
    s.total_amount.toFixed(2),
    s.notes ?? "",
    new Date(s.created_at).toISOString(),
  ].map(escape).join(","))

  const csv = [headers.join(","), ...rows].join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const datePart = filters.month ? `_${filters.month}` : filters.week ? `_${filters.week}` : filters.date ? `_${filters.date}` : ""
  const payPart = filters.paymentFilter ? `_${filters.paymentFilter}` : ""
  a.href = url
  a.download = `sales_report${datePart}${payPart}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
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
  const [weekFilter, setWeekFilter] = useState("")
  const [monthFilter, setMonthFilter] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("")
  const [detailSale, setDetailSale] = useState<Reservation | null>(null)

  const filters = {
    payment_status: (paymentFilter || undefined) as PaymentStatus | undefined,
    date: dateFilter || undefined,
    week: weekFilter || undefined,
    month: monthFilter || undefined,
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
    const html = buildPrintHTML(allSales, summary, { date: dateFilter, week: weekFilter, month: monthFilter, paymentFilter })
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
    }
  }

  function handleExportCSV() {
    exportCSV(allSales, { date: dateFilter, week: weekFilter, month: monthFilter, paymentFilter })
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
              Month
            </span>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => { setMonthFilter(e.target.value); setWeekFilter(""); setDateFilter(""); setCurrentPage(1) }}
              className="h-[38px] rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="ml-1 font-label text-[10px] font-bold uppercase tracking-widest text-outline">
              Week
            </span>
            <input
              type="week"
              value={weekFilter}
              onChange={(e) => { setWeekFilter(e.target.value); setMonthFilter(""); setDateFilter(""); setCurrentPage(1) }}
              className="h-[38px] rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="ml-1 font-label text-[10px] font-bold uppercase tracking-widest text-outline">
              Date
            </span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setWeekFilter(""); setMonthFilter(""); setCurrentPage(1) }}
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

          {(dateFilter || weekFilter || monthFilter || paymentFilter) && (
            <button
              onClick={() => { setDateFilter(""); setWeekFilter(""); setMonthFilter(""); setPaymentFilter(""); setCurrentPage(1) }}
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
            onClick={handleExportCSV}
            className="mt-auto flex h-[38px] items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-4 font-nav text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant transition-colors hover:border-[#16A34A] hover:text-[#16A34A]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>

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
      <div className="mb-6 grid grid-cols-2 gap-3">
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
                        {dateFilter || monthFilter || paymentFilter
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
