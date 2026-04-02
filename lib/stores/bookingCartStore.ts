import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export interface CartItem {
  court_id: string
  court_name: string
  court_type: "indoor" | "outdoor"
  date: string      // "YYYY-MM-DD"
  start_time: string // "HH:00" 24h format, e.g. "07:00"
  end_time: string   // "HH:00" 24h format, e.g. "08:00"
  price: number      // hourly rate for this slot
}

interface CustomerInfo {
  name: string
  email: string
  phone: string
}

interface BookingCartState {
  items: CartItem[]
  customer: CustomerInfo
  step: number

  // Actions
  addItem: (item: CartItem) => void
  removeItem: (court_id: string, start_time: string) => void
  toggleItem: (item: CartItem) => void
  clearCart: () => void
  setCustomer: (info: Partial<CustomerInfo>) => void
  setStep: (step: number) => void
}

function itemKey(court_id: string, start_time: string) {
  return `${court_id}:${start_time}`
}

export const useBookingCart = create<BookingCartState>()(
  persist(
    (set, get) => ({
      items: [],
      customer: { name: "", email: "", phone: "" },
      step: 1,

      addItem: (item) =>
        set((state) => {
          const exists = state.items.some(
            (i) => i.court_id === item.court_id && i.start_time === item.start_time
          )
          if (exists) return state
          return { items: [...state.items, item] }
        }),

      removeItem: (court_id, start_time) =>
        set((state) => ({
          items: state.items.filter(
            (i) => itemKey(i.court_id, i.start_time) !== itemKey(court_id, start_time)
          ),
        })),

      toggleItem: (item) => {
        const state = get()
        const exists = state.items.some(
          (i) => i.court_id === item.court_id && i.start_time === item.start_time
        )
        if (exists) {
          state.removeItem(item.court_id, item.start_time)
        } else {
          state.addItem(item)
        }
      },

      clearCart: () => set({ items: [] }),

      setCustomer: (info) =>
        set((state) => ({
          customer: { ...state.customer, ...info },
        })),

      setStep: (step) => set({ step }),
    }),
    {
      name: "velocity-booking-cart",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)

// Derived helpers (non-reactive, call inside components)
export function getTotalAmount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}

export function getItemCount(items: CartItem[]): number {
  return items.length
}

/** Group items by court_id, merging contiguous hours into time ranges */
export function groupItemsByCourt(items: CartItem[]): {
  court_id: string
  court_name: string
  court_type: "indoor" | "outdoor"
  date: string
  ranges: { start_time: string; end_time: string; total: number }[]
  subtotal: number
}[] {
  const grouped = new Map<
    string,
    { court_id: string; court_name: string; court_type: "indoor" | "outdoor"; date: string; items: CartItem[] }
  >()

  for (const item of items) {
    const key = item.court_id
    if (!grouped.has(key)) {
      grouped.set(key, {
        court_id: item.court_id,
        court_name: item.court_name,
        court_type: item.court_type,
        date: item.date,
        items: [],
      })
    }
    grouped.get(key)!.items.push(item)
  }

  return Array.from(grouped.values()).map((group) => {
    // Sort items by start hour
    const sorted = [...group.items].sort((a, b) => {
      const aH = parseInt(a.start_time.split(":")[0], 10)
      const bH = parseInt(b.start_time.split(":")[0], 10)
      return aH - bH
    })

    // Merge contiguous hours into ranges
    const ranges: { start_time: string; end_time: string; total: number }[] = []
    let rangeStart = sorted[0].start_time
    let rangeEnd = sorted[0].end_time
    let rangeTotal = sorted[0].price

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start_time === rangeEnd) {
        // Contiguous — extend range
        rangeEnd = sorted[i].end_time
        rangeTotal += sorted[i].price
      } else {
        // Gap — push previous range and start new one
        ranges.push({ start_time: rangeStart, end_time: rangeEnd, total: rangeTotal })
        rangeStart = sorted[i].start_time
        rangeEnd = sorted[i].end_time
        rangeTotal = sorted[i].price
      }
    }
    ranges.push({ start_time: rangeStart, end_time: rangeEnd, total: rangeTotal })

    return {
      ...group,
      ranges,
      subtotal: group.items.reduce((sum, i) => sum + i.price, 0),
    }
  })
}

/** Build the API payload for multi-court booking submission */
export function buildBookingPayload(items: CartItem[]) {
  const groups = groupItemsByCourt(items)
  return groups.map((g) => ({
    court_id: g.court_id,
    time_blocks: g.ranges.map((r) => ({
      start_time: r.start_time + ":00",
      end_time: r.end_time + ":00",
    })),
  }))
}
