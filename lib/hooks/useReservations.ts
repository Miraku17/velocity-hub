import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

/* ── Types ── */

export type ReservationType = "regular" | "walk-in" | "priority"
export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no-show"
export type PaymentStatus = "pending" | "paid" | "refunded"
export type CourtType = "indoor" | "outdoor"

export interface Reservation {
  id: string
  reservation_code: string
  court_id: string
  court_name: string
  court_type: CourtType
  customer_name: string
  customer_email: string
  customer_phone: string
  reservation_date: string
  start_time: string
  end_time: string
  duration_hours: number
  reservation_type: ReservationType
  status: ReservationStatus
  price_per_hour: number
  total_amount: number
  payment_status: PaymentStatus
  notes: string | null
  created_at: string
}

export interface ReservationFilters {
  date?: string
  status?: ReservationStatus
  court_type?: CourtType
  page?: number
  limit?: number
}

export interface PaginatedResponse {
  data: Reservation[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ReservationInput {
  court_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  date: string
  start_time: string
  end_time: string
  reservation_type?: ReservationType
  notes?: string
  turnstile_token?: string
}

export interface ReservationUpdate {
  id: string
  status?: ReservationStatus
  payment_status?: PaymentStatus
  notes?: string
}

/* ── Fetch helpers ── */

async function fetchReservations(filters?: ReservationFilters): Promise<PaginatedResponse> {
  const url = new URL("/api/reservations", window.location.origin)
  if (filters?.date) url.searchParams.set("date", filters.date)
  if (filters?.status) url.searchParams.set("status", filters.status)
  if (filters?.court_type) url.searchParams.set("court_type", filters.court_type)
  if (filters?.page) url.searchParams.set("page", filters.page.toString())
  if (filters?.limit) url.searchParams.set("limit", filters.limit.toString())

  const res = await fetch(url)
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to fetch reservations")
  }
  return res.json()
}

async function createReservation(input: ReservationInput): Promise<{ id: string }> {
  const res = await fetch("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to create reservation")
  }
  return res.json()
}

async function updateReservation(input: ReservationUpdate): Promise<Reservation> {
  const res = await fetch("/api/reservations", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to update reservation")
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] })
    },
  })
}
