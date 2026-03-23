import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from "@/lib/supabase/auth"

// GET /api/payment-qr-codes — public, returns active QR codes
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("payment_qr_codes")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at")

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

// POST /api/payment-qr-codes — admin only, create a QR code
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const body = await request.json()
  const { name, type, image_url, sort_order } = body

  if (!name?.trim() || !image_url?.trim()) {
    return Response.json({ error: "Name and image are required" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("payment_qr_codes")
    .insert({
      name: name.trim(),
      type: type || "gcash",
      image_url: image_url.trim(),
      sort_order: sort_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data, { status: 201 })
}
