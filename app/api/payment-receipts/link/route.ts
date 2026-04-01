import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// POST /api/payment-receipts/link — link a pre-uploaded receipt to a reservation
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { storage_path, reservation_id } = body as {
    storage_path: string
    reservation_id: string
  }

  if (!storage_path || !reservation_id) {
    return Response.json(
      { error: "storage_path and reservation_id are required" },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Verify reservation exists
  const { data: reservation, error: resErr } = await supabase
    .from("reservations")
    .select("id")
    .eq("id", reservation_id)
    .single()

  if (resErr || !reservation) {
    return Response.json({ error: "Reservation not found" }, { status: 404 })
  }

  // Get public URL for the uploaded file
  const { data: urlData } = supabase.storage
    .from("receipts")
    .getPublicUrl(storage_path)

  // Save receipt record
  const { data: receipt, error: dbErr } = await supabase
    .from("payment_receipts")
    .insert({
      reservation_id,
      image_url: urlData.publicUrl,
      storage_path,
    })
    .select()
    .single()

  if (dbErr) {
    return Response.json({ error: dbErr.message }, { status: 500 })
  }

  return Response.json(receipt, { status: 201 })
}
