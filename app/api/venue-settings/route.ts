import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  getAuthenticatedUser,
  checkIsAdmin,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/supabase/auth"

// GET /api/venue-settings — public
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("venue_settings")
    .select("*")
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

// PATCH /api/venue-settings — update venue settings (admin only)
export async function PATCH(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()
  if (!(await checkIsAdmin())) return forbiddenResponse()

  const body = await request.json()
  const {
    name,
    description,
    address,
    phone,
    email,
    operating_hours,
    tags,
    photos,
    payment_qr_codes,
    social_links,
  } = body

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (description !== undefined) updates.description = description
  if (address !== undefined) updates.address = address
  if (phone !== undefined) updates.phone = phone
  if (email !== undefined) updates.email = email
  if (operating_hours !== undefined) updates.operating_hours = operating_hours
  if (tags !== undefined) updates.tags = tags
  if (photos !== undefined) updates.photos = photos
  if (payment_qr_codes !== undefined) updates.payment_qr_codes = payment_qr_codes
  if (social_links !== undefined) updates.social_links = social_links

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 })
  }

  // Use admin client to bypass RLS for venue settings updates
  const supabase = createAdminClient()

  // Update the single row (singleton table)
  const { data, error } = await supabase
    .from("venue_settings")
    .update(updates)
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
