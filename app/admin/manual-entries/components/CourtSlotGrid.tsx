"use client"

import { useMemo, Fragment } from "react"
import { useQuery } from "@tanstack/react-query"
import type { SelectedSlot, GridAvailData } from "./types"

function hour24ToLabel(hour: number): string {
  const startH = hour % 24
  const endH = (hour + 1) % 24
  const to12 = (h: number) => (h === 0 ? 12 : h > 12 ? h - 12 : h)
  const period = (h: number) => (h < 12 ? "AM" : "PM")
  const startPeriod = period(startH)
  const endPeriod = period(endH)
  if (startPeriod === endPeriod) {
    return `${to12(startH)}:00 – ${to12(endH)}:00 ${endPeriod}`
  }
  return `${to12(startH)}:00 ${startPeriod} – ${to12(endH)}:00 ${endPeriod}`
}

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

interface Props {
  date: string
  selectedSlots: SelectedSlot[]
  onToggleSlot: (courtId: string, courtName: string, hour: number) => void
}

export function CourtSlotGrid({ date, selectedSlots, onToggleSlot }: Props) {
  const { data: gridData, isLoading: gridLoading } = useQuery<GridAvailData>({
    queryKey: ["grid-availability", date],
    queryFn: async () => {
      const res = await fetch(`/api/grid-availability?date=${date}`)
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
    staleTime: 60_000,
    enabled: !!date,
  })

  const timeRows = useMemo(() => {
    if (!gridData) return []
    const rows: number[] = []
    for (let h = gridData.time_range.earliest_open; h < gridData.time_range.latest_close; h++) {
      rows.push(h % 24)
    }
    return rows
  }, [gridData])

  const openCourts = useMemo(
    () => gridData?.courts.filter((c) => c.schedule && !c.schedule.is_closed) ?? [],
    [gridData]
  )

  const selectedSet = useMemo(() => {
    const set = new Set<string>()
    for (const s of selectedSlots) set.add(`${s.court_id}:${s.hour}`)
    return set
  }, [selectedSlots])

  if (gridLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container py-10">
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="font-body text-xs text-on-surface-variant">Loading availability...</span>
        </div>
      </div>
    )
  }

  if (!gridData || openCourts.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container py-10">
        <p className="font-body text-xs text-on-surface-variant">No courts available on this day</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-outline-variant/15 overflow-hidden">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 bg-surface-container-low/50 border-b border-outline-variant/10">
        {[
          { cls: "bg-emerald-100 border-emerald-300", label: "Open" },
          { cls: "bg-primary", label: "Selected" },
          { cls: "bg-gray-200 border-gray-300", label: "Booked" },
          { cls: "bg-amber-100 border-amber-300", label: "Pending" },
          { cls: "bg-slate-200 border-slate-300", label: "Blocked" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm border ${item.cls}`} />
            <span className="font-body text-[9px] text-on-surface-variant">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid gap-px min-w-max"
          style={{ gridTemplateColumns: `auto repeat(${openCourts.length}, minmax(72px, 1fr))` }}
        >
          <div className="sticky left-0 z-20 bg-surface-container-lowest flex items-center justify-center px-2 py-2.5 border-b-2 border-outline-variant/15">
            <span className="font-label text-[9px] font-bold uppercase tracking-widest text-outline">Time</span>
          </div>
          {openCourts.map((court) => (
            <div key={court.id} className="flex flex-col items-center justify-center px-1 py-2.5 border-b-2 border-outline-variant/15">
              <span className="font-headline text-xs font-bold text-on-surface leading-tight">{court.name}</span>
              <span className="font-label text-[8px] font-medium uppercase tracking-wider text-on-surface-variant">
                {court.court_type === "indoor" ? "Covered" : "Outdoor"}
              </span>
            </div>
          ))}

          {timeRows.map((hour) => (
            <Fragment key={`row-${hour}`}>
              <div className="sticky left-0 z-10 bg-surface-container-lowest flex items-center justify-center px-2 py-0.5 border-b border-outline-variant/8">
                <span className="font-body text-[10px] font-semibold text-on-surface-variant whitespace-nowrap">
                  {hour24ToLabel(hour)}
                </span>
              </div>

              {openCourts.map((court) => {
                const slotStatus = gridData.slots[court.id]?.[String(hour)]
                const isClosed = !slotStatus
                const isSelected = selectedSet.has(`${court.id}:${hour}`)
                const isInteractive = slotStatus === "open"
                const price = court.schedule?.hourly_rates?.[String(hour)] ?? court.price_per_hour

                if (isClosed) {
                  return <div key={`${court.id}-${hour}`} className="min-h-[40px] border-b border-outline-variant/8" />
                }

                return (
                  <div key={`${court.id}-${hour}`} className="p-0.5 border-b border-outline-variant/8">
                    <button
                      type="button"
                      onClick={isInteractive ? () => onToggleSlot(court.id, court.name, hour) : undefined}
                      disabled={!isInteractive}
                      className={`
                        w-full min-h-[40px] rounded-md text-center transition-all text-[10px] font-body font-semibold
                        flex flex-col items-center justify-center gap-0.5 px-1 py-1
                        ${isSelected
                          ? "bg-primary text-on-primary ring-2 ring-primary ring-offset-1"
                          : slotStatus === "open"
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 active:scale-[0.96] cursor-pointer"
                            : slotStatus === "booked"
                              ? "bg-gray-100 text-gray-400 cursor-default"
                              : slotStatus === "pending"
                                ? "bg-amber-50 text-amber-600 cursor-default"
                                : "bg-slate-100 text-slate-400 cursor-default"
                        }
                      `}
                    >
                      {isSelected ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>{formatCurrency(price)}</span>
                        </>
                      ) : slotStatus === "open" ? (
                        <span>{formatCurrency(price)}</span>
                      ) : (
                        <span className="uppercase tracking-wider text-[8px]">
                          {slotStatus === "booked" ? "Booked" : slotStatus === "pending" ? "Pending" : "Blocked"}
                        </span>
                      )}
                    </button>
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
