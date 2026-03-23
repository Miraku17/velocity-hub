import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

/* ── Types ── */

export interface TimeEntry {
  id: string
  user_id: string
  employee_name: string
  employee_role: string
  clock_in: string
  clock_out: string | null
  notes: string | null
  entry_date: string
  duration_hours: number
  is_active: boolean
  created_at: string
}

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: "admin" | "employee"
  permissions: {
    time_clock_manage: boolean
  }
}

/* ── Fetch helpers ── */

async function fetchMe(): Promise<UserProfile> {
  const res = await fetch("/api/me")
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to fetch user")
  }
  return res.json()
}

async function fetchTimeEntries(date?: string): Promise<TimeEntry[]> {
  const url = new URL("/api/time-clock", window.location.origin)
  if (date) url.searchParams.set("date", date)

  const res = await fetch(url)
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to fetch time entries")
  }
  return res.json()
}

async function clockIn(notes?: string): Promise<{ id: string; action: string }> {
  const res = await fetch("/api/time-clock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "clock-in", notes }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to clock in")
  }
  return res.json()
}

async function clockOut(notes?: string): Promise<{ id: string; action: string }> {
  const res = await fetch("/api/time-clock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "clock-out", notes }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to clock out")
  }
  return res.json()
}

/* ── Hooks ── */

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  })
}

export function useTimeEntries(date?: string) {
  return useQuery({
    queryKey: ["time-entries", date],
    queryFn: () => fetchTimeEntries(date),
  })
}

export function useClockIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notes?: string) => clockIn(notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] })
    },
  })
}

export function useClockOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notes?: string) => clockOut(notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] })
    },
  })
}
