import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getAuthenticatedUser,
  checkPermission,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/supabase/auth"

// GET /api/courts — list all courts with schedules (public)
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const type = request.nextUrl.searchParams.get("type")
  const status = request.nextUrl.searchParams.get("status")
  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true"

  let query = supabase
    .from("courts")
    .select("*, court_schedules(*)")
    .order("created_at", { ascending: true })

  if (!includeArchived) query = query.eq("archived", false)
  if (type) query = query.eq("court_type", type)
  if (status) query = query.eq("status", status)

  const { data, error } = await query

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

// POST /api/courts — create a court with schedules (requires courts.create permission)
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const hasPermission = await checkPermission("courts.create")
  if (!hasPermission) return forbiddenResponse()

  const body = await request.json()
  const { name, court_type, price_per_hour, description, status, schedules } = body

  if (!name || !court_type || price_per_hour == null) {
    return Response.json(
      { error: "name, court_type, and price_per_hour are required" },
      { status: 400 }
    )
  }

  if (!["indoor", "outdoor"].includes(court_type)) {
    return Response.json(
      { error: "court_type must be 'indoor' or 'outdoor'" },
      { status: 400 }
    )
  }

  if (typeof price_per_hour !== "number" || price_per_hour < 0) {
    return Response.json(
      { error: "price_per_hour must be a positive number" },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Create the court
  const { data: court, error: courtError } = await supabase
    .from("courts")
    .insert({
      name,
      court_type,
      price_per_hour,
      description: description || null,
      status: status || "available",
    })
    .select()
    .single()

  if (courtError) {
    if (courtError.code === "23505") {
      return Response.json({ error: "A court with this name already exists" }, { status: 409 })
    }
    return Response.json({ error: courtError.message }, { status: 500 })
  }

  // Insert schedules if provided
  if (schedules && Array.isArray(schedules) && schedules.length > 0) {
    const scheduleRows = schedules.map((s: { day_of_week: number; open_time: string; close_time: string; is_closed: boolean }) => ({
      court_id: court.id,
      day_of_week: s.day_of_week,
      open_time: s.open_time,
      close_time: s.close_time,
      is_closed: s.is_closed,
    }))

    const { error: schedError } = await supabase
      .from("court_schedules")
      .insert(scheduleRows)

    if (schedError) {
      // Court was created but schedules failed — clean up
      await supabase.from("courts").delete().eq("id", court.id)
      return Response.json({ error: schedError.message }, { status: 500 })
    }
  }

  // Fetch the court with schedules to return
  const { data: fullCourt } = await supabase
    .from("courts")
    .select("*, court_schedules(*)")
    .eq("id", court.id)
    .single()

  return Response.json(fullCourt, { status: 201 })
}
