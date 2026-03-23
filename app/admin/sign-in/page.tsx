"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "@/app/admin/actions"

export default function AdminSignIn() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await signIn(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_1.1fr]">
      {/* ── Left: Branded panel (hidden on mobile, revealed on lg) ── */}
      <div className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between">
        {/* Diagonal stripe texture */}
        <div className="kinetic-overlay absolute inset-0 opacity-60" />

        {/* Grain overlay */}
        <div className="grain-overlay absolute inset-0" />

        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(183,205,176,0.8) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">
          {/* Logo */}
          <div>
            <Image
              src="/logo.png"
              alt="Velocity Pickleball Hub"
              width={48}
              height={48}
              className="brightness-0 invert"
            />
          </div>

          {/* Center tagline */}
          <div className="max-w-md">
            <p className="font-label text-xs font-medium uppercase tracking-[0.3em] text-inverse-primary/50">
              Administration
            </p>
            <h1 className="mt-4 font-headline text-4xl font-bold leading-[1.1] tracking-tight text-on-primary xl:text-5xl">
              Manage your
              <br />
              courts & bookings
            </h1>
            {/* Court line accent */}
            <div className="mt-6 h-[3px] w-16 rounded-full bg-gradient-to-r from-inverse-primary/80 to-inverse-primary/20" />
            <p className="mt-6 max-w-xs font-body text-sm leading-relaxed text-inverse-primary/40">
              Access real-time scheduling, analytics, and venue operations from
              one place.
            </p>
          </div>

          {/* Bottom decorative */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-inverse-primary/10" />
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-inverse-primary/20">
              Velocity Pickleball Hub
            </span>
            <div className="h-px flex-1 bg-inverse-primary/10" />
          </div>
        </div>

        {/* Subtle bottom gradient for depth */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* ── Right: Sign-in form ── */}
      <div className="flex flex-col bg-surface">
        {/* Mobile header */}
        <div className="flex items-center justify-between p-6 lg:hidden">
          <Image
            src="/logo.png"
            alt="Velocity Pickleball Hub"
            width={36}
            height={36}
          />
          <span className="font-label text-[10px] font-medium uppercase tracking-[0.25em] text-on-surface-variant">
            Admin
          </span>
        </div>

        {/* Centered form */}
        <div className="flex flex-1 items-center justify-center px-6 pb-12 pt-4 lg:px-12 lg:py-0">
          <div className="w-full max-w-sm">
            {/* Header */}
            <div className="mb-10">
              <h2 className="font-headline text-2xl font-semibold tracking-tight text-on-surface">
                Welcome back
              </h2>
              <p className="mt-2 font-body text-sm text-on-surface-variant">
                Sign in to access the admin dashboard
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@velocitypickleball.com"
                  autoComplete="email"
                  required
                  disabled={isPending}
                  className="h-11 rounded-lg border-outline-variant/50 bg-surface-container-low px-3.5 font-body text-sm text-on-surface placeholder:text-outline transition-all focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant"
                  >
                    Password
                  </Label>
                  <button
                    type="button"
                    className="font-nav text-[11px] font-medium text-primary transition-colors hover:text-primary-container"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    disabled={isPending}
                    className="h-11 rounded-lg border-outline-variant/50 bg-surface-container-low px-3.5 pr-11 font-body text-sm text-on-surface placeholder:text-outline transition-all focus-visible:border-primary focus-visible:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-on-surface"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                disabled={isPending}
                className="mt-2 h-11 w-full rounded-lg bg-primary font-nav text-sm font-medium tracking-wide text-on-primary transition-all hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98] disabled:opacity-60"
              >
                {isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            {/* Footer note */}
            <p className="mt-8 text-center font-body text-xs text-outline">
              Protected area. Unauthorized access is prohibited.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-outline-variant/20 px-6 py-4">
          <p className="text-center font-label text-[10px] text-outline">
            &copy; 2026 Velocity Pickleball Hub. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
