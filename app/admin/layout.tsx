"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useMe } from "@/lib/hooks/useTimeClock"
import { useQueryClient } from "@tanstack/react-query"

const navItems = [
  {
    label: "Overview",
    href: "/admin/dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Reservations",
    href: "/admin/reservations",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "Courts",
    href: "/admin/courts",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        <line x1="2" y1="12" x2="22" y2="12" />
      </svg>
    ),
  },
  {
    label: "Sales",
    href: "/admin/sales",
    icon: (
      <span className="text-[17px] font-bold leading-none" style={{ fontFamily: "inherit" }}>₱</span>
    ),
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Venue Settings",
    href: "/admin/venue-settings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

const operationsItems = [
  {
    label: "Time Clock",
    href: "/admin/time-clock",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    label: "Audit Logs",
    href: "/admin/activity-logs",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [signOutModalOpen, setSignOutModalOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const queryClient = useQueryClient()
  const { data: me } = useMe()
  const isAdmin = me?.role === "admin"

  async function handleSignOut() {
    setSigningOut(true)
    try {
      const res = await fetch("/api/auth/sign-out", { method: "POST" })
      if (res.ok) {
        // Clear all cached queries so the next sign-in gets fresh data
        queryClient.clear()
        setSignOutModalOpen(false)
        setSigningOut(false)
        router.push("/admin/sign-in")
      }
    } catch {
      setSigningOut(false)
    }
  }

  // Don't render sidebar on sign-in page
  if (pathname === "/admin/sign-in") {
    return <>{children}</>
  }

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") return pathname === "/admin/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-svh overflow-hidden bg-surface-container-low">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col bg-surface-container-lowest border-r border-outline-variant/20 transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-8">
          <Image
            src="/logo.png"
            alt="Velocity Pickleball Hub"
            width={40}
            height={40}
            className="rounded-xl"
          />
          <div>
            <p className="font-headline text-base font-bold tracking-tight text-on-surface">
              Velocity Hub
            </p>
            <p className="font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">
              Facility Manager
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3">
          <div className="space-y-1">
            {navItems.filter((item) => (item.href !== "/admin/users" && item.href !== "/admin/venue-settings" && item.href !== "/admin/sales") || isAdmin).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 font-nav text-[13px] font-medium uppercase tracking-[0.08em] transition-colors",
                  isActive(item.href)
                    ? "bg-primary-fixed-dim/20 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                )}
              >
                <span className={isActive(item.href) ? "text-primary" : "text-on-surface-variant"}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Operations section */}
          <div className="mt-6">
            <p className="mb-2 px-3 font-label text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant/60">
              Operations
            </p>
            <div className="space-y-1">
              {operationsItems.filter((item) => item.href !== "/admin/activity-logs" || isAdmin).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 font-nav text-[13px] font-medium uppercase tracking-[0.08em] transition-colors",
                    isActive(item.href)
                      ? "bg-primary-fixed-dim/20 text-primary"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  )}
                >
                  <span className={isActive(item.href) ? "text-primary" : "text-on-surface-variant"}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* User profile & sign out */}
        <div className="border-t border-outline-variant/20 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-fixed-dim/30 font-nav text-xs font-bold text-primary">
              {me?.full_name
                ? me.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                : "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-nav text-xs font-semibold text-on-surface">
                {me?.full_name ?? "Loading..."}
              </p>
              <p className="truncate font-body text-[11px] text-on-surface-variant capitalize">
                {me?.role ?? ""}
              </p>
            </div>
            <button
              onClick={() => setSignOutModalOpen(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              aria-label="Sign out"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile hamburger */}
        <button
          className="fixed top-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface-variant shadow-sm lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ── Sign Out Confirmation Modal ── */}
      {signOutModalOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={() => !signingOut && setSignOutModalOpen(false)}
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="w-full max-w-sm rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icon */}
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-error">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <div className="mt-4 text-center">
                <h3 className="font-headline text-lg font-semibold text-on-surface">
                  Sign Out
                </h3>
                <p className="mt-2 font-body text-sm text-on-surface-variant">
                  Are you sure you want to sign out of the admin dashboard? You&apos;ll need to sign in again to access it.
                </p>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={() => setSignOutModalOpen(false)}
                  disabled={signingOut}
                  className="flex-1 rounded-lg border border-outline-variant/30 bg-transparent px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant transition-colors hover:bg-surface-container"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex-1 rounded-lg bg-error px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-error transition-colors hover:bg-error/90 disabled:opacity-60"
                >
                  {signingOut ? "Signing out..." : "Sign Out"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
