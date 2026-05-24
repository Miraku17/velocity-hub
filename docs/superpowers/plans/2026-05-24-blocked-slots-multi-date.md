# Multi-Date Blocking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins block the same time selection across N dates in one Blocked Slots submission, with each (date × range) still saving as a separate row.

**Architecture:** Add an `extraDates: string[]` chip strip to `BlockFormModal`. The existing single date input remains the "preview date" for the slot/availability grid. On submit, loop a combined sorted-unique date list and emit one row per (date × range) — the existing `onSave(rows)` already takes an array. Page-level `handleSave` uses `Promise.allSettled` with partial-failure reporting. Extract the existing `ConfirmModal` (manual-entries) into `app/components/admin/ConfirmModal.tsx` and use it to replace every `window.confirm` in this file.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, TanStack Query, Sonner. No test runner — verification is `npm run lint`, `npm run build`, and manual browser checks via `npm run dev`.

**Spec:** `docs/superpowers/specs/2026-05-24-blocked-slots-multi-date-design.md`

---

## File Structure

**Create:**
- `app/components/admin/ConfirmModal.tsx` — extracted shared confirmation modal (Portal + danger/default variants + Esc/Enter shortcuts).

**Modify:**
- `app/admin/manual-entries/page.tsx` — remove local `ConfirmModal`; import shared.
- `app/admin/blocked-slots/page.tsx` — multi-date state, chip strip UI, looped `handleSubmit`, batched `handleSave`, replace all `window.confirm` with `ConfirmModal`.

---

## Task 1: Extract shared `ConfirmModal` (no behavior change)

**Files:**
- Create: `app/components/admin/ConfirmModal.tsx`
- Modify: `app/admin/manual-entries/page.tsx`

- [ ] **Step 1: Create the shared component**

Write `app/components/admin/ConfirmModal.tsx`. Copy the component verbatim from the existing definition in `app/admin/manual-entries/page.tsx` (search for `function ConfirmModal(`). Add `"use client"` at the top. Export as named export `ConfirmModal`.

The component signature must remain:
```tsx
export function ConfirmModal({
  title,
  message,
  confirmLabel,
  variant,
  onCancel,
  onConfirm,
}: {
  title: string
  message: string
  confirmLabel: string
  variant: "danger" | "default"
  onCancel: () => void
  onConfirm: () => void
}) { /* same JSX */ }
```

It must continue to use `<Portal>` from `@/components/ui/portal` and import `useEffect` from React.

- [ ] **Step 2: Replace the local copy in manual-entries**

In `app/admin/manual-entries/page.tsx`:
1. Delete the local `function ConfirmModal({...}) { ... }` definition.
2. Add `import { ConfirmModal } from "@/components/admin/ConfirmModal"` near the other admin imports.

- [ ] **Step 3: Verify lint + build**

```bash
npm run lint
npm run build
```
Expected: no new errors. Manual-entries modal still renders and the in-app confirms still fire on "Remove date" and "Discard changes".

- [ ] **Step 4: Commit**

```bash
git add app/components/admin/ConfirmModal.tsx app/admin/manual-entries/page.tsx
git commit -m "refactor(admin): extract shared ConfirmModal component"
```

---

## Task 2: Replace `window.confirm` calls in blocked-slots with `ConfirmModal`

**Files:**
- Modify: `app/admin/blocked-slots/page.tsx`

- [ ] **Step 1: Add the `confirmDialog` state and import**

At the top of the page file add:
```tsx
import { ConfirmModal } from "@/components/admin/ConfirmModal"
```

In the appropriate top-level component (where the `window.confirm` calls live — likely `BlockedSlotsPage` and/or `BlockFormModal`), add:
```tsx
const [confirmDialog, setConfirmDialog] = useState<{
  title: string
  message: string
  confirmLabel: string
  variant: "danger" | "default"
  onConfirm: () => void
} | null>(null)
```

- [ ] **Step 2: Replace each `window.confirm` site**

For every `window.confirm(message)` in the file, replace the synchronous flow:
```tsx
if (!window.confirm(message)) return
doThing()
```
with:
```tsx
setConfirmDialog({
  title: <"Delete Block" | "Overwrite Existing" | etc>,
  message,
  confirmLabel: <"Delete" | "Overwrite" | etc>,
  variant: "danger",
  onConfirm: () => doThing(),
})
```

Concrete sites (search the file for `window.confirm`):
- Delete a blocked slot → title "Delete Block", confirmLabel "Delete", danger.
- Any other confirm prompts → use a fitting title/label, danger variant for destructive actions.

If a site is inside an async function that previously relied on the synchronous return value, restructure so the side-effecting work moves into the `onConfirm` callback.

- [ ] **Step 3: Render the `<ConfirmModal>`**

At the bottom of the component's JSX (inside the same component that owns `confirmDialog` state), add:
```tsx
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
```

- [ ] **Step 4: Verify lint + build + brief manual reasoning**

```bash
npm run lint
npm run build
```

Run `npm run dev`, sign in to `/admin/blocked-slots`, trigger the prior confirm flows — they should now show the styled in-app dialog with red "Delete" buttons instead of the OS dialog.

- [ ] **Step 5: Commit**

```bash
git add app/admin/blocked-slots/page.tsx
git commit -m "feat(blocked-slots): replace native confirms with ConfirmModal"
```

---

## Task 3: Add multi-date state + chip strip UI to `BlockFormModal`

**Files:**
- Modify: `app/admin/blocked-slots/page.tsx`

- [ ] **Step 1: Add `extraDates` state and `allDates` derivation**

Inside `BlockFormModal`, just below the existing `const [date, setDate] = useState(todayISO())` line, add:

```tsx
const [extraDates, setExtraDates] = useState<string[]>([])

const allDates = useMemo(() => {
  const set = new Set<string>([date, ...extraDates])
  return Array.from(set).sort()
}, [date, extraDates])
```

`useMemo` is already in the React imports for this file (verify; add if missing).

- [ ] **Step 2: Add the chip strip + "+ Add Date" button**

Find the existing `<input type="date">` block inside `BlockFormModal` (search for `type="date"` near `value={date}`). Immediately **after** that input's container `<div>`, add:

```tsx
<div>
  <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-widest text-outline">
    Dates to block
    <span className="ml-1 normal-case tracking-normal text-on-surface-variant">
      — {allDates.length} {allDates.length === 1 ? "date" : "dates"}
    </span>
  </label>
  <div className="flex flex-wrap items-center gap-2">
    {allDates.map((d) => {
      const label = new Date(d + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      })
      const isPreview = d === date
      const canRemove = allDates.length > 1
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
    <div className="relative">
      <button
        type="button"
        onClick={() => addDatePickerRef.current?.showPicker?.() ?? addDatePickerRef.current?.click()}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-outline-variant/40 px-3 py-1 font-nav text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
      >
        + Add Date
      </button>
      <input
        ref={addDatePickerRef}
        type="date"
        value=""
        onChange={(e) => {
          const v = e.target.value
          if (!v) return
          if (allDates.includes(v)) return
          setExtraDates((prev) => [...prev, v])
          e.target.value = ""
        }}
        className="sr-only"
      />
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add helpers + ref**

Near the top of `BlockFormModal` (after existing state):

```tsx
import { useRef } from "react"  // if not already imported
const addDatePickerRef = useRef<HTMLInputElement>(null)

function removeDate(d: string) {
  if (allDates.length <= 1) return
  if (d === date) {
    // Reassign preview date to next ascending date (or first remaining).
    const remaining = allDates.filter((x) => x !== d)
    if (remaining.length > 0) setDate(remaining[0])
  }
  setExtraDates((prev) => prev.filter((x) => x !== d))
}
```

(`useMemo` and `useRef` should be added to the React import if not present.)

- [ ] **Step 4: Verify lint + build**

```bash
npm run lint
npm run build
```

Run `npm run dev`. Open the Blocked Slots modal. The chip strip should show today's date as a primary chip. Click "+ Add Date" → native picker → new chip. Click a chip to make it the preview date. Click × on a non-preview chip to remove. Try to add the same date twice — silently rejected. Removing the active chip rebinds preview to the next date in the list.

- [ ] **Step 5: Commit**

```bash
git add app/admin/blocked-slots/page.tsx
git commit -m "feat(blocked-slots): multi-date chip strip and add-date picker"
```

---

## Task 4: Loop `handleSubmit` over `allDates` + dynamic Save label

**Files:**
- Modify: `app/admin/blocked-slots/page.tsx`

- [ ] **Step 1: Rewrite `handleSubmit`**

Replace the existing `handleSubmit` body in `BlockFormModal`:

```tsx
function handleSubmit(e: React.FormEvent) {
  e.preventDefault()

  if (blockType === "day") {
    onSave(
      allDates.map((d) => ({
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

  const rows = allDates.flatMap((d) =>
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
```

- [ ] **Step 2: Update the Save button label**

Find the Save (submit) button in `BlockFormModal`'s footer. Replace its label with:

```tsx
{saving
  ? "Saving..."
  : allDates.length > 1
    ? `Block ${allDates.length} Dates`
    : "Block Slots"}
```

(Keep the existing `disabled={...}` predicate; only the text changes.)

- [ ] **Step 3: Verify lint + build + manual reasoning**

```bash
npm run lint
npm run build
```

In dev: with one date, save full-day → 1 row created (regression). Add a second date, save full-day → 2 rows. With two dates and two non-contiguous slot ranges, save → 4 rows (verify in the table).

- [ ] **Step 4: Commit**

```bash
git add app/admin/blocked-slots/page.tsx
git commit -m "feat(blocked-slots): multiply submit payload across all dates"
```

---

## Task 5: Page-level `handleSave` with `Promise.allSettled` partial-failure

**Files:**
- Modify: `app/admin/blocked-slots/page.tsx`

- [ ] **Step 1: Add `batchSaving` state and `queryClient`**

In `BlockedSlotsPage` (the page-level component), add:

```tsx
import { useQueryClient } from "@tanstack/react-query"

const queryClient = useQueryClient()
const [batchSaving, setBatchSaving] = useState(false)
```

If `useQueryClient` is already imported at the page level, just reuse it.

- [ ] **Step 2: Rewrite `handleSave`**

Replace the existing `handleSave` function in `BlockedSlotsPage`:

```tsx
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
```

- [ ] **Step 3: Wire `batchSaving` into the modal's `saving` prop**

Where `<BlockFormModal ... saving={...} />` is rendered, change to:
```tsx
saving={createMutation.isPending || batchSaving}
```

(Or whatever existing flags were ORed — just add `|| batchSaving`.)

- [ ] **Step 4: Verify**

```bash
npm run lint
npm run build
```

In dev: save multi-date → success toast names date count. Temporarily make the POST API throw for one date (e.g. edit `app/api/blocked-slots/route.ts`) → toast names the failed date, modal stays open, table reflects the successful rows. Revert.

- [ ] **Step 5: Commit**

```bash
git add app/admin/blocked-slots/page.tsx
git commit -m "feat(blocked-slots): batch save with partial-failure handling"
```

---

## Task 6: Final smoke pass

**Files:** none (verification only).

- [ ] **Step 1: Full smoke pass**

```bash
npm run lint
npm run build
```

Run `npm run dev` and execute end-to-end:

1. **Single-date full-day** — pick today, full-day, court 1, type a reason, save → 1 row in the table.
2. **Single-date slots** — pick today, slot mode, select 6-8 PM, save → 1 row (range 18:00-20:00).
3. **Multi-date full-day** — add 2 more dates, full-day, all-courts, save → 3 rows.
4. **Multi-date slots** — 2 dates, slot mode, select 7-9 PM and 10-11 PM (non-contiguous), save → 4 rows (2 dates × 2 ranges).
5. **Save label** — verify "Block Slots" when 1 date, "Block 3 Dates" when 3.
6. **Remove preview chip** — when the preview chip is removed, the date input rebinds to the next ascending date and the slot grid switches accordingly.
7. **Duplicate prevention** — "+ Add Date" with an existing date is silently rejected.
8. **Delete block** — table row delete now shows the styled in-app confirm, not the OS dialog.
9. **Manual entries regression** — open the manual entries form, trigger "Remove date" confirm — the shared `ConfirmModal` still renders correctly.
10. **Mobile** — resize to ≤640px. Chip strip wraps; "+ Add Date" still works.

- [ ] **Step 2: Commit (only if any polish edits needed)**

If smoke pass surfaces nothing actionable, no commit. Otherwise:
```bash
git add app/admin/blocked-slots/page.tsx
git commit -m "feat(blocked-slots): smoke-pass polish"
```

---

## Done criteria

- All 6 tasks committed (or 5 if Task 6 needs no edits).
- `npm run lint` and `npm run build` clean.
- Smoke pass passes.
- Native `window.confirm` removed from `blocked-slots/page.tsx`.
- Shared `ConfirmModal` used by both `manual-entries` and `blocked-slots`.
- No schema, API, or hook changes.
