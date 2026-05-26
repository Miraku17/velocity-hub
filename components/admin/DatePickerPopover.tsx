"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Portal } from "@/components/ui/portal"

const POPOVER_HEIGHT = 340 // approx Calendar height + padding
const POPOVER_WIDTH = 280
const GAP = 6
const EDGE = 8

interface RenderTriggerArgs {
  ref: React.RefObject<HTMLButtonElement | null>
  onClick: () => void
  open: boolean
  ariaProps: {
    "aria-expanded": boolean
    "aria-haspopup": "dialog"
  }
}

interface Props {
  selected?: Date
  disabled?: (date: Date) => boolean
  onSelect: (date: Date) => void
  renderTrigger: (args: RenderTriggerArgs) => ReactNode
}

export function DatePickerPopover({ selected, disabled, onSelect, renderTrigger }: Props) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{
    top: number
    left: number
    placement: "below" | "above"
  } | null>(null)

  useEffect(() => {
    if (!open) return
    function recompute() {
      const el = triggerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const placement = spaceBelow < POPOVER_HEIGHT && rect.top > POPOVER_HEIGHT ? "above" : "below"
      const left = Math.max(EDGE, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - EDGE))
      setPos({
        top: placement === "below" ? rect.bottom + GAP : rect.top - GAP,
        left,
        placement,
      })
    }
    recompute()

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    window.addEventListener("resize", recompute)
    window.addEventListener("scroll", recompute, true)
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKey)
    return () => {
      window.removeEventListener("resize", recompute)
      window.removeEventListener("scroll", recompute, true)
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  return (
    <>
      {renderTrigger({
        ref: triggerRef,
        onClick: () => setOpen((o) => !o),
        open,
        ariaProps: { "aria-expanded": open, "aria-haspopup": "dialog" },
      })}
      {open && pos && (
        <Portal>
          <div
            ref={popoverRef}
            role="dialog"
            style={{
              position: "fixed",
              top: pos.placement === "below" ? pos.top : undefined,
              bottom: pos.placement === "above" ? window.innerHeight - pos.top : undefined,
              left: pos.left,
              zIndex: 200,
            }}
            className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-1 shadow-xl"
          >
            <Calendar
              mode="single"
              selected={selected}
              disabled={disabled}
              onSelect={(d) => {
                if (!d) return
                onSelect(d)
                setOpen(false)
              }}
            />
          </div>
        </Portal>
      )}
    </>
  )
}
