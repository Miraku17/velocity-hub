import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from "@/lib/supabase/auth"

type RouteParams = { params: Promise<{ id: string }> }

// PATCH /api/payment-qr-codes/[id] — admin only
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const { id } = await params
  const body = await request.json()
  const { name, type, image_url, is_active, sort_order } = body

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = name
  if (type !== undefined) updates.type = type
  if (image_url !== undefined) updates.image_url = image_url
  if (is_active !== undefined) updates.is_active = is_active
  if (sort_order !== undefined) updates.sort_order = sort_order

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("payment_qr_codes")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

// DELETE /api/payment-qr-codes/[id] — admin only
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("payment_qr_codes")
    .delete()
    .eq("id", id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
