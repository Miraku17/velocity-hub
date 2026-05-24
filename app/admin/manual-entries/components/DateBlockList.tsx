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
            className="sr-only"
          />
        </div>
      )}
    </div>
  )
}
