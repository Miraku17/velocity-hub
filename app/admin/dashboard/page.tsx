"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Calendar,
  Activity,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  LayoutList,
  CalendarRange,
  XCircle,
  Ban,
} from "lucide-react"
import { LoadingPage } from "@/components/ui/loading"
import Link from "next/link"

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

const statusLabel: Record<CourtStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  maintenance: "Maintenance",
}

const statusBorder: Record<CourtStatus, string> = {
  available: "border-l-primary",
  occupied: "border-l-[#6B5B00]",
  maintenance: "border-l-error",
}

const statusIcon: Record<CourtStatus, React.ReactNode> = {
  available: <CheckCircle className="h-3.5 w-3.5 text-primary" />,
  occupied: <Clock className="h-3.5 w-3.5 text-[#6B5B00]" />,
  maintenance: <AlertTriangle className="h-3.5 w-3.5 text-error" />,
}

const paymentStatusColor: Record<string, string> = {
  paid: "text-primary",
  pending: "text-[#6B5B00]",
  refunded: "text-error",
}

const activityIcon: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  paid: {
    icon: <CheckCircle className="h-4 w-4" />,
    bg: "bg-primary/10",
    color: "text-primary",
  },
  pending: {
    icon: <Clock className="h-4 w-4" />,
    bg: "bg-[#6B5B00]/10",
    color: "text-[#6B5B00]",
  },
  refunded: {
    icon: <XCircle className="h-4 w-4" />,
    bg: "bg-error/10",
    color: "text-error",
  },
}

const reservationStatusIcon: Record<string, { icon: React.ReactNode; color: string }> = {
  confirmed: { icon: <CheckCircle className="h-3.5 w-3.5" />, color: "text-primary" },
  completed: { icon: <CheckCircle className="h-3.5 w-3.5" />, color: "text-primary" },
  cancelled: { icon: <Ban className="h-3.5 w-3.5" />, color: "text-error" },
  "no-show": { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-[#6B5B00]" },
}

/* ── Component ── */

export default function AdminOverview() {
  const [scheduleView, setScheduleView] = useState<"timeline" | "list">("timeline")

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 30000, // refresh every 30s
  })

  if (isLoading || !data) {
    return <LoadingPage message="Loading dashboard..." />
  }

  const { stats, courts, today_reservations, recent_reservations } = data

  // Determine court status based on current reservations
  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60

  function getCourtDetail(court: Court) {
    if (court.status === "maintenance") {
      return { detail: "Under Maintenance", detailColor: "text-error" }
    }

    const courtRes = today_reservations.filter((r) => r.court_id === court.id)
    const activeRes = courtRes.find(
      (r) => timeToHour(r.start_time) <= currentHour && timeToHour(r.end_time) > currentHour
    )

    if (activeRes) {
      return {
        detail: `Ends: ${formatTime(activeRes.end_time)}`,
        detailColor: "text-[#6B5B00]",
        effectiveStatus: "occupied" as CourtStatus,
      }
    }

    const nextRes = courtRes.find((r) => timeToHour(r.start_time) > currentHour)
    if (nextRes) {
      return {
        detail: `Next: ${formatTime(nextRes.start_time)}`,
        detailColor: "text-primary",
      }
    }

    return { detail: "Open Now", detailColor: "text-primary" }
  }

  // Build schedule timeline
  const scheduleStartHour = 6
  const scheduleEndHour = 22
  const timeSlots = Array.from(
    { length: scheduleEndHour - scheduleStartHour },
    (_, i) => scheduleStartHour + i
  )

  // Only show occupied hours in timeline (6AM - 10PM)
  const visibleSlots = (() => {
    if (today_reservations.length === 0) return [7, 8, 9, 10, 11, 12]
    const minHour = Math.max(
      scheduleStartHour,
      Math.floor(Math.min(...today_reservations.map((r) => timeToHour(r.start_time))))
    )
    const maxHour = Math.min(
      scheduleEndHour,
      Math.ceil(Math.max(...today_reservations.map((r) => timeToHour(r.end_time)))) + 1
    )
    const slots = []
    for (let h = minHour; h < maxHour; h++) slots.push(h)
    return slots.length > 0 ? slots : [7, 8, 9, 10, 11, 12]
  })()

  const todayFormatted = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  const statCards = [
    {
      label: "Total Bookings",
      value: stats.total_bookings.toLocaleString(),
      icon: <Calendar className="h-5 w-5" />,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Today's Bookings",
      value: stats.today_bookings.toString(),
      icon: <Activity className="h-5 w-5" />,
      iconBg: "bg-[#6B5B00]/10",
      iconColor: "text-[#6B5B00]",
    },
    {
      label: "Revenue (Current Mo.)",
      value: formatCurrency(stats.month_revenue),
      icon: <DollarSign className="h-5 w-5" />,
      iconBg: "bg-[#4A2462]/10",
      iconColor: "text-[#4A2462]",
    },
  ]

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface font-headline">Overview</h1>
        <p className="text-sm text-on-surface-variant font-body">
          Manage your bookings and view court activity.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconColor}`}
            >
              {stat.icon}
            </div>
            <div>
              <p className="font-label text-xs font-medium uppercase tracking-[0.1em] text-on-surface-variant mb-1">
                {stat.label}
              </p>
              <p className="font-headline text-3xl font-bold tracking-tight text-on-surface">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Court Real-Time Status ── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-label text-sm font-semibold uppercase tracking-[0.1em] text-on-surface">
            Court Real-Time Status
          </h2>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Available
            </span>
            <span className="flex items-center gap-1.5 font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
              <span className="h-2 w-2 rounded-full bg-[#6B5B00]" />
              Occupied
            </span>
            <span className="flex items-center gap-1.5 font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
              <span className="h-2 w-2 rounded-full bg-error" />
              Maintenance
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {courts.map((court) => {
            const courtDetail = getCourtDetail(court)
            const effectiveStatus = courtDetail.effectiveStatus ?? court.status

            return (
              <div
                key={court.id}
                className={`flex flex-col rounded-xl border border-outline-variant/20 border-l-[4px] bg-surface-container-lowest p-5 shadow-sm hover:shadow-md transition-shadow ${statusBorder[effectiveStatus]}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
                    {court.name}
                  </p>
                  {statusIcon[effectiveStatus]}
                </div>
                <p className="font-headline text-lg font-semibold text-on-surface leading-tight">
                  {statusLabel[effectiveStatus]}
                </p>
                <p className={`mt-1 font-body text-xs font-medium ${courtDetail.detailColor}`}>
                  {courtDetail.detail}
                </p>
              </div>
            )
          })}

          {courts.length === 0 && (
            <div className="col-span-full flex flex-col items-center gap-2 py-8">
              <p className="font-nav text-xs font-medium text-on-surface-variant">
                No courts configured yet
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Schedule + Activity ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        {/* Live Master Schedule */}
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest flex flex-col shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/15 p-5">
            <div>
              <h2 className="font-headline text-lg font-semibold text-on-surface flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-on-surface-variant" />
                Live Master Schedule
              </h2>
              <p className="mt-1 font-body text-xs text-on-surface-variant">
                {todayFormatted} &bull; Real-time tracking
              </p>
            </div>
            <div className="flex overflow-hidden rounded-lg border border-outline-variant/30 p-1 bg-surface-container-lowest">
              <button
                onClick={() => setScheduleView("timeline")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-nav text-xs font-medium transition-colors ${
                  scheduleView === "timeline"
                    ? "bg-surface-container-highest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                <CalendarRange className="h-3.5 w-3.5" />
                Timeline
              </button>
              <button
                onClick={() => setScheduleView("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-nav text-xs font-medium transition-colors ${
                  scheduleView === "list"
                    ? "bg-surface-container-highest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
                List
              </button>
            </div>
          </div>

          <div className="flex-1">
            {scheduleView === "timeline" ? (
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  {/* Time header row */}
                  <div
                    className="border-b border-outline-variant/15 bg-surface-container-lowest/50"
                    style={{
                      display: "grid",
                      gridTemplateColumns: `160px repeat(${visibleSlots.length}, 1fr)`,
                    }}
                  >
                    <div className="px-5 py-3 font-label text-[10px] font-medium uppercase tracking-[0.1em] text-on-surface-variant">
                      Courts / Time
                    </div>
                    {visibleSlots.map((hour) => (
                      <div
                        key={hour}
                        className="border-l border-outline-variant/10 px-3 py-3 text-center font-label text-[10px] font-medium uppercase tracking-[0.1em] text-on-surface-variant"
                      >
                        {hour.toString().padStart(2, "0")}:00
                      </div>
                    ))}
                  </div>

                  {/* Court rows */}
                  {courts.map((court) => {
                    const courtRes = today_reservations.filter(
                      (r) => r.court_id === court.id
                    )
                    return (
                      <div
                        key={court.id}
                        className="border-b border-outline-variant/10 last:border-b-0 hover:bg-surface-container-lowest/50 transition-colors"
                        style={{
                          display: "grid",
                          gridTemplateColumns: `160px repeat(${visibleSlots.length}, 1fr)`,
                        }}
                      >
                        <div className="flex flex-col justify-center px-5 py-4 bg-surface-container-lowest relative z-10">
                          <p className="font-nav text-sm font-semibold text-on-surface">
                            {court.name}
                          </p>
                          <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant mt-0.5">
                            {court.court_type}
                          </p>
                        </div>

                        <div
                          className="relative"
                          style={{ gridColumn: `span ${visibleSlots.length}` }}
                        >
                          {/* Grid lines */}
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              display: "grid",
                              gridTemplateColumns: `repeat(${visibleSlots.length}, 1fr)`,
                            }}
                          >
                            {visibleSlots.map((_, i) => (
                              <div key={i} className="border-l border-outline-variant/10 h-full" />
                            ))}
                          </div>

                          {/* Reservation blocks */}
                          {courtRes.map((res) => {
                            const startH = timeToHour(res.start_time)
                            const endH = timeToHour(res.end_time)
                            const startOffset = startH - visibleSlots[0]
                            const totalHours = visibleSlots.length
                            const leftPercent = (startOffset / totalHours) * 100
                            const widthPercent =
                              ((endH - startH) / totalHours) * 100
                            const isMaintenance =
                              res.reservation_type === "maintenance"

                            return (
                              <div
                                key={res.id}
                                className={`absolute top-2 bottom-2 rounded-lg px-3 py-2.5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                                  isMaintenance
                                    ? "bg-error/10 border border-error/20"
                                    : "bg-primary-fixed/40 border border-primary-fixed-dim/30 hover:bg-primary-fixed/60"
                                }`}
                                style={{
                                  left: `calc(${leftPercent}% + 4px)`,
                                  width: `calc(${widthPercent}% - 8px)`,
                                }}
                              >
                                <p
                                  className={`font-nav text-[10px] font-bold tracking-wide uppercase ${
                                    isMaintenance ? "text-error" : "text-primary"
                                  }`}
                                >
                                  #{res.reservation_code}
                                </p>
                                <p
                                  className={`font-body text-xs font-medium mt-0.5 truncate ${
                                    isMaintenance
                                      ? "text-error/80"
                                      : "text-on-surface"
                                  }`}
                                >
                                  {res.customer_name}
                                </p>
                                <p
                                  className={`font-body text-[10px] mt-1 truncate ${
                                    isMaintenance
                                      ? "text-error/60"
                                      : "text-on-surface-variant"
                                  }`}
                                >
                                  {formatTime(res.start_time)} -{" "}
                                  {formatTime(res.end_time)}
                                </p>
                              </div>
                            )
                          })}

                          <div className="h-[72px]" />
                        </div>
                      </div>
                    )
                  })}

                  {today_reservations.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-12">
                      <CalendarRange className="h-8 w-8 text-outline" />
                      <p className="font-nav text-xs font-medium text-on-surface-variant">
                        No reservations for today
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-body text-sm whitespace-nowrap">
                  <thead className="bg-surface-container-lowest/50 border-b border-outline-variant/15 font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">
                    <tr>
                      <th className="px-5 py-4 font-medium">Court</th>
                      <th className="px-5 py-4 font-medium">Code</th>
                      <th className="px-5 py-4 font-medium">Customer</th>
                      <th className="px-5 py-4 font-medium">Time</th>
                      <th className="px-5 py-4 font-medium">Duration</th>
                      <th className="px-5 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {today_reservations
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map((res) => {
                        const si = reservationStatusIcon[res.status]
                        return (
                          <tr
                            key={res.id}
                            className="hover:bg-surface-container-lowest/80 transition-colors"
                          >
                            <td className="px-5 py-4 font-nav font-medium text-on-surface">
                              {res.court_name}
                            </td>
                            <td className="px-5 py-4 text-on-surface-variant font-mono text-xs">
                              #{res.reservation_code}
                            </td>
                            <td className="px-5 py-4 font-medium text-on-surface">
                              {res.customer_name}
                            </td>
                            <td className="px-5 py-4 text-on-surface-variant">
                              {formatTime(res.start_time)} -{" "}
                              {formatTime(res.end_time)}
                            </td>
                            <td className="px-5 py-4 text-on-surface-variant">
                              {res.duration_hours}h
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center gap-1 font-label text-[10px] font-semibold uppercase tracking-wider ${si?.color ?? "text-on-surface-variant"}`}
                              >
                                {si?.icon}
                                {res.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    {today_reservations.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-8 text-center text-on-surface-variant"
                        >
                          No reservations for today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest flex flex-col shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant/15 px-6 py-5">
            <h2 className="font-headline text-lg font-semibold text-on-surface flex items-center gap-2">
              <Activity className="h-5 w-5 text-on-surface-variant" />
              Recent Activity
            </h2>
            <Link
              href="/admin/reservations"
              className="flex items-center gap-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] text-primary transition-colors hover:text-primary/80"
            >
              View All
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-outline-variant/10 flex-1 overflow-y-auto">
            {recent_reservations.map((res) => {
              const ai = activityIcon[res.payment_status] ?? activityIcon.pending

              return (
                <div
                  key={res.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-surface-container-lowest/50 transition-colors group"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${ai.bg} ${ai.color} group-hover:scale-110 transition-transform`}
                  >
                    {ai.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-nav text-sm font-semibold text-on-surface">
                      {res.reservation_type === "walk-in"
                        ? "Walk-in"
                        : "Court Reservation"}
                    </p>
                    <p className="truncate font-body text-xs text-on-surface-variant mt-0.5">
                      {res.court_name} &bull; {res.duration_hours}h &bull;{" "}
                      {res.customer_name}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-nav text-sm font-bold text-on-surface">
                      {formatCurrency(res.total_amount)}
                    </p>
                    <p
                      className={`font-label text-[9px] font-bold uppercase tracking-wider mt-1 ${paymentStatusColor[res.payment_status] ?? "text-on-surface-variant"}`}
                    >
                      {res.payment_status}
                      <span className="text-on-surface-variant mx-1">
                        &bull;
                      </span>
                      <span className="text-on-surface-variant">
                        {getRelativeTime(res.created_at)}
                      </span>
                    </p>
                  </div>
                </div>
              )
            })}

            {recent_reservations.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12">
                <Activity className="h-8 w-8 text-outline" />
                <p className="font-nav text-xs font-medium text-on-surface-variant">
                  No recent activity
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
