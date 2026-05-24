# Multi-Date Manual Entry — Design

**Date:** 2026-05-24
**Scope:** Admin → Manual Entries form (`app/admin/manual-entries/page.tsx`)
**Status:** Approved for implementation

## Problem

Admins need to schedule the same person across multiple dates in a single form session (e.g. May 22, June 5, June 19). Today the form is single-date: pick one date, pick slots, save. Booking three dates means opening the modal three times and re-typing the customer name.

Each date must remain a **separate entry/ticket** in the database (so it can be edited, deleted, or refunded independently and is visually distinct in the entries table and sales report). The form should show **per-date subtotals and an overall total** for visibility while the admin is composing the booking.

## Non-goals

- No schema changes. Each (date × court) stays one row in `manual_entries`.
- No recurring-date generator ("every Monday for 8 weeks").
- No cross-date discount or package pricing — each date prices independently from hourly rates.
- No bulk delete / multi-edit of saved entries from the table.
- No new email or PDF receipt artifacts (manual entries don't generate any today).
- Edit mode stays single-date — multi-date is a new-entry-only feature.

## UX

The existing `EntryFormModal` becomes a two-pane layout inside the same modal.

**Shared header (unchanged):** Description / Customer Name, Notes. Apply to every date.

**Left pane — "Dates in this booking" list:**
- Vertical list of date cards. Each card shows weekday + date, slot count, court breakdown (e.g. "Court 1: 2hr · Court 3: 1hr"), per-date subtotal, and a remove (×) button.
- Below the list: a **"+ Add date"** button. Clicking it opens a native `<input type="date">` picker. Picking a date appends an empty card and selects it as active.
- One card is always active (highlighted). Clicking a card makes it active.
- Empty state (zero dates): placeholder card prompting "Add a date to get started" with the same button.
- List is sorted ascending by date.

**Right pane — court/time grid for the active date:**
- Existing grid, unchanged in look and behavior. Loads availability for the active date and reflects toggled slots into that date's card.
- Switching active dates swaps the grid; per-date selections persist in memory until save.

**Footer:**
- Left: **Overall total** + count (e.g. "3 dates · 7 slots").
- Right: Cancel / Save. Save label becomes **"Save N entries"** where N is the total entries to be created (count of date × court combinations).

**Mobile:** Panes stack — list on top, grid below. "+ Add date" stays a top-level button. Tapping a card scrolls the grid into view.

**Edit mode:** Date list hidden / locked to one card; "+ Add date" hidden. Editing existing entries remains a single-row operation. New-only feature.

## Data model

No schema changes. Multi-date is purely client-side batching.

In-memory state inside the modal:

```ts
type DateBlock = {
  id: string              // local uuid for React keys
  date: string            // "YYYY-MM-DD"
  selectedSlots: SelectedSlot[]  // same shape as today
}

const [dateBlocks, setDateBlocks] = useState<DateBlock[]>([])
const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
```

Grid toggles, `selectedSet`, and `computedTotal` derive from the **active block's** `selectedSlots`. The existing `grid-availability` query is keyed on date, so TanStack Query caches each date's availability independently — switching active blocks is free after the first load.

**Per-date subtotal:** same formula as today's `computedTotal`, scoped to one block. Overall total = sum across blocks.

## Save flow

Replaces today's `handleSubmit` + `handleSave`:

1. Iterate over `dateBlocks`. For each block, run today's grouping logic (group `selectedSlots` by `court_id`, merge contiguous hours into time-blocks) to produce one `EntryFormData` per (date × court).
2. Total entries = sum of per-date entries across all blocks.
3. Call `createMutation.mutate` for each entry. Within a block: sequential (keeps server-side ordering tidy). Across blocks: parallel via `Promise.all`.
4. On all-success: toast `"Added N entries across M dates"`, close modal.
5. On any failure: toast the specific error, **keep modal open with state intact**. Do not roll back already-created entries. Successful blocks stay saved; admin fixes and retries the failed one.

**Description / notes:** stored once in form state, copied into every entry on save. Each saved entry is independent afterward.

**Amount field:** the manual override amount input is **removed when ≥2 date blocks exist** (auto-computed total from hourly rates is authoritative). For single-date it stays, preserving today's "no slots, just record a number" use case.

## Validation

- Description required (unchanged).
- ≥1 date block, and every date block has ≥1 selected slot. If a block is empty, prevent save and highlight that card ("Pick slots or remove this date").
- No duplicate dates — "+ Add date" picker disables dates already in the list.
- Past dates allowed (matches today's behavior — admins sometimes back-fill).

## Edge cases

- **Availability changes between picking & saving.** On insert failure for a block, toast `"Some slots on <date> are no longer available — refresh and retry"`, refetch availability for that date, visually mark conflicted slots red. Other blocks that saved stay saved.
- **Removing a date with selections.** Inline confirm: "Remove May 22 and its 3 slots?". Empty cards remove immediately.
- **Switching active date.** No confirmation; selections persist on inactive blocks.
- **Closing modal mid-flow.** Confirm prompt only if any block has ≥1 slot. No draft persistence.
- **Activity log.** Each `createManualEntry` writes one audit row — naturally produces N audit rows for N entries. Correct.

## Performance

Each date triggers one `grid-availability` fetch (cached 60s). Realistic range 1–10 dates. Not a concern.

## File scope

Single file: `app/admin/manual-entries/page.tsx`. Specifically the `EntryFormModal` component and the calling page's `handleSave`. No API, hook, or DB changes.

The current `EntryFormModal` is ~440 lines and will grow. As part of this work, extract:
- `DateBlockList` — the left-pane list + add-date picker
- `CourtSlotGrid` — the existing grid markup (already a clear unit; extract verbatim)

into sibling components in `app/admin/manual-entries/components/` so the modal file stays readable. This is not gratuitous refactoring — it's the boundary the feature naturally creates.
