"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
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
  return new Date().toISOString().slice(0, 10)
}

/** Generate hourly time slots between open_time and close_time (supports overnight) */
function generateTimeSlots(openTime: string, closeTime: string): string[] {
  const openHour = parseInt(openTime.split(":")[0], 10)
  let closeHour = parseInt(closeTime.split(":")[0], 10)
  if (closeHour <= openHour) closeHour += 24
  const slots: string[] = []
  for (let h = openHour; h < closeHour; h++) {
    const displayHour = h % 24
    const hour12 = displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour
    const ampm = displayHour < 12 ? "AM" : "PM"
    slots.push(`${hour12}:00 ${ampm}`)
  }
  return slots
}

/** Convert "7:00 AM" to 24h hour number */
function parse12Hour(slot: string): number {
  const [timePart, ampm] = slot.split(" ")
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
  conflictError,
  onClearError,
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
  conflictError?: string | null
  onClearError?: () => void
}) {
  const [date, setDate] = useState(todayISO())
  const [courtId, setCourtId] = useState("")
  const [blockType, setBlockType] = useState<"day" | "slots">("day")
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [reason, setReason] = useState("")

  // When switching to slots mode, auto-select the first court if none selected
  useEffect(() => {
    if (blockType === "slots" && !courtId && courts.length > 0) {
      setCourtId(courts[0].id)
    }
  }, [blockType, courtId, courts])

  const stableOnClose = useCallback(onClose, [onClose])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") stableOnClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [stableOnClose])

  useEffect(() => {
    if (!conflictError) return
    const timer = setTimeout(() => onClearError?.(), 4000)
    return () => clearTimeout(timer)
  }, [conflictError, onClearError])

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
  const { data: existingReservations = [] } = useQuery<{ start_time: string; end_time: string }[]>({
    queryKey: ["admin-block-reservations", courtId, date],
    queryFn: async () => {
      if (!courtId || !date) return []
      const res = await fetch(`/api/reservations?court_id=${courtId}&date=${date}&fields=start_time,end_time,status&limit=100`)
      if (!res.ok) return []
      const json = await res.json()
      return (json.data || []).filter((r: { status: string }) => r.status !== "cancelled")
    },
    enabled: !!courtId && !!date && blockType === "slots",
    staleTime: 0,
  })

  // Fetch existing blocked slots for the selected date (court-specific + all-courts blocks)
  const { data: existingBlocks = [] } = useBlockedSlots(
    date ? { date } : undefined
  )

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
        const displayHour = h % 24
        const hour12 = displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour
        const ampm = displayHour < 12 ? "AM" : "PM"
        blocked.add(`${hour12}:00 ${ampm}`)
      }
    }
    return blocked
  }, [existingBlocks, courtId])

  // Map booked hours from existing reservations
  const bookedSlots = useMemo(() => {
    const booked = new Set<string>()
    const toMinutes = (t: string) => {
      const [h] = t.split(":").map(Number)
      return h === 0 ? 24 : h
    }
    for (const r of existingReservations) {
      const startH = parseInt(r.start_time.split(":")[0], 10)
      let endH = toMinutes(r.end_time)
      if (endH <= startH) endH += 24
      for (let h = startH; h < endH; h++) {
        const displayHour = h % 24
        const hour12 = displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour
        const ampm = displayHour < 12 ? "AM" : "PM"
        booked.add(`${hour12}:00 ${ampm}`)
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
      onSave([{
        court_id: courtId || null,
        blocked_date: date,
        start_time: null,
        end_time: null,
        reason: reason.trim(),
      }])
    } else {
      // Group consecutive slots into time ranges
      if (selectedSlots.length === 0) return
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

      // Create one block per contiguous range
      onSave(
        ranges.map((r) => ({
          court_id: courtId || null,
          blocked_date: date,
          start_time: `${String(r.start % 24).padStart(2, "0")}:00:00`,
          end_time: `${String(r.end % 24).padStart(2, "0")}:00:00`,
          reason: reason.trim(),
        }))
      )
    }
  }

  const canSubmit = blockType === "day" || selectedSlots.length > 0

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

                {!courtSchedule ? (
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
                  <div className="grid grid-cols-3 gap-2">
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
                          <span className="block font-body text-xs font-bold" style={{ textDecoration: isBooked || isAlreadyBlocked ? "line-through" : "none" }}>{slot}</span>
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

          {/* Conflict Error */}
          {conflictError && (
            <div className="mx-6 mb-2 flex gap-3 rounded-lg border border-error/30 bg-error/8 px-4 py-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-error">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="font-body text-xs text-error">{conflictError}</p>
            </div>
          )}

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
              {saving ? "Blocking..." : blockType === "slots" && selectedSlots.length > 0
                ? `Block ${selectedSlots.length} Slot${selectedSlots.length > 1 ? "s" : ""}`
                : "Block"
              }
            </button>
          </div>
        </form>
      </div>
    </Portal>
  )
}

/* ── Delete Confirmation ── */

function UnblockModal({
  block,
  courts,
  onClose,
  onConfirm,
  deleting,
}: {
  block: BlockedSlot
  courts: Court[]
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
}) {
  const courtName = block.court_id
    ? courts.find((c) => c.id === block.court_id)?.name ?? "Unknown"
    : "All Courts"

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="w-full max-w-sm rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#16A34A]/10 text-[#16A34A]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <div className="mt-4 text-center">
            <h3 className="font-headline text-lg font-semibold text-on-surface">Unblock</h3>
            <p className="mt-2 font-body text-sm text-on-surface-variant">
              Remove this block for <span className="font-semibold text-on-surface">{courtName}</span> on{" "}
              <span className="font-semibold text-on-surface">{formatDate(block.blocked_date)}</span>?
            </p>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              disabled={deleting}
              className="flex-1 rounded-lg border border-outline-variant/30 bg-transparent px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="flex-1 rounded-lg bg-[#16A34A] px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#16A34A]/90 disabled:opacity-60"
            >
              {deleting ? "Unblocking..." : "Unblock"}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

/* ── Page ── */

export default function BlockedSlotsPage() {
  const [dateFilter, setDateFilter] = useState("")
  const [monthFilter, setMonthFilter] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [unblockItem, setUnblockItem] = useState<BlockedSlot | null>(null)
  const [conflictError, setConflictError] = useState<string | null>(null)

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

  function handleSave(blocks: {
    court_id: string | null
    blocked_date: string
    start_time: string | null
    end_time: string | null
    reason: string
  }[]) {
    setConflictError(null)
    setShowForm(false)
    for (const block of blocks) {
      createMutation.mutate(block, {
        onError: (err) => {
          setShowForm(true)
          setConflictError(err.message)
        },
      })
    }
  }

  function handleUnblock() {
    if (!unblockItem) return
    const id = unblockItem.id
    setUnblockItem(null)
    deleteMutation.mutate(id)
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Form Modal */}
      {showForm && (
        <BlockFormModal
          courts={courts}
          onClose={() => { setShowForm(false); setConflictError(null) }}
          onSave={handleSave}
          saving={createMutation.isPending}
          conflictError={conflictError}
          onClearError={() => setConflictError(null)}
        />
      )}

      {/* Unblock Modal */}
      {unblockItem && (
        <UnblockModal
          block={unblockItem}
          courts={courts}
          onClose={() => setUnblockItem(null)}
          onConfirm={handleUnblock}
          deleting={deleteMutation.isPending}
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
                          onClick={() => setUnblockItem(block)}
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
