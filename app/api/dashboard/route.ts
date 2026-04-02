import { createClient } from "@/lib/supabase/server"
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from "@/lib/supabase/auth"

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const supabase = await createClient()

  // Use Philippines timezone for all date calculations
  const phNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }))
  const today = `${phNow.getFullYear()}-${String(phNow.getMonth() + 1).padStart(2, "0")}-${String(phNow.getDate()).padStart(2, "0")}`
  const monthStart = `${phNow.getFullYear()}-${String(phNow.getMonth() + 1).padStart(2, "0")}-01`
  const lastDay = new Date(phNow.getFullYear(), phNow.getMonth() + 1, 0).getDate()
  const monthEnd = `${phNow.getFullYear()}-${String(phNow.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`

  // Run all queries in parallel
  const [
    totalBookingsRes,
    todayBookingsRes,
    monthRevenueRes,
    courtsRes,
    todayReservationsRes,
    recentReservationsRes,
    monthReservationsRes,
    courtSchedulesRes,
  ] = await Promise.all([
    // Total bookings (all time, non-cancelled)
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .neq("status", "cancelled"),

    // Today's bookings
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("booking_date", today)
      .neq("status", "cancelled"),

    // Revenue this month (paid, excluding cancelled)
    supabase
      .from("bookings")
      .select("total_amount")
      .gte("booking_date", monthStart)
      .lte("booking_date", monthEnd)
      .neq("status", "cancelled")
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

    // All non-cancelled booking items this month (for analytics)
    supabase
      .from("booking_items_view")
      .select("booking_date, start_time, end_time, duration_hours, status")
      .gte("booking_date", monthStart)
      .lte("booking_date", monthEnd)
      .neq("status", "cancelled"),

    // Court schedules (for calculating total available hours)
    supabase
      .from("court_schedules")
      .select("court_id, day_of_week, open_time, close_time, is_closed"),
  ])

  // Calculate monthly revenue
  const monthRevenue =
    monthRevenueRes.data?.reduce(
      (sum, r) => sum + (Number(r.total_amount) || 0),
      0
    ) ?? 0

  // ── Monthly Analytics ──
  const monthReservations = monthReservationsRes.data ?? []
  const courtSchedules = courtSchedulesRes.data ?? []
  const courts = courtsRes.data ?? []

  // Total booked hours this month
  const monthBookedHours = monthReservations.reduce(
    (sum, r) => sum + (Number(r.duration_hours) || 0),
    0
  )

  // Calculate total available hours for the month
  const daysInMonth = new Date(phNow.getFullYear(), phNow.getMonth() + 1, 0).getDate()
  let monthTotalHours = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(phNow.getFullYear(), phNow.getMonth(), d)
    const dow = date.getDay() // 0=Sun, 6=Sat
    for (const court of courts) {
      const schedule = courtSchedules.find(
        (s) => s.court_id === court.id && s.day_of_week === dow
      )
      if (schedule && !schedule.is_closed) {
        const [openH, openM] = schedule.open_time.split(":").map(Number)
        const [closeH, closeM] = schedule.close_time.split(":").map(Number)
        monthTotalHours += (closeH + closeM / 60) - (openH + openM / 60)
      }
    }
  }

  // Bookings by day of week
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const byDayOfWeek = dayLabels.map((label, i) => {
    const dayRes = monthReservations.filter((r) => {
      const d = new Date(r.booking_date + "T00:00:00")
      return d.getDay() === i
    })
    return {
      day: i,
      label,
      count: dayRes.length,
      hours: dayRes.reduce((s, r) => s + (Number(r.duration_hours) || 0), 0),
    }
  })

  // Bookings by time slot (hour buckets)
  const byTimeSlot = Array.from({ length: 17 }, (_, i) => {
    const hour = i + 6 // 6 AM to 10 PM
    const slotRes = monthReservations.filter((r) => {
      const [h] = r.start_time.split(":").map(Number)
      return h === hour
    })
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const ampm = hour >= 12 ? "PM" : "AM"
    return {
      hour,
      label: `${h12}${ampm}`,
      count: slotRes.length,
      hours: slotRes.reduce((s, r) => s + (Number(r.duration_hours) || 0), 0),
    }
  }).filter((s) => s.count > 0 || (s.hour >= 7 && s.hour <= 21))

  return Response.json({
    stats: {
      total_bookings: totalBookingsRes.count ?? 0,
      today_bookings: todayBookingsRes.count ?? 0,
      month_revenue: monthRevenue,
    },
    analytics: {
      month_booked_hours: Math.round(monthBookedHours * 10) / 10,
      month_total_hours: Math.round(monthTotalHours * 10) / 10,
      month_booking_count: monthReservations.length,
      by_day_of_week: byDayOfWeek,
      by_time_slot: byTimeSlot,
    },
    courts: courts,
    today_reservations: todayReservationsRes.data ?? [],
    recent_reservations: recentReservationsRes.data ?? [],
  })
}
