import { useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

/* ── Types ── */

export type ReservationType = "regular" | "walk-in" | "priority"
export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no-show"
export type PaymentStatus = "pending" | "paid" | "refunded" | "declined"
export type CourtType = "indoor" | "outdoor"

export interface BookingItem {
  id: string
  court_id: string
  booking_date: string
  start_time: string
  end_time: string
  duration_hours: number
  price_per_hour: number
  total_amount: number
  courts: {
    name: string
    court_type: CourtType
  } | null
}

export interface Booking {
  id: string
  booking_code: string
  customer_name: string
  customer_email: string
  customer_phone: string
  booking_date: string
  reservation_type: ReservationType
  status: ReservationStatus
  payment_status: PaymentStatus
  total_amount: number
  notes: string | null
  created_at: string
  updated_at: string
  booking_items?: BookingItem[]
}

// Backward-compatible alias
export type Reservation = Booking

export interface ReservationFilters {
  date?: string
  week?: string    // "YYYY-Www" — filters by ISO week
  month?: string   // "YYYY-MM" — filters by full calendar month
  status?: ReservationStatus
  payment_status?: PaymentStatus
  court_type?: CourtType
  court_id?: string
  search?: string
  page?: number
  limit?: number
}

export interface PaginatedResponse {
  data: Booking[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ReservationInput {
  customer_name: string
  customer_email: string
  customer_phone: string
  date: string
  turnstile_token?: string
  reservation_type?: ReservationType
  notes?: string
  receipt?: File
  // Legacy single-court fields
  court_id?: string
  start_time?: string
  end_time?: string
  time_blocks?: { start_time: string; end_time: string }[]
  // Multi-court booking
  bookings?: { court_id: string; time_blocks: { start_time: string; end_time: string }[] }[]
}

export interface ReservationUpdate {
  id: string
  status?: ReservationStatus
  payment_status?: PaymentStatus
  notes?: string
}

/* ── Fetch helpers ── */

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

async function fetchReservations(filters?: ReservationFilters): Promise<PaginatedResponse> {
  const url = new URL("/api/reservations", window.location.origin)
  if (filters?.date) url.searchParams.set("date", filters.date)
  if (filters?.week) {
    const [yearStr, weekStr] = filters.week.split("-W")
    const year = Number(yearStr)
    const week = Number(weekStr)
    const jan4 = new Date(year, 0, 4)
    const dayOfWeek = jan4.getDay() || 7
    const monday = new Date(jan4)
    monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    url.searchParams.set("date_from", formatLocalDate(monday))
    url.searchParams.set("date_to", formatLocalDate(sunday))
  }
  if (filters?.month) {
    const [y, m] = filters.month.split("-").map(Number)
    const firstDay = `${filters.month}-01`
    const lastDayDate = new Date(y, m, 0)
    const lastDay = `${y}-${String(m).padStart(2, "0")}-${String(lastDayDate.getDate()).padStart(2, "0")}`
    url.searchParams.set("date_from", firstDay)
    url.searchParams.set("date_to", lastDay)
  }
  if (filters?.status) url.searchParams.set("status", filters.status)
  if (filters?.payment_status) url.searchParams.set("payment_status", filters.payment_status)
  if (filters?.court_type) url.searchParams.set("court_type", filters.court_type)
  if (filters?.court_id) url.searchParams.set("court_id", filters.court_id)
  if (filters?.search) url.searchParams.set("search", filters.search)
  if (filters?.page) url.searchParams.set("page", filters.page.toString())
  if (filters?.limit) url.searchParams.set("limit", filters.limit.toString())

  const res = await fetch(url)
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to fetch bookings")
  }
  return res.json()
}

async function createReservation(input: ReservationInput): Promise<{ id: string; booking_code?: string }> {
  const { receipt, ...fields } = input

  if (receipt) {
    const formData = new FormData()
    formData.append("data", JSON.stringify(fields))
    formData.append("receipt", receipt)
    const res = await fetch("/api/reservations", { method: "POST", body: formData })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to create booking")
    }
    return res.json()
  }

  const res = await fetch("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to create booking")
  }
  return res.json()
}

async function updateReservation(input: ReservationUpdate): Promise<Booking> {
  const res = await fetch("/api/reservations", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to update booking")
  }
  return res.json()
}

/* ── Hooks ── */

export function useReservations(filters?: ReservationFilters) {
  return useQuery({
    queryKey: ["reservations", filters],
    queryFn: () => fetchReservations(filters),
  })
}

export function useCreateReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] })
    },
  })
}

export function useUpdateReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateReservation,
    onSuccess: (updated) => {
      queryClient.setQueriesData<PaginatedResponse>(
        { queryKey: ["reservations"] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.map((r) =>
              r.id === updated.id
                ? { ...r, status: updated.status, payment_status: updated.payment_status, notes: updated.notes }
                : r
            ),
          }
        }
      )
      queryClient.invalidateQueries({ queryKey: ["reservations"] })
    },
  })
}

/**
 * Subscribe to Supabase Realtime on the `bookings` table.
 * Any INSERT, UPDATE, or DELETE will invalidate the TanStack Query cache.
 */
export function useReservationsRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("bookings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["reservations"] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
