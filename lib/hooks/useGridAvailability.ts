import { useQuery } from "@tanstack/react-query"
import type { GridAvailabilityResponse } from "@/app/api/grid-availability/route"

async function fetchGridAvailability(date: string): Promise<GridAvailabilityResponse> {
  const res = await fetch(`/api/grid-availability?date=${date}`)
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to fetch grid availability")
  }
  return res.json()
}

export function useGridAvailability(date: string) {
  return useQuery({
    queryKey: ["grid-availability", date],
    queryFn: () => fetchGridAvailability(date),
    staleTime: 0,
    gcTime: 0,
    enabled: !!date,
  })
}
