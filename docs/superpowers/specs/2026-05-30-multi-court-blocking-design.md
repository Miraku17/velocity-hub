# Multi-court blocking — design

**Date:** 2026-05-30
**Area:** `app/admin/blocked-slots/page.tsx` (`BlockFormModal`)

## Problem
The block modal only lets an admin pick **one** court. To block the same
day(s) or time slot(s) across several courts they must repeat the whole
operation per court. They want to select multiple courts (a subset, not only
"All Courts") and block them in one pass — for both whole-day and time-slot
blocks.

## Data model (existing, unchanged)
- A `blocked_slots` row has a single `court_id` (or `null` = all courts) plus
  `blocked_date`, optional `start_time`/`end_time`, `reason`.
- `POST /api/blocked-slots` rejects (409) a block whose time range overlaps a
  pending/confirmed booking on that court+date. So a saved row must target a
  slot that is actually free on its court.
- The page already batches rows via `Promise.allSettled` and reports per-row
  failures.

Blocking a subset of courts therefore = one row per court. "All Courts"
stays a single `court_id: null` row (also covers future courts).

## Decisions (agreed with user)
1. Multi-court applies to **both** whole-day and time-slot modes.
2. Time-slot availability = **intersection**: a slot is selectable only if it
   is open, unbooked, and unblocked on **every** selected court. This
   guarantees every saved row passes the API conflict check (no surprise
   partial failures).

## Design

### Court picker (UI)
Replace the single-court `Select` with **toggle chips**, one per court, plus a
leading **"All Courts"** chip. Mirrors the existing date-chip pattern. Chips
are buttons, so this doesn't conflict with the shadcn-Select convention.
- Selecting "All Courts" supersedes individual picks (maps to `court_id: null`
  rows).
- Validation: at least one court (or "All Courts") must be selected.

### State
- Replace `courtId: string` with `courtIds: string[]` + `allCourts: boolean`.
- `effectiveCourtIds = allCourts ? courts.map(c => c.id) : courtIds`.
- `slotsByDate` stays per-date; the selection applies across all chosen courts.
- Changing the **set** of courts clears slot selections (availability changes).

### Time-slot availability (intersection)
Build, for the active date, a per-court availability map from:
- reservations for the date across **all** courts (drop the single-court
  filter on the existing `/api/reservations` query, keep each item's
  `court_id`), and
- existing blocks for the date (already fetched for all courts via
  `useBlockedSlots({date})`; `null`-court blocks affect every court).

For each hour label:
- `openOnAll`  — every effective court is open that hour (per its schedule).
- `freeOnAll`  — no effective court has that hour booked or blocked.
- selectable = `openOnAll && freeOnAll`; otherwise greyed out with a reason
  (Closed / Booked / Already Blocked).
Grid rows = union of effective courts' open hours, sorted by hour.

### Rows produced (`buildBlocks`)
- Day mode: one full-day row per date × effective court; "All Courts" → one
  `null`-court row per date.
- Slots mode: one row per date × effective court × contiguous range;
  "All Courts" → one `null`-court row per range.

### Confirmation modal
Extend the existing summary to show the affected courts (e.g.
`COURT 01, COURT 2` or `All Courts`) above the per-date slot breakdown.

## Edge cases
- No court selected → Save disabled.
- A selected court closed on a date → its hours are absent from `openOnAll`, so
  those slots aren't blockable (strict intersection). A full-day block on any
  effective court likewise disables that court's hours.
- Court-set change clears `slotsByDate` (stale availability).

## Out of scope
- Per-court *different* slots in one pass (each court can already be a separate
  pass). Selection is uniform across the chosen courts.
