import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getAuthenticatedUser,
  checkIsStaff,
  unauthorizedResponse,
} from "@/lib/supabase/auth"
import { sendBookingNotification, sendReceiptEmail } from "@/lib/email"
import { rateLimit } from "@/lib/rate-limit"

/**
 * Shift a "YYYY-MM-DD" date string by N days.
 */
function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// Overnight-slot cutoff: items with start_time before 06:00 are treated as next-day
const NEXT_DAY_CUTOFF = "06:00:00"

/**
 * Given a target display date, return booking IDs whose items actually fall on
 * that date because of overnight (next-day) slots stored under the previous
 * calendar date.
 */
async function getOvernightBookingIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetDate: string
): Promise<string[]> {
  const prevDate = shiftDate(targetDate, -1)
  const { data } = await supabase
    .from("booking_items")
    .select("booking_id")
    .eq("booking_date", prevDate)
    .lt("start_time", NEXT_DAY_CUTOFF)
  return [...new Set((data ?? []).map((r: { booking_id: string }) => r.booking_id))]
}

/**
 * Try to parse a search string as a date and return "YYYY-MM-DD" or null.
 */
function tryParseDate(input: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const d = new Date(input + "T00:00:00")
    if (!isNaN(d.getTime())) return input
  }

  const slashMatch = input.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (slashMatch) {
    const [, m, d, y] = slashMatch
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    if (!isNaN(date.getTime())) {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
    }
  }

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

// GET /api/reservations — list bookings
// Public: requires court_id + date, returns only slot data (no PII)
// Admin: full access with search, filters, pagination
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const params = request.nextUrl.searchParams
  const user = await getAuthenticatedUser()
  const isStaff = user ? await checkIsStaff() : false

  const date = params.get("date")
  const courtId = params.get("court_id")

  // Public (unauthenticated) access: only slot availability lookups
  if (!isStaff) {
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

  // Admin: query bookings table directly
  const dateFrom = params.get("date_from")
  const dateTo = params.get("date_to")
  const status = params.get("status")
  const paymentStatus = params.get("payment_status")
  const courtType = params.get("court_type")
  const search = params.get("search")?.trim()
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1)
  const limit = Math.max(1, Math.min(10000, parseInt(params.get("limit") || "20", 10) || 20))
  const offset = (page - 1) * limit

  // If court_type filter is set, find matching booking IDs first
  let courtTypeBookingIds: string[] | null = null
  if (courtType) {
    const { data: matchingIds } = await supabase
      .from("booking_items_view")
      .select("booking_id")
      .eq("court_type", courtType)

    if (matchingIds && matchingIds.length > 0) {
      courtTypeBookingIds = [...new Set(matchingIds.map((r: { booking_id: string }) => r.booking_id))]
    } else {
      return Response.json({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      })
    }
  }

  let query = supabase
    .from("bookings")
    .select("*, booking_items(id, court_id, booking_date, start_time, end_time, duration_hours, price_per_hour, total_amount, courts(name, court_type))", { count: "exact" })
    .order("created_at", { ascending: false })

  if (date) {
    // Include bookings stored on (date - 1) whose overnight items actually fall on `date`
    const overnightIds = await getOvernightBookingIds(supabase, date)
    if (overnightIds.length > 0) {
      query = query.or(`booking_date.eq.${date},id.in.(${overnightIds.join(",")})`)
    } else {
      query = query.eq("booking_date", date)
    }
  }
  if (dateFrom) query = query.gte("booking_date", dateFrom)
  if (dateTo) query = query.lte("booking_date", dateTo)
  if (status) query = query.eq("status", status)
  if (paymentStatus) query = query.eq("payment_status", paymentStatus)
  if (courtTypeBookingIds) query = query.in("id", courtTypeBookingIds)
  if (courtId) {
    // Filter bookings that have an item for this court
    const { data: courtBookingIds } = await supabase
      .from("booking_items")
      .select("booking_id")
      .eq("court_id", courtId)
    if (courtBookingIds && courtBookingIds.length > 0) {
      query = query.in("id", [...new Set(courtBookingIds.map((r: { booking_id: string }) => r.booking_id))])
    } else {
      return Response.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } })
    }
  }
  if (search) {
    const sanitized = search.replace(/[,.()"'\\]/g, "")
    if (sanitized) {
      const parsedDate = tryParseDate(sanitized)
      const orFilters = [
        `customer_name.ilike.%${sanitized}%`,
        `customer_email.ilike.%${sanitized}%`,
        `customer_phone.ilike.%${sanitized}%`,
        `booking_code.ilike.%${sanitized}%`,
      ]
      if (parsedDate) {
        orFilters.push(`booking_date.eq.${parsedDate}`)
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

// POST /api/reservations — create a booking (public, no auth required)
export async function POST(request: NextRequest) {
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
    bookings,
  } = body as {
    court_id?: string
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
    bookings?: { court_id: string; time_blocks: { start_time: string; end_time: string }[] }[]
  }

  // // Verify Cloudflare Turnstile token (temporarily disabled)
  // const turnstileSecret = process.env.TURNSTILE_SECRET_KEY
  // if (turnstileSecret) {
  //   if (!turnstile_token) {
  //     return Response.json(
  //       { error: "Human verification is required. Please complete the CAPTCHA." },
  //       { status: 400 }
  //     )
  //   }

  //   let turnstileSuccess = false
  //   try {
  //     const verifyRes = await fetch(
  //       "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  //       {
  //         method: "POST",
  //         headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //         body: new URLSearchParams({
  //           secret: turnstileSecret,
  //           response: turnstile_token,
  //           remoteip: ip,
  //         }),
  //       }
  //     )

  //     const verification = (await verifyRes.json()) as { success: boolean }
  //     turnstileSuccess = verification.success
  //   } catch {
  //     return Response.json(
  //       { error: "Unable to verify human check. Please try again." },
  //       { status: 503 }
  //     )
  //   }

  //   if (!turnstileSuccess) {
  //     return Response.json(
  //       { error: "Human verification failed. Please try again." },
  //       { status: 403 }
  //     )
  //   }
  // }

  const isMultiCourt = Array.isArray(bookings) && bookings.length > 0
  const legacyBlocks = time_blocks && time_blocks.length > 0
    ? time_blocks
    : start_time && end_time
      ? [{ start_time, end_time }]
      : []

  if (!customer_name || !customer_email || !customer_phone || !date) {
    return Response.json(
      { error: "customer_name, customer_email, customer_phone, and date are required" },
      { status: 400 }
    )
  }

  if (!isMultiCourt && (!court_id || legacyBlocks.length === 0)) {
    return Response.json(
      { error: "court_id and time block(s) are required" },
      { status: 400 }
    )
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const PHONE_RE = /^[\d\-+\s()]{7,20}$/
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

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

  const phNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }))
  const phToday = `${phNow.getFullYear()}-${String(phNow.getMonth() + 1).padStart(2, "0")}-${String(phNow.getDate()).padStart(2, "0")}`
  if (date < phToday) {
    return Response.json({ error: "Cannot book dates in the past" }, { status: 400 })
  }

  const VALID_RESERVATION_TYPES = ["regular", "walk-in", "priority"]
  if (reservation_type && !VALID_RESERVATION_TYPES.includes(reservation_type)) {
    return Response.json({ error: "Invalid reservation type" }, { status: 400 })
  }

  const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/

  function timeToMinutes(t: string) {
    const [h, m] = t.split(":").map(Number)
    return h * 60 + m
  }

  // Build items array for the RPC
  const items: { court_id: string; start_time: string; end_time: string }[] = []

  if (isMultiCourt) {
    for (const b of bookings!) {
      if (!UUID_RE.test(b.court_id)) {
        return Response.json({ error: "Invalid court ID in bookings" }, { status: 400 })
      }
      if (!b.time_blocks || b.time_blocks.length === 0) {
        return Response.json({ error: "Each booking must have at least one time block" }, { status: 400 })
      }
      for (const block of b.time_blocks) {
        if (!block.start_time || !block.end_time) {
          return Response.json({ error: "Each time block must have start_time and end_time" }, { status: 400 })
        }
        if (!TIME_RE.test(block.start_time) || !TIME_RE.test(block.end_time)) {
          return Response.json({ error: "Invalid time format" }, { status: 400 })
        }
        if (timeToMinutes(block.start_time) >= timeToMinutes(block.end_time)) {
          return Response.json({ error: "start_time must be before end_time" }, { status: 400 })
        }
        items.push({ court_id: b.court_id, start_time: block.start_time, end_time: block.end_time })
      }
    }
  } else {
    if (!UUID_RE.test(court_id!)) {
      return Response.json({ error: "Invalid court ID" }, { status: 400 })
    }
    for (const block of legacyBlocks) {
      if (!block.start_time || !block.end_time) {
        return Response.json({ error: "Each time block must have start_time and end_time" }, { status: 400 })
      }
      if (!TIME_RE.test(block.start_time) || !TIME_RE.test(block.end_time)) {
        return Response.json({ error: "Invalid time format" }, { status: 400 })
      }
      if (block.start_time >= block.end_time) {
        return Response.json({ error: "start_time must be before end_time" }, { status: 400 })
      }
      items.push({ court_id: court_id!, start_time: block.start_time, end_time: block.end_time })
    }
  }

  // Single RPC call creates booking + all items in one transaction
  const { data: bookingId, error } = await supabase.rpc("create_booking", {
    p_customer_name: customer_name,
    p_customer_email: customer_email,
    p_customer_phone: customer_phone,
    p_date: date,
    p_reservation_type: reservation_type || "regular",
    p_notes: notes || null,
    p_items: items,
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  // Upload receipt if provided
  if (receiptFile) {
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const adminClient = createAdminClient()

    const ext = receiptFile.name.split(".").pop() || "jpg"
    const storagePath = `${bookingId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const arrayBuffer = await receiptFile.arrayBuffer()
    const { data: uploadData, error: uploadErr } = await adminClient.storage
      .from("receipts")
      .upload(storagePath, arrayBuffer, {
        contentType: receiptFile.type,
        upsert: false,
      })

    if (uploadErr) {
      await adminClient.from("bookings").delete().eq("id", bookingId)
      return Response.json({ error: "Receipt upload failed. Please try again." }, { status: 500 })
    }

    const { data: urlData } = adminClient.storage
      .from("receipts")
      .getPublicUrl(uploadData.path)

    // Retry the DB insert up to 2 times — if it still fails, clean up and error out
    let receiptDbErr: { message: string } | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error: insertErr } = await adminClient
        .from("payment_receipts")
        .insert({
          booking_id: bookingId,
          image_url: urlData.publicUrl,
          storage_path: uploadData.path,
        })
      if (!insertErr) {
        receiptDbErr = null
        break
      }
      receiptDbErr = insertErr
    }

    if (receiptDbErr) {
      // Clean up: remove the uploaded file and the booking
      await adminClient.storage.from("receipts").remove([uploadData.path])
      await adminClient.from("bookings").delete().eq("id", bookingId)
      console.error("Failed to save payment receipt record after retries:", receiptDbErr.message)
      return Response.json({ error: "Failed to save receipt. Please try again." }, { status: 500 })
    }
  }

  // Fetch the created booking for the email
  const { data: booking } = await supabase
    .from("bookings")
    .select("booking_code, booking_items(court_id, start_time, end_time, courts(name, court_type))")
    .eq("id", bookingId)
    .single()

  type PostItem = { court_id: string; start_time: string; end_time: string; courts: { name: string; court_type: string } | null }
  const rawPostItems = (booking?.booking_items ?? []) as unknown as { court_id: string; start_time: string; end_time: string; courts: { name: string; court_type: string }[] | { name: string; court_type: string } | null }[]
  const bookingItems: PostItem[] = rawPostItems.map((bi) => ({
    ...bi,
    courts: Array.isArray(bi.courts) ? bi.courts[0] ?? null : bi.courts,
  }))

  // Group booking items by court for the email
  const courtGroupMap = new Map<string, { courtName: string; courtType: string; slots: { startTime: string; endTime: string }[] }>()
  for (const bi of bookingItems) {
    const name = bi.courts?.name ?? "Unknown"
    const type = bi.courts?.court_type ?? ""
    if (!courtGroupMap.has(bi.court_id)) {
      courtGroupMap.set(bi.court_id, { courtName: name, courtType: type, slots: [] })
    }
    courtGroupMap.get(bi.court_id)!.slots.push({ startTime: bi.start_time, endTime: bi.end_time })
  }
  const notifCourts = Array.from(courtGroupMap.values())

  sendBookingNotification({
    reservationCode: booking?.booking_code ?? bookingId,
    customerName: customer_name,
    customerEmail: customer_email,
    customerPhone: customer_phone,
    date,
    reservationType: reservation_type || "regular",
    notes,
    courts: notifCourts,
  }).catch(console.error)

  return Response.json({ id: bookingId, booking_code: booking?.booking_code }, { status: 201 })
}

// PATCH /api/reservations — update booking status (admin only)
export async function PATCH(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const isStaff = await checkIsStaff()
  if (!isStaff) {
    return Response.json({ error: "Staff access required" }, { status: 403 })
  }

  const supabase = await createClient()

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
    .from("bookings")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Send receipt email when admin confirms
  if (status === "confirmed") {
    const { data: booking } = await supabase
      .from("bookings")
      .select("*, booking_items(start_time, end_time, total_amount, court_id, courts(name, court_type))")
      .eq("id", id)
      .single()

    if (booking) {
      type EmailItem = { start_time: string; end_time: string; total_amount: number; court_id: string; courts: { name: string; court_type: string } | null }
      const rawItems = booking.booking_items as unknown as { start_time: string; end_time: string; total_amount: number; court_id: string; courts: { name: string; court_type: string }[] | { name: string; court_type: string } | null }[]
      const items: EmailItem[] = (rawItems ?? []).map((bi) => ({
        ...bi,
        courts: Array.isArray(bi.courts) ? bi.courts[0] ?? null : bi.courts,
      }))

      const receiptCourtMap = new Map<string, { courtName: string; courtType: string; slots: { startTime: string; endTime: string; amount: number }[] }>()
      for (const item of items) {
        const name = item.courts?.name ?? "Unknown"
        const type = item.courts?.court_type ?? ""
        if (!receiptCourtMap.has(item.court_id)) {
          receiptCourtMap.set(item.court_id, { courtName: name, courtType: type, slots: [] })
        }
        receiptCourtMap.get(item.court_id)!.slots.push({
          startTime: item.start_time,
          endTime: item.end_time,
          amount: Number(item.total_amount),
        })
      }
      const receiptCourts = Array.from(receiptCourtMap.values())

      sendReceiptEmail({
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        date: booking.booking_date,
        reservationType: booking.reservation_type,
        reservationCode: booking.booking_code,
        totalAmount: booking.total_amount,
        notes: booking.notes,
        courts: receiptCourts,
      }).catch(console.error)
    }
  }

  return Response.json(data)
}
