import { createAdminClient } from "@/lib/supabase/admin"
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from "@/lib/supabase/auth"
import { createClient } from "@/lib/supabase/server"

// POST /api/users — invite a new employee (admin only)
export async function POST(request: Request) {
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

  const body = await request.json()
  const { full_name, email } = body as { full_name: string; email: string }

  if (!full_name?.trim() || !email?.trim()) {
    return Response.json({ error: "Name and email are required" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: full_name.trim(), role: "employee" },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/set-password`,
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ id: data.user.id })
}

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

  // Use auth users as the source of truth so no user is ever missing
  const { data: authData, error: authError } = await admin.auth.admin.listUsers()
  if (authError) {
    return Response.json({ error: authError.message }, { status: 500 })
  }
  const authUsers = authData?.users ?? []

  // Merge with profiles for role / full_name
  const { data: profiles } = await admin.from("profiles").select("*")
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  const users = authUsers
    .map((u) => {
      const profile = profileMap.get(u.id)
      return {
        id: u.id,
        full_name:
          profile?.full_name ??
          u.user_metadata?.full_name ??
          u.email?.split("@")[0] ??
          "Unknown",
        email: u.email ?? profile?.email ?? "",
        role: profile?.role ?? u.user_metadata?.role ?? "employee",
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at ?? null,
      }
    })
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return Response.json(users)
}
