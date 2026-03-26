import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from "@/lib/supabase/auth"

// GET /api/blocked-slots — list blocks (public: for booking page)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const params = request.nextUrl.searchParams

  const date = params.get("date")
  const dateFrom = params.get("date_from")
  const dateTo = params.get("date_to")
  const courtId = params.get("court_id")

  let query = supabase
    .from("blocked_slots")
    .select("*")
    .order("blocked_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (date) query = query.eq("blocked_date", date)
  if (dateFrom) query = query.gte("blocked_date", dateFrom)
  if (dateTo) query = query.lte("blocked_date", dateTo)
  if (courtId) query = query.or(`court_id.eq.${courtId},court_id.is.null`)

  const { data, error } = await query

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

// POST /api/blocked-slots — create a block (admin only)
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const supabase = await createClient()
  const body = await request.json()

  const { court_id, blocked_date, start_time, end_time, reason } = body

  if (!blocked_date) {
    return Response.json({ error: "blocked_date is required" }, { status: 400 })
  }

  // If start_time provided, end_time must also be provided
  if ((start_time && !end_time) || (!start_time && end_time)) {
    return Response.json(
      { error: "Both start_time and end_time are required for time-range blocks" },
      { status: 400 }
    )
  }

  // Check for confirmed/pending bookings that would conflict with this block
  let conflictQuery = supabase
    .from("reservations")
    .select("id, customer_name, start_time, end_time, status")
    .eq("reservation_date", blocked_date)
    .in("status", ["pending", "confirmed"])

  if (court_id) {
    conflictQuery = conflictQuery.eq("court_id", court_id)
  }

  const { data: allReservations } = await conflictQuery

  // Check overlap in JS — handles midnight (00:00:00) correctly by treating it as 1440 min (end of day)
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number)
    const mins = h * 60 + (m || 0)
    return mins === 0 ? 1440 : mins
  }

  let conflicts = allReservations || []
  if (start_time && end_time) {
    const blockStart = toMinutes(start_time)
    const blockEnd = toMinutes(end_time)
    conflicts = conflicts.filter((r) => {
      const rStart = toMinutes(r.start_time)
      const rEnd = toMinutes(r.end_time)
      return rStart < blockEnd && rEnd > blockStart
    })
  }

  if (conflicts.length > 0) {
    const count = conflicts.length
    return Response.json(
      {
        error: `Cannot block: ${count} existing booking${count > 1 ? "s" : ""} conflict with this time slot. Please review existing bookings first.`,
        conflicts,
      },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from("blocked_slots")
    .insert({
      court_id: court_id || null,
      blocked_date,
      start_time: start_time || null,
      end_time: end_time || null,
      reason: reason || "",
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data, { status: 201 })
}

// DELETE /api/blocked-slots?id=... — remove a block (admin only)
export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const supabase = await createClient()
  const id = request.nextUrl.searchParams.get("id")

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 })
  }

  const { error } = await supabase
    .from("blocked_slots")
    .delete()
    .eq("id", id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
