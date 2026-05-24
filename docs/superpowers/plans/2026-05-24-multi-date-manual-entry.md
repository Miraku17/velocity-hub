# Multi-Date Manual Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins schedule the same person across multiple dates in one Manual Entries form session, with per-date subtotals and an overall total, while each (date × court) still saves as a separate `manual_entries` row.

**Architecture:** Refactor `EntryFormModal` from a single-date state model (`selectedSlots: SelectedSlot[]`) to a multi-block model (`dateBlocks: DateBlock[]` with one active block). Extract the existing court-availability grid into a reusable `CourtSlotGrid` component and add a `DateBlockList` sidebar. Submission iterates each block and calls the existing create-entry API once per (date × court). No schema, API, or hook changes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, TanStack Query, Sonner toasts. No test runner in this project — verification is `npm run lint`, `npm run build`, and manual browser checks via `npm run dev`.

**Spec:** `docs/superpowers/specs/2026-05-24-multi-date-manual-entry-design.md`

---

## File Structure

**Create:**
- `app/admin/manual-entries/components/CourtSlotGrid.tsx` — extracted grid + legend + availability fetch (Task 1).
- `app/admin/manual-entries/components/DateBlockList.tsx` — left-pane list of date cards + "Add date" picker (Task 4).
- `app/admin/manual-entries/components/types.ts` — shared types: `SelectedSlot`, `DateBlock`, `GridAvailData` (Task 1).

**Modify:**
- `app/admin/manual-entries/page.tsx` — `EntryFormModal` (refactored to use the new components and multi-block state) and `ManualEntriesPage.handleSave` (multi-block submission).

---

## Task 1: Extract shared types and `CourtSlotGrid` component (no behavior change)

**Files:**
- Create: `app/admin/manual-entries/components/types.ts`
- Create: `app/admin/manual-entries/components/CourtSlotGrid.tsx`
- Modify: `app/admin/manual-entries/page.tsx`

- [ ] **Step 1: Create the shared types file**

Write `app/admin/manual-entries/components/types.ts`:

```ts
export interface SelectedSlot {
  court_id: string
  court_name: string
  hour: number
}

export interface DateBlock {
  id: string                 // local uuid for React keys
  date: string               // "YYYY-MM-DD"
  selectedSlots: SelectedSlot[]
}

export interface GridAvailData {
  courts: {
    id: string
    name: string
    court_type: "indoor" | "outdoor"
    price_per_hour: number
    schedule: {
      open_time: string
      close_time: string
      is_closed: boolean
      hourly_rates: Record<string, number> | null
    } | null
  }[]
  time_range: { earliest_open: number; latest_close: number }
  slots: Record<string, Record<string, "open" | "booked" | "pending" | "blocked">>
}
```

- [ ] **Step 2: Create `CourtSlotGrid.tsx` by extracting today's grid markup verbatim**

Write `app/admin/manual-entries/components/CourtSlotGrid.tsx`. This is a verbatim lift of the grid markup currently inside `EntryFormModal` (the block that begins with the "Select Court & Time Slots" label and ends after the table), plus the `hour24ToLabel`, `formatCurrency` helpers, plus the `useQuery` for `grid-availability`. The component owns the availability fetch — parents do not pass grid data in.

```tsx
"use client"

import { useMemo, Fragment } from "react"
import { useQuery } from "@tanstack/react-query"
import type { SelectedSlot, GridAvailData } from "./types"

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

interface Props {
  date: string
  selectedSlots: SelectedSlot[]
  onToggleSlot: (courtId: string, courtName: string, hour: number) => void
}

export function CourtSlotGrid({ date, selectedSlots, onToggleSlot }: Props) {
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
    for (const s of selectedSlots) set.add(`${s.court_id}:${s.hour}`)
    return set
  }, [selectedSlots])

  if (gridLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container py-10">
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="font-body text-xs text-on-surface-variant">Loading availability...</span>
        </div>
      </div>
    )
  }

  if (!gridData || openCourts.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container py-10">
        <p className="font-body text-xs text-on-surface-variant">No courts available on this day</p>
      </div>
    )
  }

  return (
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

          {timeRows.map((hour) => (
            <Fragment key={`row-${hour}`}>
              <div className="sticky left-0 z-10 bg-surface-container-lowest flex items-center justify-center px-2 py-0.5 border-b border-outline-variant/8">
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
                      onClick={isInteractive ? () => onToggleSlot(court.id, court.name, hour) : undefined}
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
  )
}
```

- [ ] **Step 3: Replace the inline grid in `page.tsx` with `<CourtSlotGrid>`**

In `app/admin/manual-entries/page.tsx`:
1. Remove the local `SelectedSlot` interface and the `hour24ToLabel`, `formatCurrency`, `GridAvailData` definitions (now in `components/`).
2. Import them: `import { CourtSlotGrid } from "./components/CourtSlotGrid"` and `import type { SelectedSlot, GridAvailData } from "./components/types"`.
3. Keep today's `selectedSlots`/`computedTotal`/`useQuery` for `grid-availability` in `EntryFormModal` for now (used by the amount computation and submit logic). The grid render block (the entire `<div>` rendering legend + table) is replaced with:

```tsx
<CourtSlotGrid
  date={date}
  selectedSlots={selectedSlots}
  onToggleSlot={toggleSlot}
/>
```

Note: `computedTotal` in the modal still depends on `gridData` from `useQuery(["grid-availability", date])`. Keep that query in the modal — TanStack Query will dedupe it with the same query inside `CourtSlotGrid`, so no extra network call.

- [ ] **Step 4: Verify lint, build, and manual smoke test**

Run:
```bash
npm run lint
npm run build
```
Expected: no new errors.

Run `npm run dev` and open `http://localhost:3000/admin/manual-entries`. Click "Add Entry", pick a date, select a few slots across two courts, verify the amount auto-fills, save. Behavior must be identical to before. Close and reopen — re-edit an existing entry, verify pre-selected slots highlight correctly.

- [ ] **Step 5: Commit**

```bash
git add app/admin/manual-entries/
git commit -m "refactor(manual-entries): extract CourtSlotGrid component"
```

---

## Task 2: Convert modal state to `dateBlocks[]` model (still one block, no UI change)

**Files:**
- Modify: `app/admin/manual-entries/page.tsx`

- [ ] **Step 1: Replace `selectedSlots` state with `dateBlocks` + active id**

Inside `EntryFormModal`, replace the existing `date` and `selectedSlots` state with:

```tsx
import type { DateBlock, SelectedSlot } from "./components/types"

function newBlockId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `b_${Math.random().toString(36).slice(2)}`
}

// Initial blocks: edit mode → one block from `entry`; create mode → one empty block for today.
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
```

- [ ] **Step 2: Update mutators to operate on the active block**

Replace `toggleSlot` and the "clear selected slots when date changes" effect with helpers that update the active block:

```tsx
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
```

Delete the `useEffect(() => { setSelectedSlots([]) }, [date])` block — its job is now done by `setActiveDate`. Wire the existing `<input type="date">` `onChange` to call `setActiveDate(e.target.value)` instead of `setDate(...)`.

- [ ] **Step 3: Preserve `computedTotal`/amount auto-fill for the active block**

`computedTotal` already reads `selectedSlots`, which now resolves to the active block's slots — no change needed. The `useEffect` that sets `amount` from `computedTotal` is unchanged.

- [ ] **Step 4: Update `handleSubmit` to emit entries for every block**

Replace the existing `handleSubmit` body. The grouping logic per block is identical to today; we just loop blocks:

```tsx
function handleSubmit(e: React.FormEvent) {
  e.preventDefault()

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
    return
  }

  for (const entryData of allEntries) onSave(entryData)
}
```

(Per-block pricing using cached query data lands in Task 5. Until then, only the active block computes a non-null amount — acceptable since this task still ships with a single block visible.)

- [ ] **Step 5: Verify lint, build, smoke test**

```bash
npm run lint
npm run build
```

Run `npm run dev`. Repeat the smoke test from Task 1 Step 4. Behavior must be identical — there is still only one block visible.

- [ ] **Step 6: Commit**

```bash
git add app/admin/manual-entries/page.tsx
git commit -m "refactor(manual-entries): convert modal state to dateBlocks model"
```

---

## Task 3: Two-pane layout shell (single block rendered as a card)

**Files:**
- Modify: `app/admin/manual-entries/page.tsx`

- [ ] **Step 1: Wrap the form body in a responsive two-pane grid**

Inside `EntryFormModal`, replace the `<div className="space-y-4 p-6">` block (the form body) with a header section + two-pane grid. The Description/Notes inputs stay at the top, full width. The grid below has a left pane (sidebar) and right pane (slot grid):

```tsx
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
    {/* LEFT PANE — placeholder (DateBlockList lands in Task 4) */}
    <div className="rounded-lg border border-outline-variant/15 bg-surface-container-low/40 p-3">
      <div className="font-label text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
        Dates in this booking
      </div>
      {dateBlocks.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => setActiveBlockId(b.id)}
          className={`w-full text-left rounded-md border p-2 mb-2 transition-colors ${
            b.id === activeBlockId
              ? "border-primary bg-primary/10"
              : "border-outline-variant/20 bg-surface-container-lowest hover:border-primary/40"
          }`}
        >
          <div className="font-body text-sm font-semibold text-on-surface">
            {formatDate(b.date)}
          </div>
          <div className="font-body text-[10px] text-on-surface-variant">
            {b.selectedSlots.length} slot{b.selectedSlots.length === 1 ? "" : "s"}
          </div>
        </button>
      ))}
    </div>

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

      {/* Amount input — single-block only; hidden once Task 7 introduces multi-block */}
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
    </div>
  </div>
</div>
```

- [ ] **Step 2: Verify lint, build, smoke test**

```bash
npm run lint
npm run build
```

Run `npm run dev`. Open the modal. Confirm:
- Description + Notes appear at top (full width).
- Below, the date list shows one card (today's date, "0 slots") on the left, and the date input + grid + amount on the right.
- On mobile (resize to ≤640px), the panes stack: date list first, then grid.
- Selecting slots updates the active card's "X slots" count.

- [ ] **Step 3: Commit**

```bash
git add app/admin/manual-entries/page.tsx
git commit -m "feat(manual-entries): two-pane modal layout"
```

---

## Task 4: Extract `DateBlockList` component + "+ Add date" button

**Files:**
- Create: `app/admin/manual-entries/components/DateBlockList.tsx`
- Modify: `app/admin/manual-entries/page.tsx`

- [ ] **Step 1: Write `DateBlockList.tsx`**

This component owns rendering the cards, the active highlight, the remove-button stub (Task 6), and the inline date picker for adding a new date.

```tsx
"use client"

import { useRef, useState } from "react"
import type { DateBlock } from "./types"

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

interface Props {
  blocks: DateBlock[]
  activeBlockId: string
  subtotals: Record<string, number>  // blockId -> subtotal in pesos
  onSelectBlock: (id: string) => void
  onRemoveBlock: (id: string) => void
  onAddDate: (date: string) => void
  canRemove: boolean   // false in edit mode (Task 9)
  canAdd: boolean      // false in edit mode (Task 9)
}

export function DateBlockList({
  blocks,
  activeBlockId,
  subtotals,
  onSelectBlock,
  onRemoveBlock,
  onAddDate,
  canRemove,
  canAdd,
}: Props) {
  const [pickerValue, setPickerValue] = useState("")
  const pickerRef = useRef<HTMLInputElement>(null)
  const usedDates = new Set(blocks.map((b) => b.date))

  function handleAddChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (!value) return
    if (usedDates.has(value)) {
      // Browsers don't honor a per-day disable on native date inputs; reject silently.
      setPickerValue("")
      return
    }
    onAddDate(value)
    setPickerValue("")
  }

  return (
    <div className="rounded-lg border border-outline-variant/15 bg-surface-container-low/40 p-3">
      <div className="font-label text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
        Dates in this booking
      </div>

      <div className="space-y-2 mb-3">
        {blocks.map((b) => {
          const isActive = b.id === activeBlockId
          const subtotal = subtotals[b.id] ?? 0
          return (
            <div
              key={b.id}
              className={`group rounded-md border p-2 transition-colors ${
                isActive
                  ? "border-primary bg-primary/10"
                  : "border-outline-variant/20 bg-surface-container-lowest hover:border-primary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectBlock(b.id)}
                  className="flex-1 text-left"
                >
                  <div className="font-body text-sm font-semibold text-on-surface">
                    {formatDate(b.date)}
                  </div>
                  <div className="font-body text-[10px] text-on-surface-variant">
                    {b.selectedSlots.length} slot{b.selectedSlots.length === 1 ? "" : "s"}
                    {subtotal > 0 && (
                      <span className="ml-1 font-bold text-[#16A34A]">
                        · ₱{subtotal.toLocaleString()}
                      </span>
                    )}
                  </div>
                </button>
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => onRemoveBlock(b.id)}
                    aria-label="Remove date"
                    className="flex h-6 w-6 items-center justify-center rounded text-on-surface-variant/60 transition-colors hover:bg-error/10 hover:text-error"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {canAdd && (
        <div className="relative">
          <button
            type="button"
            onClick={() => pickerRef.current?.showPicker?.() ?? pickerRef.current?.click()}
            className="w-full h-9 rounded-md border border-dashed border-outline-variant/40 bg-surface-container-lowest font-nav text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          >
            + Add Date
          </button>
          <input
            ref={pickerRef}
            type="date"
            value={pickerValue}
            onChange={handleAddChange}
            className="absolute inset-0 opacity-0 pointer-events-none"
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire `DateBlockList` into the modal**

In `EntryFormModal`, replace the inline left-pane placeholder from Task 3 with `<DateBlockList>`. Add an `addDate` handler:

```tsx
import { DateBlockList } from "./components/DateBlockList"

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
  // Confirm logic lands in Task 6.
  setDateBlocks((blocks) => blocks.filter((b) => b.id !== id))
  if (id === activeBlockId) {
    setDateBlocks((blocks) => {
      if (blocks.length > 0) setActiveBlockId(blocks[0].id)
      return blocks
    })
  }
}
```

Render in the left pane:

```tsx
<DateBlockList
  blocks={dateBlocks}
  activeBlockId={activeBlockId}
  subtotals={{}}  // wired in Task 5
  onSelectBlock={setActiveBlockId}
  onRemoveBlock={removeBlock}
  onAddDate={addDate}
  canRemove={dateBlocks.length > 1}
  canAdd={!entry}  // edit-mode lockdown finalized in Task 9
/>
```

- [ ] **Step 3: Verify lint, build, smoke test**

```bash
npm run lint
npm run build
```

`npm run dev`. Open the modal. Click "+ Add Date", pick a future date — a new card appears and becomes active, the grid switches to that date. Click the original card — grid switches back, prior selections still there. Add a third date out of order (e.g., earlier than the existing two); confirm the list re-sorts ascending. Try to pick a date already in the list — nothing happens.

- [ ] **Step 4: Commit**

```bash
git add app/admin/manual-entries/
git commit -m "feat(manual-entries): DateBlockList component + add-date picker"
```

---

## Task 5: Per-date subtotals + overall total footer + dynamic Save label

**Files:**
- Modify: `app/admin/manual-entries/page.tsx`

- [ ] **Step 1: Compute per-block subtotals from the TanStack Query cache**

In `EntryFormModal`, after the existing `useQuery` for the active date, import `useQueryClient` and compute subtotals for every block using cached data (no extra fetches):

```tsx
import { useQuery, useQueryClient } from "@tanstack/react-query"

const queryClient = useQueryClient()

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
  // We intentionally include `gridData` (active date's query result) in deps so
  // subtotals refresh when a newly-loaded date's data arrives in the cache.
}, [dateBlocks, gridData, queryClient])

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
```

Pass `subtotals` into `<DateBlockList subtotals={subtotals} ... />` (replacing the empty object from Task 4).

- [ ] **Step 2: Add overall total + count to the modal footer**

Replace today's footer block in `EntryFormModal` (the `<div className="flex justify-end gap-3 border-t...">`) with:

```tsx
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
```

- [ ] **Step 3: Refresh subtotals when a date's availability finishes loading**

`useQueryClient().getQueryData` is non-reactive — `subtotals` won't recompute when a *non-active* block's date data lands. Subscribe to the query cache once:

```tsx
import { useEffect, useState } from "react"

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
```

Add `cacheTick` to the `subtotals` `useMemo` deps array.

- [ ] **Step 4: Eager-load availability for every block so subtotals populate**

When a block is added, its data hasn't been fetched until the block becomes active. Trigger a prefetch when `dateBlocks` changes:

```tsx
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
```

- [ ] **Step 5: Verify lint, build, smoke test**

```bash
npm run lint
npm run build
```

`npm run dev`. Open the modal, pick a few slots on date A. Add date B, switch to it, pick slots. Switch back — date A's card still shows its subtotal in green. Footer shows the combined total and `"2 dates · N slots"`. Save button reads `"Save M Entries"` where M = number of distinct (date × court) pairs.

- [ ] **Step 6: Commit**

```bash
git add app/admin/manual-entries/page.tsx
git commit -m "feat(manual-entries): per-date subtotals and overall total footer"
```

---

## Task 6: Remove-date confirm + hide amount input when multi-block + validation

**Files:**
- Modify: `app/admin/manual-entries/page.tsx`

- [ ] **Step 1: Confirm before removing a date with selections**

Replace the `removeBlock` helper from Task 4 with one that confirms when slots exist:

```tsx
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
  setDateBlocks((blocks) => {
    const next = blocks.filter((b) => b.id !== id)
    if (id === activeBlockId && next.length > 0) {
      setActiveBlockId(next[0].id)
    }
    return next
  })
}
```

- [ ] **Step 2: Hide the manual amount input when ≥2 blocks exist**

Wrap the amount input grid in `EntryFormModal` (the `<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">` containing the Amount input from Task 3) in a conditional:

```tsx
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
```

- [ ] **Step 3: Block submit when any block has zero slots**

Add a validity check at the start of `handleSubmit`. When multi-block, every block must have ≥1 slot. When single-block, today's "notes only with manual amount" path still works.

```tsx
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

  // ... existing body from Task 2 Step 4 ...
}
```

`toast` is already imported at the top of the file.

- [ ] **Step 4: Visually flag empty blocks in the list**

Update `DateBlockList.tsx` to add a red ring on empty cards when `blocks.length > 1`:

```tsx
const isEmpty = b.selectedSlots.length === 0 && blocks.length > 1
const cardClasses = `group rounded-md border p-2 transition-colors ${
  isActive
    ? "border-primary bg-primary/10"
    : isEmpty
      ? "border-error/50 bg-error/5 hover:border-error"
      : "border-outline-variant/20 bg-surface-container-lowest hover:border-primary/40"
}`
```

Replace the existing className expression in the card `<div>` with `cardClasses`.

- [ ] **Step 5: Verify lint, build, smoke test**

```bash
npm run lint
npm run build
```

`npm run dev`. Smoke test:
- Single-block: amount input visible; remove-date X hidden (canRemove=false).
- Add second date: amount input disappears; X buttons appear on both cards.
- Make second date empty and try to save: toast error fires, second card stays highlighted red, modal stays open.
- Remove a date with selections: confirm dialog appears.

- [ ] **Step 6: Commit**

```bash
git add app/admin/manual-entries/
git commit -m "feat(manual-entries): remove confirm, multi-block validation, hide amount"
```

---

## Task 7: Multi-block save in page-level `handleSave`

**Files:**
- Modify: `app/admin/manual-entries/page.tsx`

- [ ] **Step 1: Replace the per-entry `onSave` callback with a batch save**

Today `EntryFormModal` calls `onSave(entryData)` once per entry, and the page loops. We want all entries from a single submit to land in one batched call so the page can use `Promise.all` and emit one summary toast.

Change the `EntryFormModal` `onSave` prop signature to `(entries: EntryFormData[]) => void`. Update `handleSubmit` (from Task 6 Step 3) to emit a single array instead of looping:

```tsx
// Replace `for (const entryData of allEntries) onSave(entryData)` and the
// notes-only fallback with:
if (allEntries.length === 0) {
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
} else {
  onSave(allEntries)
}
```

Update the `onSave` type in the modal's `Props`:

```tsx
onSave: (entries: EntryFormData[]) => void
```

- [ ] **Step 2: Rewrite `ManualEntriesPage.handleSave` to handle batches**

In `ManualEntriesPage`, replace the existing `handleSave`. Import the raw create function via `useMutation.mutateAsync` (already available on the existing `useCreateManualEntry` hook).

```tsx
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
}
```

- [ ] **Step 3: Update the `saving` prop wiring**

`saving` currently reads from `createMutation.isPending || updateMutation.isPending`. With `Promise.allSettled`, `createMutation.isPending` will flip on/off per-call, but TanStack's mutation tracks the last call. To keep the button disabled across the whole batch, add a local saving state:

```tsx
const [batchSaving, setBatchSaving] = useState(false)
```

Wrap the create branch of `handleSave`:

```tsx
setBatchSaving(true)
try {
  const results = await Promise.allSettled(/* ... */)
  // ... existing handling ...
} finally {
  setBatchSaving(false)
}
```

Pass `saving={createMutation.isPending || updateMutation.isPending || batchSaving}` into `<EntryFormModal>`.

- [ ] **Step 4: Invalidate availability for failed dates**

On any failure, invalidate `["grid-availability", date]` for each failed date so the next render of that block's grid refetches and shows the now-conflicting slots as `booked`. Add inside `handleSave` after the failures array is computed:

```tsx
if (failures.length > 0) {
  const failedDates = Array.from(new Set(failures.map((f) => f.p.entry_date)))
  for (const d of failedDates) {
    queryClient.invalidateQueries({ queryKey: ["grid-availability", d] })
  }
}
```

`queryClient` is available via `useQueryClient()` — add `import { useQueryClient } from "@tanstack/react-query"` and `const queryClient = useQueryClient()` at the top of `ManualEntriesPage`.

Per-slot red highlighting requires the API to return the specific conflicting slot IDs, which it does not today; that polish is deferred. The user-visible behavior on retry: conflicted slots now appear `booked` in the grid and can't be re-selected.

- [ ] **Step 5: Verify lint, build, smoke test**

```bash
npm run lint
npm run build
```

`npm run dev`. Create an entry with one date — works as before. Create across two dates — saves both, toast says `"Added N entries across 2 dates"`, modal closes, table shows both rows. Edit an existing entry — single-row update still works.

Force a failure (temporarily edit `app/api/manual-entries/route.ts`'s POST handler to throw on a specific date) and confirm partial-failure toast + modal stays open with state intact. Revert the temp change.

- [ ] **Step 6: Commit**

```bash
git add app/admin/manual-entries/page.tsx
git commit -m "feat(manual-entries): batch multi-date save with partial-failure handling"
```

---

## Task 8: Close-modal confirm when unsaved selections

**Files:**
- Modify: `app/admin/manual-entries/page.tsx`

- [ ] **Step 1: Guard onClose when there are unsaved selections**

In `EntryFormModal`, replace direct `onClose` references in the backdrop / overlay / X-button / Cancel onClicks (and the Escape key handler) with a guarded helper:

```tsx
function attemptClose() {
  const hasSelections = dateBlocks.some((b) => b.selectedSlots.length > 0)
  if (hasSelections) {
    const ok = window.confirm("Discard unsaved selections?")
    if (!ok) return
  }
  onClose()
}
```

Replace every `onClick={onClose}` / `onClick={stableOnClose}` and the `if (e.key === "Escape") stableOnClose()` line with `attemptClose` (and update the `useCallback`/`useEffect` to depend on `attemptClose` via a ref pattern, or inline the effect):

```tsx
useEffect(() => {
  function handleKey(e: KeyboardEvent) {
    if (e.key === "Escape") attemptClose()
  }
  window.addEventListener("keydown", handleKey)
  return () => window.removeEventListener("keydown", handleKey)
  // attemptClose closes over fresh dateBlocks each render — re-bind each render.
})
```

(`stableOnClose` and its `useCallback` are no longer needed and can be deleted.)

- [ ] **Step 2: Verify lint, build, smoke test**

```bash
npm run lint
npm run build
```

`npm run dev`. Open modal, no selections — Cancel/X/Escape/backdrop click closes immediately. Make a selection — closing prompts to discard.

- [ ] **Step 3: Commit**

```bash
git add app/admin/manual-entries/page.tsx
git commit -m "feat(manual-entries): confirm before discarding unsaved selections"
```

---

## Task 9: Edit-mode lockdown + final smoke pass

**Files:**
- Modify: `app/admin/manual-entries/page.tsx`

- [ ] **Step 1: Lock edit mode to one block**

Today, opening the modal with `entry={someEntry}` already initializes `dateBlocks` to a single block from that entry (Task 2 Step 1). Verify by inspection:
- `canAdd={!entry}` (already passed to `DateBlockList` in Task 4 Step 2) → "+ Add Date" hidden in edit mode.
- `canRemove={dateBlocks.length > 1}` → already false when only one block exists. In edit mode there is always exactly one block, so the X is hidden.

No code change needed if both conditions hold. If `canAdd` is not yet wired, set it now.

- [ ] **Step 2: Hide the entire date-list pane in edit mode (optional polish)**

In edit mode the left pane has one card with no actions — visually noisy. Replace the two-pane grid's left pane with `null` when editing, and let the right pane take full width:

```tsx
<div className={`grid grid-cols-1 ${entry ? "" : "md:grid-cols-[260px_1fr]"} gap-4`}>
  {!entry && (
    <DateBlockList ... />
  )}
  <div className="space-y-3">
    {/* right pane unchanged */}
  </div>
</div>
```

- [ ] **Step 3: Full smoke pass**

```bash
npm run lint
npm run build
```

`npm run dev`. Execute every flow end-to-end:
1. **Single-date create** — pick today, two slots on Court 1, amount auto-fills, save → 1 entry in table.
2. **Multi-date create** — date A: 1 slot on Court 1 + 2 slots on Court 2. Date B: 3 contiguous slots on Court 1. Date C: 1 slot. Footer shows total of all three subtotals and `"3 dates · 7 slots"`. Save button reads `"Save 4 Entries"` (A=2 court entries, B=1, C=1). Save → 4 rows in table grouped by date, descriptions all match.
3. **Validation** — add a date, leave it empty, try to save → toast + empty card flagged red. Remove that date, save succeeds.
4. **Remove confirm** — date with selections shows confirm, empty date removes silently.
5. **Discard confirm** — Escape with selections prompts.
6. **Edit existing** — open an existing entry → single-block layout, no left pane, no "+ Add Date". Update description, save.
7. **Notes-only create** — single-block, no slots, type a manual amount and description, save → 1 entry with null court/time.
8. **Mobile** — resize to ≤640px. Panes stack. Date list scrolls; grid scrolls horizontally.

- [ ] **Step 4: Commit**

```bash
git add app/admin/manual-entries/page.tsx
git commit -m "feat(manual-entries): edit-mode lockdown + final polish"
```

---

## Done criteria

- All 9 tasks committed.
- `npm run lint` and `npm run build` clean.
- Full smoke pass in Task 9 Step 3 passes.
- No changes to `lib/`, `app/api/`, or any DB migration.
