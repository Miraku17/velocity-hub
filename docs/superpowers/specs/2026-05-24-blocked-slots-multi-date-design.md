# Multi-Date Blocking — Design

**Date:** 2026-05-24
**Scope:** Admin → Blocked Slots form (`app/admin/blocked-slots/page.tsx`)
**Status:** Approved for implementation

## Problem

Admins regularly need to block the same time window across many dates — weekly maintenance, holidays, tournament weekends. Today the `BlockFormModal` only handles one date per submission, so blocking 4 dates means opening the modal 4 times.

The block selection (court / all-courts, full-day vs hourly slots, reason) is **always the same** for these recurring cases. Only the date list varies. The feature should multiply that single selection across N dates without touching the rest of the flow.

## Non-goals

- No per-date slot selection — slots/full-day applies uniformly to every date.
- No per-date court selection — court (or all-courts) applies uniformly.
- No schema, API, or hook changes. Each (date × range) still posts to the existing `createBlockedSlot` endpoint.
- No edit-mode multi-date (editing remains row-by-row).
- No recurring-date generator UI ("every Monday for 8 weeks").
- No conflict preview for non-preview dates — the API rejects conflicting rows and partial-failure handling reports which dates failed.

## UX

`BlockFormModal` keeps its current layout (Block Type → Court → Date → slots/availability → Reason). The single change is a new **"Dates to block"** chip strip placed directly below the existing `<input type="date">`:

- The existing date input remains the **preview date** — the slot grid, existing-reservations check, and existing-blocks info still read from whichever date is in that input.
- Below the input: a horizontal chip strip listing every date in the batch. Each chip shows a short label (e.g. "Mon, May 24") with an × to remove. Sorted ascending.
- The preview date is included implicitly — if no chips are added, the form blocks exactly that one date (today's behavior, unchanged).
- A **"+ Add Date"** button next to the chips opens a native date picker (hidden `<input type="date">` with `sr-only`, triggered via `showPicker()`). Picking adds a chip; duplicates are silently rejected.
- Save button label changes:
  - 1 date (only preview): "Block Slots" (unchanged).
  - N > 1 dates: "Block N dates".

Everything else (slot picker, "select all", full-day overwrite warnings, court/all-courts selector, reason field) is untouched.

## Data flow

No schema changes. The existing `onSave(rows: Array<...>)` callback already accepts an array. Multi-date is purely client-side batching.

**State** in `BlockFormModal`:

```ts
const [extraDates, setExtraDates] = useState<string[]>([])
// Combined list at submit time:
const allDates = useMemo(() => {
  const set = new Set<string>([date, ...extraDates])
  return Array.from(set).sort()
}, [date, extraDates])
```

The preview date is always in `allDates`. Removing the preview date's chip resets the preview to the next date in the list (or to today if empty).

**`handleSubmit`** loops `allDates` and produces:

- **Full-day mode:** one row per date — `{ court_id, blocked_date: d, start_time: null, end_time: null, reason }`.
- **Slot mode:** group the selected slots into contiguous ranges once (existing logic), then for each date emit one row per range. N dates × R ranges = N×R rows. If no slots selected, abort with the existing validation.

Calls `onSave(rows)` once with the flat array.

**Page-level `handleSave`** rewrites to use `Promise.allSettled(rows.map((p) => createMutation.mutateAsync(p)))`. Success-only: toast `"Blocked N date(s)"`, close modal. Partial failure: toast names the unique failed dates and the first error, modal stays open, `queryClient.invalidateQueries({ queryKey: ["blocked-slots"] })` runs unconditionally.

## Confirm-modal compliance

The new CLAUDE.md rule (no native dialogs) was added in the previous PR but only enforced in `manual-entries`. This PR:

1. Extracts the `ConfirmModal` component from `app/admin/manual-entries/page.tsx` into a shared `app/components/admin/ConfirmModal.tsx`.
2. Updates the manual-entries page to import from the shared location.
3. Replaces every `window.confirm` in `app/admin/blocked-slots/page.tsx` with `ConfirmModal` driven from a `confirmDialog` state object (same pattern as manual-entries: `{ title, message, confirmLabel, variant, onConfirm }`).

Block-deletion confirms and any full-day-overwrite confirms use the danger variant.

## Validation

- At least one date in `allDates` (the preview date guarantees this).
- Slot mode requires ≥1 selected slot (unchanged).
- Duplicate dates rejected at chip-add time.
- Full-day-overwrite warning (if the form has one today) fires when **any** of the chosen dates already has a full-day block — but the implementation defers per-date conflict detection to the API. The form does not pre-check non-preview dates.

## Edge cases

- **API rejects a subset of dates** — partial-failure toast names them; modal stays open with state intact so admin can adjust and retry.
- **Removing the preview date's chip** — the date `<input>` rebinds to the next chip ascending (or to `todayISO()` if no chips remain).
- **Edit mode** — unchanged. Edit is single-date row replacement.

## File scope

- `app/admin/blocked-slots/page.tsx` — `BlockFormModal` (multi-date state + chip strip + handleSubmit loop) and the page's `handleSave` (Promise.allSettled).
- `app/components/admin/ConfirmModal.tsx` — new shared component.
- `app/admin/manual-entries/page.tsx` — drop local `ConfirmModal`, import shared.
