import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// GET /api/payment-receipts?reservation_id=xxx — fetch receipts for a reservation
export async function GET(request: NextRequest) {
  const reservationId = request.nextUrl.searchParams.get("reservation_id")

  if (!reservationId) {
    return Response.json({ error: "reservation_id is required" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("payment_receipts")
    .select("*")
    .eq("reservation_id", reservationId)
    .order("created_at", { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

// POST /api/payment-receipts — public, upload receipt image + save record
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const reservationId = formData.get("reservation_id") as string | null

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 })
  }

  if (!reservationId) {
    return Response.json({ error: "reservation_id is required" }, { status: 400 })
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

  // Get public URL
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
