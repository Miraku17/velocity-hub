"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Calendar } from "@/components/ui/calendar"
import { LoadingPage } from "@/components/ui/loading"
import { useMe } from "@/lib/hooks/useTimeClock"

/* ── Types ── */

interface CourtSchedule {
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
  hourly_rates: Record<string, number> | null
}

interface Court {
  id: string
  name: string
  court_type: string
  status: string
  price_per_hour: number
  court_schedules?: CourtSchedule[]
}

interface Reservation {
  id: string
  court_id: string
  court_name: string
  customer_name: string
  start_time: string
  end_time: string
  status: string
  total_amount: number
}

interface BlockedSlot {
  id: string
  court_id: string | null
  blocked_date: string
  start_time: string | null
  end_time: string | null
  reason: string
}

/* ── Fetch ── */

async function fetchCourts(): Promise<Court[]> {
  const res = await fetch("/api/courts")
  if (!res.ok) throw new Error("Failed to fetch courts")
  return res.json()
}

async function fetchReservations(date: string): Promise<Reservation[]> {
  const res = await fetch(`/api/reservations?date=${date}&limit=100`)
  if (!res.ok) throw new Error("Failed to fetch reservations")
  const json = await res.json()
  // Flatten bookings with booking_items into per-item entries for the schedule grid.
  // An item's actual date is booking_date + 1 when it is an overnight slot
  // (start_time before 6 AM). Only include items whose actual date matches `date`.
  const bookings = json.data ?? []
  const flat: Reservation[] = []
  for (const b of bookings) {
    if (!b.booking_items || b.booking_items.length === 0) continue
    for (const item of b.booking_items) {
      const startHour = parseInt(item.start_time.split(":")[0], 10)
      const isNextDay = startHour < 6
      const actualDate = isNextDay
        ? (() => {
            const d = new Date(b.booking_date + "T00:00:00")
            d.setDate(d.getDate() + 1)
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          })()
        : b.booking_date
      if (actualDate !== date) continue
      flat.push({
        id: item.id,
        court_id: item.court_id,
        court_name: item.courts?.name ?? "—",
        customer_name: b.customer_name,
        start_time: item.start_time,
        end_time: item.end_time,
        status: b.status,
        total_amount: item.total_amount,
      })
    }
  }
  return flat
}

async function fetchBlockedSlots(date: string): Promise<BlockedSlot[]> {
  const res = await fetch(`/api/blocked-slots?date=${date}`)
  if (!res.ok) throw new Error("Failed to fetch blocked slots")
  return res.json()
}

/* ── Helpers ── */

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function formatHour(hour: number): string {
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const ampm = hour < 12 ? "AM" : "PM"
  return `${h12}${ampm}`
}

function formatHourRange(hour: number): string {
  return `${formatHour(hour)} - ${formatHour((hour + 1) % 24)}`
}

function timeToHour(time: string): number {
  return parseInt(time.split(":")[0], 10)
}

function getHoursForCourt(court: Court, dayOfWeek: number): number[] {
  const sched = court.court_schedules?.find((s) => s.day_of_week === dayOfWeek)
  if (!sched || sched.is_closed) return []
  const openH = parseInt(sched.open_time.split(":")[0], 10)
  let closeH = parseInt(sched.close_time.split(":")[0], 10)
  if (closeH <= openH) closeH += 24
  const hours: number[] = []
  for (let h = openH; h < closeH; h++) hours.push(h % 24)
  return hours
}

function getRateForHour(court: Court, dayOfWeek: number, hour: number): number {
  const sched = court.court_schedules?.find((s) => s.day_of_week === dayOfWeek)
  if (sched?.hourly_rates && sched.hourly_rates[String(hour)] != null) {
    return sched.hourly_rates[String(hour)]
  }
  return court.price_per_hour
}

function formatCurrency(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

/* ── Component ── */

export default function SchedulePage() {
  const { data: me } = useMe()
  const isAdmin = me?.role === "admin"
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calendarOpen, setCalendarOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const dateStr = useMemo(() => toDateStr(selectedDate), [selectedDate])
  const todayStr = toDateStr(new Date())
  const isToday = dateStr === todayStr
  const dayOfWeek = selectedDate.getDay()
  const now = new Date()
  const currentHour = now.getHours()

  useEffect(() => {
    if (!calendarOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCalendarOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [calendarOpen])

  const { data: courts = [], isLoading: courtsLoading } = useQuery({
    queryKey: ["courts"],
    queryFn: fetchCourts,
  })

  const { data: reservations = [], isLoading: reservationsLoading, isFetching } = useQuery({
    queryKey: ["schedule-reservations", dateStr],
    queryFn: () => fetchReservations(dateStr),
  })

  const { data: blockedSlots = [] } = useQuery({
    queryKey: ["schedule-blocked", dateStr],
    queryFn: () => fetchBlockedSlots(dateStr),
  })

  const activeCourts = courts.filter((c) => c.status !== "maintenance")
  const activeReservations = useMemo(() => reservations.filter((r) => r.status !== "cancelled"), [reservations])

  const allHours = useMemo(() => {
    // Collect raw (unwrapped) hour ranges to determine the correct display order
    let earliest = 24
    let latest = 0
    for (const court of activeCourts) {
      const sched = court.court_schedules?.find((s) => s.day_of_week === dayOfWeek)
      if (!sched || sched.is_closed) continue
      const openH = parseInt(sched.open_time.split(":")[0], 10)
      let closeH = parseInt(sched.close_time.split(":")[0], 10)
      if (closeH <= openH) closeH += 24
      if (openH < earliest) earliest = openH
      if (closeH > latest) latest = closeH
    }
    if (earliest >= latest) {
      // No open courts — fallback
      const hours: { hour: number; isNextDay: boolean }[] = []
      for (let h = 6; h <= 21; h++) hours.push({ hour: h, isNextDay: false })
      return hours
    }
    const hours: { hour: number; isNextDay: boolean }[] = []
    for (let h = earliest; h < latest; h++) hours.push({ hour: h % 24, isNextDay: h >= 24 })
    return hours
  }, [activeCourts, dayOfWeek])

  const bookingMap = useMemo(() => {
    const map: Record<string, Record<number, Reservation>> = {}
    for (const res of activeReservations) {
      if (!map[res.court_id]) map[res.court_id] = {}
      const startH = timeToHour(res.start_time)
      const endH = timeToHour(res.end_time)
      const end = endH <= startH ? endH + 24 : endH
      for (let h = startH; h < end; h++) map[res.court_id][h % 24] = res
    }
    return map
  }, [activeReservations])

  // Build blocked slots map: court_id -> hour -> BlockedSlot
  const blockedMap = useMemo(() => {
    const map: Record<string, Record<number, BlockedSlot>> = {}
    for (const b of blockedSlots) {
      if (!b.start_time || !b.end_time) {
        // Full-day block — mark all hours for the court (or all courts if null)
        const courtIds = b.court_id ? [b.court_id] : activeCourts.map((c) => c.id)
        for (const cid of courtIds) {
          if (!map[cid]) map[cid] = {}
          for (let h = 0; h < 24; h++) map[cid][h] = b
        }
        continue
      }
      const startH = timeToHour(b.start_time)
      let endH = timeToHour(b.end_time)
      if (endH <= startH) endH += 24
      const courtIds = b.court_id ? [b.court_id] : activeCourts.map((c) => c.id)
      for (const cid of courtIds) {
        if (!map[cid]) map[cid] = {}
        for (let h = startH; h < endH; h++) map[cid][h % 24] = b
      }
    }
    return map
  }, [blockedSlots, activeCourts])

  // Stats
  const totalBookings = activeReservations.length
  const totalRevenue = activeReservations.reduce((sum, r) => sum + r.total_amount, 0)
  const bookedHours = activeReservations.reduce((sum, r) => {
    const s = timeToHour(r.start_time)
    let e = timeToHour(r.end_time)
    if (e <= s) e += 24
    return sum + (e - s)
  }, 0)

  const prevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d)
  }
  const nextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d)
  }
  const goToday = () => setSelectedDate(new Date())

  const formattedDateLong = selectedDate.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })
  const formattedDateShort = selectedDate.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  })

  if (courtsLoading || reservationsLoading) return <LoadingPage message="Loading schedule..." />

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* ── Header Row ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary lg:text-4xl">
            Schedule
          </h1>
          <p className="mt-1 font-body text-sm font-medium text-secondary">
            {formattedDateLong}
          </p>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevDay}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/25 bg-surface-container-lowest text-on-surface-variant transition-all hover:bg-surface-container hover:text-on-surface active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setCalendarOpen(!calendarOpen)}
              className={`flex h-9 min-w-[160px] items-center justify-center gap-2 rounded-lg border px-4 font-nav text-[12px] font-semibold tracking-wide transition-all active:scale-[0.98] ${
                calendarOpen
                  ? "border-primary/40 bg-primary/5 text-primary shadow-sm"
                  : "border-outline-variant/25 bg-surface-container-lowest text-on-surface hover:bg-surface-container"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-50">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {isToday ? "Today" : formattedDateShort}
              {isFetching && (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              )}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-40">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {calendarOpen && (
              <div className="absolute right-0 top-11 z-50 animate-in fade-in slide-in-from-top-2 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-1 shadow-xl">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { if (d) { setSelectedDate(d); setCalendarOpen(false) } }}
                />
                <div className="border-t border-outline-variant/10 px-2 py-1.5">
                  <button
                    onClick={() => { goToday(); setCalendarOpen(false) }}
                    className="w-full rounded-lg bg-primary px-3 py-1.5 font-nav text-[11px] font-semibold uppercase tracking-wider text-on-primary transition-all hover:bg-primary/90 active:scale-[0.98]"
                  >
                    Go to Today
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={nextDay}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/25 bg-surface-container-lowest text-on-surface-variant transition-all hover:bg-surface-container hover:text-on-surface active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {!isToday && (
            <button
              onClick={goToday}
              className="rounded-lg bg-primary/5 px-3 py-1.5 font-nav text-[10px] font-semibold uppercase tracking-wider text-primary transition-all hover:bg-primary/10 active:scale-[0.98]"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div className={`grid ${isAdmin ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
        <div className="rounded-xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/15">
          <p className="font-label text-[9px] font-medium uppercase tracking-widest text-on-surface-variant">
            Bookings
          </p>
          <p className="mt-1 font-headline text-2xl font-extrabold tracking-tight text-on-surface">
            {totalBookings}
          </p>
        </div>
        <div className="rounded-xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/15">
          <p className="font-label text-[9px] font-medium uppercase tracking-widest text-on-surface-variant">
            Booked Hours
          </p>
          <p className="mt-1 font-headline text-2xl font-extrabold tracking-tight text-on-surface">
            {bookedHours}<span className="text-sm font-semibold text-on-surface-variant">h</span>
          </p>
        </div>
        {isAdmin && (
          <div className="rounded-xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/15">
            <p className="font-label text-[9px] font-medium uppercase tracking-widest text-on-surface-variant">
              Revenue
            </p>
            <p className="mt-1 font-headline text-2xl font-extrabold tracking-tight text-primary">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-5">
        <span className="flex items-center gap-2">
          <span className="h-3 w-6 rounded-sm bg-primary/[0.06] ring-1 ring-primary/10" />
          <span className="font-nav text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">Available</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-6 rounded-sm bg-primary/20 ring-1 ring-primary/30" />
          <span className="font-nav text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">Confirmed</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-6 rounded-sm bg-[#C49B00]/15 ring-1 ring-[#C49B00]/25" />
          <span className="font-nav text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">Pending</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-6 rounded-sm bg-error/10 ring-1 ring-error/20" />
          <span className="font-nav text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">Blocked</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-6 rounded-sm bg-surface-container-high ring-1 ring-outline-variant/20" />
          <span className="font-nav text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">Closed</span>
        </span>
        {isToday && (
          <span className="flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-error" />
            <span className="font-nav text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">Now</span>
          </span>
        )}
      </div>

      {/* ── Schedule Grid ── */}
      <div className="overflow-x-auto rounded-2xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm">
        <table className="w-full border-collapse" style={{ minWidth: `${120 + activeCourts.length * 170}px` }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-container-low">
              <th className="w-[110px] border-b border-r border-outline-variant/12 px-3 py-3.5 text-center">
                <span className="font-headline text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Time
                </span>
              </th>
              {activeCourts.map((court) => {
                const sched = court.court_schedules?.find((s) => s.day_of_week === dayOfWeek)
                const hasCustom = !!sched?.hourly_rates
                return (
                  <th
                    key={court.id}
                    className="border-b border-r border-outline-variant/12 px-3 py-3.5 text-center last:border-r-0"
                  >
                    <p className="font-headline text-[13px] font-bold text-on-surface">{court.name}</p>
                    <p className="mt-0.5 font-body text-[10px] text-on-surface-variant">
                      {hasCustom ? "Variable rate" : `${formatCurrency(court.price_per_hour)}/hr`}
                    </p>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {allHours.map(({ hour, isNextDay }, rowIdx) => {
              const isCurrentHour = isToday && !isNextDay && hour === currentHour
              return (
                <tr
                  key={`${hour}-${isNextDay ? "next" : "same"}`}
                  className={`transition-colors ${
                    isCurrentHour
                      ? "bg-primary/[0.04]"
                      : rowIdx % 2 === 0
                      ? ""
                      : "bg-surface-container-low/20"
                  }`}
                >
                  {/* Time label */}
                  <td className={`relative border-b border-r border-outline-variant/10 px-3 py-0 text-center ${isCurrentHour ? "border-l-2 border-l-primary" : ""}`}>
                    <span className={`font-nav text-[11px] font-bold tracking-wide ${isCurrentHour ? "text-primary" : "text-on-surface-variant"}`}>
                      {formatHourRange(hour)}
                    </span>
                    {isNextDay && (
                      <span className="mt-0.5 block rounded px-1 py-0.5 font-label text-[8px] font-bold uppercase tracking-wider bg-[#fff7ed] text-[#9a3412] border border-[#fed7aa]">
                        Next day
                      </span>
                    )}
                    {isCurrentHour && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </td>

                  {/* Court cells */}
                  {activeCourts.map((court) => {
                    const courtHours = getHoursForCourt(court, dayOfWeek)
                    const isOpen = courtHours.includes(hour)
                    const reservation = bookingMap[court.id]?.[hour]
                    const isBooked = !!reservation
                    const isPending = reservation?.status === "pending"
                    const isConfirmed = reservation?.status === "confirmed" || reservation?.status === "completed"
                    const blocked = blockedMap[court.id]?.[hour]
                    const isBlocked = !!blocked && !isBooked
                    const rate = getRateForHour(court, dayOfWeek, hour)

                    const isFirstHourOfBooking = isBooked && (
                      !bookingMap[court.id]?.[(hour - 1 + 24) % 24] ||
                      bookingMap[court.id][(hour - 1 + 24) % 24]?.id !== reservation.id
                    )
                    const isLastHourOfBooking = isBooked && (
                      !bookingMap[court.id]?.[(hour + 1) % 24] ||
                      bookingMap[court.id][(hour + 1) % 24]?.id !== reservation.id
                    )

                    const isFirstHourOfBlock = isBlocked && (
                      !blockedMap[court.id]?.[(hour - 1 + 24) % 24] ||
                      blockedMap[court.id][(hour - 1 + 24) % 24]?.id !== blocked.id
                    )
                    const isLastHourOfBlock = isBlocked && (
                      !blockedMap[court.id]?.[(hour + 1) % 24] ||
                      blockedMap[court.id][(hour + 1) % 24]?.id !== blocked.id
                    )

                    if (!isOpen) {
                      return (
                        <td
                          key={court.id}
                          className="border-b border-r border-outline-variant/10 last:border-r-0 h-[52px]"
                        >
                          <div className="h-full bg-surface-container-high/40" />
                        </td>
                      )
                    }

                    if (isBooked) {
                      return (
                        <td
                          key={court.id}
                          className="border-b border-r border-outline-variant/10 last:border-r-0 h-[52px] p-0"
                          title={`${reservation.customer_name} (${reservation.status})`}
                        >
                          <div
                            className={`mx-1 flex h-full flex-col items-center justify-center px-2 ${
                              isPending
                                ? "bg-[#C49B00]/8 border-x border-[#C49B00]/15"
                                : "bg-primary/8 border-x border-primary/12"
                            } ${isFirstHourOfBooking ? "mt-1 rounded-t-lg border-t" : ""} ${isLastHourOfBooking ? "mb-1 rounded-b-lg border-b" : ""}`}
                          >
                            {isFirstHourOfBooking && (
                              <>
                                <p className={`font-nav text-[11px] font-bold truncate max-w-full ${isPending ? "text-[#C49B00]" : isConfirmed ? "text-primary" : "text-on-surface-variant"}`}>
                                  {reservation.customer_name}
                                </p>
                                <p className={`font-label text-[8px] font-semibold uppercase tracking-widest ${isPending ? "text-[#C49B00]/60" : "text-primary/50"}`}>
                                  {reservation.status}
                                </p>
                              </>
                            )}
                          </div>
                        </td>
                      )
                    }

                    if (isBlocked) {
                      return (
                        <td
                          key={court.id}
                          className="border-b border-r border-outline-variant/10 last:border-r-0 h-[52px] p-0"
                          title={blocked.reason || "Blocked"}
                        >
                          <div
                            className={`mx-1 flex h-full flex-col items-center justify-center px-2 bg-error/6 border-x border-error/12 ${isFirstHourOfBlock ? "mt-1 rounded-t-lg border-t" : ""} ${isLastHourOfBlock ? "mb-1 rounded-b-lg border-b" : ""}`}
                          >
                            {isFirstHourOfBlock && (
                              <>
                                <p className="font-nav text-[11px] font-bold truncate max-w-full text-error/70">
                                  {blocked.reason || "Blocked"}
                                </p>
                                <p className="font-label text-[8px] font-semibold uppercase tracking-widest text-error/40">
                                  Blocked
                                </p>
                              </>
                            )}
                          </div>
                        </td>
                      )
                    }

                    return (
                      <td
                        key={court.id}
                        className="border-b border-r border-outline-variant/10 last:border-r-0 h-[52px] text-center"
                      >
                        <span className="font-body text-[10px] font-medium text-outline/60">
                          {formatCurrency(rate)}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}

            {allHours.length === 0 && (
              <tr>
                <td colSpan={activeCourts.length + 1} className="px-5 py-20 text-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-outline-variant/25 mb-3">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <p className="font-nav text-sm font-semibold text-on-surface-variant">No operating hours</p>
                  <p className="mt-1 font-body text-xs text-outline">Courts are closed on this day</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
