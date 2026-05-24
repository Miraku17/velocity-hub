"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
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
import { CourtSlotGrid } from "./components/CourtSlotGrid"
import { DateBlockList } from "./components/DateBlockList"
import type { DateBlock, SelectedSlot, GridAvailData } from "./components/types"

function newBlockId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `b_${Math.random().toString(36).slice(2)}`
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
  onSave: (entries: EntryFormData[]) => void
  saving: boolean
}) {
  const [dateBlocks, setDateBlocks] = useState<DateBlock[]>(() => {
    if (entry?.entry_date) {
      const slots: SelectedSlot[] = []
      if (entry.court_id && entry.start_time && entry.end_time) {
        const court = courts.find((c) => c.id === entry.court_id)
        if (court) {
          const startH = parseInt(entry.start_time.split(":")[0], 10)
          const endH = parseInt(entry.end_time.split(":")[0], 10)
          for (let h = startH; h < endH; h++) {
            slots.push({ court_id: court.id, court_name: court.name, hour: h })
          }
        }
      }
      return [{ id: newBlockId(), date: entry.entry_date, selectedSlots: slots }]
    }
    return [{ id: newBlockId(), date: todayISO(), selectedSlots: [] }]
  })
  const [activeBlockId, setActiveBlockId] = useState<string>(() => dateBlocks[0].id)

  const activeBlock = dateBlocks.find((b) => b.id === activeBlockId) ?? dateBlocks[0]
  const date = activeBlock.date
  const selectedSlots = activeBlock.selectedSlots

  const [amount, setAmount] = useState(entry?.amount?.toString() ?? "")
  const [description, setDescription] = useState(entry?.description ?? "")
  const [notes, setNotes] = useState(entry?.notes ?? "")

  const queryClient = useQueryClient()

  // Fetch grid availability for the active block's date
  const { data: gridData } = useQuery<GridAvailData>({
    queryKey: ["grid-availability", date],
    queryFn: async () => {
      const res = await fetch(`/api/grid-availability?date=${date}`)
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
    staleTime: 60_000,
    enabled: !!date,
  })

  // Tick state that bumps whenever a grid-availability query updates.
  const [cacheTick, setCacheTick] = useState(0)
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      const key = event.query.queryKey
      if (Array.isArray(key) && key[0] === "grid-availability") {
        setCacheTick((t) => t + 1)
      }
    })
    return unsubscribe
  }, [queryClient])

  // Eager-load availability for every block so subtotals populate
  useEffect(() => {
    for (const b of dateBlocks) {
      queryClient.prefetchQuery({
        queryKey: ["grid-availability", b.date],
        queryFn: async () => {
          const res = await fetch(`/api/grid-availability?date=${b.date}`)
          if (!res.ok) throw new Error("Failed to fetch")
          return res.json()
        },
        staleTime: 60_000,
      })
    }
  }, [dateBlocks, queryClient])

  // Per-block subtotals from the TanStack Query cache
  const subtotals = useMemo(() => {
    const result: Record<string, number> = {}
    for (const block of dateBlocks) {
      const cached = queryClient.getQueryData<GridAvailData>(["grid-availability", block.date])
      if (!cached) {
        result[block.id] = 0
        continue
      }
      let sum = 0
      for (const s of block.selectedSlots) {
        const court = cached.courts.find((c) => c.id === s.court_id)
        if (!court) continue
        sum += court.schedule?.hourly_rates?.[String(s.hour)] ?? court.price_per_hour
      }
      result[block.id] = sum
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateBlocks, gridData, queryClient, cacheTick])

  const overallTotal = useMemo(
    () => Object.values(subtotals).reduce((a, b) => a + b, 0),
    [subtotals]
  )

  const totalSlots = useMemo(
    () => dateBlocks.reduce((sum, b) => sum + b.selectedSlots.length, 0),
    [dateBlocks]
  )

  const entriesToCreate = useMemo(() => {
    let count = 0
    for (const b of dateBlocks) {
      const courtIds = new Set(b.selectedSlots.map((s) => s.court_id))
      count += courtIds.size
    }
    return count
  }, [dateBlocks])

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

  function toggleSlot(courtId: string, courtName: string, hour: number) {
    setDateBlocks((blocks) =>
      blocks.map((b) => {
        if (b.id !== activeBlockId) return b
        const key = `${courtId}:${hour}`
        const exists = b.selectedSlots.some((s) => `${s.court_id}:${s.hour}` === key)
        if (exists) {
          return { ...b, selectedSlots: b.selectedSlots.filter((s) => `${s.court_id}:${s.hour}` !== key) }
        }
        return { ...b, selectedSlots: [...b.selectedSlots, { court_id: courtId, court_name: courtName, hour }] }
      })
    )
  }

  function setActiveDate(newDate: string) {
    setDateBlocks((blocks) =>
      blocks.map((b) =>
        b.id === activeBlockId ? { ...b, date: newDate, selectedSlots: [] } : b
      )
    )
  }

  function addDate(newDate: string) {
    setDateBlocks((blocks) => {
      if (blocks.some((b) => b.date === newDate)) return blocks
      const created: DateBlock = { id: newBlockId(), date: newDate, selectedSlots: [] }
      const next = [...blocks, created].sort((a, b) => a.date.localeCompare(b.date))
      return next
    })
    // Auto-activate the newly added block on the next render.
    queueMicrotask(() => {
      setDateBlocks((blocks) => {
        const target = blocks.find((b) => b.date === newDate)
        if (target) setActiveBlockId(target.id)
        return blocks
      })
    })
  }

  function removeBlock(id: string) {
    const target = dateBlocks.find((b) => b.id === id)
    if (!target) return
    if (target.selectedSlots.length > 0) {
      const dateLabel = new Date(target.date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short", day: "numeric",
      })
      const ok = window.confirm(`Remove ${dateLabel} and its ${target.selectedSlots.length} slot${target.selectedSlots.length === 1 ? "" : "s"}?`)
      if (!ok) return
    }
    const next = dateBlocks.filter((b) => b.id !== id)
    setDateBlocks(next)
    if (id === activeBlockId && next.length > 0) {
      setActiveBlockId(next[0].id)
    }
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

    if (dateBlocks.length > 1) {
      const empty = dateBlocks.find((b) => b.selectedSlots.length === 0)
      if (empty) {
        const label = new Date(empty.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
        toast.error(`Pick slots for ${label} or remove that date`)
        setActiveBlockId(empty.id)
        return
      }
    }

    const allEntries: EntryFormData[] = []

    for (const block of dateBlocks) {
      if (block.selectedSlots.length === 0) {
        // Empty block — skip in submission (validation in a later task will block this case).
        continue
      }

      const byCourt = new Map<string, number[]>()
      for (const s of block.selectedSlots) {
        if (!byCourt.has(s.court_id)) byCourt.set(s.court_id, [])
        byCourt.get(s.court_id)!.push(s.hour)
      }

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

        let courtAmount: number | null = null
        if (gridData && block.date === date) {
          // Only the active block's gridData is in this scope; per-block pricing
          // is finalized in Task 5 using the query cache. For now, leave amount
          // null for non-active blocks — the API accepts null.
          const court = gridData.courts.find((c) => c.id === cId)
          if (court) {
            courtAmount = hours.reduce(
              (sum, h) => sum + (court.schedule?.hourly_rates?.[String(h)] ?? court.price_per_hour),
              0
            )
          }
        }

        allEntries.push({
          id: entry?.id,
          entry_date: block.date,
          amount: courtAmount,
          description: description.trim(),
          notes: notes.trim() || null,
          court_id: cId,
          start_time: startTime,
          end_time: endTime,
          time_blocks: blocks.length > 1
            ? blocks.map((b) => ({
                start_time: `${String(b.startH).padStart(2, "0")}:00:00`,
                end_time: `${String(b.endH).padStart(2, "0")}:00:00`,
              }))
            : undefined,
        })
      }
    }

    if (allEntries.length === 0) {
      // No slots in any block — fall back to today's "notes only" save path.
      onSave([
        {
          id: entry?.id,
          entry_date: date,
          amount: amount.trim() ? parseFloat(amount) : null,
          description: description.trim(),
          notes: notes.trim() || null,
          court_id: null,
          start_time: null,
          end_time: null,
        },
      ])
      return
    }

    onSave(allEntries)
  }

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
            {/* Description + Notes (full width, shared across all dates) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Two-pane: date list + slot grid */}
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
              {/* LEFT PANE — DateBlockList */}
              <DateBlockList
                blocks={dateBlocks}
                activeBlockId={activeBlockId}
                subtotals={subtotals}
                onSelectBlock={setActiveBlockId}
                onRemoveBlock={removeBlock}
                onAddDate={addDate}
                canRemove={dateBlocks.length > 1}
                canAdd={!entry}
              />

              {/* RIGHT PANE — date input + grid for active block */}
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setActiveDate(e.target.value)}
                    className="h-[42px] w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                    Select Court & Time Slots
                    {selectedSlots.length > 0 && (
                      <span className="normal-case tracking-normal text-primary"> — {selectedSlots.length} selected</span>
                    )}
                  </label>
                  <CourtSlotGrid
                    date={date}
                    selectedSlots={selectedSlots}
                    onToggleSlot={toggleSlot}
                  />
                </div>

                {/* Amount input — single-block only; hidden when ≥2 blocks exist */}
                {dateBlocks.length === 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                        Amount (PHP) <span className="normal-case tracking-normal text-on-surface-variant">— optional</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-sm font-bold text-on-surface-variant">₱</span>
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
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-outline-variant/15 px-6 py-4">
            <div className="font-body text-xs text-on-surface-variant">
              <span className="font-headline text-base font-bold text-[#16A34A]">
                ₱{overallTotal.toLocaleString()}
              </span>
              <span className="ml-2">
                {dateBlocks.length} date{dateBlocks.length === 1 ? "" : "s"} · {totalSlots} slot{totalSlots === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex justify-end gap-3">
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
                {saving
                  ? "Saving..."
                  : entry
                    ? "Update"
                    : entriesToCreate > 0
                      ? `Save ${entriesToCreate} ${entriesToCreate === 1 ? "Entry" : "Entries"}`
                      : "Add Entry"}
              </button>
            </div>
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
  const [batchSaving, setBatchSaving] = useState(false)
  const queryClient = useQueryClient()

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

  async function handleSave(entries: EntryFormData[]) {
    // Edit path: there's always exactly one entry, with an id.
    if (entries[0]?.id) {
      const e = entries[0]
      updateMutation.mutate(
        {
          id: e.id!,
          entry_date: e.entry_date,
          amount: e.amount,
          description: e.description,
          notes: e.notes,
          court_id: e.court_id,
          start_time: e.start_time,
          end_time: e.end_time,
        },
        {
          onSuccess: () => {
            toast.success("Entry updated successfully")
            setEditEntry(null)
            setShowForm(false)
          },
          onError: (err) => toast.error(err.message || "Failed to update entry"),
        }
      )
      return
    }

    // Create path: may be multiple entries across multiple dates.
    // Expand any time_blocks into individual create payloads.
    const payloads: Array<{
      entry_date: string
      amount: number | null
      description: string
      notes: string | null
      court_id: string | null
      start_time: string | null
      end_time: string | null
    }> = []

    for (const e of entries) {
      if (e.time_blocks && e.time_blocks.length > 1) {
        const amountPerBlock = e.amount != null ? e.amount / e.time_blocks.length : null
        for (const block of e.time_blocks) {
          payloads.push({
            entry_date: e.entry_date,
            amount: amountPerBlock,
            description: e.description,
            notes: e.notes,
            court_id: e.court_id,
            start_time: block.start_time,
            end_time: block.end_time,
          })
        }
      } else {
        payloads.push({
          entry_date: e.entry_date,
          amount: e.amount,
          description: e.description,
          notes: e.notes,
          court_id: e.court_id,
          start_time: e.start_time,
          end_time: e.end_time,
        })
      }
    }

    setBatchSaving(true)
    try {
      const results = await Promise.allSettled(
        payloads.map((p) => createMutation.mutateAsync(p))
      )

      const failures = results
        .map((r, i) => ({ r, p: payloads[i] }))
        .filter(({ r }) => r.status === "rejected") as Array<{
          r: PromiseRejectedResult
          p: (typeof payloads)[number]
        }>

      const successCount = results.length - failures.length
      const dateCount = new Set(payloads.filter((_, i) => results[i].status === "fulfilled").map((p) => p.entry_date)).size

      if (failures.length > 0) {
        const failedDateSet = Array.from(new Set(failures.map((f) => f.p.entry_date)))
        for (const d of failedDateSet) {
          queryClient.invalidateQueries({ queryKey: ["grid-availability", d] })
        }
      }

      if (failures.length === 0) {
        toast.success(
          `Added ${successCount} ${successCount === 1 ? "entry" : "entries"}${dateCount > 1 ? ` across ${dateCount} dates` : ""}`
        )
        setShowForm(false)
        return
      }

      // Partial failure — keep modal open with what's left.
      const firstErr = (failures[0].r.reason as Error)?.message || "Failed to add entry"
      const failedDates = Array.from(new Set(failures.map((f) => f.p.entry_date))).join(", ")
      toast.error(
        successCount > 0
          ? `Saved ${successCount}, failed on ${failedDates}: ${firstErr}`
          : `Failed: ${firstErr}`
      )
    } finally {
      setBatchSaving(false)
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
          saving={createMutation.isPending || updateMutation.isPending || batchSaving}
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
