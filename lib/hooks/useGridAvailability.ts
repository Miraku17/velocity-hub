import { useQuery } from "@tanstack/react-query"
import type { GridAvailabilityResponse } from "@/app/api/grid-availability/route"
import { readErrorMessage } from "@/lib/apiError"

async function fetchGridAvailability(date: string): Promise<GridAvailabilityResponse> {
  const res = await fetch(`/api/grid-availability?date=${date}`)
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to fetch grid availability"))
  }
  return res.json()
}

export function useGridAvailability(date: string) {
  return useQuery({
    queryKey: ["grid-availability", date],
    queryFn: () => fetchGridAvailability(date),
    staleTime: 60_000,
    enabled: !!date,
  })
}
