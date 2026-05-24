export interface SelectedSlot {
  court_id: string
  court_name: string
  hour: number
}

export interface DateBlock {
  id: string                 // local uuid for React keys
  date: string               // "YYYY-MM-DD"
  selectedSlots: SelectedSlot[]
}

export interface GridAvailData {
  courts: {
    id: string
    name: string
    court_type: "indoor" | "outdoor"
    price_per_hour: number
    schedule: {
      open_time: string
      close_time: string
      is_closed: boolean
      hourly_rates: Record<string, number> | null
    } | null
  }[]
  time_range: { earliest_open: number; latest_close: number }
  slots: Record<string, Record<string, "open" | "booked" | "pending" | "blocked">>
}
