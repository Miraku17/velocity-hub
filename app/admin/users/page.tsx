"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

/* ── Mock Data ── */

type UserRole = "admin" | "employee"
type UserStatus = "active" | "invited" | "deactivated"

interface UserProfile {
  id: string
  full_name: string
  email: string
  role: UserRole
  status: UserStatus
  created_at: string
  last_sign_in: string | null
}

const mockUsers: UserProfile[] = [
  {
    id: "1",
    full_name: "Velocity Admin",
    email: "admin@velocitypickle.com",
    role: "admin",
    status: "active",
    created_at: "2026-03-23",
    last_sign_in: "2026-03-23",
  },
  {
    id: "2",
    full_name: "Maria Santos",
    email: "maria.santos@velocitypickle.com",
    role: "employee",
    status: "active",
    created_at: "2026-03-20",
    last_sign_in: "2026-03-22",
  },
  {
    id: "3",
    full_name: "Juan Cruz",
    email: "juan.cruz@velocitypickle.com",
    role: "employee",
    status: "active",
    created_at: "2026-03-18",
    last_sign_in: "2026-03-21",
  },
  {
    id: "4",
    full_name: "Ana Reyes",
    email: "ana.reyes@velocitypickle.com",
    role: "employee",
    status: "invited",
    created_at: "2026-03-22",
    last_sign_in: null,
  },
  {
    id: "5",
    full_name: "Carlos Garcia",
    email: "carlos.garcia@velocitypickle.com",
    role: "employee",
    status: "deactivated",
    created_at: "2026-02-10",
    last_sign_in: "2026-03-01",
  },
]

const stats = [
  {
    label: "Total Users",
    value: mockUsers.length.toString(),
    iconBg: "bg-primary",
    iconColor: "text-on-primary",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Active",
    value: mockUsers.filter((u) => u.status === "active").length.toString(),
    iconBg: "bg-[#0050AE]",
    iconColor: "text-white",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    label: "Admins",
    value: mockUsers.filter((u) => u.role === "admin").length.toString(),
    iconBg: "bg-[#4A2462]",
    iconColor: "text-white",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
]

/* ── Helpers ── */

const roleLabel: Record<UserRole, string> = {
  admin: "Admin",
  employee: "Employee",
}

const roleBadge: Record<UserRole, string> = {
  admin: "bg-[#4A2462]/10 text-[#4A2462]",
  employee: "bg-primary-fixed/40 text-on-primary-fixed-variant",
}

const statusDot: Record<UserStatus, string> = {
  active: "bg-primary",
  invited: "bg-[#C49B00]",
  deactivated: "bg-outline",
}

const statusLabel: Record<UserStatus, string> = {
  active: "Active",
  invited: "Invited",
  deactivated: "Deactivated",
}

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
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/* ── Component ── */

export default function AdminUsers() {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all")
  const [showInviteModal, setShowInviteModal] = useState(false)

  const filtered = mockUsers.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconColor}`}>
              {stat.icon}
            </div>
            <div>
              <p className="font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">
                {stat.label}
              </p>
              <p className="font-headline text-2xl font-bold tracking-tight text-on-surface">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Users Table Card ── */}
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-outline-variant/15 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-headline text-lg font-semibold text-on-surface">
              Team Members
            </h2>
            <p className="mt-0.5 font-body text-xs text-on-surface-variant">
              Manage admin and employee access
            </p>
          </div>

          <Button
            onClick={() => setShowInviteModal(!showInviteModal)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-primary transition-colors hover:bg-primary-container hover:text-on-primary-container"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Invite User
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-outline-variant/10 px-5 py-4 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border-outline-variant/30 bg-surface-container-low pl-9 pr-4 font-body text-sm text-on-surface placeholder:text-outline transition-all focus-visible:border-primary focus-visible:ring-primary/20"
            />
          </div>

          {/* Role filter */}
          <div className="flex overflow-hidden rounded-lg border border-outline-variant/30">
            {(["all", "admin", "employee"] as const).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-4 py-1.5 font-nav text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  role !== "all" ? "border-l border-outline-variant/30" : ""
                } ${
                  roleFilter === role
                    ? "bg-surface-container-high text-on-surface"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {role === "all" ? "All" : roleLabel[role]}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-outline-variant/15">
                <th className="px-5 py-3 text-left font-label text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface-variant">
                  User
                </th>
                <th className="px-5 py-3 text-left font-label text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface-variant">
                  Role
                </th>
                <th className="hidden px-5 py-3 text-left font-label text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface-variant md:table-cell">
                  Status
                </th>
                <th className="hidden px-5 py-3 text-left font-label text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface-variant lg:table-cell">
                  Joined
                </th>
                <th className="hidden px-5 py-3 text-left font-label text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface-variant lg:table-cell">
                  Last Active
                </th>
                <th className="px-5 py-3 text-right font-label text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface-variant">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-surface-container-low/50"
                >
                  {/* User */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim/30 font-nav text-xs font-bold text-primary">
                        {getInitials(user.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-nav text-xs font-semibold text-on-surface">
                          {user.full_name}
                        </p>
                        <p className="truncate font-body text-[11px] text-on-surface-variant">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-md px-2.5 py-1 font-nav text-[10px] font-semibold uppercase tracking-wider ${roleBadge[user.role]}`}>
                      {roleLabel[user.role]}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="hidden px-5 py-4 md:table-cell">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${statusDot[user.status]}`} />
                      <span className="font-label text-[11px] font-medium text-on-surface-variant">
                        {statusLabel[user.status]}
                      </span>
                    </span>
                  </td>

                  {/* Joined */}
                  <td className="hidden px-5 py-4 lg:table-cell">
                    <span className="font-body text-xs text-on-surface-variant">
                      {formatDate(user.created_at)}
                    </span>
                  </td>

                  {/* Last Active */}
                  <td className="hidden px-5 py-4 lg:table-cell">
                    <span className="font-body text-xs text-on-surface-variant">
                      {user.last_sign_in
                        ? formatDate(user.last_sign_in)
                        : "Never"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right">
                    <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="19" r="1" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="text-outline" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="22" y1="11" x2="16" y2="11" />
                      </svg>
                      <p className="font-nav text-xs font-medium text-on-surface-variant">
                        No users found
                      </p>
                      <p className="font-body text-[11px] text-outline">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-outline-variant/15 px-5 py-3">
          <p className="font-body text-[11px] text-on-surface-variant">
            Showing {filtered.length} of {mockUsers.length} users
          </p>
        </div>
      </div>
    </div>
  )
}
