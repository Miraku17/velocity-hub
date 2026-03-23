"use client"

import { useState } from "react"

/* ── Types ── */

type LogCategory = "all" | "auth" | "booking" | "court" | "system" | "security"

type LogEntry = {
  id: string
  timestamp: string
  time: string
  actor: string
  actorInitials: string
  actorRole: string
  action: string
  description: string
  category: LogCategory
  ip?: string
  severity: "info" | "warning" | "critical"
  metadata?: string
}

/* ── Mock Data ── */

const logs: LogEntry[] = [
  {
    id: "LOG-001",
    timestamp: "Mar 23, 2026",
    time: "14:32:05",
    actor: "Facility Admin",
    actorInitials: "FA",
    actorRole: "Admin",
    action: "Court Status Changed",
    description: "Changed Court 05 status from Active to Maintenance — Resurfacing",
    category: "court",
    ip: "192.168.1.42",
    severity: "info",
    metadata: "court_id: C05",
  },
  {
    id: "LOG-002",
    timestamp: "Mar 23, 2026",
    time: "14:28:11",
    actor: "System",
    actorInitials: "SY",
    actorRole: "Automated",
    action: "Rate Limit Triggered",
    description: "Blocked 12 rapid booking attempts from same IP within 60s window",
    category: "security",
    ip: "103.25.67.190",
    severity: "warning",
    metadata: "rule: rate_limit_booking",
  },
  {
    id: "LOG-003",
    timestamp: "Mar 23, 2026",
    time: "14:15:33",
    actor: "Facility Admin",
    actorInitials: "FA",
    actorRole: "Admin",
    action: "Reservation Cancelled",
    description: "Cancelled reservation #VL-88222 for Rita Alvarez — Refund issued ₱400.00",
    category: "booking",
    ip: "192.168.1.42",
    severity: "info",
    metadata: "reservation_id: #VL-88222",
  },
  {
    id: "LOG-004",
    timestamp: "Mar 23, 2026",
    time: "13:45:00",
    actor: "System",
    actorInitials: "SY",
    actorRole: "Automated",
    action: "Spam Detection",
    description: "Flagged and blocked booking form submission — honeypot field triggered",
    category: "security",
    ip: "45.33.22.109",
    severity: "warning",
    metadata: "rule: honeypot_trap",
  },
  {
    id: "LOG-005",
    timestamp: "Mar 23, 2026",
    time: "13:22:47",
    actor: "Facility Admin",
    actorInitials: "FA",
    actorRole: "Admin",
    action: "Sign In",
    description: "Successful admin login from trusted IP",
    category: "auth",
    ip: "192.168.1.42",
    severity: "info",
  },
  {
    id: "LOG-006",
    timestamp: "Mar 23, 2026",
    time: "12:58:19",
    actor: "System",
    actorInitials: "SY",
    actorRole: "Automated",
    action: "Failed Login Attempt",
    description: "3 consecutive failed login attempts — temporary lockout applied (15 min)",
    category: "auth",
    ip: "78.104.55.201",
    severity: "critical",
    metadata: "lockout_until: 13:13:19",
  },
  {
    id: "LOG-007",
    timestamp: "Mar 23, 2026",
    time: "12:30:00",
    actor: "Facility Admin",
    actorInitials: "FA",
    actorRole: "Admin",
    action: "Reservation Created",
    description: "Created priority reservation #VL-88221 for David Kim — Court 01, 6-8 PM",
    category: "booking",
    ip: "192.168.1.42",
    severity: "info",
    metadata: "reservation_id: #VL-88221",
  },
  {
    id: "LOG-008",
    timestamp: "Mar 23, 2026",
    time: "11:45:22",
    actor: "System",
    actorInitials: "SY",
    actorRole: "Automated",
    action: "CAPTCHA Challenge Issued",
    description: "Served CAPTCHA to suspicious booking session — failed verification, blocked",
    category: "security",
    ip: "91.240.118.33",
    severity: "warning",
    metadata: "rule: captcha_challenge",
  },
  {
    id: "LOG-009",
    timestamp: "Mar 23, 2026",
    time: "11:12:05",
    actor: "Facility Admin",
    actorInitials: "FA",
    actorRole: "Admin",
    action: "Pricing Updated",
    description: "Updated Court 01-03 hourly rate from ₱350 to ₱400 (Indoor)",
    category: "system",
    ip: "192.168.1.42",
    severity: "info",
    metadata: "courts: C01, C02, C03",
  },
  {
    id: "LOG-010",
    timestamp: "Mar 23, 2026",
    time: "10:30:00",
    actor: "System",
    actorInitials: "SY",
    actorRole: "Automated",
    action: "Duplicate Booking Prevented",
    description: "Blocked duplicate booking attempt for same time slot — Court 02, 1-2 PM",
    category: "security",
    ip: "192.168.1.55",
    severity: "info",
    metadata: "rule: duplicate_prevention",
  },
  {
    id: "LOG-011",
    timestamp: "Mar 22, 2026",
    time: "23:15:44",
    actor: "System",
    actorInitials: "SY",
    actorRole: "Automated",
    action: "Session Expired",
    description: "Admin session auto-expired after 2 hours of inactivity",
    category: "auth",
    ip: "192.168.1.42",
    severity: "info",
  },
  {
    id: "LOG-012",
    timestamp: "Mar 22, 2026",
    time: "21:05:33",
    actor: "Facility Admin",
    actorInitials: "FA",
    actorRole: "Admin",
    action: "Reservation Modified",
    description: "Moved reservation #VL-88210 from Court 03 to Court 01 — customer request",
    category: "booking",
    ip: "192.168.1.42",
    severity: "info",
    metadata: "reservation_id: #VL-88210",
  },
]

const categoryFilters: { label: string; value: LogCategory }[] = [
  { label: "All Logs", value: "all" },
  { label: "Auth", value: "auth" },
  { label: "Bookings", value: "booking" },
  { label: "Courts", value: "court" },
  { label: "System", value: "system" },
  { label: "Security", value: "security" },
]

/* ── Helpers ── */

const severityStyles: Record<string, { dot: string; bg: string; text: string }> = {
  info: { dot: "bg-primary", bg: "bg-primary/5", text: "text-primary" },
  warning: { dot: "bg-[#C49B00]", bg: "bg-[#C49B00]/5", text: "text-[#6B5B00]" },
  critical: { dot: "bg-error", bg: "bg-error/5", text: "text-error" },
}

const categoryIcon: Record<string, React.ReactNode> = {
  auth: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  booking: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  court: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  ),
  system: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  ),
  security: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
}

const categoryLabel: Record<string, string> = {
  auth: "Auth",
  booking: "Booking",
  court: "Court",
  system: "System",
  security: "Security",
}

/* ── Stats ── */

const securityStats = {
  blockedAttempts: 27,
  failedLogins: 5,
  rateLimits: 12,
  spamBlocked: 8,
}

/* ── Component ── */

export default function ActivityLogsPage() {
  const [activeFilter, setActiveFilter] = useState<LogCategory>("all")

  const filtered =
    activeFilter === "all"
      ? logs
      : logs.filter((l) => l.category === activeFilter)

  return (
    <div className="p-4 lg:p-8">
      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary lg:text-4xl">
            Activity Logs
          </h1>
          <p className="mt-1 font-body text-sm font-medium text-secondary">
            Track all changes, logins, and security events
          </p>
        </div>

        {/* Export */}
        <button className="flex h-9 items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-4 font-nav text-xs font-semibold uppercase tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Logs
        </button>
      </div>

      {/* ── Security Stats ── */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error/10 text-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="font-label text-[10px] font-bold uppercase tracking-widest text-outline">
              Blocked
            </p>
          </div>
          <p className="mt-2 font-headline text-2xl font-extrabold text-on-surface">
            {securityStats.blockedAttempts}
          </p>
          <p className="font-body text-[11px] text-on-surface-variant">Total blocked today</p>
        </div>

        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C49B00]/10 text-[#6B5B00]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <p className="font-label text-[10px] font-bold uppercase tracking-widest text-outline">
              Failed Logins
            </p>
          </div>
          <p className="mt-2 font-headline text-2xl font-extrabold text-on-surface">
            {securityStats.failedLogins}
          </p>
          <p className="font-body text-[11px] text-on-surface-variant">Last 24 hours</p>
        </div>

        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6B3B65]/10 text-[#6B3B65]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <p className="font-label text-[10px] font-bold uppercase tracking-widest text-outline">
              Rate Limits
            </p>
          </div>
          <p className="mt-2 font-headline text-2xl font-extrabold text-on-surface">
            {securityStats.rateLimits}
          </p>
          <p className="font-body text-[11px] text-on-surface-variant">Triggers today</p>
        </div>

        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <p className="font-label text-[10px] font-bold uppercase tracking-widest text-outline">
              Spam Blocked
            </p>
          </div>
          <p className="mt-2 font-headline text-2xl font-extrabold text-on-surface">
            {securityStats.spamBlocked}
          </p>
          <p className="font-body text-[11px] text-on-surface-variant">Submissions caught</p>
        </div>
      </div>

      {/* ── Category Filters ── */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categoryFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`rounded-lg px-3 py-1.5 font-nav text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              activeFilter === filter.value
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* ── Log Entries ── */}
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest">
        {/* Table header */}
        <div className="hidden border-b border-outline-variant/15 px-6 py-3 md:grid md:grid-cols-[140px_120px_1fr_100px_100px]">
          <span className="font-label text-[10px] font-bold uppercase tracking-[0.15em] text-outline">
            Timestamp
          </span>
          <span className="font-label text-[10px] font-bold uppercase tracking-[0.15em] text-outline">
            Actor
          </span>
          <span className="font-label text-[10px] font-bold uppercase tracking-[0.15em] text-outline">
            Event
          </span>
          <span className="font-label text-[10px] font-bold uppercase tracking-[0.15em] text-outline">
            Category
          </span>
          <span className="text-right font-label text-[10px] font-bold uppercase tracking-[0.15em] text-outline">
            IP Address
          </span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-outline-variant/10">
          {filtered.map((log) => {
            const style = severityStyles[log.severity]

            return (
              <div
                key={log.id}
                className={`group px-6 py-4 transition-colors hover:bg-surface-container-low/50 md:grid md:grid-cols-[140px_120px_1fr_100px_100px] md:items-center ${style.bg}`}
              >
                {/* Timestamp */}
                <div className="mb-2 md:mb-0">
                  <p className="font-mono text-xs font-medium text-on-surface">
                    {log.time}
                  </p>
                  <p className="font-body text-[11px] text-on-surface-variant">
                    {log.timestamp}
                  </p>
                </div>

                {/* Actor */}
                <div className="mb-2 flex items-center gap-2 md:mb-0">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-nav text-[10px] font-bold ${
                      log.actor === "System"
                        ? "bg-surface-container-high text-on-surface-variant"
                        : "bg-primary-fixed-dim/30 text-primary"
                    }`}
                  >
                    {log.actorInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-nav text-xs font-semibold text-on-surface">
                      {log.actor}
                    </p>
                  </div>
                </div>

                {/* Event */}
                <div className="mb-2 md:mb-0 md:pr-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                    <p className="font-nav text-xs font-bold text-on-surface">
                      {log.action}
                    </p>
                  </div>
                  <p className="mt-0.5 pl-3.5 font-body text-[11px] leading-relaxed text-on-surface-variant">
                    {log.description}
                  </p>
                  {log.metadata && (
                    <p className="mt-1 pl-3.5 font-mono text-[10px] text-outline">
                      {log.metadata}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div className="mb-2 md:mb-0">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-container-high px-2 py-1 font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {categoryIcon[log.category]}
                    {categoryLabel[log.category]}
                  </span>
                </div>

                {/* IP */}
                <div className="md:text-right">
                  {log.ip && (
                    <span className="font-mono text-[11px] text-outline">
                      {log.ip}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-outline-variant/15 px-6 py-3">
          <span className="font-body text-xs font-medium text-on-surface-variant">
            Showing{" "}
            <span className="font-bold text-on-surface">{filtered.length}</span>{" "}
            {activeFilter === "all" ? "entries" : `${activeFilter} entries`}
          </span>
          <button className="font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-primary transition-colors hover:text-primary-container">
            Load More
          </button>
        </div>
      </div>
    </div>
  )
}
