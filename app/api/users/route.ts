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
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/auth/set-password`,
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ id: data.user.id })
}

// PATCH /api/users — update a user's role (admin only)
export async function PATCH(request: Request) {
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
  const { user_id, role } = body as { user_id: string; role: string }

  if (!user_id || !["admin", "employee"].includes(role)) {
    return Response.json({ error: "Valid user_id and role are required" }, { status: 400 })
  }

  if (user_id === user.id) {
    return Response.json({ error: "You cannot change your own role" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error: profileError } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", user_id)

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 500 })
  }

  // Also update auth user metadata so it stays in sync
  await admin.auth.admin.updateUserById(user_id, {
    user_metadata: { role },
  })

  return Response.json({ success: true })
}

// DELETE /api/users — delete a user (admin only)
export async function DELETE(request: Request) {
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

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("user_id")

  if (!userId) {
    return Response.json({ error: "user_id is required" }, { status: 400 })
  }

  if (userId === user.id) {
    return Response.json({ error: "You cannot delete your own account" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Delete profile first, then auth user
  await admin.from("profiles").delete().eq("id", userId)

  const { error: authError } = await admin.auth.admin.deleteUser(userId)
  if (authError) {
    return Response.json({ error: authError.message }, { status: 500 })
  }

  return Response.json({ success: true })
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
