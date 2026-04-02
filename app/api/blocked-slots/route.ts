import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getAuthenticatedUser,
  checkIsStaff,
  unauthorizedResponse,
  forbiddenResponse,
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
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (courtId) {
    if (!UUID_RE.test(courtId)) {
      return Response.json({ error: "Invalid court_id" }, { status: 400 })
    }
    query = query.or(`court_id.eq.${courtId},court_id.is.null`)
  }

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
  if (!(await checkIsStaff())) return forbiddenResponse()

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
  let itemQuery = supabase
    .from("booking_items")
    .select("id, court_id, start_time, end_time, booking_id, bookings!inner(id, customer_name, status)")
    .eq("booking_date", blocked_date)
    .in("bookings.status", ["pending", "confirmed"])

  if (court_id) {
    itemQuery = itemQuery.eq("court_id", court_id)
  }

  const { data: allItems } = await itemQuery

  // Check overlap in JS — handles midnight (00:00:00) correctly by treating it as 1440 min (end of day)
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number)
    const mins = h * 60 + (m || 0)
    return mins === 0 ? 1440 : mins
  }

  type ConflictItem = { id: string; start_time: string; end_time: string; bookings: { id: string; customer_name: string; status: string }[] }
  let conflicts = (allItems || []) as unknown as ConflictItem[]
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
        conflicts: conflicts.map((c) => ({
          id: c.bookings[0]?.id,
          customer_name: c.bookings[0]?.customer_name,
          start_time: c.start_time,
          end_time: c.end_time,
          status: c.bookings[0]?.status,
        })),
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
  if (!(await checkIsStaff())) return forbiddenResponse()

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
