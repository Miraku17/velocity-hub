"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestPasswordReset } from "@/app/admin/actions"

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await requestPasswordReset(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSent(true)
      }
    })
  }

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <Image src="/logo.png" alt="Velocity Pickleball Hub" width={40} height={40} />
          <p className="font-label text-[10px] font-medium uppercase tracking-[0.25em] text-on-surface-variant">
            Admin · Password Reset
          </p>
        </div>

        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-xl">
          {sent ? (
            <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div>
                <p className="font-headline text-base font-semibold text-on-surface">Check your email</p>
                <p className="mt-1 font-body text-xs text-on-surface-variant">
                  We sent a password reset link. It expires in 1 hour.
                </p>
              </div>
              <Link href="/admin/sign-in" className="font-nav text-xs font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
              <div className="mb-2">
                <h2 className="font-headline text-base font-semibold text-on-surface">Forgot your password?</h2>
                <p className="mt-1 font-body text-xs text-on-surface-variant">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant">
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

              <Button
                type="submit"
                size="lg"
                disabled={isPending}
                className="h-11 w-full rounded-lg bg-primary font-nav text-sm font-medium tracking-wide text-on-primary transition-all hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98] disabled:opacity-60"
              >
                {isPending ? "Sending..." : "Send Reset Link"}
              </Button>

              <div className="text-center">
                <Link href="/admin/sign-in" className="font-nav text-xs font-medium text-on-surface-variant hover:text-on-surface">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
