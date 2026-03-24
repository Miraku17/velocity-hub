import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/supabase/auth"

export async function GET(request: Request) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const supabase = await createClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return Response.json({ error: "Admin access required" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const table = searchParams.get("table")
  const action = searchParams.get("action")
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 200)

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (table) query = query.eq("table_name", table)
  if (action) query = query.eq("action", action)

  const { data, error } = await query

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
