import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type SlotStatus = "open" | "booked" | "pending" | "blocked"

export interface GridAvailabilityResponse {
  courts: {
    id: string
    name: string
    court_type: "indoor" | "outdoor"
    price_per_hour: number
    schedule: {
      open_time: string
      close_time: string
      is_closed: boolean
      hourly_rates: Record<string, number> | null
    } | null
  }[]
  time_range: { earliest_open: number; latest_close: number }
  slots: Record<string, Record<string, SlotStatus>>
}

/**
 * GET /api/grid-availability?date=YYYY-MM-DD
 *
 * Returns all courts with their schedule + slot availability for the given date.
 * Used by the booking grid to render a table of courts x time slots.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const date = request.nextUrl.searchParams.get("date")

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "date parameter is required (YYYY-MM-DD)" }, { status: 400 })
  }

  const dayOfWeek = new Date(date + "T12:00:00").getDay()

  // Fetch courts, reservations, and blocked slots in parallel
  const [courtsResult, resResult, blockedResult] = await Promise.all([
    supabase
      .from("courts")
      .select("id, name, court_type, price_per_hour, court_schedules(day_of_week, open_time, close_time, is_closed, hourly_rates)")
      .eq("status", "available")
      .eq("archived", false)
      .order("name"),
    supabase
      .from("reservations_view")
      .select("court_id, start_time, end_time, status")
      .eq("reservation_date", date)
      .neq("status", "cancelled"),
    supabase
      .from("blocked_slots")
      .select("court_id, start_time, end_time")
      .eq("blocked_date", date),
  ])

  if (courtsResult.error) {
    return Response.json({ error: courtsResult.error.message }, { status: 500 })
  }
  if (resResult.error) {
    return Response.json({ error: resResult.error.message }, { status: 500 })
  }
  if (blockedResult.error) {
    return Response.json({ error: blockedResult.error.message }, { status: 500 })
  }

  const courts = courtsResult.data
  const reservations = resResult.data
  const blockedSlots = blockedResult.data

  // Build response
  let earliestOpen = 24
  let latestClose = 0

  const courtList: GridAvailabilityResponse["courts"] = []
  const slots: Record<string, Record<string, SlotStatus>> = {}

  for (const court of courts || []) {
    const schedules = court.court_schedules as {
      day_of_week: number
      open_time: string
      close_time: string
      is_closed: boolean
      hourly_rates: Record<string, number> | null
    }[]
    const schedule = schedules?.find((s) => s.day_of_week === dayOfWeek)

    courtList.push({
      id: court.id,
      name: court.name,
      court_type: court.court_type,
      price_per_hour: court.price_per_hour,
      schedule: schedule
        ? {
            open_time: schedule.open_time,
            close_time: schedule.close_time,
            is_closed: schedule.is_closed,
            hourly_rates: schedule.hourly_rates,
          }
        : null,
    })

    if (!schedule || schedule.is_closed) continue

    const openHour = parseInt(schedule.open_time.split(":")[0], 10)
    let closeHour = parseInt(schedule.close_time.split(":")[0], 10)
    if (closeHour <= openHour) closeHour += 24

    if (openHour < earliestOpen) earliestOpen = openHour
    if (closeHour > latestClose) latestClose = closeHour

    // Check if entire day is blocked for this court
    const dayBlocked = (blockedSlots || []).some(
      (b) => !b.start_time && !b.end_time && (b.court_id === court.id || !b.court_id)
    )

    const courtSlots: Record<string, SlotStatus> = {}

    for (let h = openHour; h < closeHour; h++) {
      const hour = h % 24
      const hourStr = String(hour)

      if (dayBlocked) {
        courtSlots[hourStr] = "blocked"
        continue
      }

      courtSlots[hourStr] = "open"
    }

    // Mark blocked time-range slots
    for (const b of blockedSlots || []) {
      if (b.court_id && b.court_id !== court.id) continue
      if (!b.start_time || !b.end_time) continue

      const bStartH = parseInt(b.start_time.split(":")[0], 10)
      let bEndH = parseInt(b.end_time.split(":")[0], 10)
      if (bEndH <= bStartH) bEndH += 24

      for (let h = bStartH; h < bEndH; h++) {
        const hourStr = String(h % 24)
        if (hourStr in courtSlots) {
          courtSlots[hourStr] = "blocked"
        }
      }
    }

    // Mark reserved slots
    for (const r of reservations || []) {
      if (r.court_id !== court.id) continue

      const startH = parseInt(r.start_time.split(":")[0], 10)
      let endH = parseInt(r.end_time.split(":")[0], 10)
      if (endH <= startH) endH += 24

      for (let h = startH; h < endH; h++) {
        const hourStr = String(h % 24)
        if (hourStr in courtSlots) {
          courtSlots[hourStr] =
            r.status === "confirmed" || r.status === "completed" ? "booked" : "pending"
        }
      }
    }

    slots[court.id] = courtSlots
  }

  const response: GridAvailabilityResponse = {
    courts: courtList,
    time_range: {
      earliest_open: earliestOpen === 24 ? 0 : earliestOpen,
      latest_close: latestClose === 0 ? 24 : latestClose,
    },
    slots,
  }

  return Response.json(response, {
    headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45" },
  })
}
