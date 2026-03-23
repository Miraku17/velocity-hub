import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/supabase/auth"

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const supabase = await createClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single()

  const hasManagePermission = await supabase.rpc("has_permission", {
    permission_name: "time_clock.manage",
  })

  return Response.json({
    id: user.id,
    email: profile?.email ?? user.email,
    full_name: profile?.full_name ?? null,
    role: profile?.role ?? "employee",
    permissions: {
      time_clock_manage: hasManagePermission.data === true,
    },
  })
}
