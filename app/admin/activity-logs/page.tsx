"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

/* ── Types ── */

type ActionFilter = "all" | "created" | "updated" | "deleted"
type TableFilter = "all" | "reservations" | "time_entries" | "profiles" | "courts"

interface AuditLog {
  id: string
  created_at: string
  actor_id: string | null
  actor_name: string | null
  actor_role: string | null
  action: string
  table_name: string
  record_id: string | null
  description: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
}

/* ── Helpers ── */

function getInitials(name: string | null) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }),
  }
}

const actionStyles: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  created: { bg: "bg-primary/8", text: "text-primary", dot: "bg-primary", label: "Created" },
  updated: { bg: "bg-[#C49B00]/8", text: "text-[#6B5B00]", dot: "bg-[#C49B00]", label: "Updated" },
  deleted: { bg: "bg-error/8", text: "text-error", dot: "bg-error", label: "Deleted" },
}

const tableLabel: Record<string, string> = {
  reservations: "Reservation",
  time_entries: "Time Clock",
  profiles: "User",
  courts: "Court",
}

const tableIcon: Record<string, React.ReactNode> = {
  reservations: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  time_entries: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  profiles: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  courts: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  ),
}

/* ── Component ── */

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all")
  const [tableFilter, setTableFilter] = useState<TableFilter>("all")
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs", tableFilter, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (tableFilter !== "all") params.set("table", tableFilter)
      if (actionFilter !== "all") params.set("action", actionFilter)
      params.set("limit", "100")
      const res = await fetch(`/api/audit-logs?${params}`)
      if (!res.ok) throw new Error("Failed to fetch audit logs")
      return res.json()
    },
  })

  const totalToday = logs.filter((l) => {
    const d = new Date(l.created_at)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  }).length

  const createdCount = logs.filter((l) => l.action === "created").length
  const updatedCount = logs.filter((l) => l.action === "updated").length
  const deletedCount = logs.filter((l) => l.action === "deleted").length

  function handleExport() {
    if (!logs.length) return
    const rows = logs.map((l) => {
      const { date, time } = formatDateTime(l.created_at)
      return {
        Date: date,
        Time: time,
        Actor: l.actor_name ?? "Unknown",
        Role: l.actor_role ?? "",
        Action: l.action,
        Table: tableLabel[l.table_name] ?? l.table_name,
        "Record ID": l.record_id ?? "",
        Description: l.description ?? "",
      }
    })
    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => `"${(r as Record<string, string>)[h] ?? ""}"`).join(",")),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary lg:text-4xl">
            Audit Logs
          </h1>
          <p className="mt-1 font-body text-sm font-medium text-secondary">
            Every create, update, and delete — tracked by user
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={!logs.length}
          className="flex h-9 items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-4 font-nav text-xs font-semibold uppercase tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-40"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Today", value: totalToday, color: "text-on-surface", icon: "📋" },
          { label: "Created", value: createdCount, color: "text-primary", icon: "✚" },
          { label: "Updated", value: updatedCount, color: "text-[#6B5B00]", icon: "✎" },
          { label: "Deleted", value: deletedCount, color: "text-error", icon: "✕" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
            <p className="font-label text-[10px] font-bold uppercase tracking-widest text-outline">{s.label}</p>
            <p className={`mt-2 font-headline text-2xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3">
        {/* Action filter */}
        <div className="flex overflow-hidden rounded-lg border border-outline-variant/30">
          {(["all", "created", "updated", "deleted"] as ActionFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setActionFilter(f)}
              className={`px-3 py-1.5 font-nav text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                f !== "all" ? "border-l border-outline-variant/30" : ""
              } ${
                actionFilter === f
                  ? "bg-surface-container-high text-on-surface"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {f === "all" ? "All Actions" : f}
            </button>
          ))}
        </div>

        {/* Table filter */}
        <div className="flex overflow-hidden rounded-lg border border-outline-variant/30">
          {(["all", "reservations", "time_entries", "profiles", "courts"] as TableFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTableFilter(f)}
              className={`px-3 py-1.5 font-nav text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                f !== "all" ? "border-l border-outline-variant/30" : ""
              } ${
                tableFilter === f
                  ? "bg-surface-container-high text-on-surface"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {f === "all" ? "All Tables" : (tableLabel[f] ?? f)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Log Table ── */}
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden">
        <div className="hidden border-b border-outline-variant/15 px-6 py-3 md:grid md:grid-cols-[150px_140px_80px_100px_1fr_32px]">
          {["Timestamp", "Actor", "Action", "Table", "Description", ""].map((h) => (
            <span key={h} className="font-label text-[10px] font-bold uppercase tracking-[0.15em] text-outline">{h}</span>
          ))}
        </div>

        <div className="divide-y divide-outline-variant/10">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {!isLoading && logs.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <svg className="text-outline/40" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="font-nav text-xs font-medium text-on-surface-variant">No audit logs yet</p>
              <p className="font-body text-[11px] text-outline">Actions on the system will appear here</p>
            </div>
          )}

          {!isLoading && logs.map((log) => {
            const { date, time } = formatDateTime(log.created_at)
            const action = actionStyles[log.action] ?? actionStyles.updated
            const isExpanded = expanded === log.id
            const hasDetails = log.old_data || log.new_data

            return (
              <div key={log.id} className="transition-colors hover:bg-surface-container-low/40">
                <div className={`px-6 py-4 md:grid md:grid-cols-[150px_140px_80px_100px_1fr_32px] md:items-center gap-2`}>
                  {/* Timestamp */}
                  <div className="mb-1 md:mb-0">
                    <p className="font-mono text-xs font-medium text-on-surface">{time}</p>
                    <p className="font-body text-[11px] text-on-surface-variant">{date}</p>
                  </div>

                  {/* Actor */}
                  <div className="mb-1 flex items-center gap-2 md:mb-0">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-nav text-[10px] font-bold ${
                      log.actor_role === "admin"
                        ? "bg-[#4A2462]/10 text-[#4A2462]"
                        : "bg-primary-fixed-dim/30 text-primary"
                    }`}>
                      {getInitials(log.actor_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-nav text-xs font-semibold text-on-surface">{log.actor_name ?? "Unknown"}</p>
                      <p className="font-body text-[10px] capitalize text-on-surface-variant">{log.actor_role ?? ""}</p>
                    </div>
                  </div>

                  {/* Action badge */}
                  <div className="mb-1 md:mb-0">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-label text-[10px] font-bold uppercase tracking-wider ${action.bg} ${action.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${action.dot}`} />
                      {action.label}
                    </span>
                  </div>

                  {/* Table */}
                  <div className="mb-1 md:mb-0">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-container-high px-2 py-1 font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      {tableIcon[log.table_name]}
                      {tableLabel[log.table_name] ?? log.table_name}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="min-w-0">
                    <p className="font-body text-xs text-on-surface leading-relaxed">{log.description ?? "—"}</p>
                    {log.record_id && (
                      <p className="font-mono text-[10px] text-outline mt-0.5 truncate">{log.record_id}</p>
                    )}
                  </div>

                  {/* Expand toggle */}
                  <div className="flex justify-end">
                    {hasDetails && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : log.id)}
                        className="flex h-6 w-6 items-center justify-center rounded text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
                      >
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded data diff */}
                {isExpanded && hasDetails && (
                  <div className="border-t border-outline-variant/10 bg-surface-container-low/30 px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {log.old_data && (
                      <div>
                        <p className="mb-2 font-label text-[10px] font-bold uppercase tracking-widest text-error">Before</p>
                        <pre className="rounded-lg bg-surface-container-high p-3 font-mono text-[10px] text-on-surface-variant overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(log.old_data, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.new_data && (
                      <div>
                        <p className="mb-2 font-label text-[10px] font-bold uppercase tracking-widest text-primary">After</p>
                        <pre className="rounded-lg bg-surface-container-high p-3 font-mono text-[10px] text-on-surface-variant overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(log.new_data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between border-t border-outline-variant/15 px-6 py-3">
          <p className="font-body text-xs text-on-surface-variant">
            <span className="font-semibold text-on-surface">{logs.length}</span> entries
          </p>
          <p className="font-body text-[11px] text-outline">Auto-refreshes every 30s</p>
        </div>
      </div>
    </div>
  )
}
