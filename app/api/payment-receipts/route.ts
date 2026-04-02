import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  getAuthenticatedUser,
  checkIsStaff,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/supabase/auth"
import { rateLimit } from "@/lib/rate-limit"

// GET /api/payment-receipts?reservation_id=xxx — fetch receipts (staff only)
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()
  if (!(await checkIsStaff())) return forbiddenResponse()

  const param = request.nextUrl.searchParams.get("reservation_id")

  if (!param) {
    return Response.json({ error: "reservation_id is required" }, { status: 400 })
  }

  const ids = param.split(",").map((s) => s.trim()).filter(Boolean)

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("payment_receipts")
    .select("*")
    .in("reservation_id", ids)
    .order("created_at", { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Return signed URLs instead of public URLs
  const receiptsWithSignedUrls = await Promise.all(
    (data ?? []).map(async (receipt) => {
      if (!receipt.storage_path) return receipt

      const { data: signedData } = await supabase.storage
        .from("receipts")
        .createSignedUrl(receipt.storage_path, 60 * 60) // 1 hour expiry

      return {
        ...receipt,
        image_url: signedData?.signedUrl ?? receipt.image_url,
      }
    })
  )

  return Response.json(receiptsWithSignedUrls)
}

// POST /api/payment-receipts — public, upload receipt image + save record
export async function POST(request: NextRequest) {
  // Rate limit by IP
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
  const reservationId = formData.get("reservation_id") as string | null

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 })
  }

  if (!reservationId) {
    return Response.json({ error: "reservation_id is required" }, { status: 400 })
  }

  // Validate UUID format
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(reservationId)) {
    return Response.json({ error: "Invalid reservation_id" }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: "File must be JPEG, PNG, WebP, or GIF" }, { status: 400 })
  }

  // 10MB limit
  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: "File must be under 10MB" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify reservation exists
  const { data: reservation, error: resErr } = await supabase
    .from("reservations")
    .select("id")
    .eq("id", reservationId)
    .single()

  if (resErr || !reservation) {
    return Response.json({ error: "Reservation not found" }, { status: 404 })
  }

  // Upload to storage
  const ext = file.name.split(".").pop() || "jpg"
  const storagePath = `${reservationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

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

  // Store the storage path (not a public URL)
  const { data: urlData } = supabase.storage
    .from("receipts")
    .getPublicUrl(uploadData.path)

  // Save receipt record
  const { data: receipt, error: dbErr } = await supabase
    .from("payment_receipts")
    .insert({
      reservation_id: reservationId,
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
