import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/supabase/auth"

// GET /api/time-clock — fetch time entries (admin: all, employee: own)
export async function GET(request: Request) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") // optional: YYYY-MM-DD

  // Check if admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const isAdmin = profile?.role === "admin"

  let query = supabase
    .from("time_entries_view")
    .select("*")
    .order("clock_in", { ascending: false })

  // Employee can only see own entries
  if (!isAdmin) {
    query = query.eq("user_id", user.id)
  }

  // Filter by date if provided
  if (date) {
    query = query.eq("entry_date", date)
  }

  const { data, error } = await query.limit(50)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

// POST /api/time-clock — clock in or out
export async function POST(request: Request) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const supabase = await createClient()
  const body = await request.json()
  const { action, notes } = body as { action: "clock-in" | "clock-out"; notes?: string }

  if (action === "clock-in") {
    const { data, error } = await supabase.rpc("clock_in", {
      p_notes: notes || null,
    })

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ id: data, action: "clock-in" })
  }

  if (action === "clock-out") {
    const { data, error } = await supabase.rpc("clock_out", {
      p_notes: notes || null,
    })

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ id: data, action: "clock-out" })
  }

  return Response.json({ error: "Invalid action" }, { status: 400 })
}
