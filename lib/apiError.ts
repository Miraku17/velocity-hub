/**
 * Extract a human-readable message from a failed fetch Response.
 *
 * Error bodies aren't guaranteed to be JSON — e.g. a platform-level 413
 * (payload too large) returns a non-JSON body. Calling res.json() on it throws,
 * and on iOS Safari that surfaces as the opaque "The string did not match the
 * expected pattern." Parse defensively and always return readable text.
 */
export async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  if (res.status === 413) {
    return "The upload is too large. Please use a smaller file and try again."
  }
  try {
    const data = await res.json()
    return data?.error || fallback
  } catch {
    return fallback
  }
}
