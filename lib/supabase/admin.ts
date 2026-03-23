import { createClient } from "@supabase/supabase-js"

// Server-only admin client that bypasses RLS.
// NEVER import this on the client side.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
