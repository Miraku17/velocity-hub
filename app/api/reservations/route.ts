import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from "@/lib/supabase/auth"

// GET /api/reservations — list reservations (admin: all via view, public: by email)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const params = request.nextUrl.searchParams

  const date = params.get("date")
  const status = params.get("status")
  const courtType = params.get("court_type")
  const courtId = params.get("court_id")
  const page = parseInt(params.get("page") || "1", 10)
  const limit = parseInt(params.get("limit") || "20", 10)
  const offset = (page - 1) * limit

  let query = supabase
    .from("reservations_view")
    .select("*", { count: "exact" })
    .order("reservation_date", { ascending: false })
    .order("start_time", { ascending: false })

  if (date) query = query.eq("reservation_date", date)
  if (status) query = query.eq("status", status)
  if (courtType) query = query.eq("court_type", courtType)
  if (courtId) query = query.eq("court_id", courtId)

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

// POST /api/reservations — create a reservation (public, no auth required)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()

  const {
    court_id,
    customer_name,
    customer_email,
    customer_phone,
    date,
    start_time,
    end_time,
    reservation_type,
    notes,
  } = body as {
    court_id: string
    customer_name: string
    customer_email: string
    customer_phone: string
    date: string
    start_time: string
    end_time: string
    reservation_type?: string
    notes?: string
  }

  // Validate required fields
  if (!court_id || !customer_name || !customer_email || !customer_phone || !date || !start_time || !end_time) {
    return Response.json(
      { error: "court_id, customer_name, customer_email, customer_phone, date, start_time, and end_time are required" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase.rpc("create_reservation", {
    p_court_id: court_id,
    p_customer_name: customer_name,
    p_customer_email: customer_email,
    p_customer_phone: customer_phone,
    p_date: date,
    p_start_time: start_time,
    p_end_time: end_time,
    p_reservation_type: reservation_type || "regular",
    p_notes: notes || null,
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ id: data }, { status: 201 })
}

// PATCH /api/reservations — update reservation status (admin only)
export async function PATCH(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const supabase = await createClient()

  // Check if admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return Response.json({ error: "Admin access required" }, { status: 403 })
  }

  const body = await request.json()
  const { id, status, payment_status, notes } = body as {
    id: string
    status?: string
    payment_status?: string
    notes?: string
  }

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 })
  }

  const updates: Record<string, string> = {}
  if (status) updates.status = status
  if (payment_status) updates.payment_status = payment_status
  if (notes !== undefined) updates.notes = notes

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("reservations")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
