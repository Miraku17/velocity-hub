import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/calendar-availability?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&court_id=UUID
 *
 * Returns a map of dates to their availability status for the booking calendar.
 * Calls the Postgres function get_calendar_availability() which computes
 * total slots (from court schedule) vs booked/pending/blocked slots in a single query.
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

  const { data, error } = await supabase.rpc("get_calendar_availability", {
    p_date_from: dateFrom,
    p_date_to: dateTo,
    p_court_id: courtId || null,
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data ?? {}, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  })
}
