import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from "@/lib/supabase/auth"
import { sendBookingNotification, sendReceiptEmail } from "@/lib/email"

// GET /api/reservations — list reservations (admin: all via view, public: by email)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const params = request.nextUrl.searchParams

  const date = params.get("date")
  const dateFrom = params.get("date_from")
  const dateTo = params.get("date_to")
  const status = params.get("status")
  const courtType = params.get("court_type")
  const courtId = params.get("court_id")
  const search = params.get("search")?.trim()
  const page = parseInt(params.get("page") || "1", 10)
  const limit = parseInt(params.get("limit") || "20", 10)
  const offset = (page - 1) * limit

  let query = supabase
    .from("reservations_view")
    .select("*", { count: "exact" })
    .order("reservation_date", { ascending: false })
    .order("start_time", { ascending: false })

  if (date) query = query.eq("reservation_date", date)
  if (dateFrom) query = query.gte("reservation_date", dateFrom)
  if (dateTo) query = query.lte("reservation_date", dateTo)
  if (status) query = query.eq("status", status)
  if (courtType) query = query.eq("court_type", courtType)
  if (courtId) query = query.eq("court_id", courtId)
  if (search) {
    query = query.or(
      `customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,customer_phone.ilike.%${search}%,reservation_code.ilike.%${search}%`
    )
  }

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
    turnstile_token,
    time_blocks,
  } = body as {
    court_id: string
    customer_name: string
    customer_email: string
    customer_phone: string
    date: string
    start_time?: string
    end_time?: string
    reservation_type?: string
    notes?: string
    turnstile_token?: string
    time_blocks?: { start_time: string; end_time: string }[]
  }

  // Verify Cloudflare Turnstile token
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY
  if (turnstileSecret) {
    if (!turnstile_token) {
      return Response.json(
        { error: "Human verification is required. Please complete the CAPTCHA." },
        { status: 400 }
      )
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? ""

    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: turnstile_token,
          remoteip: ip,
        }),
      }
    )

    const verification = (await verifyRes.json()) as { success: boolean }
    if (!verification.success) {
      return Response.json(
        { error: "Human verification failed. Please try again." },
        { status: 403 }
      )
    }
  }

  // Build the list of time blocks to create
  const blocks = time_blocks && time_blocks.length > 0
    ? time_blocks
    : start_time && end_time
      ? [{ start_time, end_time }]
      : []

  // Validate required fields
  if (!court_id || !customer_name || !customer_email || !customer_phone || !date || blocks.length === 0) {
    return Response.json(
      { error: "court_id, customer_name, customer_email, customer_phone, date, and time block(s) are required" },
      { status: 400 }
    )
  }

  // Generate a shared group ID when booking multiple non-contiguous blocks
  const bookingGroupId = blocks.length > 1
    ? crypto.randomUUID()
    : null

  // Create a reservation for each time block
  const ids: string[] = []
  for (const block of blocks) {
    const { data, error } = await supabase.rpc("create_reservation", {
      p_court_id: court_id,
      p_customer_name: customer_name,
      p_customer_email: customer_email,
      p_customer_phone: customer_phone,
      p_date: date,
      p_start_time: block.start_time,
      p_end_time: block.end_time,
      p_reservation_type: reservation_type || "regular",
      p_notes: notes || null,
    })

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    const reservationId = data as string
    ids.push(reservationId)

    // Stamp the booking_group_id so all blocks are linked as one booking
    if (bookingGroupId) {
      await supabase
        .from("reservations")
        .update({ booking_group_id: bookingGroupId })
        .eq("id", reservationId)
    }
  }

  // Send ONE admin notification email with all slots (non-blocking)
  const [{ data: court }, { data: firstReservation }] = await Promise.all([
    supabase.from("courts").select("name, court_type").eq("id", court_id).single(),
    supabase.from("reservations").select("reservation_code").eq("id", ids[0]).single(),
  ])

  sendBookingNotification({
    reservationCode: firstReservation?.reservation_code ?? ids[0],
    customerName: customer_name,
    customerEmail: customer_email,
    customerPhone: customer_phone,
    courtName: court?.name ?? "Unknown Court",
    courtType: court?.court_type ?? "",
    date,
    startTime: blocks[0].start_time,
    endTime: blocks[0].end_time,
    reservationType: reservation_type || "regular",
    notes,
    slots: blocks.map((b) => ({ startTime: b.start_time, endTime: b.end_time })),
  }).catch(console.error)

  // Return first id for backward compatibility, plus all ids and group id
  return Response.json({ id: ids[0], ids, booking_group_id: bookingGroupId }, { status: 201 })
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
  if (status === "cancelled") updates.payment_status = "declined"
  else if (payment_status) updates.payment_status = payment_status
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

  // Send receipt to customer when admin confirms the booking
  // For grouped bookings, only send once (from the first sibling) with all slot details
  if (status === "confirmed") {
    const { data: reservation } = await supabase
      .from("reservations_view")
      .select("*")
      .eq("id", id)
      .single()

    if (reservation) {
      // Check if this is part of a group
      let siblings: typeof reservation[] = []
      if (reservation.booking_group_id) {
        const { data: groupRows } = await supabase
          .from("reservations_view")
          .select("*")
          .eq("booking_group_id", reservation.booking_group_id)
          .order("start_time", { ascending: true })

        siblings = groupRows ?? []

        // Only send the email once — skip if this isn't the first sibling
        if (siblings.length > 0 && siblings[0].id !== id) {
          return Response.json(data)
        }
      }

      const isGrouped = siblings.length > 1
      // Use the earliest slot as the primary (matches admin table and booking notification)
      const primary = isGrouped ? siblings[0] : reservation
      const groupTotal = isGrouped
        ? siblings.reduce((sum: number, r: typeof reservation) => sum + Number(r.total_amount), 0)
        : reservation.total_amount

      sendReceiptEmail({
        customerName: primary.customer_name,
        customerEmail: primary.customer_email,
        courtName: primary.court_name,
        courtType: primary.court_type,
        date: primary.reservation_date,
        startTime: primary.start_time,
        endTime: primary.end_time,
        reservationType: primary.reservation_type,
        reservationCode: primary.reservation_code,
        totalAmount: groupTotal,
        notes: primary.notes,
        slots: isGrouped
          ? siblings.map((r: typeof reservation) => ({
              startTime: r.start_time,
              endTime: r.end_time,
              amount: Number(r.total_amount),
            }))
          : undefined,
      }).catch(console.error)
    }
  }

  return Response.json(data)
}
