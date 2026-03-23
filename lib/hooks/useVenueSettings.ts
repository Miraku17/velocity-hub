import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

/* ── Types ── */

export interface OperatingHour {
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
}

export interface PaymentQR {
  name: string
  type: string      // "gcash" | "maya" | "bank" | etc
  image_url: string
}

export interface SocialLinks {
  facebook?: string
  instagram?: string
  tiktok?: string
  website?: string
  [key: string]: string | undefined
}

export interface VenueSettings {
  id: string
  name: string
  description: string | null
  address: string | null
  phone: string | null
  email: string | null
  operating_hours: OperatingHour[]
  tags: string[]
  photos: string[]
  payment_qr_codes: PaymentQR[]
  social_links: SocialLinks
  updated_at: string
}

export type VenueSettingsUpdate = Partial<Omit<VenueSettings, "id" | "updated_at">>

/* ── Fetch helpers ── */

async function fetchVenueSettings(): Promise<VenueSettings> {
  const res = await fetch("/api/venue-settings")
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to fetch venue settings")
  }
  return res.json()
}

async function updateVenueSettings(updates: VenueSettingsUpdate): Promise<VenueSettings> {
  const res = await fetch("/api/venue-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || "Failed to update venue settings")
  }
  return res.json()
}

/* ── Hooks ── */

export function useVenueSettings() {
  return useQuery({
    queryKey: ["venue-settings"],
    queryFn: fetchVenueSettings,
  })
}

export function useUpdateVenueSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateVenueSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venue-settings"] })
    },
  })
}
