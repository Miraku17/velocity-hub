import { createClient } from "@/lib/supabase/server"

export async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null
  return user
}

export async function checkPermission(permissionName: string): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("has_permission", {
    permission_name: permissionName,
  })

  if (error) return false
  return data === true
}

export function unauthorizedResponse(message = "Unauthorized") {
  return Response.json({ error: message }, { status: 401 })
}

export function forbiddenResponse(message = "Insufficient permissions") {
  return Response.json({ error: message }, { status: 403 })
}
