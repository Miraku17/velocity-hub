import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from "@/lib/supabase/auth"

// POST /api/upload — upload a file to Supabase Storage
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const folder = (formData.get("folder") as string) || "photos"

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  if (!allowedTypes.includes(file.type)) {
    return Response.json(
      { error: "File must be JPEG, PNG, WebP, or GIF" },
      { status: 400 }
    )
  }

  // 5MB limit
  if (file.size > 5 * 1024 * 1024) {
    return Response.json(
      { error: "File must be under 5MB" },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Generate unique filename
  const ext = file.name.split(".").pop() || "jpg"
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { data, error } = await supabase.storage
    .from("venue")
    .upload(fileName, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("venue")
    .getPublicUrl(data.path)

  return Response.json({ url: urlData.publicUrl, path: data.path }, { status: 201 })
}

// DELETE /api/upload — delete a file from Supabase Storage
export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const { path } = await request.json()
  if (!path) {
    return Response.json({ error: "No path provided" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.storage.from("venue").remove([path])

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
