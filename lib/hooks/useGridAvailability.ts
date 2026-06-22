import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import type { GridAvailabilityResponse } from "@/app/api/grid-availability/route"
import { formatLocalDate } from "@/app/booking/utils"
import { readErrorMessage } from "@/lib/apiError"

// Availability rarely changes minute-to-minute, and the booking flow always
// re-checks the live grid (staleTime: 0) right before confirming — and the DB's
// unique-slot constraint is the real guard against double-booking. So a longer
// client cache here is safe and avoids refetch flicker when navigating dates.
const STALE_TIME = 2 * 60_000

async function fetchGridAvailability(date: string): Promise<GridAvailabilityResponse> {
  const res = await fetch(`/api/grid-availability?date=${date}`)
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to fetch grid availability"))
  }
  return res.json()
}

function gridQueryOptions(date: string) {
  return {
    queryKey: ["grid-availability", date] as const,
    queryFn: () => fetchGridAvailability(date),
    staleTime: STALE_TIME,
    enabled: !!date,
  }
}

export function useGridAvailability(date: string) {
  return useQuery(gridQueryOptions(date))
}

/**
 * Warm the React Query cache for the previous and next day so the prev/next
 * date arrows render instantly instead of waiting on a fresh round trip.
 */
export function usePrefetchAdjacentDays(date: string) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!date) return
    for (const offset of [-1, 1]) {
      const d = new Date(date + "T00:00:00")
      if (isNaN(d.getTime())) continue
      d.setDate(d.getDate() + offset)
      queryClient.prefetchQuery(gridQueryOptions(formatLocalDate(d)))
    }
  }, [date, queryClient])
}
