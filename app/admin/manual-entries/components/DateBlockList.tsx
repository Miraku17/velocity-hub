"use client"

import type { DateBlock } from "./types"
import { DatePickerPopover } from "@/components/admin/DatePickerPopover"

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function dateToISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
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
  const usedDates = new Set(blocks.map((b) => b.date))

  return (
    <div className="rounded-lg border border-outline-variant/15 bg-surface-container-low/40 p-3">
      <div className="font-label text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
        Dates in this booking
      </div>

      <div className="space-y-2 mb-3">
        {blocks.map((b) => {
          const isActive = b.id === activeBlockId
          const isEmpty = b.selectedSlots.length === 0 && blocks.length > 1
          const subtotal = subtotals[b.id] ?? 0
          const cardClasses = `group rounded-md border p-2 transition-colors ${
            isActive
              ? "border-primary bg-primary/10"
              : isEmpty
                ? "border-error/50 bg-error/5 hover:border-error"
                : "border-outline-variant/20 bg-surface-container-lowest hover:border-primary/40"
          }`
          return (
            <div
              key={b.id}
              className={cardClasses}
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
        <DatePickerPopover
          disabled={(d) => usedDates.has(dateToISO(d))}
          onSelect={(d) => onAddDate(dateToISO(d))}
          renderTrigger={({ ref, onClick, open, ariaProps }) => (
            <button
              ref={ref}
              type="button"
              onClick={onClick}
              {...ariaProps}
              className={`w-full h-9 rounded-md border border-dashed font-nav text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                open
                  ? "border-primary bg-surface-container-lowest text-primary"
                  : "border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary"
              }`}
            >
              + Add Date
            </button>
          )}
        />
      )}
    </div>
  )
}
