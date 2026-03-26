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
