"use client"

import { useState, useEffect } from "react"
import EmployeeClockWidget from "./EmployeeClockWidget"
import { LoadingPage } from "@/components/ui/loading"
import { useMe, useTimeEntries, type TimeEntry } from "@/lib/hooks/useTimeClock"

/* ── Helpers ── */

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

function formatDuration(hours: number) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h ${m}m`
}

function LiveClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="text-center">
      <p className="font-headline text-4xl font-bold tracking-tight text-on-surface tabular-nums xl:text-5xl">
        {time.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })}
      </p>
      <p className="mt-1 font-body text-xs text-on-surface-variant">
        {time.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </div>
  )
}

/* ── Component ── */

export default function TimeClock() {
  const { data: user, isLoading: userLoading } = useMe()
  const { data: entries, isLoading: entriesLoading } = useTimeEntries()
  const [logFilter, setLogFilter] = useState<"today" | "all">("today")

  if (userLoading) {
    return <LoadingPage message="Loading time clock..." />
  }

  const isAdmin = user?.role === "admin" || user?.permissions.time_clock_manage

  const allEntries = entries ?? []
  const todayStr = new Date().toISOString().split("T")[0]

  // Derive team status from today's entries (admin only)
  const todayEntries = allEntries.filter((e) => e.entry_date === todayStr)
  const activeEntries = allEntries.filter((e) => e.is_active)

  // Build unique employee status list from today's entries
  const employeeStatusMap = new Map<
    string,
    { name: string; role: string; isActive: boolean; clockIn: string | null; hoursToday: number }
  >()

  if (isAdmin) {
    for (const entry of todayEntries) {
      const existing = employeeStatusMap.get(entry.user_id)
      const hours = existing ? existing.hoursToday + entry.duration_hours : entry.duration_hours
      employeeStatusMap.set(entry.user_id, {
        name: entry.employee_name,
        role: entry.employee_role,
        isActive: existing?.isActive || entry.is_active,
        clockIn: entry.is_active ? entry.clock_in : existing?.clockIn ?? null,
        hoursToday: hours,
      })
    }
  }

  const employees = Array.from(employeeStatusMap.entries()).map(([id, emp]) => ({
    id,
    ...emp,
  }))

  const clockedInCount = activeEntries.length
  const clockedOutCount = Math.max(0, employees.length - clockedInCount)

  // Filter entries for the log table
  const filteredEntries: TimeEntry[] =
    logFilter === "today"
      ? allEntries.filter((e) => e.entry_date === todayStr)
      : allEntries

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* ── Role Badge ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary lg:text-4xl">
            {isAdmin ? "Time Clock" : "My Time Clock"}
          </h1>
          <p className="mt-1 font-body text-sm font-medium text-secondary">
            {isAdmin
              ? "Manage team attendance and hours"
              : "Track your clock in & out"}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-label text-[10px] font-bold uppercase tracking-widest ${
            isAdmin
              ? "bg-primary/10 text-primary"
              : "bg-[#6B3B65]/10 text-[#6B3B65]"
          }`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {isAdmin ? "Admin" : "Employee"}
        </span>
      </div>

      {/* ── Clock Widget + Stats ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[400px_1fr]">
        <EmployeeClockWidget />

        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">
            <LiveClock />
          </div>

          {isAdmin ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div>
                  <p className="font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">
                    Clocked In
                  </p>
                  <p className="font-headline text-2xl font-bold tracking-tight text-on-surface">
                    {clockedInCount}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#6B5B00] text-white">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <div>
                  <p className="font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">
                    Clocked Out
                  </p>
                  <p className="font-headline text-2xl font-bold tracking-tight text-on-surface">
                    {clockedOutCount}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">
                    My Hours Today
                  </p>
                  <p className="font-headline text-2xl font-bold tracking-tight text-on-surface">
                    {formatDuration(
                      todayEntries.reduce((sum, e) => sum + e.duration_hours, 0)
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">
                    Entries
                  </p>
                  <p className="font-headline text-2xl font-bold tracking-tight text-primary">
                    {todayEntries.length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Team Status (Admin only) + Time Log ── */}
      <div className={`grid grid-cols-1 gap-6 ${isAdmin ? "xl:grid-cols-[1fr_1fr]" : ""}`}>
        {/* Team Status — Admin only */}
        {isAdmin && (
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest">
            <div className="border-b border-outline-variant/15 p-5">
              <h2 className="font-headline text-lg font-semibold text-on-surface">
                Team Status
              </h2>
              <p className="mt-0.5 font-body text-xs text-on-surface-variant">
                Overview of all team members
              </p>
            </div>

            <div className="divide-y divide-outline-variant/10">
              {employees.length === 0 && !entriesLoading && (
                <div className="flex flex-col items-center gap-2 px-5 py-12">
                  <svg className="text-outline" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                  <p className="font-nav text-xs font-medium text-on-surface-variant">
                    No activity today
                  </p>
                </div>
              )}

              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center gap-3 px-5 py-4"
                >
                  <div className="relative">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim/30 font-nav text-xs font-bold text-primary">
                      {getInitials(emp.name)}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-container-lowest ${
                        emp.isActive ? "bg-primary" : "bg-outline"
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-nav text-xs font-semibold text-on-surface">
                      {emp.name}
                    </p>
                    <p className="truncate font-body text-[11px] text-on-surface-variant">
                      {emp.isActive && emp.clockIn ? (
                        <>
                          In since{" "}
                          <span className="font-medium text-primary">
                            {formatTime(emp.clockIn)}
                          </span>
                          {" · "}
                          {formatDuration(emp.hoursToday)}
                        </>
                      ) : (
                        <span className="text-outline">
                          {emp.hoursToday > 0
                            ? `${formatDuration(emp.hoursToday)} today`
                            : "Not clocked in"}
                        </span>
                      )}
                    </p>
                  </div>

                  <span className="mr-2 font-label text-[9px] font-medium uppercase tracking-wider text-on-surface-variant">
                    {emp.role}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-label text-[10px] font-semibold uppercase tracking-wider ${
                      emp.isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        emp.isActive
                          ? "bg-primary animate-pulse"
                          : "bg-outline"
                      }`}
                    />
                    {emp.isActive ? "Active" : "Off"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time Log — visible to both, but filtered by backend */}
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/15 p-5">
            <div>
              <h2 className="font-headline text-lg font-semibold text-on-surface">
                {isAdmin ? "Time Log" : "My Time Log"}
              </h2>
              <p className="mt-0.5 font-body text-xs text-on-surface-variant">
                {isAdmin
                  ? "Clock in & out history for all employees"
                  : "Your personal clock in & out history"}
              </p>
            </div>
            <div className="flex overflow-hidden rounded-lg border border-outline-variant/30">
              <button
                onClick={() => setLogFilter("today")}
                className={`px-4 py-1.5 font-nav text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  logFilter === "today"
                    ? "bg-surface-container-high text-on-surface"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setLogFilter("all")}
                className={`border-l border-outline-variant/30 px-4 py-1.5 font-nav text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  logFilter === "all"
                    ? "bg-surface-container-high text-on-surface"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                All
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-outline-variant/15">
                  {isAdmin && (
                    <th className="px-5 py-3 text-left font-label text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface-variant">
                      Employee
                    </th>
                  )}
                  <th className="px-5 py-3 text-left font-label text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface-variant">
                    Date
                  </th>
                  <th className="px-5 py-3 text-left font-label text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface-variant">
                    In
                  </th>
                  <th className="px-5 py-3 text-left font-label text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface-variant">
                    Out
                  </th>
                  <th className="px-5 py-3 text-right font-label text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface-variant">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {entriesLoading && (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="px-5 py-12 text-center">
                      <p className="font-body text-xs text-on-surface-variant animate-pulse">
                        Loading entries...
                      </p>
                    </td>
                  </tr>
                )}

                {!entriesLoading &&
                  filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="transition-colors hover:bg-surface-container-low/50"
                    >
                      {isAdmin && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim/30 font-nav text-[10px] font-bold text-primary">
                              {getInitials(entry.employee_name)}
                            </div>
                            <span className="font-nav text-xs font-semibold text-on-surface">
                              {entry.employee_name}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="px-5 py-3.5">
                        <span className="font-body text-xs text-on-surface-variant">
                          {formatDate(entry.entry_date)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-nav text-xs font-medium text-primary">
                          {formatTime(entry.clock_in)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {entry.clock_out ? (
                          <span className="font-nav text-xs font-medium text-on-surface">
                            {formatTime(entry.clock_out)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 font-label text-[10px] font-semibold uppercase tracking-wider text-primary">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {entry.clock_out ? (
                          <span className="font-nav text-xs font-semibold text-on-surface">
                            {formatDuration(entry.duration_hours)}
                          </span>
                        ) : (
                          <span className="font-body text-xs text-outline">—</span>
                        )}
                      </td>
                    </tr>
                  ))}

                {!entriesLoading && filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="text-outline" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <p className="font-nav text-xs font-medium text-on-surface-variant">
                          No time entries
                        </p>
                        <p className="font-body text-[11px] text-outline">
                          Clock in to start tracking
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-outline-variant/15 px-5 py-3">
            <p className="font-body text-[11px] text-on-surface-variant">
              {filteredEntries.length} entries
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
