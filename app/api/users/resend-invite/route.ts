import { createAdminClient } from "@/lib/supabase/admin"
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from "@/lib/supabase/auth"
import { createClient } from "@/lib/supabase/server"

// POST /api/users/resend-invite — resend invitation email (admin only)
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
  const { email } = body as { email: string }

  if (!email?.trim()) {
    return Response.json({ error: "Email is required" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/auth/set-password`,
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ success: true })
}
