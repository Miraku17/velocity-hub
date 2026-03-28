import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from "@/lib/supabase/auth"

// GET /api/manual-entries — list entries, optionally filtered by date range
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const supabase = await createClient()
  const params = request.nextUrl.searchParams

  const date = params.get("date")
  const dateFrom = params.get("date_from")
  const dateTo = params.get("date_to")

  let query = supabase
    .from("manual_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (date) query = query.eq("entry_date", date)
  if (dateFrom) query = query.gte("entry_date", dateFrom)
  if (dateTo) query = query.lte("entry_date", dateTo)

  const { data, error } = await query

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

// POST /api/manual-entries — create a new entry
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const supabase = await createClient()
  const body = await request.json()

  const { entry_date, amount, description, notes, court_id, start_time, end_time } = body

  if (!entry_date || !description) {
    return Response.json(
      { error: "entry_date and description are required" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("manual_entries")
    .insert({
      entry_date,
      amount: amount ?? null,
      description,
      notes: notes ?? null,
      court_id: court_id ?? null,
      start_time: start_time ?? null,
      end_time: end_time ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data, { status: 201 })
}

// PATCH /api/manual-entries — update an entry
export async function PATCH(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const supabase = await createClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("manual_entries")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

// DELETE /api/manual-entries?id=... — delete an entry
export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const supabase = await createClient()
  const id = request.nextUrl.searchParams.get("id")

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 })
  }

  const { error } = await supabase
    .from("manual_entries")
    .delete()
    .eq("id", id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
