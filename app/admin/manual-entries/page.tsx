"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  useManualEntries,
  useCreateManualEntry,
  useUpdateManualEntry,
  useDeleteManualEntry,
  type ManualEntry,
} from "@/lib/hooks/useManualEntries"
import { useCourts, type Court } from "@/lib/hooks/useCourts"
import { LoadingPage } from "@/components/ui/loading"

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
  onSave: (data: EntryFormData) => void
  saving: boolean
}) {
  const [date, setDate] = useState(entry?.entry_date ?? todayISO())
  const [amount, setAmount] = useState(entry?.amount?.toString() ?? "")
  const [description, setDescription] = useState(entry?.description ?? "")
  const [notes, setNotes] = useState(entry?.notes ?? "")
  const [courtId, setCourtId] = useState(entry?.court_id ?? "")
  const [startTime, setStartTime] = useState(entry?.start_time?.slice(0, 5) ?? "")
  const [endTime, setEndTime] = useState(entry?.end_time?.slice(0, 5) ?? "")

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
    onSave({
      id: entry?.id,
      entry_date: date,
      amount: amount.trim() ? parseFloat(amount) : null,
      description: description.trim(),
      notes: notes.trim() || null,
      court_id: courtId || null,
      start_time: startTime ? `${startTime}:00` : null,
      end_time: endTime ? `${endTime}:00` : null,
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <form
          onSubmit={handleSubmit}
          className="relative w-full max-w-md rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xl pointer-events-auto"
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
            </div>

            {/* Court */}
            <div>
              <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                Court <span className="normal-case tracking-normal text-on-surface-variant">— optional</span>
              </label>
              <select
                value={courtId}
                onChange={(e) => setCourtId(e.target.value)}
                className="h-[42px] w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary"
              >
                <option value="">No court</option>
                {(courts ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.court_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  Start Time <span className="normal-case tracking-normal text-on-surface-variant">— optional</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-[42px] w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                  End Time <span className="normal-case tracking-normal text-on-surface-variant">— optional</span>
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-[42px] w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>

            {/* Amount */}
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

            {/* Description */}
            <div>
              <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                Description <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Private event — Court 1"
                className="h-[42px] w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary placeholder:text-on-surface-variant/40"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                Notes <span className="normal-case tracking-normal text-on-surface-variant">— optional</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional notes for this date..."
                className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary placeholder:text-on-surface-variant/40 resize-none"
              />
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
    </>
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
    <>
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-sm rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-2xl pointer-events-auto"
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
    </>
  )
}

/* ── Page ── */

export default function ManualEntriesPage() {
  const [dateFilter, setDateFilter] = useState("")
  const [monthFilter, setMonthFilter] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState<ManualEntry | null>(null)
  const [deleteEntry, setDeleteEntry] = useState<ManualEntry | null>(null)

  const filters = {
    date: dateFilter || undefined,
    month: monthFilter || undefined,
  }

  const { data: entries, isLoading } = useManualEntries(filters)
  const { data: courts = [] } = useCourts()
  const createMutation = useCreateManualEntry()
  const updateMutation = useUpdateManualEntry()
  const deleteMutation = useDeleteManualEntry()

  const totalAmount = useMemo(() => {
    if (!entries) return 0
    return entries.reduce((sum, e) => sum + (e.amount ?? 0), 0)
  }, [entries])

  function handleSave(data: EntryFormData) {
    const payload = {
      entry_date: data.entry_date,
      amount: data.amount,
      description: data.description,
      notes: data.notes,
      court_id: data.court_id,
      start_time: data.start_time,
      end_time: data.end_time,
    }
    if (data.id) {
      updateMutation.mutate(
        { id: data.id, ...payload },
        {
          onSuccess: () => {
            setEditEntry(null)
            setShowForm(false)
          },
        }
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setShowForm(false)
        },
      })
    }
  }

  function handleDelete() {
    if (!deleteEntry) return
    deleteMutation.mutate(deleteEntry.id, {
      onSuccess: () => setDeleteEntry(null),
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
            {entries?.length ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-[#16A34A]">
            Total Amount
          </p>
          <p className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-[#16A34A]">
            ₱{totalAmount.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-outline">
            Notes Only
          </p>
          <p className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-on-surface">
            {entries?.filter((e) => !e.amount).length ?? 0}
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
                          ₱{entry.amount.toFixed(2)}
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
    </div>
  )
}
