import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { readErrorMessage } from "@/lib/apiError"

/* ── Types ── */

export type CourtType = "indoor" | "outdoor"
export type CourtStatus = "available" | "occupied" | "maintenance"

export interface CourtSchedule {
  id: string
  court_id: string
  day_of_week: number // 0=Sunday, 6=Saturday
  open_time: string   // "HH:MM:SS"
  close_time: string  // "HH:MM:SS"
  is_closed: boolean
  hourly_rates: Record<string, number> | null // e.g. {"7": 300, "8": 500} — keys are hour (0-23)
  created_at: string
  updated_at: string
}

export interface ScheduleInput {
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
  hourly_rates?: Record<string, number> | null
}

export interface Court {
  id: string
  name: string
  court_type: CourtType
  status: CourtStatus
  price_per_hour: number
  description: string | null
  archived: boolean
  created_at: string
  updated_at: string
  court_schedules?: CourtSchedule[]
}

export interface CourtInput {
  name: string
  court_type: CourtType
  status?: CourtStatus
  price_per_hour: number
  description?: string | null
  schedules?: ScheduleInput[]
}

export type CourtUpdate = Partial<CourtInput>

/* ── Fetch helpers ── */

async function fetchCourts(params?: {
  type?: CourtType
  status?: CourtStatus
  includeArchived?: boolean
}): Promise<Court[]> {
  const url = new URL("/api/courts", window.location.origin)
  if (params?.type) url.searchParams.set("type", params.type)
  if (params?.status) url.searchParams.set("status", params.status)
  if (params?.includeArchived) url.searchParams.set("includeArchived", "true")

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to fetch courts"))
  }
  return res.json()
}

async function fetchCourt(id: string): Promise<Court> {
  const res = await fetch(`/api/courts/${id}`)
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to fetch court"))
  }
  return res.json()
}

async function createCourt(input: CourtInput): Promise<Court> {
  const res = await fetch("/api/courts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to create court"))
  }
  return res.json()
}

async function updateCourt({
  id,
  ...updates
}: CourtUpdate & { id: string }): Promise<Court> {
  const res = await fetch(`/api/courts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to update court"))
  }
  return res.json()
}

async function deleteCourt(id: string): Promise<{ archived: boolean }> {
  const res = await fetch(`/api/courts/${id}`, { method: "DELETE" })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to delete court"))
  }
  return res.json()
}

async function restoreCourt(id: string): Promise<Court> {
  const res = await fetch(`/api/courts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archived: false }),
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to restore court"))
  }
  return res.json()
}

/* ── Hooks ── */

export function useCourts(params?: { type?: CourtType; status?: CourtStatus; includeArchived?: boolean }) {
  return useQuery({
    queryKey: ["courts", params],
    queryFn: () => fetchCourts(params),
  })
}

export function useCourt(id: string) {
  return useQuery({
    queryKey: ["courts", id],
    queryFn: () => fetchCourt(id),
    enabled: !!id,
  })
}

export function useCreateCourt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCourt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] })
    },
  })
}

export function useUpdateCourt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateCourt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] })
    },
  })
}

export function useDeleteCourt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCourt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] })
    },
  })
}

export function useRestoreCourt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: restoreCourt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] })
    },
  })
}
