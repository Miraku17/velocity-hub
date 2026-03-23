import { createClient } from "@/lib/supabase/server"
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from "@/lib/supabase/auth"

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0]

  // Run all queries in parallel
  const [
    totalBookingsRes,
    todayBookingsRes,
    monthRevenueRes,
    courtsRes,
    todayReservationsRes,
    recentReservationsRes,
  ] = await Promise.all([
    // Total bookings (all time, non-cancelled)
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .neq("status", "cancelled"),

    // Today's bookings
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("reservation_date", today)
      .neq("status", "cancelled"),

    // Revenue this month (paid or confirmed)
    supabase
      .from("reservations")
      .select("total_amount")
      .gte("reservation_date", monthStart)
      .in("payment_status", ["paid"]),

    // All courts with schedules
    supabase
      .from("courts")
      .select("*")
      .order("name", { ascending: true }),

    // Today's reservations for the schedule (non-cancelled)
    supabase
      .from("reservations_view")
      .select("*")
      .eq("reservation_date", today)
      .neq("status", "cancelled")
      .order("start_time", { ascending: true }),

    // Recent reservations (last 10)
    supabase
      .from("reservations_view")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  // Calculate monthly revenue
  const monthRevenue =
    monthRevenueRes.data?.reduce(
      (sum, r) => sum + (Number(r.total_amount) || 0),
      0
    ) ?? 0

  return Response.json({
    stats: {
      total_bookings: totalBookingsRes.count ?? 0,
      today_bookings: todayBookingsRes.count ?? 0,
      month_revenue: monthRevenue,
    },
    courts: courtsRes.data ?? [],
    today_reservations: todayReservationsRes.data ?? [],
    recent_reservations: recentReservationsRes.data ?? [],
  })
}
