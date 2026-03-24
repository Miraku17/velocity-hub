"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type Status = "loading" | "ready" | "success" | "error"

export default function SetPasswordPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>("loading")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState<string>("")

  useEffect(() => {
    // Supabase puts the tokens in the URL hash for invite links
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")
    const type = params.get("type")

    if (type !== "invite" || !accessToken || !refreshToken) {
      setStatus("error")
      return
    }

    const supabase = createClient()
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ data, error }) => {
      if (error || !data.user) {
        setStatus("error")
        return
      }
      setName(data.user.user_metadata?.full_name ?? "")
      // Clear hash from URL
      window.history.replaceState(null, "", window.location.pathname)
      setStatus("ready")
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setError(null)
    setSubmitting(true)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    setStatus("success")
    setTimeout(() => router.push("/admin"), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="mb-8 text-center">
          <p className="font-['Clash_Display'] text-2xl font-bold text-primary tracking-tight">
            VELOCITY
          </p>
          <p className="font-[Poppins] text-[10px] uppercase tracking-[0.3em] text-on-surface-variant mt-1">
            Pickleball Hub
          </p>
        </div>

        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-xl">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="font-body text-sm text-on-surface-variant">Verifying your invite...</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-error">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <p className="font-headline text-base font-semibold text-on-surface">Invalid or Expired Link</p>
                <p className="mt-1 font-body text-xs text-on-surface-variant">
                  This invite link is no longer valid. Ask your admin to send a new invite.
                </p>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div>
                <p className="font-headline text-base font-semibold text-on-surface">Password Set!</p>
                <p className="mt-1 font-body text-xs text-on-surface-variant">
                  Redirecting you to the dashboard...
                </p>
              </div>
            </div>
          )}

          {status === "ready" && (
            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
              <div className="mb-2">
                <h2 className="font-headline text-base font-semibold text-on-surface">
                  {name ? `Welcome, ${name.split(" ")[0]}!` : "Set Your Password"}
                </h2>
                <p className="mt-1 font-body text-xs text-on-surface-variant">
                  Choose a password to activate your account.
                </p>
              </div>

              <div className="space-y-2">
                <label className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  disabled={submitting}
                  className="w-full h-11 rounded-lg border border-outline-variant/50 bg-surface-container-low px-3.5 font-body text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
              </div>

              <div className="space-y-2">
                <label className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  disabled={submitting}
                  className="w-full h-11 rounded-lg border border-outline-variant/50 bg-surface-container-low px-3.5 font-body text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
              </div>

              {error && (
                <p className="font-body text-xs text-error">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !password || !confirm}
                className="w-full rounded-lg bg-primary py-2.5 font-nav text-xs font-semibold uppercase tracking-wider text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? "Setting Password..." : "Set Password & Continue"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
