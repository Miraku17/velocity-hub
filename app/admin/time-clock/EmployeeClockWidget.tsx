"use client"

import { useState, useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useClockIn, useClockOut, useTimeEntries, useMe } from "@/lib/hooks/useTimeClock"

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

  return <>{elapsed}</>
}

/* ── Main Widget ── */

export default function EmployeeClockWidget() {
  const [confirmAction, setConfirmAction] = useState<"clock-in" | "clock-out" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [time, setTime] = useState(new Date())
  const [transitioning, setTransitioning] = useState(false)

  const queryClient = useQueryClient()
  const { data: me } = useMe()
  const { data: entries, isLoading } = useTimeEntries()
  const clockInMutation = useClockIn()
  const clockOutMutation = useClockOut()

  const activeEntry = entries?.find((e) => e.is_active && e.user_id === me?.id) ?? null
  const isClockedIn = !!activeEntry
  const isPending = clockInMutation.isPending || clockOutMutation.isPending

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

  const dateFormatted = time.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  const clockInTimeFormatted = activeEntry
    ? new Date(activeEntry.clock_in).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null

  const handleConfirm = useCallback(async () => {
    if (!confirmAction) return
    setError(null)
    try {
      if (confirmAction === "clock-in") {
        await clockInMutation.mutateAsync(undefined)
      } else {
        await clockOutMutation.mutateAsync(undefined)
      }
      setConfirmAction(null)
      setTransitioning(true)
      await queryClient.refetchQueries({ queryKey: ["time-entries"] })
      setTransitioning(false)
    } catch (err) {
      setTransitioning(false)
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }, [confirmAction, clockInMutation, clockOutMutation, queryClient])

  // Escape key to close modal
  useEffect(() => {
    if (!confirmAction) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) {
        setConfirmAction(null)
        setError(null)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [confirmAction, isPending])

  const busy = isPending || transitioning || isLoading

  return (
    <>
      {/* ── Confirmation Modal ── */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !isPending && (setConfirmAction(null), setError(null))}
          />
          <div className="relative z-10 mx-4 w-full max-w-sm rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-xl">
            <div className="flex justify-center">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full ${
                  confirmAction === "clock-in"
                    ? "bg-primary/10 text-primary"
                    : "bg-error/10 text-error"
                }`}
              >
                {confirmAction === "clock-in" ? (
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
                {confirmAction === "clock-in" ? "Clock In" : "Clock Out"}
              </h3>
              <p className="mt-2 font-body text-sm text-on-surface-variant">
                {confirmAction === "clock-in"
                  ? "You are about to start your shift."
                  : "You are about to end your shift."}
              </p>

              <div className="mt-4 rounded-lg bg-surface-container-low px-4 py-3">
                <p className="font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">
                  {confirmAction === "clock-in" ? "Clock In At" : "Clock Out At"}
                </p>
                <p className="mt-1 font-headline text-2xl font-bold tracking-tight text-on-surface tabular-nums">
                  {currentTimeFormatted}
                </p>
              </div>

              {error && (
                <p className="mt-3 font-body text-xs text-error">{error}</p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setConfirmAction(null); setError(null) }}
                disabled={isPending}
                className="flex-1 rounded-lg border border-outline-variant/30 bg-transparent px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className={`flex-1 rounded-lg px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] transition-colors disabled:opacity-60 ${
                  confirmAction === "clock-in"
                    ? "bg-primary text-on-primary hover:bg-primary/90"
                    : "bg-error text-on-error hover:bg-error/90"
                }`}
              >
                {isPending ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Widget ── */}
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
              {dateFormatted}
            </p>
          </div>

          {/* Status card */}
          {isClockedIn && activeEntry ? (
            <div className="w-full rounded-lg border border-primary/10 bg-primary/5 p-4 text-center">
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
                <p className="mt-1 font-headline text-3xl font-bold tracking-tight text-primary tabular-nums xl:text-4xl">
                  <ElapsedTime since={activeEntry.clock_in} />
                </p>
              </div>
              <p className="mt-2 font-body text-[11px] text-on-surface-variant">
                Clocked in at{" "}
                <span className="font-medium text-on-surface">{clockInTimeFormatted}</span>
              </p>
            </div>
          ) : (
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
            onClick={() => setConfirmAction(isClockedIn ? "clock-out" : "clock-in")}
            disabled={busy}
            className={`group flex h-20 w-20 items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-60 ${
              isClockedIn
                ? "bg-error text-on-error shadow-lg shadow-error/25 hover:shadow-xl hover:shadow-error/30"
                : "bg-primary text-on-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
            }`}
          >
            {busy ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : isClockedIn ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:scale-110">
                <circle cx="12" cy="12" r="10" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:scale-110">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
            )}
          </button>

          <p className="font-nav text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            {busy ? "Updating..." : isClockedIn ? "Tap to Clock Out" : "Tap to Clock In"}
          </p>
        </div>
      </div>
    </>
  )
}
