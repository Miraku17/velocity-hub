import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

/* ── Types ── */

export interface ManualEntry {
  id: string
  entry_date: string
  amount: number | null
  description: string
  notes: string | null
  court_id: string | null
  start_time: string | null
  end_time: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ManualEntryFilters {
  date?: string
  date_from?: string
  date_to?: string
  month?: string // "YYYY-MM"
}

export interface ManualEntryInput {
  entry_date: string
  amount?: number | null
  description: string
  notes?: string | null
  court_id?: string | null
  start_time?: string | null
  end_time?: string | null
}

export interface ManualEntryUpdate {
  id: string
  entry_date?: string
  amount?: number | null
  description?: string
  notes?: string | null
  court_id?: string | null
  start_time?: string | null
  end_time?: string | null
}

/* ── Fetch helpers ── */

async function fetchManualEntries(filters?: ManualEntryFilters): Promise<ManualEntry[]> {
  const url = new URL("/api/manual-entries", window.location.origin)
  if (filters?.date) url.searchParams.set("date", filters.date)
  if (filters?.date_from) url.searchParams.set("date_from", filters.date_from)
  if (filters?.date_to) url.searchParams.set("date_to", filters.date_to)
  if (filters?.month) {
    const [y, m] = filters.month.split("-").map(Number)
    url.searchParams.set("date_from", `${filters.month}-01`)
    url.searchParams.set("date_to", new Date(y, m, 0).toISOString().slice(0, 10))
  }

  const res = await fetch(url)
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to fetch manual entries")
  }
  return res.json()
}

async function createManualEntry(input: ManualEntryInput): Promise<ManualEntry> {
  const res = await fetch("/api/manual-entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to create entry")
  }
  return res.json()
}

async function updateManualEntry(input: ManualEntryUpdate): Promise<ManualEntry> {
  const res = await fetch("/api/manual-entries", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to update entry")
  }
  return res.json()
}

async function deleteManualEntry(id: string): Promise<void> {
  const res = await fetch(`/api/manual-entries?id=${id}`, { method: "DELETE" })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to delete entry")
  }
}

/* ── Hooks ── */

export function useManualEntries(filters?: ManualEntryFilters) {
  return useQuery({
    queryKey: ["manual-entries", filters],
    queryFn: () => fetchManualEntries(filters),
  })
}

export function useCreateManualEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createManualEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-entries"] })
    },
  })
}

export function useUpdateManualEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateManualEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-entries"] })
    },
  })
}

export function useDeleteManualEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteManualEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-entries"] })
    },
  })
}
