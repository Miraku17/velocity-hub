"use client"

import { useQuery } from "@tanstack/react-query"
import { LoadingPage } from "@/components/ui/loading"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

interface DayOfWeekData {
  day: number
  label: string
  count: number
  hours: number
}

interface TimeSlotData {
  hour: number
  label: string
  count: number
  hours: number
}

interface Analytics {
  month_booked_hours: number
  month_total_hours: number
  month_booking_count: number
  by_day_of_week: DayOfWeekData[]
  by_time_slot: TimeSlotData[]
}

interface DashboardData {
  stats: {
    total_bookings: number
    today_bookings: number
    month_revenue: number
  }
  analytics: Analytics
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
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 30000,
  })

  if (isLoading || !data) {
    return <LoadingPage message="Loading dashboard..." />
  }

  const { stats, analytics, courts, today_reservations, recent_reservations } = data

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

      {/* ── Monthly Insights ── */}
      <div>
        <div className="flex items-baseline gap-2 mb-4">
          <h2 className="font-headline text-lg font-bold text-on-surface">
            Monthly Insights
          </h2>
          <span className="font-body text-xs text-on-surface-variant">
            {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Utilization Card */}
          <div className="rounded-xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/20">
            <p className="font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">
              Court Utilization
            </p>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
                {analytics.month_booked_hours}
              </span>
              <span className="font-body text-sm text-on-surface-variant">
                / {analytics.month_total_hours} hrs
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${analytics.month_total_hours > 0 ? Math.min((analytics.month_booked_hours / analytics.month_total_hours) * 100, 100) : 0}%`,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="font-body text-[11px] text-on-surface-variant">
                {analytics.month_booking_count} bookings
              </p>
              <p className="font-headline text-xs font-bold text-primary">
                {analytics.month_total_hours > 0
                  ? Math.round((analytics.month_booked_hours / analytics.month_total_hours) * 100)
                  : 0}%
              </p>
            </div>
          </div>

          {/* Busiest Days */}
          <div className="rounded-xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/20">
            <p className="font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant mb-3">
              Bookings by Day
            </p>
            <div className="space-y-2">
              {(() => {
                const maxCount = Math.max(...analytics.by_day_of_week.map((d) => d.count), 1)
                return analytics.by_day_of_week.map((d) => (
                  <div key={d.day} className="flex items-center gap-2">
                    <span className="w-8 shrink-0 font-label text-[10px] font-semibold text-on-surface-variant">
                      {d.label}
                    </span>
                    <div className="flex-1 h-4 rounded bg-surface-container-high overflow-hidden">
                      <div
                        className={`h-full rounded transition-all ${
                          d.count === maxCount && d.count > 0 ? "bg-primary" : "bg-primary/40"
                        }`}
                        style={{ width: `${maxCount > 0 ? (d.count / maxCount) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right font-headline text-[11px] font-bold text-on-surface">
                      {d.count}
                    </span>
                  </div>
                ))
              })()}
            </div>
            {(() => {
              const sorted = [...analytics.by_day_of_week].sort((a, b) => b.count - a.count)
              const busiest = sorted[0]
              const slowest = sorted.filter((d) => d.count > 0).pop() ?? sorted[sorted.length - 1]
              return (
                <div className="mt-3 flex items-center justify-between border-t border-outline-variant/10 pt-3">
                  <p className="font-body text-[10px] text-on-surface-variant">
                    Peak: <span className="font-semibold text-primary">{busiest?.label}</span>
                  </p>
                  <p className="font-body text-[10px] text-on-surface-variant">
                    Slowest: <span className="font-semibold text-error">{slowest?.label}</span>
                  </p>
                </div>
              )
            })()}
          </div>

          {/* Busiest Times */}
          <div className="rounded-xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/20">
            <p className="font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant mb-3">
              Bookings by Time
            </p>
            <div className="space-y-1.5">
              {(() => {
                const maxCount = Math.max(...analytics.by_time_slot.map((s) => s.count), 1)
                return analytics.by_time_slot.map((s) => (
                  <div key={s.hour} className="flex items-center gap-2">
                    <span className="w-10 shrink-0 font-label text-[9px] font-semibold text-on-surface-variant">
                      {s.label}
                    </span>
                    <div className="flex-1 h-3 rounded bg-surface-container-high overflow-hidden">
                      <div
                        className={`h-full rounded transition-all ${
                          s.count === maxCount && s.count > 0 ? "bg-primary" : "bg-primary/40"
                        }`}
                        style={{ width: `${maxCount > 0 ? (s.count / maxCount) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-5 shrink-0 text-right font-headline text-[10px] font-bold text-on-surface">
                      {s.count}
                    </span>
                  </div>
                ))
              })()}
            </div>
            {(() => {
              const sorted = [...analytics.by_time_slot].sort((a, b) => b.count - a.count)
              const peak = sorted[0]
              const slowest = sorted.filter((s) => s.count > 0).pop() ?? sorted[sorted.length - 1]
              return (
                <div className="mt-3 flex items-center justify-between border-t border-outline-variant/10 pt-3">
                  <p className="font-body text-[10px] text-on-surface-variant">
                    Peak: <span className="font-semibold text-primary">{peak?.label}</span>
                  </p>
                  <p className="font-body text-[10px] text-on-surface-variant">
                    Slowest: <span className="font-semibold text-error">{slowest?.label}</span>
                  </p>
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* ── Courts Grid ── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-headline text-lg font-bold text-on-surface">Court Status</h2>
          <div className="flex items-center gap-3 sm:gap-4">
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

      {/* ── Recent Activity ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
