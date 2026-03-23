"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useClockIn, useClockOut, useTimeEntries } from "@/lib/hooks/useTimeClock"

/* ── Confirmation Modal ── */

function ConfirmModal({
  open,
  action,
  currentTime,
  isPending,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean
  action: "clock-in" | "clock-out"
  currentTime: string
  isPending: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) onCancel()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onCancel, isPending])

  if (!open) return null

  const isClockIn = action === "clock-in"

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !isPending && onCancel()}
      />

      <div className="relative z-10 mx-4 w-full max-w-sm rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-xl">
        <div className="flex justify-center">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full ${
              isClockIn
                ? "bg-primary/10 text-primary"
                : "bg-error/10 text-error"
            }`}
          >
            {isClockIn ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
              </svg>
            )}
          </div>
        </div>

        <div className="mt-4 text-center">
          <h3 className="font-headline text-lg font-semibold text-on-surface">
            {isClockIn ? "Clock In" : "Clock Out"}
          </h3>
          <p className="mt-2 font-body text-sm text-on-surface-variant">
            {isClockIn
              ? "You are about to start your shift. Your clock-in time will be recorded."
              : "You are about to end your shift. Your clock-out time will be recorded."}
          </p>

          <div className="mt-4 rounded-lg bg-surface-container-low px-4 py-3">
            <p className="font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">
              {isClockIn ? "Clock In At" : "Clock Out At"}
            </p>
            <p className="mt-1 font-headline text-2xl font-bold tracking-tight text-on-surface tabular-nums">
              {currentTime}
            </p>
          </div>

          {error && (
            <p className="mt-3 font-body text-xs text-error">{error}</p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 rounded-lg border border-outline-variant/30 bg-transparent px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className={`flex-1 rounded-lg px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
              isClockIn
                ? "bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container"
                : "bg-error text-on-error hover:bg-error/90"
            } disabled:opacity-60`}
          >
            {isPending
              ? "Processing..."
              : isClockIn
              ? "Confirm Clock In"
              : "Confirm Clock Out"}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Elapsed Timer ── */

function ElapsedTime({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState("")

  useEffect(() => {
    function calc() {
      const start = new Date(since)
      const now = new Date()
      const diff = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000))
      const hrs = Math.floor(diff / 3600)
      const mins = Math.floor((diff % 3600) / 60)
      const secs = diff % 60
      setElapsed(
        `${hrs.toString().padStart(2, "0")}:${mins
          .toString()
          .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      )
    }
    calc()
    const timer = setInterval(calc, 1000)
    return () => clearInterval(timer)
  }, [since])

  return (
    <span className="font-headline text-3xl font-bold tracking-tight text-primary tabular-nums xl:text-4xl">
      {elapsed}
    </span>
  )
}

/* ── Main Widget ── */

export default function EmployeeClockWidget() {
  const [modalOpen, setModalOpen] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [time, setTime] = useState(new Date())

  const { data: entries } = useTimeEntries()
  const clockInMutation = useClockIn()
  const clockOutMutation = useClockOut()

  // Find the user's active entry (is_active = true)
  const activeEntry = entries?.find((e) => e.is_active) ?? null
  const isClockedIn = !!activeEntry

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const currentTimeFormatted = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })

  const clockInTimeFormatted = activeEntry
    ? new Date(activeEntry.clock_in).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null

  const pendingAction = isClockedIn ? "clock-out" : "clock-in"
  const isPending = clockInMutation.isPending || clockOutMutation.isPending

  const handleConfirm = useCallback(async () => {
    setMutationError(null)
    try {
      if (pendingAction === "clock-in") {
        await clockInMutation.mutateAsync(undefined)
      } else {
        await clockOutMutation.mutateAsync(undefined)
      }
      setModalOpen(false)
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Something went wrong")
    }
  }, [pendingAction, clockInMutation, clockOutMutation])

  const handleCancel = useCallback(() => {
    setMutationError(null)
    setModalOpen(false)
  }, [])

  return (
    <>
      <ConfirmModal
        open={modalOpen}
        action={pendingAction}
        currentTime={currentTimeFormatted}
        isPending={isPending}
        error={mutationError}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest">
        <div className="border-b border-outline-variant/15 p-5">
          <h2 className="font-headline text-lg font-semibold text-on-surface">
            My Time Clock
          </h2>
          <p className="mt-0.5 font-body text-xs text-on-surface-variant">
            {isClockedIn ? "Your shift is in progress" : "Clock in to start your shift"}
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 p-6 sm:p-8">
          {/* Current time */}
          <div className="text-center">
            <p className="font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">
              Current Time
            </p>
            <p className="mt-1 font-headline text-3xl font-bold tracking-tight text-on-surface tabular-nums xl:text-4xl">
              {currentTimeFormatted}
            </p>
            <p className="mt-1 font-body text-xs text-on-surface-variant">
              {time.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Status + elapsed */}
          {isClockedIn && activeEntry && (
            <div className="w-full rounded-lg bg-primary/5 border border-primary/10 p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <p className="font-label text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">
                  Shift In Progress
                </p>
              </div>
              <div className="mt-3">
                <p className="font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">
                  Elapsed Time
                </p>
                <div className="mt-1">
                  <ElapsedTime since={activeEntry.clock_in} />
                </div>
              </div>
              <p className="mt-2 font-body text-[11px] text-on-surface-variant">
                Clocked in at{" "}
                <span className="font-medium text-on-surface">{clockInTimeFormatted}</span>
              </p>
            </div>
          )}

          {!isClockedIn && (
            <div className="w-full rounded-lg bg-surface-container-low p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="h-2 w-2 rounded-full bg-outline" />
                <p className="font-label text-[10px] font-semibold uppercase tracking-[0.15em] text-on-surface-variant">
                  Off Shift
                </p>
              </div>
              <p className="mt-2 font-body text-[11px] text-outline">
                Press the button below to start your shift
              </p>
            </div>
          )}

          {/* Clock button */}
          <button
            onClick={() => setModalOpen(true)}
            disabled={isPending}
            className={`group flex h-20 w-20 items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-60 ${
              !isClockedIn
                ? "bg-primary text-on-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                : "bg-error text-on-error shadow-lg shadow-error/25 hover:shadow-xl hover:shadow-error/30"
            }`}
          >
            {!isClockedIn ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:scale-110">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:scale-110">
                <circle cx="12" cy="12" r="10" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
              </svg>
            )}
          </button>

          <p className="font-nav text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            {!isClockedIn ? "Tap to Clock In" : "Tap to Clock Out"}
          </p>
        </div>
      </div>
    </>
  )
}
