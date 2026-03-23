"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { LoadingPage } from "@/components/ui/loading"

/* ── Types ── */

type UserRole = "admin" | "employee"

interface UserProfile {
  id: string
  full_name: string
  email: string
  role: UserRole
  created_at: string
  last_sign_in: string | null
}

/* ── Helpers ── */

const roleLabel: Record<UserRole, string> = {
  admin: "Admin",
  employee: "Employee",
}

const roleBadge: Record<UserRole, string> = {
  admin: "bg-[#4A2462]/10 text-[#4A2462]",
  employee: "bg-primary-fixed/40 text-on-primary-fixed-variant",
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

  const { data: users = [], isLoading } = useQuery<UserProfile[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users")
      if (!res.ok) throw new Error("Failed to fetch users")
      return res.json()
    },
  })

  const filtered = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.last_sign_in).length
  const adminCount = users.filter((u) => u.role === "admin").length
  const employeeCount = users.filter((u) => u.role === "employee").length

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {isLoading && <LoadingPage message="Loading users..." />}

      {/* ── Stats ── */}
      {!isLoading && (
        <>
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <div>
              <span className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">{totalUsers}</span>
              <span className="ml-1.5 font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">users</span>
            </div>
            <div className="h-6 w-px bg-outline-variant/25 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="font-nav text-xs font-semibold text-on-surface">{activeUsers}</span>
              <span className="font-body text-xs text-on-surface-variant">active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#4A2462]" />
              <span className="font-nav text-xs font-semibold text-on-surface">{adminCount}</span>
              <span className="font-body text-xs text-on-surface-variant">{adminCount === 1 ? "admin" : "admins"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#0050AE]" />
              <span className="font-nav text-xs font-semibold text-on-surface">{employeeCount}</span>
              <span className="font-body text-xs text-on-surface-variant">{employeeCount === 1 ? "employee" : "employees"}</span>
            </div>
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

            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 border-b border-outline-variant/10 px-5 py-4 sm:flex-row sm:items-center">
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

                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-md px-2.5 py-1 font-nav text-[10px] font-semibold uppercase tracking-wider ${roleBadge[user.role]}`}>
                          {roleLabel[user.role]}
                        </span>
                      </td>

                      <td className="hidden px-5 py-4 lg:table-cell">
                        <span className="font-body text-xs text-on-surface-variant">
                          {formatDate(user.created_at)}
                        </span>
                      </td>

                      <td className="hidden px-5 py-4 lg:table-cell">
                        <span className="font-body text-xs text-on-surface-variant">
                          {user.last_sign_in
                            ? formatDate(user.last_sign_in)
                            : "Never"}
                        </span>
                      </td>

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
                      <td colSpan={5} className="px-5 py-12 text-center">
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
                Showing {filtered.length} of {users.length} users
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
