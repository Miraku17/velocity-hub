"use client"

import { useEffect } from "react"
import { Portal } from "@/components/ui/portal"

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
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel()
      if (e.key === "Enter") onConfirm()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onCancel, onConfirm])

  const confirmClasses =
    variant === "danger"
      ? "bg-error text-on-error hover:bg-error/90"
      : "bg-primary text-on-primary hover:bg-primary/90"
  const iconClasses =
    variant === "danger" ? "bg-error/10 text-error" : "bg-primary/10 text-primary"

  return (
    <Portal>
      <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-[111] flex items-center justify-center p-4" onClick={onCancel}>
        <div
          className="w-full max-w-sm rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center">
            <div className={`flex h-14 w-14 items-center justify-center rounded-full ${iconClasses}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          </div>
          <div className="mt-4 text-center">
            <h3 className="font-headline text-lg font-semibold text-on-surface">{title}</h3>
            <p className="mt-2 font-body text-sm text-on-surface-variant">{message}</p>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-outline-variant/30 bg-transparent px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              autoFocus
              className={`flex-1 rounded-lg px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${confirmClasses}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
