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

  // Build a matching query for aggregates (no pagination)
  let statsQuery = supabase
    .from("manual_entries")
    .select("amount")

  if (date) { query = query.eq("entry_date", date); statsQuery = statsQuery.eq("entry_date", date) }
  if (dateFrom) { query = query.gte("entry_date", dateFrom); statsQuery = statsQuery.gte("entry_date", dateFrom) }
  if (dateTo) { query = query.lte("entry_date", dateTo); statsQuery = statsQuery.lte("entry_date", dateTo) }

  query = query.range(offset, offset + limit - 1)

  const [{ data, error, count }, { data: allEntries }] = await Promise.all([query, statsQuery])

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const totalAmount = (allEntries ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0)
  const notesOnly = (allEntries ?? []).filter((e) => !e.amount).length

  return Response.json({
    data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
    stats: {
      totalAmount,
      notesOnly,
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

  // Also create a booking when court and time info are provided
  let reservationId: string | null = null
  if (court_id && start_time && end_time) {
    const adminClient = createAdminClient()

    // Compute the correct hourly rate from the court's schedule
    const dayOfWeek = new Date(entry_date + "T00:00:00").getDay()
    const { data: courtInfo } = await adminClient
      .from("courts")
      .select("price_per_hour, court_schedules(*)")
      .eq("id", court_id)
      .single()

    const courtBasePrice: number = courtInfo?.price_per_hour ?? 0
    const daySchedule = (courtInfo?.court_schedules as { day_of_week: number; hourly_rates?: Record<string, number> | null }[] | null)
      ?.find((s) => s.day_of_week === dayOfWeek)
    const rates = daySchedule?.hourly_rates ?? null

    const sh = parseInt(start_time.split(":")[0], 10)
    const eh = parseInt(end_time.split(":")[0], 10)
    const hrs = eh > sh ? eh - sh : 24 - sh + eh
    let correctTotal = 0
    for (let h = sh; h < sh + hrs; h++) {
      correctTotal += rates?.[String(h % 24)] ?? courtBasePrice
    }
    const correctRate = hrs > 0 ? correctTotal / hrs : courtBasePrice
    const finalTotal = amount != null ? amount : correctTotal

    const { data: bookingId, error: bookingError } = await adminClient.rpc("create_booking", {
      p_customer_name: description,
      p_customer_email: "Manual Input",
      p_customer_phone: "Manual Input",
      p_date: entry_date,
      p_reservation_type: "walk-in",
      p_notes: description + (notes ? ` — ${notes}` : ""),
      p_items: [{ court_id, start_time, end_time }],
    })

    if (!bookingError && bookingId) {
      reservationId = bookingId as string

      // Auto-confirm with correct rate and total
      await adminClient
        .from("bookings")
        .update({ status: "confirmed", payment_status: "paid", total_amount: finalTotal })
        .eq("id", bookingId)

      await adminClient
        .from("booking_items")
        .update({ price_per_hour: correctRate, total_amount: finalTotal })
        .eq("booking_id", bookingId)
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

  // Fetch the entry first to find its matching reservation
  const { data: entry } = await supabase
    .from("manual_entries")
    .select("court_id, entry_date, start_time, end_time")
    .eq("id", id)
    .single()

  // Cancel the matching booking if one exists
  if (entry?.court_id && entry?.start_time && entry?.end_time) {
    const adminClient = createAdminClient()
    const { data: matchingItems } = await adminClient
      .from("booking_items")
      .select("booking_id")
      .eq("court_id", entry.court_id)
      .eq("booking_date", entry.entry_date)
      .eq("start_time", entry.start_time)
      .eq("end_time", entry.end_time)
    if (matchingItems && matchingItems.length > 0) {
      const bookingIds = matchingItems.map((i: { booking_id: string }) => i.booking_id)
      await adminClient
        .from("bookings")
        .delete()
        .in("id", bookingIds)
        .eq("customer_email", "Manual Input")
    }
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
