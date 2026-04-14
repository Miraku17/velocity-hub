"use client"

import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Portal } from "@/components/ui/portal"
import { Label } from "@/components/ui/label"
import { LoadingPage } from "@/components/ui/loading"
import { useMe } from "@/lib/hooks/useTimeClock"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

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

/* ── Invite Modal ── */

function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setFullName("")
      setEmail("")
      setError(null)
      setSuccess(false)
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, submitting, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send invite")
      setSuccess(true)
      queryClient.invalidateQueries({ queryKey: ["users"] })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !submitting && onClose()} />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/15 px-6 py-5">
          <div>
            <h3 className="font-headline text-base font-semibold text-on-surface">Add Employee</h3>
            <p className="mt-0.5 font-body text-xs text-on-surface-variant">
              They&apos;ll receive an email to set their password.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.27 6.27l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div>
              <p className="font-headline text-base font-semibold text-on-surface">Invite Sent!</p>
              <p className="mt-1 font-body text-xs text-on-surface-variant">
                <span className="font-medium text-on-surface">{email}</span> will receive an email to set up their account.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 rounded-lg bg-primary px-6 py-2.5 font-nav text-xs font-semibold uppercase tracking-wider text-on-primary transition-colors hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
            <div className="space-y-2">
              <Label className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                Full Name
              </Label>
              <Input
                ref={nameRef}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan dela Cruz"
                disabled={submitting}
                required
                className="h-11 rounded-lg border-outline-variant/50 bg-surface-container-low px-3.5 font-body text-sm text-on-surface"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                Email Address
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@example.com"
                disabled={submitting}
                required
                className="h-11 rounded-lg border-outline-variant/50 bg-surface-container-low px-3.5 font-body text-sm text-on-surface"
              />
            </div>

            <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-3">
              <p className="font-body text-[11px] text-on-surface-variant leading-relaxed">
                <span className="font-medium text-on-surface">Role:</span> Employee — The employee will receive an invite email and set their own password upon first login.
              </p>
            </div>

            {error && (
              <p className="font-body text-xs text-error">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 rounded-lg border border-outline-variant/30 py-2.5 font-nav text-xs font-semibold uppercase tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !fullName.trim() || !email.trim()}
                className="flex-1 rounded-lg bg-primary py-2.5 font-nav text-xs font-semibold uppercase tracking-wider text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
    </Portal>
  )
}

/* ── Delete Confirm Modal ── */

function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  userName,
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  userName: string
  loading: boolean
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, loading, onClose])

  if (!open) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !loading && onClose()} />
        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xl">
          <div className="px-6 py-5">
            <h3 className="font-headline text-base font-semibold text-on-surface">Delete User</h3>
            <p className="mt-2 font-body text-sm text-on-surface-variant">
              Are you sure you want to delete <span className="font-semibold text-on-surface">{userName}</span>? This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 border-t border-outline-variant/15 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-outline-variant/30 py-2.5 font-nav text-xs font-semibold uppercase tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 rounded-lg bg-error py-2.5 font-nav text-xs font-semibold uppercase tracking-wider text-on-error transition-colors hover:bg-error/90 disabled:opacity-50"
            >
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

/* ── User Actions Dropdown ── */

function UserActions({
  user,
  currentUserId,
}: {
  user: UserProfile
  currentUserId: string | undefined
}) {
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isSelf = currentUserId === user.id

  const changeRole = useMutation({
    mutationFn: async (newRole: UserRole) => {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update role")
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const resendInvite = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users/resend-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to resend invite")
      return data
    },
  })

  const deleteUser = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users?user_id=${user.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete user")
      return data
    },
    onSuccess: () => {
      setDeleteOpen(false)
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const targetRole: UserRole = user.role === "admin" ? "employee" : "admin"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" sideOffset={4}>
          {!user.last_sign_in && (
            <DropdownMenuItem
              disabled={resendInvite.isPending}
              onClick={() => resendInvite.mutate()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              {resendInvite.isPending ? "Sending..." : resendInvite.isSuccess ? "Invite Sent!" : "Resend Invite"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            disabled={isSelf || changeRole.isPending}
            onClick={() => changeRole.mutate(targetRole)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 12h-6" />
            </svg>
            {changeRole.isPending ? "Updating..." : `Make ${roleLabel[targetRole]}`}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={isSelf}
            onClick={() => setDeleteOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" /><path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteUser.mutate()}
        userName={user.full_name}
        loading={deleteUser.isPending}
      />
    </>
  )
}

/* ── Component ── */

export default function AdminUsers() {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all")
  const [inviteOpen, setInviteOpen] = useState(false)
  const { data: me } = useMe()
  const canCreateUser = me?.permissions.users_create ?? false

  const { data: users = [], isLoading, isError, error } = useQuery<UserProfile[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to fetch users")
      }
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
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      {isLoading && <LoadingPage message="Loading users..." />}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {(error as Error)?.message ?? "Failed to load users."}
        </div>
      )}

      {/* ── Stats ── */}
      {!isLoading && !isError && (
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

              {canCreateUser && (
                <button
                  onClick={() => setInviteOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-wider text-on-primary transition-colors hover:bg-primary/90"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Employee
                </button>
              )}
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
                        <UserActions user={user} currentUserId={me?.id} />
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
