import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getAuthenticatedUser,
  checkPermission,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/supabase/auth"

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/courts/[id] — get a single court with schedules (public)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("courts")
    .select("*, court_schedules(*)")
    .eq("id", id)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return Response.json({ error: "Court not found" }, { status: 404 })
    }
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

// PATCH /api/courts/[id] — update a court and its schedules (requires courts.update permission)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const hasPermission = await checkPermission("courts.update")
  if (!hasPermission) return forbiddenResponse()

  const { id } = await params
  const body = await request.json()
  const { name, court_type, price_per_hour, description, status, schedules, archived } = body

  if (court_type && !["indoor", "outdoor"].includes(court_type)) {
    return Response.json(
      { error: "court_type must be 'indoor' or 'outdoor'" },
      { status: 400 }
    )
  }

  if (
    status &&
    !["available", "occupied", "maintenance"].includes(status)
  ) {
    return Response.json(
      { error: "status must be 'available', 'occupied', or 'maintenance'" },
      { status: 400 }
    )
  }

  if (price_per_hour != null && (typeof price_per_hour !== "number" || price_per_hour < 0)) {
    return Response.json(
      { error: "price_per_hour must be a positive number" },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Build update payload with only provided fields
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (court_type !== undefined) updates.court_type = court_type
  if (price_per_hour !== undefined) updates.price_per_hour = price_per_hour
  if (description !== undefined) updates.description = description
  if (status !== undefined) updates.status = status
  if (archived !== undefined) updates.archived = archived

  // Update court fields if any
  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("courts")
      .update(updates)
      .eq("id", id)

    if (error) {
      if (error.code === "23505") {
        return Response.json({ error: "A court with this name already exists" }, { status: 409 })
      }
      if (error.code === "PGRST116") {
        return Response.json({ error: "Court not found" }, { status: 404 })
      }
      return Response.json({ error: error.message }, { status: 500 })
    }
  }

  // Update schedules if provided — delete all existing and re-insert
  if (schedules !== undefined && Array.isArray(schedules)) {
    // Delete existing schedules
    const { error: delError } = await supabase
      .from("court_schedules")
      .delete()
      .eq("court_id", id)

    if (delError) {
      return Response.json({ error: delError.message }, { status: 500 })
    }

    // Insert new schedules
    if (schedules.length > 0) {
      const scheduleRows = schedules.map((s: { day_of_week: number; open_time: string; close_time: string; is_closed: boolean }) => ({
        court_id: id,
        day_of_week: s.day_of_week,
        open_time: s.open_time,
        close_time: s.close_time,
        is_closed: s.is_closed,
      }))

      const { error: insError } = await supabase
        .from("court_schedules")
        .insert(scheduleRows)

      if (insError) {
        return Response.json({ error: insError.message }, { status: 500 })
      }
    }
  }

  // Return the updated court with schedules
  const { data, error: fetchError } = await supabase
    .from("courts")
    .select("*, court_schedules(*)")
    .eq("id", id)
    .single()

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 })
  }

  return Response.json(data)
}

// DELETE /api/courts/[id] — archive a court if it has reservations, hard-delete otherwise
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const hasPermission = await checkPermission("courts.delete")
  if (!hasPermission) return forbiddenResponse()

  const { id } = await params
  const supabase = await createClient()

  // Check if any reservations reference this court
  const { count } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("court_id", id)

  if (count && count > 0) {
    // Soft delete — preserve reservation history
    const { error } = await supabase
      .from("courts")
      .update({ archived: true })
      .eq("id", id)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ message: "Court archived", archived: true })
  }

  // No reservations — safe to hard delete
  const { error } = await supabase.from("courts").delete().eq("id", id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ message: "Court deleted", archived: false })
}
