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

  const [
    hasTimeClock,
    hasCourtsCreate,
    hasCourtsUpdate,
    hasCourtsDelete,
    hasUsersCreate,
    hasBookingsCreate,
    hasBookingsUpdate,
  ] = await Promise.all([
    supabase.rpc("has_permission", { permission_name: "time_clock.manage" }),
    supabase.rpc("has_permission", { permission_name: "courts.create" }),
    supabase.rpc("has_permission", { permission_name: "courts.update" }),
    supabase.rpc("has_permission", { permission_name: "courts.delete" }),
    supabase.rpc("has_permission", { permission_name: "users.create" }),
    supabase.rpc("has_permission", { permission_name: "bookings.create" }),
    supabase.rpc("has_permission", { permission_name: "bookings.update" }),
  ])

  return Response.json({
    id: user.id,
    email: profile?.email ?? user.email,
    full_name: profile?.full_name ?? null,
    role: profile?.role ?? "employee",
    permissions: {
      time_clock_manage: hasTimeClock.data === true,
      courts_create: hasCourtsCreate.data === true,
      courts_update: hasCourtsUpdate.data === true,
      courts_delete: hasCourtsDelete.data === true,
      users_create: hasUsersCreate.data === true,
      bookings_create: hasBookingsCreate.data === true,
      bookings_update: hasBookingsUpdate.data === true,
    },
  })
}
