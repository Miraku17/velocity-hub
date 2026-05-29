/**
 * Downscale + re-encode an image File on the client before upload.
 *
 * Phone photos are routinely 4–8 MB, which exceeds the serverless request-body
 * limit (~4.5 MB). When that limit is hit the platform returns a non-JSON 413
 * and the booking fails with an opaque error. Shrinking the image here keeps
 * uploads small enough to succeed.
 *
 * Returns a new JPEG File, or the original file if compression isn't needed or
 * fails for any reason (we never want this to block a booking).
 */
const MAX_DIMENSION = 1600 // px — longest edge
const QUALITY = 0.82
const COMPRESS_ABOVE_BYTES = 1.5 * 1024 * 1024 // only bother for files > 1.5 MB

export async function compressImage(file: File): Promise<File> {
  if (typeof document === "undefined") return file
  // Skip non-raster types and animated GIFs (re-encoding would drop frames).
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file
  if (file.size <= COMPRESS_ABOVE_BYTES) return file

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("Failed to decode image"))
      el.src = objectUrl
    })

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
    const width = Math.max(1, Math.round(img.width * scale))
    const height = Math.max(1, Math.round(img.height * scale))

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    )
    // If re-encoding didn't actually help, keep the original.
    if (!blob || blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg"
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified })
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
