"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { LoadingPage } from "@/components/ui/loading"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/* ── Types ── */

type CourtStatus = "available" | "occupied" | "maintenance"

interface Court {
  id: string
  name: string
  court_type: string
  status: CourtStatus
  price_per_hour: number
}

interface TodayReservation {
  id: string
  reservation_code: string
  court_id: string
  court_name: string
  court_type: string
  customer_name: string
  start_time: string
  end_time: string
  status: string
  reservation_type: string
  total_amount: number
  duration_hours: number
}

interface RecentReservation {
  id: string
  reservation_code: string
  court_name: string
  customer_name: string
  total_amount: number
  payment_status: string
  status: string
  reservation_type: string
  duration_hours: number
  created_at: string
}

interface DashboardData {
  stats: {
    total_bookings: number
    today_bookings: number
    month_revenue: number
  }
  courts: Court[]
  today_reservations: TodayReservation[]
  recent_reservations: RecentReservation[]
}

/* ── Fetch ── */

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/dashboard")
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to fetch dashboard")
  }
  return res.json()
}

/* ── Helpers ── */

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatTime(time: string) {
  const [h, m] = time.split(":")
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12.toString().padStart(2, "0")}:${m} ${ampm}`
}

function timeToHour(time: string) {
  const [h, m] = time.split(":").map(Number)
  return h + m / 60
}

function getRelativeTime(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return "Just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

/* ── Component ── */

export default function AdminOverview() {
  const [scheduleView, setScheduleView] = useState<"timeline" | "list">("timeline")

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 30000,
  })

  if (isLoading || !data) {
    return <LoadingPage message="Loading dashboard..." />
  }

  const { stats, courts, today_reservations, recent_reservations } = data

  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60

  function getCourtLiveStatus(court: Court) {
    if (court.status === "maintenance") {
      return { status: "maintenance" as CourtStatus, detail: "Under Maintenance" }
    }
    const courtRes = today_reservations.filter((r) => r.court_id === court.id)
    const activeRes = courtRes.find(
      (r) => timeToHour(r.start_time) <= currentHour && timeToHour(r.end_time) > currentHour
    )
    if (activeRes) {
      return { status: "occupied" as CourtStatus, detail: `Until ${formatTime(activeRes.end_time)}` }
    }
    const nextRes = courtRes.find((r) => timeToHour(r.start_time) > currentHour)
    if (nextRes) {
      return { status: "available" as CourtStatus, detail: `Next: ${formatTime(nextRes.start_time)}` }
    }
    return { status: "available" as CourtStatus, detail: "Open" }
  }

  // Timeline slots
  const visibleSlots = (() => {
    if (today_reservations.length === 0) return [7, 8, 9, 10, 11, 12]
    const minHour = Math.max(6, Math.floor(Math.min(...today_reservations.map((r) => timeToHour(r.start_time)))))
    const maxHour = Math.min(22, Math.ceil(Math.max(...today_reservations.map((r) => timeToHour(r.end_time)))) + 1)
    const slots = []
    for (let h = minHour; h < maxHour; h++) slots.push(h)
    return slots.length > 0 ? slots : [7, 8, 9, 10, 11, 12]
  })()

  const todayFormatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary lg:text-4xl">
            Dashboard
          </h1>
          <p className="mt-1 font-body text-sm font-medium text-secondary">
            {todayFormatted}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/reservations"
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-4 py-2 font-nav text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Reservations
          </Link>
          <Link
            href="/admin/courts"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-nav text-[11px] font-semibold uppercase tracking-wider text-on-primary shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/25 active:scale-[0.98]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Courts
          </Link>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Bookings */}
        <div className="rounded-xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/20">
          <p className="font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">
            Total Bookings
          </p>
          <p className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-on-surface">
            {stats.total_bookings.toLocaleString()}
          </p>
          <p className="mt-1 font-body text-[11px] text-on-surface-variant">Lifetime</p>
        </div>

        {/* Today */}
        <div className="rounded-xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/20">
          <p className="font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">
            Today
          </p>
          <p className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-primary">
            {stats.today_bookings}
          </p>
          <p className="mt-1 font-body text-[11px] text-on-surface-variant">Scheduled today</p>
        </div>

        {/* Revenue */}
        <div className="rounded-xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/20">
          <p className="font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">
            Monthly Revenue
          </p>
          <p className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-on-surface">
            {formatCurrency(stats.month_revenue)}
          </p>
          <p className="mt-1 font-body text-[11px] text-on-surface-variant">
            {now.toLocaleDateString("en-US", { month: "long" })}
          </p>
        </div>
      </div>

      {/* ── Courts Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline text-lg font-bold text-on-surface">Court Status</h2>
          <div className="flex items-center gap-4">
            {[
              { label: "Available", color: "bg-primary" },
              { label: "Occupied", color: "bg-[#C49B00]" },
              { label: "Maintenance", color: "bg-error" },
            ].map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${l.color}`} />
                <span className="font-body text-[10px] text-on-surface-variant">{l.label}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {courts.map((court) => {
            const live = getCourtLiveStatus(court)
            const dotColor = live.status === "available" ? "bg-primary" : live.status === "occupied" ? "bg-[#C49B00]" : "bg-error"
            const textColor = live.status === "available" ? "text-primary" : live.status === "occupied" ? "text-[#C49B00]" : "text-error"

            return (
              <div
                key={court.id}
                className="rounded-xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/20 transition-all hover:ring-outline-variant/40"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-headline text-sm font-bold text-on-surface">{court.name}</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                </div>
                <p className="font-label text-[9px] font-medium uppercase tracking-widest text-on-surface-variant">
                  {court.court_type}
                </p>
                <p className={`mt-1 font-body text-[11px] font-semibold ${textColor}`}>
                  {live.detail}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Schedule + Activity ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        {/* Live Schedule */}
        <Card className="border-none shadow-none ring-1 ring-outline-variant/20 bg-surface-container-lowest overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-outline-variant/10 px-5 py-4 space-y-0">
            <CardTitle className="font-headline text-base font-bold text-on-surface">
              Today&apos;s Schedule
            </CardTitle>
            <div className="flex rounded-lg bg-surface-container-high p-0.5">
              {(["timeline", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setScheduleView(v)}
                  className={`px-3 py-1 rounded-md font-nav text-[10px] font-semibold uppercase tracking-wider transition-all ${
                    scheduleView === v
                      ? "bg-surface-container-lowest text-on-surface shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {scheduleView === "timeline" ? (
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* Time header */}
                  <div
                    className="border-b border-outline-variant/10 bg-surface-container-low/30"
                    style={{ display: "grid", gridTemplateColumns: `160px repeat(${visibleSlots.length}, 1fr)` }}
                  >
                    <div className="px-5 py-3 font-label text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Court
                    </div>
                    {visibleSlots.map((hour) => (
                      <div key={hour} className="border-l border-outline-variant/10 px-2 py-3 text-center font-label text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                        {hour.toString().padStart(2, "0")}:00
                      </div>
                    ))}
                  </div>

                  {/* Court rows */}
                  <div className="divide-y divide-outline-variant/8">
                    {courts.map((court) => {
                      const courtRes = today_reservations.filter((r) => r.court_id === court.id)
                      return (
                        <div
                          key={court.id}
                          className="hover:bg-surface-container-low/20 transition-colors"
                          style={{ display: "grid", gridTemplateColumns: `160px repeat(${visibleSlots.length}, 1fr)` }}
                        >
                          <div className="flex flex-col justify-center px-5 py-5 border-r border-outline-variant/10">
                            <p className="font-headline text-xs font-bold text-on-surface">{court.name}</p>
                            <p className="font-label text-[9px] font-medium uppercase tracking-wider text-on-surface-variant mt-0.5">{court.court_type}</p>
                          </div>

                          <div className="relative h-16" style={{ gridColumn: `span ${visibleSlots.length}` }}>
                            {/* Grid lines */}
                            <div className="absolute inset-0 pointer-events-none" style={{ display: "grid", gridTemplateColumns: `repeat(${visibleSlots.length}, 1fr)` }}>
                              {visibleSlots.map((_, i) => (
                                <div key={i} className="border-l border-outline-variant/8 h-full" />
                              ))}
                            </div>

                            {/* Reservation blocks */}
                            {courtRes.map((res) => {
                              const startH = timeToHour(res.start_time)
                              const endH = timeToHour(res.end_time)
                              const leftPercent = ((startH - visibleSlots[0]) / visibleSlots.length) * 100
                              const widthPercent = ((endH - startH) / visibleSlots.length) * 100
                              const isActive = startH <= currentHour && endH > currentHour

                              return (
                                <div
                                  key={res.id}
                                  className={`absolute top-2 bottom-2 rounded-md px-2.5 py-1.5 transition-all cursor-default ${
                                    isActive
                                      ? "bg-primary/15 ring-1 ring-primary/30"
                                      : "bg-surface-container-high ring-1 ring-outline-variant/20"
                                  }`}
                                  style={{
                                    left: `calc(${leftPercent}% + 4px)`,
                                    width: `calc(${widthPercent}% - 8px)`,
                                  }}
                                >
                                  <p className={`font-nav text-[9px] font-bold truncate ${isActive ? "text-primary" : "text-on-surface"}`}>
                                    {res.customer_name}
                                  </p>
                                  <p className="font-body text-[8px] text-on-surface-variant mt-0.5">
                                    {formatTime(res.start_time)} – {formatTime(res.end_time)}
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {today_reservations.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-outline-variant/30 mb-3">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <p className="font-nav text-xs font-medium text-on-surface-variant">No reservations today</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* List view */
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-outline-variant/10 bg-surface-container-low/30">
                      <th className="px-5 py-3 font-label text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Court</th>
                      <th className="px-5 py-3 font-label text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Customer</th>
                      <th className="px-5 py-3 font-label text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Time</th>
                      <th className="px-5 py-3 text-center font-label text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/8">
                    {today_reservations
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map((res) => (
                        <tr key={res.id} className="hover:bg-surface-container-low/20 transition-colors">
                          <td className="px-5 py-4 font-headline text-xs font-bold text-on-surface">{res.court_name}</td>
                          <td className="px-5 py-4 font-body text-xs text-on-surface">{res.customer_name}</td>
                          <td className="px-5 py-4 font-body text-xs text-on-surface-variant">
                            {formatTime(res.start_time)} – {formatTime(res.end_time)}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-block rounded px-2 py-0.5 font-label text-[9px] font-bold uppercase tracking-widest ${
                              res.status === "confirmed" || res.status === "completed"
                                ? "bg-primary/10 text-primary"
                                : res.status === "pending"
                                ? "bg-[#C49B00]/10 text-[#C49B00]"
                                : "bg-error/10 text-error"
                            }`}>
                              {res.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {today_reservations.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-16 text-center font-nav text-xs font-medium text-on-surface-variant">
                          No reservations today
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-none shadow-none ring-1 ring-outline-variant/20 bg-surface-container-lowest overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-outline-variant/10 px-5 py-4 space-y-0">
            <CardTitle className="font-headline text-base font-bold text-on-surface">
              Recent Activity
            </CardTitle>
            <Link
              href="/admin/reservations"
              className="font-nav text-[10px] font-semibold uppercase tracking-wider text-primary transition-colors hover:text-primary/80"
            >
              View all
            </Link>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-outline-variant/8">
              {recent_reservations.map((res) => (
                <div key={res.id} className="flex items-center gap-3 px-5 py-4 hover:bg-surface-container-low/20 transition-colors">
                  {/* Status dot */}
                  <div className={`h-2 w-2 shrink-0 rounded-full ${
                    res.payment_status === "paid" ? "bg-primary" :
                    res.payment_status === "refunded" ? "bg-error" : "bg-[#C49B00]"
                  }`} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-nav text-xs font-semibold text-on-surface">
                      {res.customer_name}
                    </p>
                    <p className="truncate font-body text-[10px] text-on-surface-variant">
                      {res.court_name} · {getRelativeTime(res.created_at)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-headline text-xs font-bold text-on-surface">
                      {formatCurrency(res.total_amount)}
                    </p>
                    <p className={`font-label text-[9px] font-bold uppercase tracking-widest ${
                      res.payment_status === "paid" ? "text-primary" :
                      res.payment_status === "refunded" ? "text-error" : "text-[#C49B00]"
                    }`}>
                      {res.payment_status}
                    </p>
                  </div>
                </div>
              ))}

              {recent_reservations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <p className="font-nav text-xs font-medium text-on-surface-variant">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
