import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  getAuthenticatedUser,
  checkIsAdmin,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/supabase/auth"

// GET /api/manual-entries — list entries, optionally filtered by date range
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const supabase = await createClient()
  const params = request.nextUrl.searchParams

  const date = params.get("date")
  const dateFrom = params.get("date_from")
  const dateTo = params.get("date_to")
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(params.get("limit") || "20", 10) || 20))
  const offset = (page - 1) * limit

  let query = supabase
    .from("manual_entries")
    .select("*", { count: "exact" })
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (date) query = query.eq("entry_date", date)
  if (dateFrom) query = query.gte("entry_date", dateFrom)
  if (dateTo) query = query.lte("entry_date", dateTo)

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({
    data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  })
}

// POST /api/manual-entries — create a new entry (admin only)
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()
  if (!(await checkIsAdmin())) return forbiddenResponse()

  const supabase = await createClient()
  const body = await request.json()

  const { entry_date, amount, description, notes, court_id, start_time, end_time } = body

  if (!entry_date || !description) {
    return Response.json(
      { error: "entry_date and description are required" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("manual_entries")
    .insert({
      entry_date,
      amount: amount ?? null,
      description,
      notes: notes ?? null,
      court_id: court_id ?? null,
      start_time: start_time ?? null,
      end_time: end_time ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Also create a reservation when court and time info are provided
  let reservationId: string | null = null
  if (court_id && start_time && end_time) {
    const adminClient = createAdminClient()
    const { data: resData, error: resError } = await adminClient.rpc(
      "create_reservation",
      {
        p_court_id: court_id,
        p_customer_name: description,
        p_customer_email: "Manual Input",
        p_customer_phone: "Manual Input",
        p_date: entry_date,
        p_start_time: start_time,
        p_end_time: end_time <= start_time ? "23:59:00" : end_time,
        p_reservation_type: "walk-in",
        p_notes: description + (notes ? ` — ${notes}` : ""),
      }
    )

    if (!resError && resData) {
      reservationId = resData as string
      // Auto-confirm the reservation
      await adminClient
        .from("reservations")
        .update({ status: "confirmed" })
        .eq("id", reservationId)
    }
  }

  return Response.json({ ...data, reservation_id: reservationId }, { status: 201 })
}

// PATCH /api/manual-entries — update an entry (admin only)
export async function PATCH(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()
  if (!(await checkIsAdmin())) return forbiddenResponse()

  const supabase = await createClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("manual_entries")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

// DELETE /api/manual-entries?id=... — delete an entry (admin only)
export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()
  if (!(await checkIsAdmin())) return forbiddenResponse()

  const supabase = await createClient()
  const id = request.nextUrl.searchParams.get("id")

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 })
  }

  const { error } = await supabase
    .from("manual_entries")
    .delete()
    .eq("id", id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
