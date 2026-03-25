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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState<string>("")

  useEffect(() => {
    const supabase = createClient()

    // Supabase browser client auto-processes the hash fragment on load.
    // Listen for the resulting AUTH_STATE_CHANGE event first.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") && session) {
        subscription.unsubscribe()
        setName(session.user.user_metadata?.full_name ?? "")
        window.history.replaceState(null, "", window.location.pathname)
        setStatus("ready")
      }
    })

    // Also check for an already-active session (e.g. redirected via /auth/callback)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        subscription.unsubscribe()
        setName(data.session.user.user_metadata?.full_name ?? "")
        setStatus("ready")
        return
      }

      // Fallback: manually set session from hash fragment
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get("access_token")
      const refreshToken = params.get("refresh_token")
      const type = params.get("type")

      if (type === "invite" && accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ data: sessionData, error }) => {
            if (error || !sessionData.session) {
              subscription.unsubscribe()
              setStatus("error")
              return
            }
            subscription.unsubscribe()
            setName(sessionData.session.user.user_metadata?.full_name ?? "")
            window.history.replaceState(null, "", window.location.pathname)
            setStatus("ready")
          })
      } else {
        // No hash, no existing session — set a timeout to wait for onAuthStateChange
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: retryData }) => {
            subscription.unsubscribe()
            if (retryData.session) {
              setName(retryData.session.user.user_metadata?.full_name ?? "")
              setStatus("ready")
            } else {
              setStatus("error")
            }
          })
        }, 1000)
      }
    })

    return () => subscription.unsubscribe()
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
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    disabled={submitting}
                    className="w-full h-11 rounded-lg border border-outline-variant/50 bg-surface-container-low px-3.5 pr-11 font-body text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-on-surface"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    required
                    disabled={submitting}
                    className="w-full h-11 rounded-lg border border-outline-variant/50 bg-surface-container-low px-3.5 pr-11 font-body text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-on-surface"
                    tabIndex={-1}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
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
