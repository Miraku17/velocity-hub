import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

/* ── Types ── */

export interface BlockedSlot {
  id: string
  court_id: string | null
  blocked_date: string
  start_time: string | null
  end_time: string | null
  reason: string
  created_by: string | null
  created_at: string
}

export interface BlockedSlotFilters {
  date?: string
  date_from?: string
  date_to?: string
  court_id?: string
  month?: string // "YYYY-MM"
}

export interface BlockedSlotInput {
  court_id?: string | null
  blocked_date: string
  start_time?: string | null
  end_time?: string | null
  reason?: string
}

/* ── Fetch helpers ── */

async function fetchBlockedSlots(filters?: BlockedSlotFilters): Promise<BlockedSlot[]> {
  const url = new URL("/api/blocked-slots", window.location.origin)
  if (filters?.date) url.searchParams.set("date", filters.date)
  if (filters?.date_from) url.searchParams.set("date_from", filters.date_from)
  if (filters?.date_to) url.searchParams.set("date_to", filters.date_to)
  if (filters?.court_id) url.searchParams.set("court_id", filters.court_id)
  if (filters?.month) {
    const [y, m] = filters.month.split("-").map(Number)
    url.searchParams.set("date_from", `${filters.month}-01`)
    url.searchParams.set("date_to", new Date(y, m, 0).toISOString().slice(0, 10))
  }

  const res = await fetch(url)
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to fetch blocked slots")
  }
  return res.json()
}

async function createBlockedSlot(input: BlockedSlotInput): Promise<BlockedSlot> {
  const res = await fetch("/api/blocked-slots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to create block")
  }
  return res.json()
}

async function deleteBlockedSlot(id: string): Promise<void> {
  const res = await fetch(`/api/blocked-slots?id=${id}`, { method: "DELETE" })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to delete block")
  }
}

/* ── Hooks ── */

export function useBlockedSlots(filters?: BlockedSlotFilters) {
  return useQuery({
    queryKey: ["blocked-slots", filters],
    queryFn: () => fetchBlockedSlots(filters),
  })
}

export function useCreateBlockedSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createBlockedSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-slots"] })
    },
  })
}

export function useDeleteBlockedSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteBlockedSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-slots"] })
    },
  })
}
