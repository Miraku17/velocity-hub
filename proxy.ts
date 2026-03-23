import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"
import { rateLimit } from "@/lib/rate-limit"

// Rate limit config per route (POST/PATCH only)
const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  "/api/reservations": { maxRequests: 10, windowMs: 60_000 },       // 10 per minute
  "/api/payment-receipts": { maxRequests: 5, windowMs: 60_000 },    // 5 per minute
}

export async function proxy(request: NextRequest) {
  // Rate limit public POST/PATCH API routes
  if (
    (request.method === "POST" || request.method === "PATCH") &&
    request.nextUrl.pathname.startsWith("/api/")
  ) {
    const config = RATE_LIMITS[request.nextUrl.pathname]
    if (config) {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        ?? request.headers.get("x-real-ip")
        ?? "unknown"

      const result = rateLimit(ip, request.nextUrl.pathname, config)

      if (result.limited) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(result.retryAfter ?? 60),
            },
          }
        )
      }
    }
  }

  // Admin auth session handling
  if (request.nextUrl.pathname.startsWith("/admin")) {
    return await updateSession(request)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/reservations",
    "/api/payment-receipts",
  ],
}
