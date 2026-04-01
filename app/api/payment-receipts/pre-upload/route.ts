import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// POST /api/payment-receipts/pre-upload — upload receipt image to storage before reservation is created
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: "File must be JPEG, PNG, WebP, or GIF" }, { status: 400 })
  }

  // 10MB limit
  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: "File must be under 10MB" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Upload to a pending folder — will be moved/linked when reservation is created
  const ext = file.name.split(".").pop() || "jpg"
  const storagePath = `pending/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from("receipts")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadErr) {
    return Response.json({ error: uploadErr.message }, { status: 500 })
  }

  return Response.json({ storage_path: uploadData.path }, { status: 201 })
}
