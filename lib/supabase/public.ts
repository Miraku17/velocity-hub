import { createClient } from "@supabase/supabase-js"

// Cookieless anon client for PUBLIC, read-only endpoints.
//
// Unlike the SSR client in `./server`, this never reads or writes cookies, so
// Route Handlers that use it have no per-request session dependency and emit no
// `Set-Cookie`. That lets the Vercel/CDN edge honour the response's
// `Cache-Control` (s-maxage) header and serve repeat requests from cache instead
// of round-tripping to Supabase.
//
// Use ONLY for endpoints that return non-sensitive data (no customer PII) and
// never need the user session. Anything reading PII must keep using the cookie
// client + admin auth checks (see API Security in CLAUDE.md).
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
