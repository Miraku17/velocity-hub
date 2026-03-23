"use client"

import { useState } from "react"
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
    year: "numeric",
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
  const todayEntries = allEntries.filter((e) => e.entry_date === todayStr)
  const activeEntries = allEntries.filter((e) => e.is_active)

  // Build employee status map (admin only)
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

  const employees = Array.from(employeeStatusMap.entries()).map(([id, emp]) => ({ id, ...emp }))
  const clockedInCount = activeEntries.length

  const filteredEntries: TimeEntry[] =
    logFilter === "today"
      ? allEntries.filter((e) => e.entry_date === todayStr)
      : allEntries

  const myHoursToday = todayEntries.reduce((sum, e) => sum + e.duration_hours, 0)

  function handleExport() {
    const rows = filteredEntries.map((e) => ({
      ...(isAdmin ? { Employee: e.employee_name } : {}),
      Date: e.entry_date,
      "Clock In": formatTime(e.clock_in),
      "Clock Out": e.clock_out ? formatTime(e.clock_out) : "Active",
      "Duration (hrs)": e.clock_out ? e.duration_hours.toFixed(2) : "",
    }))

    if (rows.length === 0) return

    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => `"${(r as Record<string, string>)[h] ?? ""}"`).join(",")
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `time-log-${logFilter === "today" ? todayStr : "all"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary lg:text-4xl">
            {isAdmin ? "Time Clock" : "My Time Clock"}
          </h1>
          <p className="mt-1 font-body text-sm font-medium text-secondary">
            {isAdmin ? "Manage team attendance and hours" : "Track your clock in & out"}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-label text-[10px] font-bold uppercase tracking-widest ${
            isAdmin ? "bg-primary/10 text-primary" : "bg-[#6B3B65]/10 text-[#6B3B65]"
          }`}
        >
          {isAdmin ? "Admin" : "Employee"}
        </span>
      </div>

      {/* ── Quick Stats (inline) ── */}
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
        {isAdmin ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="font-headline text-xl font-extrabold text-on-surface">{clockedInCount}</span>
              <span className="font-body text-xs text-on-surface-variant">clocked in</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-outline" />
              <span className="font-headline text-xl font-extrabold text-on-surface">{employees.length}</span>
              <span className="font-body text-xs text-on-surface-variant">active today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-secondary" />
              <span className="font-headline text-xl font-extrabold text-on-surface">{todayEntries.length}</span>
              <span className="font-body text-xs text-on-surface-variant">{todayEntries.length === 1 ? "entry" : "entries"} today</span>
            </div>
          </>
        ) : (
          <>
            <div>
              <span className="font-headline text-xl font-extrabold text-on-surface">{formatDuration(myHoursToday)}</span>
              <span className="ml-1.5 font-body text-xs text-on-surface-variant">today</span>
            </div>
            <div>
              <span className="font-headline text-xl font-extrabold text-on-surface">{todayEntries.length}</span>
              <span className="ml-1.5 font-body text-xs text-on-surface-variant">{todayEntries.length === 1 ? "entry" : "entries"}</span>
            </div>
          </>
        )}
      </div>

      {/* ── Clock Widget + Team Status ── */}
      <div className={`grid grid-cols-1 gap-6 ${isAdmin ? "xl:grid-cols-[360px_1fr]" : "max-w-md"}`}>
        <EmployeeClockWidget />

        {/* Team Status — Admin only */}
        {isAdmin && (
          <div className="rounded-xl ring-1 ring-outline-variant/20 bg-surface-container-lowest overflow-hidden">
            <div className="border-b border-outline-variant/10 px-5 py-4">
              <h2 className="font-headline text-base font-bold text-on-surface">Team Status</h2>
              <p className="mt-0.5 font-body text-[11px] text-on-surface-variant">Who&apos;s on shift right now</p>
            </div>

            <div className="divide-y divide-outline-variant/8">
              {employees.length === 0 && !entriesLoading && (
                <div className="flex flex-col items-center gap-2 px-5 py-12">
                  <svg className="text-outline/30" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                  <p className="font-nav text-xs font-medium text-on-surface-variant">No activity today</p>
                </div>
              )}

              {employees.map((emp) => (
                <div key={emp.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="relative">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim/30 font-nav text-[10px] font-bold text-primary">
                      {getInitials(emp.name)}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-container-lowest ${
                        emp.isActive ? "bg-primary" : "bg-outline"
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-nav text-xs font-semibold text-on-surface">
                      {emp.name}
                    </p>
                    <p className="truncate font-body text-[10px] text-on-surface-variant">
                      {emp.isActive && emp.clockIn ? (
                        <>
                          Since{" "}
                          <span className="font-medium text-primary">{formatTime(emp.clockIn)}</span>
                          {" · "}{formatDuration(emp.hoursToday)}
                        </>
                      ) : (
                        <span className="text-outline">
                          {emp.hoursToday > 0 ? `${formatDuration(emp.hoursToday)} logged` : "No activity"}
                        </span>
                      )}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-label text-[9px] font-bold uppercase tracking-wider ${
                      emp.isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${emp.isActive ? "bg-primary animate-pulse" : "bg-outline"}`} />
                    {emp.isActive ? "On" : "Off"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Time Log ── */}
      <div className="rounded-xl ring-1 ring-outline-variant/20 bg-surface-container-lowest overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/10 px-5 py-4">
          <div>
            <h2 className="font-headline text-base font-bold text-on-surface">
              {isAdmin ? "Time Log" : "My Time Log"}
            </h2>
            <p className="mt-0.5 font-body text-[11px] text-on-surface-variant">
              {isAdmin ? "All employee clock history" : "Your clock in & out history"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-surface-container-high p-0.5">
              {(["today", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`px-3 py-1 rounded-md font-nav text-[10px] font-semibold uppercase tracking-wider transition-all ${
                    logFilter === f
                      ? "bg-surface-container-lowest text-on-surface shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {f === "today" ? "Today" : "All"}
                </button>
              ))}
            </div>
            <button
              onClick={handleExport}
              disabled={filteredEntries.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-nav text-[10px] font-semibold uppercase tracking-wider text-on-primary shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/25 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-outline-variant/10 bg-surface-container-low/20">
                {isAdmin && (
                  <th className="px-5 py-3 text-left font-label text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Employee
                  </th>
                )}
                <th className="px-5 py-3 text-left font-label text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Date
                </th>
                <th className="px-5 py-3 text-left font-label text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                  In
                </th>
                <th className="px-5 py-3 text-left font-label text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Out
                </th>
                <th className="px-5 py-3 text-right font-label text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/8">
              {entriesLoading && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="px-5 py-12 text-center">
                    <p className="font-body text-xs text-on-surface-variant animate-pulse">Loading...</p>
                  </td>
                </tr>
              )}

              {!entriesLoading && filteredEntries.map((entry) => (
                <tr key={entry.id} className="transition-colors hover:bg-surface-container-low/30">
                  {isAdmin && (
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim/30 font-nav text-[9px] font-bold text-primary">
                          {getInitials(entry.employee_name)}
                        </div>
                        <span className="font-nav text-xs font-semibold text-on-surface">
                          {entry.employee_name}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-5 py-3">
                    <span className="font-body text-xs text-on-surface-variant">{formatDate(entry.entry_date)}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-nav text-xs font-medium text-primary">{formatTime(entry.clock_in)}</span>
                  </td>
                  <td className="px-5 py-3">
                    {entry.clock_out ? (
                      <span className="font-nav text-xs font-medium text-on-surface">{formatTime(entry.clock_out)}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 font-label text-[9px] font-bold uppercase tracking-wider text-primary">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {entry.clock_out ? (
                      <span className="font-nav text-xs font-semibold text-on-surface">{formatDuration(entry.duration_hours)}</span>
                    ) : (
                      <span className="font-body text-xs text-outline">—</span>
                    )}
                  </td>
                </tr>
              ))}

              {!entriesLoading && filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="px-5 py-12 text-center">
                    <p className="font-nav text-xs font-medium text-on-surface-variant">No entries</p>
                    <p className="mt-1 font-body text-[11px] text-outline">Clock in to start tracking</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-outline-variant/10 px-5 py-3">
          <p className="font-body text-[11px] text-on-surface-variant">
            {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
          </p>
        </div>
      </div>
    </div>
  )
}
