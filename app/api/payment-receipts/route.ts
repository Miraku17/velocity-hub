import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  getAuthenticatedUser,
  checkIsStaff,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/supabase/auth"
import { rateLimit } from "@/lib/rate-limit"

// GET /api/payment-receipts?booking_id=xxx — fetch receipts (staff only)
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()
  if (!(await checkIsStaff())) return forbiddenResponse()

  const param = request.nextUrl.searchParams.get("booking_id")

  if (!param) {
    return Response.json({ error: "booking_id is required" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("payment_receipts")
    .select("*")
    .eq("booking_id", param)
    .order("created_at", { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Return signed URLs for private bucket
  const receiptsWithSignedUrls = await Promise.all(
    (data ?? []).map(async (receipt) => {
      if (!receipt.storage_path) {
        console.error("payment_receipts: missing storage_path for id", receipt.id)
        return { ...receipt, image_url: null }
      }

      const { data: signedData, error: signErr } = await supabase.storage
        .from("receipts")
        .createSignedUrl(receipt.storage_path, 60 * 60) // 1 hour expiry

      if (signErr || !signedData?.signedUrl) {
        console.error("payment_receipts: failed to sign url for", receipt.storage_path, signErr?.message)
        return { ...receipt, image_url: null }
      }

      return { ...receipt, image_url: signedData.signedUrl }
    })
  )

  return Response.json(receiptsWithSignedUrls)
}

// POST /api/payment-receipts — public, upload receipt image + save record
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown"

  const { limited, retryAfter } = rateLimit(ip, "POST:/api/payment-receipts", {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
  })

  if (limited) {
    return Response.json(
      { error: "Too many upload attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    )
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const bookingId = formData.get("booking_id") as string | null

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 })
  }

  if (!bookingId) {
    return Response.json({ error: "booking_id is required" }, { status: 400 })
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(bookingId)) {
    return Response.json({ error: "Invalid booking_id" }, { status: 400 })
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: "File must be JPEG, PNG, WebP, or GIF" }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: "File must be under 10MB" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify booking exists
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", bookingId)
    .single()

  if (bookingErr || !booking) {
    return Response.json({ error: "Booking not found" }, { status: 404 })
  }

  const ext = file.name.split(".").pop() || "jpg"
  const storagePath = `${bookingId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from("receipts")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadErr) {
    return Response.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage
    .from("receipts")
    .getPublicUrl(uploadData.path)

  const { data: receipt, error: dbErr } = await supabase
    .from("payment_receipts")
    .insert({
      booking_id: bookingId,
      image_url: urlData.publicUrl,
      storage_path: uploadData.path,
    })
    .select()
    .single()

  if (dbErr) {
    return Response.json({ error: dbErr.message }, { status: 500 })
  }

  return Response.json(receipt, { status: 201 })
}
