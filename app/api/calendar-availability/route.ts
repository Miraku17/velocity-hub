import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/calendar-availability?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&court_id=UUID
 *
 * Returns a map of dates to their availability status for the booking calendar.
 * For each date, computes total slots (from court schedule) vs booked/pending/blocked slots.
 *
 * Response: { [date: string]: { total: number, booked: number, available: number } }
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const params = request.nextUrl.searchParams

  const dateFrom = params.get("date_from")
  const dateTo = params.get("date_to")
  const courtId = params.get("court_id")

  if (!dateFrom || !dateTo) {
    return Response.json({ error: "date_from and date_to are required" }, { status: 400 })
  }

  // Fetch courts with schedules
  let courtsQuery = supabase
    .from("courts")
    .select("id, court_schedules(day_of_week, open_time, close_time, is_closed)")
    .eq("status", "available")
    .eq("archived", false)

  if (courtId) {
    courtsQuery = courtsQuery.eq("id", courtId)
  }

  const { data: courts, error: courtsError } = await courtsQuery
  if (courtsError) {
    return Response.json({ error: courtsError.message }, { status: 500 })
  }

  // Fetch reservations in range (non-cancelled) via the view
  let resQuery = supabase
    .from("reservations_view")
    .select("court_id, reservation_date, start_time, end_time, status")
    .gte("reservation_date", dateFrom)
    .lte("reservation_date", dateTo)
    .neq("status", "cancelled")

  if (courtId) {
    resQuery = resQuery.eq("court_id", courtId)
  }

  const { data: reservations, error: resError } = await resQuery
  if (resError) {
    return Response.json({ error: resError.message }, { status: 500 })
  }

  // Fetch blocked slots in range
  let blockedQuery = supabase
    .from("blocked_slots")
    .select("court_id, blocked_date, start_time, end_time")
    .gte("blocked_date", dateFrom)
    .lte("blocked_date", dateTo)

  if (courtId) {
    blockedQuery = blockedQuery.or(`court_id.eq.${courtId},court_id.is.null`)
  }

  const { data: blockedSlots, error: blockedError } = await blockedQuery
  if (blockedError) {
    return Response.json({ error: blockedError.message }, { status: 500 })
  }

  // Build a map: date -> { total slots across courts, taken slots }
  const result: Record<string, { total: number; booked: number; available: number }> = {}

  // Iterate each date in the range
  const start = new Date(dateFrom + "T00:00:00")
  const end = new Date(dateTo + "T00:00:00")

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0]
    const dayOfWeek = d.getDay() // 0=Sunday

    let totalSlots = 0
    const takenSlots = new Set<string>() // "courtId:hour"

    // Compute total slots from court schedules
    for (const court of courts || []) {
      const schedule = (court.court_schedules as { day_of_week: number; open_time: string; close_time: string; is_closed: boolean }[])
        ?.find((s) => s.day_of_week === dayOfWeek)

      if (!schedule || schedule.is_closed) continue

      const openHour = parseInt(schedule.open_time.split(":")[0], 10)
      let closeHour = parseInt(schedule.close_time.split(":")[0], 10)
      if (closeHour <= openHour) closeHour += 24

      // Check if entire day is blocked for this court
      const dayBlocked = (blockedSlots || []).some(
        (b) =>
          b.blocked_date === dateStr &&
          !b.start_time &&
          !b.end_time &&
          (b.court_id === court.id || !b.court_id)
      )

      if (dayBlocked) {
        // All slots blocked for this court on this day
        continue
      }

      const courtSlotCount = closeHour - openHour
      totalSlots += courtSlotCount

      // Mark blocked time-range slots
      for (const b of blockedSlots || []) {
        if (b.blocked_date !== dateStr) continue
        if (b.court_id && b.court_id !== court.id) continue
        if (!b.start_time || !b.end_time) continue

        const bStartH = parseInt(b.start_time.split(":")[0], 10)
        let bEndH = parseInt(b.end_time.split(":")[0], 10)
        if (bEndH <= bStartH) bEndH += 24

        for (let h = bStartH; h < bEndH; h++) {
          const hour = h % 24
          if (hour >= openHour && hour < (closeHour % 24 || 24)) {
            takenSlots.add(`${court.id}:${hour}`)
          }
        }
      }
    }

    // Mark reserved slots
    for (const r of reservations || []) {
      if (r.reservation_date !== dateStr) continue

      const startH = parseInt(r.start_time.split(":")[0], 10)
      let endH = parseInt(r.end_time.split(":")[0], 10)
      if (endH <= startH) endH += 24

      for (let h = startH; h < endH; h++) {
        takenSlots.add(`${r.court_id}:${h % 24}`)
      }
    }

    const booked = takenSlots.size
    result[dateStr] = {
      total: totalSlots,
      booked,
      available: Math.max(0, totalSlots - booked),
    }
  }

  return Response.json(result)
}
