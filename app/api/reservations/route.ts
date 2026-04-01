import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getAuthenticatedUser,
  checkIsAdmin,
  unauthorizedResponse,
} from "@/lib/supabase/auth"
import { sendBookingNotification, sendReceiptEmail } from "@/lib/email"
import { rateLimit } from "@/lib/rate-limit"

/**
 * Try to parse a search string as a date and return "YYYY-MM-DD" or null.
 * Supports: "2026-04-14", "04/14/2026", "Apr 14 2026", "April 14", "Apr 14", etc.
 */
function tryParseDate(input: string): string | null {
  // ISO format: 2026-04-14
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const d = new Date(input + "T00:00:00")
    if (!isNaN(d.getTime())) return input
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const slashMatch = input.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (slashMatch) {
    const [, m, d, y] = slashMatch
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    if (!isNaN(date.getTime())) {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
    }
  }

  // Natural language: "Apr 14 2026", "April 14, 2026", "Apr 14" (defaults to current year)
  const monthNames: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
    nov: 10, november: 10, dec: 11, december: 11,
  }
  const naturalMatch = input.match(/^([a-zA-Z]+)\s+(\d{1,2})(?:\s+(\d{4}))?$/)
  if (naturalMatch) {
    const monthIdx = monthNames[naturalMatch[1].toLowerCase()]
    if (monthIdx !== undefined) {
      const day = Number(naturalMatch[2])
      const year = naturalMatch[3] ? Number(naturalMatch[3]) : new Date().getFullYear()
      const date = new Date(year, monthIdx, day)
      if (!isNaN(date.getTime()) && date.getMonth() === monthIdx) {
        return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      }
    }
  }

  return null
}

// GET /api/reservations — list reservations
// Public: requires court_id + date, returns only slot data (no PII)
// Admin: full access with search, filters, pagination
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const params = request.nextUrl.searchParams
  const user = await getAuthenticatedUser()
  const isAdmin = user ? await checkIsAdmin() : false

  const date = params.get("date")
  const courtId = params.get("court_id")

  // Public (unauthenticated) access: only slot availability lookups
  if (!isAdmin) {
    if (!courtId || !date) {
      return Response.json(
        { error: "court_id and date are required" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("reservations_view")
      .select("start_time, end_time, status")
      .eq("court_id", courtId)
      .eq("reservation_date", date)
      .neq("status", "cancelled")

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({
      data,
      pagination: { page: 1, limit: data?.length ?? 0, total: data?.length ?? 0, totalPages: 1 },
    })
  }

  // Admin: full access
  const dateFrom = params.get("date_from")
  const dateTo = params.get("date_to")
  const status = params.get("status")
  const paymentStatus = params.get("payment_status")
  const courtType = params.get("court_type")
  const search = params.get("search")?.trim()
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(params.get("limit") || "20", 10) || 20))
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
  if (paymentStatus) query = query.eq("payment_status", paymentStatus)
  if (courtType) query = query.eq("court_type", courtType)
  if (courtId) query = query.eq("court_id", courtId)
  if (search) {
    // Sanitize search input: remove characters that could manipulate PostgREST filter syntax
    const sanitized = search.replace(/[,.()"'\\]/g, "")
    if (sanitized) {
      // Try to parse as a date so users can search by date (e.g. "Apr 14", "2026-04-14", "04/14/2026")
      const parsedDate = tryParseDate(sanitized)
      const orFilters = [
        `customer_name.ilike.%${sanitized}%`,
        `customer_email.ilike.%${sanitized}%`,
        `customer_phone.ilike.%${sanitized}%`,
        `reservation_code.ilike.%${sanitized}%`,
      ]
      if (parsedDate) {
        orFilters.push(`reservation_date.eq.${parsedDate}`)
      }
      query = query.or(orFilters.join(","))
    }
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
  // Rate limit by IP: max 10 bookings per 15 minutes
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown"

  const { limited, retryAfter } = rateLimit(ip, "POST:/api/reservations", {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
  })

  if (limited) {
    return Response.json(
      { error: "Too many booking attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    )
  }

  const supabase = await createClient()

  // Parse body — supports JSON or FormData (when a receipt file is attached)
  let body: Record<string, unknown>
  let receiptFile: File | null = null
  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    body = JSON.parse(formData.get("data") as string)
    const file = formData.get("receipt") as File | null
    if (file && file.size > 0) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
      if (!allowedTypes.includes(file.type)) {
        return Response.json({ error: "Receipt must be JPEG, PNG, WebP, or GIF" }, { status: 400 })
      }
      if (file.size > 10 * 1024 * 1024) {
        return Response.json({ error: "Receipt must be under 10MB" }, { status: 400 })
      }
      receiptFile = file
    }
  } else {
    body = await request.json()
  }

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

    let turnstileSuccess = false
    try {
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
      turnstileSuccess = verification.success
    } catch {
      // Network error contacting Cloudflare — fail closed
      return Response.json(
        { error: "Unable to verify human check. Please try again." },
        { status: 503 }
      )
    }

    if (!turnstileSuccess) {
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

  // Validate input formats
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const PHONE_RE = /^[\d\-+\s()]{7,20}$/
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

  if (!UUID_RE.test(court_id)) {
    return Response.json({ error: "Invalid court ID" }, { status: 400 })
  }
  if (customer_name.trim().length < 1 || customer_name.length > 100) {
    return Response.json({ error: "Name must be between 1 and 100 characters" }, { status: 400 })
  }
  if (!EMAIL_RE.test(customer_email)) {
    return Response.json({ error: "Invalid email address" }, { status: 400 })
  }
  if (!PHONE_RE.test(customer_phone)) {
    return Response.json({ error: "Invalid phone number" }, { status: 400 })
  }
  if (!DATE_RE.test(date)) {
    return Response.json({ error: "Invalid date format" }, { status: 400 })
  }

  // Prevent booking in the past (use Philippines timezone)
  const phNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }))
  const phToday = `${phNow.getFullYear()}-${String(phNow.getMonth() + 1).padStart(2, "0")}-${String(phNow.getDate()).padStart(2, "0")}`
  if (date < phToday) {
    return Response.json({ error: "Cannot book dates in the past" }, { status: 400 })
  }

  // Validate each time block
  const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/
  for (const block of blocks) {
    if (!block.start_time || !block.end_time) {
      return Response.json({ error: "Each time block must have start_time and end_time" }, { status: 400 })
    }
    if (!TIME_RE.test(block.start_time) || !TIME_RE.test(block.end_time)) {
      return Response.json({ error: "Invalid time format" }, { status: 400 })
    }
    if (block.start_time >= block.end_time) {
      return Response.json({ error: "start_time must be before end_time" }, { status: 400 })
    }
  }

  // Validate reservation type
  const VALID_RESERVATION_TYPES = ["regular", "walk-in", "priority"]
  if (reservation_type && !VALID_RESERVATION_TYPES.includes(reservation_type)) {
    return Response.json({ error: "Invalid reservation type" }, { status: 400 })
  }

  // Fetch the court's schedule to determine the correct hourly rate per time slot
  const bookingDayOfWeek = new Date(date + "T00:00:00").getDay()
  const { data: courtData } = await supabase
    .from("courts")
    .select("price_per_hour, court_schedules(*)")
    .eq("id", court_id)
    .single()

  const basePrice: number = courtData?.price_per_hour ?? 0
  const schedule = (courtData?.court_schedules as { day_of_week: number; hourly_rates?: Record<string, number> | null }[] | null)
    ?.find((s) => s.day_of_week === bookingDayOfWeek)
  const hourlyRates = schedule?.hourly_rates ?? null

  /** Return the correct rate for a given start hour */
  function getHourRate(startHour: number): number {
    if (!hourlyRates) return basePrice
    return hourlyRates[String(startHour)] ?? basePrice
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
      // Rollback previously created reservations in this group
      if (ids.length > 0) {
        await supabase
          .from("reservations")
          .update({ status: "cancelled" })
          .in("id", ids)
      }
      return Response.json({ error: error.message }, { status: 400 })
    }

    const reservationId = data as string
    ids.push(reservationId)

    // Compute the correct price_per_hour and total_amount using hourly rates
    const startHour = parseInt(block.start_time.split(":")[0], 10)
    const endHour = parseInt(block.end_time.split(":")[0], 10)
    const durationHours = endHour > startHour ? endHour - startHour : 24 - startHour + endHour
    let correctTotal = 0
    for (let h = startHour; h < startHour + durationHours; h++) {
      correctTotal += getHourRate(h % 24)
    }
    // For price_per_hour, use the average rate across the block's hours
    const correctRate = durationHours > 0 ? correctTotal / durationHours : basePrice

    // Update with correct rate, total, and optional group ID
    await supabase
      .from("reservations")
      .update({
        price_per_hour: correctRate,
        total_amount: correctTotal,
        ...(bookingGroupId ? { booking_group_id: bookingGroupId } : {}),
      })
      .eq("id", reservationId)
  }

  // Upload receipt if provided — if this fails, roll back all reservations
  if (receiptFile) {
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const adminClient = createAdminClient()

    const ext = receiptFile.name.split(".").pop() || "jpg"
    const storagePath = `${ids[0]}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const arrayBuffer = await receiptFile.arrayBuffer()
    const { data: uploadData, error: uploadErr } = await adminClient.storage
      .from("receipts")
      .upload(storagePath, arrayBuffer, {
        contentType: receiptFile.type,
        upsert: false,
      })

    if (uploadErr) {
      // Roll back — delete all reservations created in this request
      await adminClient
        .from("reservations")
        .delete()
        .in("id", ids)
      return Response.json({ error: "Receipt upload failed. Please try again." }, { status: 500 })
    }

    const { data: urlData } = adminClient.storage
      .from("receipts")
      .getPublicUrl(uploadData.path)

    // Save receipt record linked to the first reservation
    await adminClient
      .from("payment_receipts")
      .insert({
        reservation_id: ids[0],
        image_url: urlData.publicUrl,
        storage_path: uploadData.path,
      })
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
