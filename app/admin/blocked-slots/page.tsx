"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  useBlockedSlots,
  useCreateBlockedSlot,
  useDeleteBlockedSlot,
  type BlockedSlot,
} from "@/lib/hooks/useBlockedSlots"
import { useCourts, type Court } from "@/lib/hooks/useCourts"
import { LoadingPage } from "@/components/ui/loading"
import { Portal } from "@/components/ui/portal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmModal } from "@/components/admin/ConfirmModal"
import { DatePickerPopover } from "@/components/admin/DatePickerPopover"
import { toast } from "sonner"

function dateToISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function isoToDate(iso: string) {
  return new Date(iso + "T00:00:00")
}

/* ── Helpers ── */

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
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

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

/** Format a 24h hour number to 12h string */
function hourTo12(h: number): string {
  const displayHour = h % 24
  const hour12 = displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour
  const ampm = displayHour < 12 ? "AM" : "PM"
  return `${hour12}:00 ${ampm}`
}

/** Generate hourly time slots between open_time and close_time (supports overnight) */
function generateTimeSlots(openTime: string, closeTime: string): string[] {
  const openHour = parseInt(openTime.split(":")[0], 10)
  let closeHour = parseInt(closeTime.split(":")[0], 10)
  if (closeHour <= openHour) closeHour += 24
  const slots: string[] = []
  for (let h = openHour; h < closeHour; h++) {
    slots.push(`${hourTo12(h)} – ${hourTo12(h + 1)}`)
  }
  return slots
}

/** Convert "7:00 AM – 8:00 AM" to start 24h hour number */
function parse12Hour(slot: string): number {
  const startPart = slot.split(" – ")[0]
  const [timePart, ampm] = startPart.split(" ")
  let hour = parseInt(timePart.split(":")[0], 10)
  if (ampm === "AM" && hour === 12) hour = 0
  else if (ampm === "PM" && hour !== 12) hour += 12
  return hour
}

/* ── Block Form Modal ── */

function BlockFormModal({
  courts,
  onClose,
  onSave,
  saving,
}: {
  courts: Court[]
  onClose: () => void
  onSave: (data: {
    court_id: string | null
    blocked_date: string
    start_time: string | null
    end_time: string | null
    reason: string
  }[]) => void
  saving: boolean
}) {
  const [date, setDate] = useState(todayISO())
  const [dates, setDates] = useState<string[]>([])
  const [courtId, setCourtId] = useState("")
  const [blockType, setBlockType] = useState<"day" | "slots">("day")

  const sortedDates = useMemo(
    () => [...dates].sort((a, b) => a.localeCompare(b)),
    [dates]
  )

  function addDate(d: string) {
    if (dates.includes(d)) return
    setDates((prev) => [...prev, d])
    setDate(d)
  }

  function removeDate(d: string) {
    if (dates.length === 0) return
    const next = dates.filter((x) => x !== d)
    setDates(next)
    if (d === date) {
      const ascending = [...next].sort((a, b) => a.localeCompare(b))
      setDate(ascending[0])
    }
  }
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [reason, setReason] = useState("")

  // When switching to slots mode, auto-select the first court if none selected
  useEffect(() => {
    if (blockType === "slots" && !courtId && courts.length > 0) {
      setCourtId(courts[0].id)
    }
  }, [blockType, courtId, courts])

  const stableOnClose = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") stableOnClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [stableOnClose])

  // Get selected court and its schedule for the selected date
  const selectedCourt = courts.find((c) => c.id === courtId)
  const dayOfWeek = date ? new Date(date + "T00:00:00").getDay() : -1
  const courtSchedule = selectedCourt?.court_schedules?.find(
    (s) => s.day_of_week === dayOfWeek && !s.is_closed
  )
  const timeSlots = courtSchedule
    ? generateTimeSlots(courtSchedule.open_time, courtSchedule.close_time)
    : []

  // Fetch existing reservations for selected court + date (to show as unavailable)
  const { data: existingReservations = [], isLoading: loadingReservations } = useQuery<{ start_time: string; end_time: string }[]>({
    queryKey: ["admin-block-reservations", courtId, date],
    queryFn: async () => {
      if (!courtId || !date) return []
      const res = await fetch(`/api/reservations?court_id=${courtId}&date=${date}&fields=start_time,end_time,status&limit=100`)
      if (!res.ok) return []
      const json = await res.json()
      // Admin response returns booking objects with nested booking_items; flatten them.
      // Bookings can span multiple courts/dates and the endpoint returns ALL their
      // items, so keep only items for THIS court on THIS date — otherwise other
      // courts' bookings get shown as "booked" here and can't be blocked.
      const rows: { start_time?: string; end_time?: string; status?: string; booking_items?: { court_id?: string; booking_date?: string; start_time: string; end_time: string }[] }[] = json.data || []
      const flat: { start_time: string; end_time: string; status: string }[] = []
      for (const r of rows) {
        if (Array.isArray(r.booking_items)) {
          for (const item of r.booking_items) {
            if (item.court_id && item.court_id !== courtId) continue
            if (item.booking_date && item.booking_date !== date) continue
            if (item.start_time && item.end_time) {
              flat.push({ start_time: item.start_time, end_time: item.end_time, status: r.status ?? "confirmed" })
            }
          }
        } else if (r.start_time && r.end_time) {
          flat.push({ start_time: r.start_time, end_time: r.end_time, status: r.status ?? "confirmed" })
        }
      }
      return flat.filter(r => r.status !== "cancelled")
    },
    enabled: !!courtId && !!date && blockType === "slots",
    staleTime: 60_000,
  })

  // Fetch existing blocked slots for the selected date (court-specific + all-courts blocks)
  const { data: existingBlocks = [], isLoading: loadingBlocks } = useBlockedSlots(
    date ? { date } : undefined
  )

  const slotsLoading = (loadingReservations && !!courtId && !!date && blockType === "slots") || loadingBlocks

  // Check if there's a full-day block for this date (matching court or all-courts)
  const fullDayBlock = useMemo(() => {
    return existingBlocks.find(
      (b) =>
        !b.start_time &&
        !b.end_time &&
        (b.court_id === null || b.court_id === courtId)
    )
  }, [existingBlocks, courtId])

  // Map already-blocked hours from existing blocked slots
  const alreadyBlockedSlots = useMemo(() => {
    const blocked = new Set<string>()
    for (const b of existingBlocks) {
      // Skip full-day blocks (handled separately) and blocks for other courts
      if (!b.start_time || !b.end_time) continue
      if (b.court_id !== null && b.court_id !== courtId) continue

      const startH = parseInt(b.start_time.split(":")[0], 10)
      let endH = parseInt(b.end_time.split(":")[0], 10)
      if (endH <= startH) endH += 24
      for (let h = startH; h < endH; h++) {
        blocked.add(`${hourTo12(h)} – ${hourTo12(h + 1)}`)
      }
    }
    return blocked
  }, [existingBlocks, courtId])

  // Map booked hours from existing reservations
  const bookedSlots = useMemo(() => {
    const booked = new Set<string>()
    const toHour = (t: string) => {
      const [h] = t.split(":").map(Number)
      return h === 0 ? 24 : h
    }
    for (const r of existingReservations) {
      if (!r.start_time || !r.end_time) continue
      const startH = parseInt(r.start_time.split(":")[0], 10)
      let endH = toHour(r.end_time)
      if (endH <= startH) endH += 24
      for (let h = startH; h < endH; h++) {
        booked.add(`${hourTo12(h)} – ${hourTo12(h + 1)}`)
      }
    }
    return booked
  }, [existingReservations])

  // Reset selected slots when court or date changes
  useEffect(() => {
    setSelectedSlots([])
  }, [courtId, date])

  function toggleSlot(slot: string) {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    )
  }

  function selectAllSlots() {
    setSelectedSlots(timeSlots.filter((s) => !bookedSlots.has(s) && !alreadyBlockedSlots.has(s)))
  }

  function clearAllSlots() {
    setSelectedSlots([])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (blockType === "day") {
      onSave(
        sortedDates.map((d) => ({
          court_id: courtId || null,
          blocked_date: d,
          start_time: null,
          end_time: null,
          reason: reason.trim(),
        }))
      )
      return
    }

    if (selectedSlots.length === 0) return

    // Existing contiguous-range grouping (unchanged):
    const sorted = [...selectedSlots].sort((a, b) => parse12Hour(a) - parse12Hour(b))
    const ranges: { start: number; end: number }[] = []
    let currentStart = parse12Hour(sorted[0])
    let currentEnd = currentStart + 1

    for (let i = 1; i < sorted.length; i++) {
      const hour = parse12Hour(sorted[i])
      if (hour === currentEnd) {
        currentEnd = hour + 1
      } else {
        ranges.push({ start: currentStart, end: currentEnd })
        currentStart = hour
        currentEnd = hour + 1
      }
    }
    ranges.push({ start: currentStart, end: currentEnd })

    const rows = sortedDates.flatMap((d) =>
      ranges.map((r) => ({
        court_id: courtId || null,
        blocked_date: d,
        start_time: `${String(r.start % 24).padStart(2, "0")}:00:00`,
        end_time: `${String(r.end % 24).padStart(2, "0")}:00:00`,
        reason: reason.trim(),
      }))
    )

    onSave(rows)
  }

  const canSubmit = dates.length > 0 && (blockType === "day" || selectedSlots.length > 0)

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4" onClick={onClose}>
        <form
          onSubmit={handleSubmit}
          className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline-variant/15 px-6 py-5 shrink-0">
            <h3 className="font-headline text-lg font-bold text-on-surface">Block Slot</h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="space-y-4 p-6 overflow-y-auto flex-1">
            {/* Block Type */}
            <div>
              <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                What do you want to block?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBlockType("day")}
                  className={`flex-1 rounded-lg border px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
                    blockType === "day"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  Block a Date
                </button>
                <button
                  type="button"
                  onClick={() => setBlockType("slots")}
                  className={`flex-1 rounded-lg border px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
                    blockType === "slots"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  Block Time Slots
                </button>
              </div>
            </div>

            {/* Court — optional for "day" mode, required for "slots" mode */}
            <div>
              <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                Court
                {blockType === "day" && (
                  <span className="normal-case tracking-normal text-on-surface-variant"> — optional</span>
                )}
              </label>
              <Select value={courtId} onValueChange={(v) => setCourtId(v ?? "")}>
                <SelectTrigger className="h-[42px] w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 font-body text-sm text-on-surface">
                  <SelectValue placeholder={blockType === "day" ? "All Courts" : "Select a court"}>
                    {courtId
                      ? (() => { const c = courts.find((c) => c.id === courtId); return c ? `${c.name} — ${c.court_type}` : courtId })()
                      : (blockType === "day" ? "All Courts" : "Select a court")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {blockType === "day" && (
                    <SelectItem value="">All Courts</SelectItem>
                  )}
                  {courts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.court_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {blockType === "day" && !courtId && (
                <p className="mt-1 font-body text-[10px] text-on-surface-variant">
                  Blocks all courts on this date
                </p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-[42px] w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary"
              />
              {/* Existing blocks info for selected date */}
              {existingBlocks.length > 0 && blockType === "day" && (
                <div className="mt-2 flex gap-2.5 rounded-lg border border-[#D97706]/30 bg-[#D97706]/8 px-3 py-2.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-[#D97706]">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div>
                    <p className="font-body text-[11px] font-semibold text-[#D97706]">
                      {fullDayBlock
                        ? `This date already has a full-day block${fullDayBlock.court_id === null ? " (all courts)" : ""}`
                        : `${existingBlocks.filter((b) => b.court_id === null || b.court_id === courtId || !courtId).length} existing block(s) on this date`
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Multi-date chip strip */}
            <div>
              <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                Dates to block
                <span className="ml-1 normal-case tracking-normal text-on-surface-variant">
                  — {sortedDates.length} {sortedDates.length === 1 ? "date" : "dates"}
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {sortedDates.map((d) => {
                  const label = new Date(d + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric",
                  })
                  const isPreview = d === date
                  const canRemove = true
                  return (
                    <span
                      key={d}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-body text-xs font-medium ${
                        isPreview
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setDate(d)}
                        className="font-semibold"
                      >
                        {label}
                      </button>
                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => removeDate(d)}
                          aria-label={`Remove ${label}`}
                          className="flex h-4 w-4 items-center justify-center rounded-full text-on-surface-variant/60 transition-colors hover:bg-error/10 hover:text-error"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </span>
                  )
                })}
                <DatePickerPopover
                  selected={isoToDate(date)}
                  disabled={(d) => dates.includes(dateToISO(d))}
                  onSelect={(d) => addDate(dateToISO(d))}
                  renderTrigger={({ ref, onClick, open, ariaProps }) => (
                    <button
                      ref={ref}
                      type="button"
                      onClick={onClick}
                      {...ariaProps}
                      className={`inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1 font-nav text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                        open
                          ? "border-primary text-primary"
                          : "border-outline-variant/40 text-on-surface-variant hover:border-primary hover:text-primary"
                      }`}
                    >
                      + Add Date
                    </button>
                  )}
                />
              </div>
            </div>

            {/* Time Slots Grid */}
            {blockType === "slots" && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                    Select Slots
                    {selectedSlots.length > 0 && (
                      <span className="ml-2 normal-case tracking-normal text-primary">
                        ({selectedSlots.length} selected)
                      </span>
                    )}
                  </label>
                  {timeSlots.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllSlots}
                        className="font-nav text-[9px] font-semibold uppercase tracking-wider text-primary hover:underline"
                      >
                        Select All
                      </button>
                      {selectedSlots.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAllSlots}
                          className="font-nav text-[9px] font-semibold uppercase tracking-wider text-on-surface-variant hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Full-day block warning */}
                {fullDayBlock && (
                  <div className="flex gap-3 rounded-lg border border-error/30 bg-error/8 px-4 py-3 mb-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-error">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                    <div>
                      <p className="font-body text-xs font-semibold text-error">
                        This date is fully blocked{fullDayBlock.court_id === null ? " (all courts)" : ""}
                      </p>
                      {fullDayBlock.reason && (
                        <p className="font-body text-[11px] text-error/70 mt-0.5">
                          Reason: {fullDayBlock.reason}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {slotsLoading ? (
                  <div className="flex flex-col items-center rounded-lg bg-surface-container-low py-8">
                    <svg className="animate-spin text-outline/40 mb-2" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <p className="font-body text-xs text-on-surface-variant">
                      Loading slots...
                    </p>
                  </div>
                ) : !courtSchedule ? (
                  <div className="flex flex-col items-center rounded-lg bg-surface-container-low py-8">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-outline/40 mb-2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <p className="font-body text-xs text-on-surface-variant">
                      Court is closed on this day
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots.map((slot) => {
                      const isSelected = selectedSlots.includes(slot)
                      const isBooked = bookedSlots.has(slot)
                      const isAlreadyBlocked = alreadyBlockedSlots.has(slot) || !!fullDayBlock
                      const isDisabled = isBooked || isAlreadyBlocked
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => !isDisabled && toggleSlot(slot)}
                          className={`rounded-lg border py-2.5 px-2 text-center transition-all ${
                            isAlreadyBlocked
                              ? "cursor-not-allowed border-error/20 bg-error/5 opacity-60"
                              : isBooked
                              ? "cursor-not-allowed border-outline-variant/10 bg-surface-container-low opacity-50"
                              : isSelected
                              ? "border-error bg-error/10 text-error"
                              : "border-outline-variant/20 text-on-surface-variant hover:border-error/40 hover:bg-error/5"
                          }`}
                        >
                          <span className="block font-body text-[11px] font-bold" style={{ textDecoration: isBooked || isAlreadyBlocked ? "line-through" : "none" }}>{slot}</span>
                          <span className={`block font-label text-[8px] font-extrabold uppercase tracking-widest mt-0.5 ${
                            isAlreadyBlocked ? "text-error" : ""
                          }`}>
                            {isAlreadyBlocked ? "Already Blocked" : isBooked ? "Booked" : isSelected ? "Blocked" : ""}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                Reason <span className="normal-case tracking-normal text-on-surface-variant">— optional</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Maintenance, Private event"
                className="h-[42px] w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary placeholder:text-on-surface-variant/40"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-outline-variant/15 px-6 py-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-outline-variant/30 bg-transparent px-5 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="rounded-lg bg-error px-5 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-error transition-colors hover:bg-error/90 disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : sortedDates.length > 1
                  ? `Block ${sortedDates.length} Dates`
                  : "Block Slots"
              }
            </button>
          </div>
        </form>
      </div>
    </Portal>
  )
}

/* ── Page ── */

export default function BlockedSlotsPage() {
  const queryClient = useQueryClient()
  const [dateFilter, setDateFilter] = useState("")
  const [monthFilter, setMonthFilter] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [batchSaving, setBatchSaving] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    confirmLabel: string
    variant: "danger" | "default"
    onConfirm: () => void
  } | null>(null)

  const filters = {
    date: dateFilter || undefined,
    month: monthFilter || undefined,
  }

  const { data: blocks, isLoading } = useBlockedSlots(filters)
  const { data: courtsData } = useCourts()
  const courts = courtsData ?? []
  const createMutation = useCreateBlockedSlot()
  const deleteMutation = useDeleteBlockedSlot()

  const courtMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of courts) map.set(c.id, c.name)
    return map
  }, [courts])

  async function handleSave(rows: Array<{
    court_id: string | null
    blocked_date: string
    start_time: string | null
    end_time: string | null
    reason: string
  }>) {
    setBatchSaving(true)
    try {
      const results = await Promise.allSettled(
        rows.map((r) => createMutation.mutateAsync(r))
      )

      const failures = results
        .map((r, i) => ({ r, row: rows[i] }))
        .filter(({ r }) => r.status === "rejected") as Array<{
          r: PromiseRejectedResult
          row: typeof rows[number]
        }>

      queryClient.invalidateQueries({ queryKey: ["blocked-slots"] })

      const successCount = results.length - failures.length
      const uniqueDates = new Set(rows.map((r) => r.blocked_date)).size

      if (failures.length === 0) {
        toast.success(
          uniqueDates > 1
            ? `Blocked ${uniqueDates} dates (${successCount} slot${successCount === 1 ? "" : "s"})`
            : `Blocked ${successCount} slot${successCount === 1 ? "" : "s"}`
        )
        setShowForm(false)
        return
      }

      const firstErr = (failures[0].r.reason as Error)?.message || "Failed to create block"
      const failedDates = Array.from(new Set(failures.map((f) => f.row.blocked_date))).join(", ")
      toast.error(
        successCount > 0
          ? `Saved ${successCount}, failed on ${failedDates}: ${firstErr}`
          : `Failed: ${firstErr}`
      )
    } finally {
      setBatchSaving(false)
    }
  }

  function handleUnblock(block: BlockedSlot) {
    const courtName = block.court_id
      ? (courts.find((c) => c.id === block.court_id)?.name ?? "Unknown")
      : "All Courts"
    setConfirmDialog({
      title: "Delete Block",
      message: `Remove the block for ${courtName} on ${formatDate(block.blocked_date)}?`,
      confirmLabel: "Delete",
      variant: "danger",
      onConfirm: () => deleteMutation.mutate(block.id),
    })
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Form Modal */}
      {showForm && (
        <BlockFormModal
          courts={courts}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
          saving={createMutation.isPending || batchSaving}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          variant={confirmDialog.variant}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={() => {
            const { onConfirm } = confirmDialog
            setConfirmDialog(null)
            onConfirm()
          }}
        />
      )}

      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-primary lg:text-4xl">
            Blocked Slots
          </h2>
          <p className="mt-1 font-body text-sm font-medium text-secondary">
            Block entire days or specific time slots to prevent bookings
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="ml-1 font-label text-[10px] font-bold uppercase tracking-widest text-outline">
              Month
            </span>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => { setMonthFilter(e.target.value); setDateFilter("") }}
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
              onChange={(e) => { setDateFilter(e.target.value); setMonthFilter("") }}
              className="h-[38px] rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary"
            />
          </div>

          {(dateFilter || monthFilter) && (
            <button
              onClick={() => { setDateFilter(""); setMonthFilter("") }}
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
            onClick={() => setShowForm(true)}
            className="mt-auto flex h-[38px] items-center gap-2 rounded-lg bg-error px-4 font-nav text-[10px] font-semibold uppercase tracking-wider text-on-error transition-colors hover:bg-error/90"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            Block Slot
          </button>
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-outline">
            Active Blocks
          </p>
          <p className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-on-surface">
            {blocks?.length ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-error">
            Full Day Blocks
          </p>
          <p className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-error">
            {blocks?.filter((b) => !b.start_time).length ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-[#D97706]">
            Time-Range Blocks
          </p>
          <p className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-[#D97706]">
            {blocks?.filter((b) => !!b.start_time).length ?? 0}
          </p>
        </div>
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <LoadingPage />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant/15 bg-surface-container-lowest">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-outline-variant/15">
                <th className="px-6 py-4 text-left font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Date
                </th>
                <th className="px-6 py-4 text-left font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Court
                </th>
                <th className="px-6 py-4 text-left font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Block Type
                </th>
                <th className="px-6 py-4 text-left font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Reason
                </th>
                <th className="px-6 py-4 text-right font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {blocks && blocks.length > 0 ? (
                blocks.map((block) => (
                  <tr
                    key={block.id}
                    className="border-b border-outline-variant/10 transition-colors hover:bg-surface-container-low/50"
                  >
                    <td className="px-6 py-5">
                      <span className="font-body text-sm font-medium text-on-surface">
                        {formatDate(block.blocked_date)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-body text-sm text-on-surface">
                        {block.court_id ? courtMap.get(block.court_id) ?? "Unknown" : (
                          <span className="font-semibold text-on-surface">All Courts</span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      {block.start_time && block.end_time ? (
                        <div>
                          <span className="rounded bg-[#D97706]/10 px-1.5 py-0.5 font-label text-[9px] font-extrabold uppercase tracking-widest text-[#D97706]">
                            Time Range
                          </span>
                          <p className="mt-1 font-body text-xs text-on-surface-variant">
                            {formatTime(block.start_time)} – {formatTime(block.end_time)}
                          </p>
                        </div>
                      ) : (
                        <span className="rounded bg-error/10 px-1.5 py-0.5 font-label text-[9px] font-extrabold uppercase tracking-widest text-error">
                          Full Day
                        </span>
                      )}
                    </td>
                    <td className="max-w-[200px] px-6 py-5">
                      {block.reason ? (
                        <p className="truncate font-body text-xs text-on-surface-variant" title={block.reason}>
                          {block.reason}
                        </p>
                      ) : (
                        <span className="font-body text-xs text-on-surface-variant/40">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleUnblock(block)}
                          className="flex h-8 items-center gap-1.5 rounded-lg px-3 font-nav text-[10px] font-semibold uppercase tracking-wider text-[#16A34A] transition-colors hover:bg-[#16A34A]/10"
                          title="Unblock"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                          Unblock
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-outline/40">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <p className="font-nav text-sm font-semibold text-on-surface-variant">
                        No blocked slots
                      </p>
                      <p className="font-body text-xs text-outline">
                        {dateFilter || monthFilter
                          ? "Try adjusting your filters"
                          : "All slots are currently open for booking"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
