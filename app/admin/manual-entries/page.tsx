"use client"

import { useState, useEffect, useCallback, useMemo, Fragment } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  useManualEntries,
  useCreateManualEntry,
  useUpdateManualEntry,
  useDeleteManualEntry,
  type ManualEntry,
} from "@/lib/hooks/useManualEntries"
import { useCourts, type Court } from "@/lib/hooks/useCourts"
import { LoadingPage } from "@/components/ui/loading"
import { toast } from "sonner"
import { Portal } from "@/components/ui/portal"
/* ── Helpers ── */

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`
}

/* ── Entry Form Modal ── */

interface SelectedSlot {
  court_id: string
  court_name: string
  hour: number
}

interface EntryFormData {
  entry_date: string
  amount: number | null
  description: string
  notes: string | null
  court_id: string | null
  start_time: string | null
  end_time: string | null
  time_blocks?: { start_time: string; end_time: string }[]
  id?: string
}

function hour24ToLabel(hour: number): string {
  const startH = hour % 24
  const endH = (hour + 1) % 24
  const to12 = (h: number) => (h === 0 ? 12 : h > 12 ? h - 12 : h)
  const period = (h: number) => (h < 12 ? "AM" : "PM")
  const startPeriod = period(startH)
  const endPeriod = period(endH)
  if (startPeriod === endPeriod) {
    return `${to12(startH)}:00 – ${to12(endH)}:00 ${endPeriod}`
  }
  return `${to12(startH)}:00 ${startPeriod} – ${to12(endH)}:00 ${endPeriod}`
}

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

interface GridAvailData {
  courts: {
    id: string
    name: string
    court_type: "indoor" | "outdoor"
    price_per_hour: number
    schedule: { open_time: string; close_time: string; is_closed: boolean; hourly_rates: Record<string, number> | null } | null
  }[]
  time_range: { earliest_open: number; latest_close: number }
  slots: Record<string, Record<string, "open" | "booked" | "pending" | "blocked">>
}

function EntryFormModal({
  entry,
  courts,
  onClose,
  onSave,
  saving,
}: {
  entry: ManualEntry | null // null = create mode
  courts: Court[]
  onClose: () => void
  onSave: (data: EntryFormData) => void
  saving: boolean
}) {
  const [date, setDate] = useState(entry?.entry_date ?? todayISO())
  const [amount, setAmount] = useState(entry?.amount?.toString() ?? "")
  const [description, setDescription] = useState(entry?.description ?? "")
  const [notes, setNotes] = useState(entry?.notes ?? "")
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>(() => {
    if (!entry?.court_id || !entry?.start_time || !entry?.end_time) return []
    const court = courts.find((c) => c.id === entry.court_id)
    if (!court) return []
    const startH = parseInt(entry.start_time.split(":")[0], 10)
    const endH = parseInt(entry.end_time.split(":")[0], 10)
    const slots: SelectedSlot[] = []
    for (let h = startH; h < endH; h++) {
      slots.push({ court_id: court.id, court_name: court.name, hour: h })
    }
    return slots
  })

  // Fetch grid availability for the selected date
  const { data: gridData, isLoading: gridLoading } = useQuery<GridAvailData>({
    queryKey: ["grid-availability", date],
    queryFn: async () => {
      const res = await fetch(`/api/grid-availability?date=${date}`)
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
    staleTime: 60_000,
    enabled: !!date,
  })

  // Clear selected slots when date changes
  useEffect(() => { setSelectedSlots([]) }, [date])

  // Auto-fill amount based on selected slots
  const computedTotal = useMemo(() => {
    if (!gridData || selectedSlots.length === 0) return 0
    let total = 0
    for (const s of selectedSlots) {
      const court = gridData.courts.find((c) => c.id === s.court_id)
      if (!court) continue
      total += court.schedule?.hourly_rates?.[String(s.hour)] ?? court.price_per_hour
    }
    return total
  }, [selectedSlots, gridData])

  useEffect(() => {
    if (selectedSlots.length > 0) {
      setAmount(computedTotal > 0 ? computedTotal.toString() : "")
    } else {
      setAmount("")
    }
  }, [computedTotal, selectedSlots.length])

  const timeRows = useMemo(() => {
    if (!gridData) return []
    const rows: number[] = []
    for (let h = gridData.time_range.earliest_open; h < gridData.time_range.latest_close; h++) {
      rows.push(h % 24)
    }
    return rows
  }, [gridData])

  const openCourts = useMemo(
    () => gridData?.courts.filter((c) => c.schedule && !c.schedule.is_closed) ?? [],
    [gridData]
  )

  const selectedSet = useMemo(() => {
    const set = new Set<string>()
    for (const s of selectedSlots) {
      set.add(`${s.court_id}:${s.hour}`)
    }
    return set
  }, [selectedSlots])

  function toggleSlot(courtId: string, courtName: string, hour: number) {
    const key = `${courtId}:${hour}`
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => `${s.court_id}:${s.hour}` === key)
      if (exists) return prev.filter((s) => `${s.court_id}:${s.hour}` !== key)
      return [...prev, { court_id: courtId, court_name: courtName, hour }]
    })
  }

  const stableOnClose = useCallback(onClose, [onClose])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") stableOnClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [stableOnClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Group selected slots by court_id, then merge contiguous hours into blocks
    const byCourt = new Map<string, number[]>()
    for (const s of selectedSlots) {
      if (!byCourt.has(s.court_id)) byCourt.set(s.court_id, [])
      byCourt.get(s.court_id)!.push(s.hour)
    }

    // For manual entries, we create one entry per court
    // If only one court is selected, use the simple path
    const allEntries: EntryFormData[] = []
    for (const [cId, hours] of byCourt) {
      hours.sort((a, b) => a - b)
      const blocks: { startH: number; endH: number }[] = []
      let blockStart = hours[0]
      let prev = hours[0]
      for (let i = 1; i < hours.length; i++) {
        if (hours[i] !== prev + 1) {
          blocks.push({ startH: blockStart, endH: prev + 1 })
          blockStart = hours[i]
        }
        prev = hours[i]
      }
      blocks.push({ startH: blockStart, endH: prev + 1 })

      const startTime = `${String(blocks[0].startH).padStart(2, "0")}:00:00`
      const endTime = `${String(blocks[blocks.length - 1].endH).padStart(2, "0")}:00:00`

      // Calculate amount for this court's slots from hourly rates
      let courtAmount: number | null = null
      if (gridData) {
        const court = gridData.courts.find((c) => c.id === cId)
        if (court) {
          courtAmount = hours.reduce((sum, h) => {
            return sum + (court.schedule?.hourly_rates?.[String(h)] ?? court.price_per_hour)
          }, 0)
        }
      }

      allEntries.push({
        id: entry?.id,
        entry_date: date,
        amount: courtAmount,
        description: description.trim(),
        notes: notes.trim() || null,
        court_id: cId,
        start_time: startTime,
        end_time: endTime,
        time_blocks: blocks.length > 1 ? blocks.map((b) => ({
          start_time: `${String(b.startH).padStart(2, "0")}:00:00`,
          end_time: `${String(b.endH).padStart(2, "0")}:00:00`,
        })) : undefined,
      })
    }

    if (allEntries.length === 0) {
      // No slots selected — submit without court/time
      onSave({
        id: entry?.id,
        entry_date: date,
        amount: amount.trim() ? parseFloat(amount) : null,
        description: description.trim(),
        notes: notes.trim() || null,
        court_id: null,
        start_time: null,
        end_time: null,
      })
    } else {
      // Save each court entry
      for (const entryData of allEntries) {
        onSave(entryData)
      }
    }
  }

  const selectedCount = selectedSlots.length

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4" onClick={onClose}>
        <form
          onSubmit={handleSubmit}
          className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline-variant/15 px-6 py-5">
            <h3 className="font-headline text-lg font-bold text-on-surface">
              {entry ? "Edit Entry" : "New Entry"}
            </h3>
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

          <div className="space-y-4 p-6">
            {/* Date + Description row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>
              <div>
                <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Description / Customer Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Walk-in customer"
                  className="h-[42px] w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary placeholder:text-on-surface-variant/40"
                />
              </div>
            </div>

            {/* Court Availability Grid */}
            <div>
              <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                Select Court & Time Slots
                {selectedCount > 0 && (
                  <span className="normal-case tracking-normal text-primary"> — {selectedCount} selected</span>
                )}
              </label>

              {gridLoading ? (
                <div className="flex items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container py-10">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="font-body text-xs text-on-surface-variant">Loading availability...</span>
                  </div>
                </div>
              ) : !gridData || openCourts.length === 0 ? (
                <div className="flex items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container py-10">
                  <p className="font-body text-xs text-on-surface-variant">No courts available on this day</p>
                </div>
              ) : (
                <div className="rounded-lg border border-outline-variant/15 overflow-hidden">
                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 bg-surface-container-low/50 border-b border-outline-variant/10">
                    {[
                      { cls: "bg-emerald-100 border-emerald-300", label: "Open" },
                      { cls: "bg-primary", label: "Selected" },
                      { cls: "bg-gray-200 border-gray-300", label: "Booked" },
                      { cls: "bg-amber-100 border-amber-300", label: "Pending" },
                      { cls: "bg-slate-200 border-slate-300", label: "Blocked" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-1">
                        <span className={`inline-block h-2.5 w-2.5 rounded-sm border ${item.cls}`} />
                        <span className="font-body text-[9px] text-on-surface-variant">{item.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="overflow-x-auto">
                    <div
                      className="grid gap-px min-w-max"
                      style={{ gridTemplateColumns: `auto repeat(${openCourts.length}, minmax(72px, 1fr))` }}
                    >
                      {/* Header row */}
                      <div className="sticky left-0 z-20 bg-surface-container-lowest flex items-center justify-center px-2 py-2.5 border-b-2 border-outline-variant/15">
                        <span className="font-label text-[9px] font-bold uppercase tracking-widest text-outline">Time</span>
                      </div>
                      {openCourts.map((court) => (
                        <div key={court.id} className="flex flex-col items-center justify-center px-1 py-2.5 border-b-2 border-outline-variant/15">
                          <span className="font-headline text-xs font-bold text-on-surface leading-tight">{court.name}</span>
                          <span className="font-label text-[8px] font-medium uppercase tracking-wider text-on-surface-variant">
                            {court.court_type === "indoor" ? "Covered" : "Outdoor"}
                          </span>
                        </div>
                      ))}

                      {/* Time rows */}
                      {timeRows.map((hour) => (
                        <Fragment key={`row-${hour}`}>
                          <div
                            className="sticky left-0 z-10 bg-surface-container-lowest flex items-center justify-center px-2 py-0.5 border-b border-outline-variant/8"
                          >
                            <span className="font-body text-[10px] font-semibold text-on-surface-variant whitespace-nowrap">
                              {hour24ToLabel(hour)}
                            </span>
                          </div>

                          {openCourts.map((court) => {
                            const slotStatus = gridData.slots[court.id]?.[String(hour)]
                            const isClosed = !slotStatus
                            const isSelected = selectedSet.has(`${court.id}:${hour}`)
                            const isInteractive = slotStatus === "open"
                            const price = court.schedule?.hourly_rates?.[String(hour)] ?? court.price_per_hour

                            if (isClosed) {
                              return <div key={`${court.id}-${hour}`} className="min-h-[40px] border-b border-outline-variant/8" />
                            }

                            return (
                              <div key={`${court.id}-${hour}`} className="p-0.5 border-b border-outline-variant/8">
                                <button
                                  type="button"
                                  onClick={isInteractive ? () => toggleSlot(court.id, court.name, hour) : undefined}
                                  disabled={!isInteractive}
                                  className={`
                                    w-full min-h-[40px] rounded-md text-center transition-all text-[10px] font-body font-semibold
                                    flex flex-col items-center justify-center gap-0.5 px-1 py-1
                                    ${isSelected
                                      ? "bg-primary text-on-primary ring-2 ring-primary ring-offset-1"
                                      : slotStatus === "open"
                                        ? "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 active:scale-[0.96] cursor-pointer"
                                        : slotStatus === "booked"
                                          ? "bg-gray-100 text-gray-400 cursor-default"
                                          : slotStatus === "pending"
                                            ? "bg-amber-50 text-amber-600 cursor-default"
                                            : "bg-slate-100 text-slate-400 cursor-default"
                                    }
                                  `}
                                >
                                  {isSelected ? (
                                    <>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                      <span>{formatCurrency(price)}</span>
                                    </>
                                  ) : slotStatus === "open" ? (
                                    <span>{formatCurrency(price)}</span>
                                  ) : (
                                    <span className="uppercase tracking-wider text-[8px]">
                                      {slotStatus === "booked" ? "Booked" : slotStatus === "pending" ? "Pending" : "Blocked"}
                                    </span>
                                  )}
                                </button>
                              </div>
                            )
                          })}
                        </Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Amount + Notes row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Amount (PHP) <span className="normal-case tracking-normal text-on-surface-variant">— optional</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-sm font-bold text-on-surface-variant">
                    ₱
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-[42px] w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest pl-7 pr-3 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Notes <span className="normal-case tracking-normal text-on-surface-variant">— optional</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  className="h-[42px] w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary placeholder:text-on-surface-variant/40"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-outline-variant/15 px-6 py-4">
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
              disabled={saving || !description.trim()}
              className="rounded-lg bg-primary px-5 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? "Saving..." : entry ? "Update" : "Add Entry"}
            </button>
          </div>
        </form>
      </div>
    </Portal>
  )
}

/* ── Delete Confirmation ── */

function DeleteModal({
  entry,
  onClose,
  onConfirm,
  deleting,
}: {
  entry: ManualEntry
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
}) {
  return (
    <Portal>
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="w-full max-w-sm rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-error">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
          </div>
          <div className="mt-4 text-center">
            <h3 className="font-headline text-lg font-semibold text-on-surface">Delete Entry</h3>
            <p className="mt-2 font-body text-sm text-on-surface-variant">
              Delete &ldquo;{entry.description}&rdquo;? This action cannot be undone.
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
              className="flex-1 rounded-lg bg-error px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-error transition-colors hover:bg-error/90 disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

/* ── Page ── */

export default function ManualEntriesPage() {
  const PAGE_SIZE = 20
  const [currentPage, setCurrentPage] = useState(1)
  const [dateFilter, setDateFilter] = useState("")
  const [monthFilter, setMonthFilter] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState<ManualEntry | null>(null)
  const [deleteEntry, setDeleteEntry] = useState<ManualEntry | null>(null)

  const filters = {
    date: dateFilter || undefined,
    month: monthFilter || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
  }

  const { data: result, isLoading } = useManualEntries(filters)
  const entries = result?.data
  const pagination = result?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 }
  const stats = result?.stats ?? { totalAmount: 0, notesOnly: 0 }
  const { data: courts = [] } = useCourts()
  const createMutation = useCreateManualEntry()
  const updateMutation = useUpdateManualEntry()
  const deleteMutation = useDeleteManualEntry()

  function handleSave(data: EntryFormData) {
    if (data.id) {
      // Update: single entry
      updateMutation.mutate(
        {
          id: data.id,
          entry_date: data.entry_date,
          amount: data.amount,
          description: data.description,
          notes: data.notes,
          court_id: data.court_id,
          start_time: data.start_time,
          end_time: data.end_time,
        },
        {
          onSuccess: () => {
            toast.success("Entry updated successfully")
            setEditEntry(null)
            setShowForm(false)
          },
          onError: (err) => {
            toast.error(err.message || "Failed to update entry")
          },
        }
      )
    } else if (data.time_blocks && data.time_blocks.length > 1) {
      // Create: multiple non-contiguous blocks — one entry per block
      const blocks = data.time_blocks
      const amountPerBlock = data.amount != null ? data.amount / blocks.length : null
      let completed = 0
      for (const block of blocks) {
        createMutation.mutate(
          {
            entry_date: data.entry_date,
            amount: amountPerBlock,
            description: data.description,
            notes: data.notes,
            court_id: data.court_id,
            start_time: block.start_time,
            end_time: block.end_time,
          },
          {
            onSuccess: () => {
              completed++
              if (completed === blocks.length) {
                toast.success("Entry added successfully")
                setShowForm(false)
              }
            },
            onError: (err) => {
              toast.error(err.message || "Failed to add entry")
            },
          }
        )
      }
    } else {
      // Create: single block
      createMutation.mutate(
        {
          entry_date: data.entry_date,
          amount: data.amount,
          description: data.description,
          notes: data.notes,
          court_id: data.court_id,
          start_time: data.start_time,
          end_time: data.end_time,
        },
        {
          onSuccess: () => {
            toast.success("Entry added successfully")
            setShowForm(false)
          },
          onError: (err) => {
            toast.error(err.message || "Failed to add entry")
          },
        }
      )
    }
  }

  function handleDelete() {
    if (!deleteEntry) return
    deleteMutation.mutate(deleteEntry.id, {
      onSuccess: () => {
        toast.success("Entry deleted successfully")
        setDeleteEntry(null)
      },
      onError: (err) => {
        toast.error(err.message || "Failed to delete entry")
      },
    })
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Form Modal */}
      {(showForm || editEntry) && (
        <EntryFormModal
          entry={editEntry}
          courts={courts}
          onClose={() => { setShowForm(false); setEditEntry(null) }}
          onSave={handleSave}
          saving={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Delete Modal */}
      {deleteEntry && (
        <DeleteModal
          entry={deleteEntry}
          onClose={() => setDeleteEntry(null)}
          onConfirm={handleDelete}
          deleting={deleteMutation.isPending}
        />
      )}

      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-primary lg:text-4xl">
            Manual Entries
          </h2>
          <p className="mt-1 font-body text-sm font-medium text-secondary">
            Record profit from blocked/reserved slots and add date notes
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
              onChange={(e) => { setMonthFilter(e.target.value); setDateFilter(""); setCurrentPage(1) }}
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
              onChange={(e) => { setDateFilter(e.target.value); setMonthFilter(""); setCurrentPage(1) }}
              className="h-[38px] rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary"
            />
          </div>

          {(dateFilter || monthFilter) && (
            <button
              onClick={() => { setDateFilter(""); setMonthFilter(""); setCurrentPage(1) }}
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
            onClick={() => { setEditEntry(null); setShowForm(true) }}
            className="mt-auto flex h-[38px] items-center gap-2 rounded-lg bg-primary px-4 font-nav text-[10px] font-semibold uppercase tracking-wider text-on-primary transition-colors hover:bg-primary/90"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Entry
          </button>
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-outline">
            Total Entries
          </p>
          <p className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-on-surface">
            {pagination.total.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-[#16A34A]">
            Total Amount
          </p>
          <p className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-[#16A34A]">
            ₱{stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-outline">
            Notes Only
          </p>
          <p className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-on-surface">
            {stats.notesOnly.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <LoadingPage />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant/15 bg-surface-container-lowest">
          <table className="w-full min-w-[750px]">
            <thead>
              <tr className="border-b border-outline-variant/15">
                <th className="px-6 py-4 text-left font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Date
                </th>
                <th className="px-6 py-4 text-left font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Court
                </th>
                <th className="px-6 py-4 text-left font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Time
                </th>
                <th className="px-6 py-4 text-left font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Description
                </th>
                <th className="px-6 py-4 text-right font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Amount
                </th>
                <th className="px-6 py-4 text-left font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Notes
                </th>
                <th className="px-6 py-4 text-right font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {entries && entries.length > 0 ? (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-outline-variant/10 transition-colors hover:bg-surface-container-low/50"
                  >
                    <td className="px-6 py-5">
                      <span className="font-body text-sm font-medium text-on-surface">
                        {formatDate(entry.entry_date)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      {entry.court_id ? (
                        <span className="font-body text-sm text-on-surface">
                          {(courts ?? []).find((c) => c.id === entry.court_id)?.name ?? "—"}
                        </span>
                      ) : (
                        <span className="font-body text-xs text-on-surface-variant/40">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      {entry.start_time && entry.end_time ? (
                        <span className="font-body text-sm text-on-surface">
                          {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
                        </span>
                      ) : (
                        <span className="font-body text-xs text-on-surface-variant/40">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-body text-sm text-on-surface">
                        {entry.description}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {entry.amount != null ? (
                        <span className="font-headline text-sm font-bold text-[#16A34A]">
                          ₱{entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="font-body text-xs text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td className="max-w-[240px] px-6 py-5">
                      {entry.notes ? (
                        <p className="truncate font-body text-xs text-on-surface-variant" title={entry.notes}>
                          {entry.notes}
                        </p>
                      ) : (
                        <span className="font-body text-xs text-on-surface-variant/40">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditEntry(entry); setShowForm(true) }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
                          title="Edit"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteEntry(entry)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error"
                          title="Delete"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-outline/40">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                      <p className="font-nav text-sm font-semibold text-on-surface-variant">
                        No entries yet
                      </p>
                      <p className="font-body text-xs text-outline">
                        {dateFilter || monthFilter
                          ? "Try adjusting your filters"
                          : "Add manual entries for blocked slots or date notes"}
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
        (() => {
          const totalPages = pagination.totalPages
          const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            if (totalPages <= 5) return i + 1
            const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
            return start + i
          })
          return (
            <div className="mt-4 flex items-center justify-between">
              <span className="font-body text-xs font-medium tracking-tight text-on-surface-variant">
                Showing{" "}
                <span className="font-bold text-on-surface">
                  {(pagination.page - 1) * pagination.limit + 1}-
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-on-surface">{pagination.total}</span>{" "}
                entries
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
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
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border font-nav text-sm font-bold transition-colors ${
                      currentPage === page
                        ? "border-primary bg-primary text-on-primary shadow-sm shadow-primary/20"
                        : "border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary"
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
          )
        })()
      )}
    </div>
  )
}
