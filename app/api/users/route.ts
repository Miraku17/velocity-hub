import { createAdminClient } from "@/lib/supabase/admin"
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from "@/lib/supabase/auth"
import { createClient } from "@/lib/supabase/server"

// GET /api/users — list all users with last_sign_in (admin only)
export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return Response.json({ error: "Admin access required" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Fetch profiles
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Fetch auth users for last_sign_in
  const { data: authData } = await admin.auth.admin.listUsers()
  const authUsers = authData?.users ?? []

  const authMap = new Map(
    authUsers.map((u) => [u.id, u.last_sign_in_at])
  )

  const users = profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    role: p.role,
    created_at: p.created_at,
    last_sign_in: authMap.get(p.id) ?? null,
  }))

  return Response.json(users)
}
