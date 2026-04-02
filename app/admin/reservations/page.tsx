"use client"

import { useState, useEffect, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  useReservations,
  useReservationsRealtime,
  useCreateReservation,
  useUpdateReservation,
  type ReservationStatus,
  type CourtType,
  type Reservation,
  type BookingItem,
} from "@/lib/hooks/useReservations"
import { useCourts, type Court } from "@/lib/hooks/useCourts"
import { Button } from "@/components/ui/button"
import { Portal } from "@/components/ui/portal"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LoadingPage } from "@/components/ui/loading"
import { useMe } from "@/lib/hooks/useTimeClock"

/* ── Helpers ── */

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(time: string) {
  const [h, m] = time.split(":")
  const hour = parseInt(h, 10) % 24
  const ampm = hour >= 12 ? "PM" : "AM"
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12.toString().padStart(2, "0")}:${m} ${ampm}`
}

function formatTimeSlot(start: string, end: string) {
  return `${formatTime(start)} - ${formatTime(end)}`
}

function getStatusLabel(status: ReservationStatus) {
  const map: Record<ReservationStatus, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    completed: "Completed",
    "no-show": "No Show",
  }
  return map[status]
}

function getTypeLabel(type: string) {
  const map: Record<string, string> = {
    regular: "Regular Booking",
    "walk-in": "Walk-in",
    priority: "Priority Club",
  }
  return map[type] || type
}

function getAvatarStyle(res: Reservation) {
  if (res.status === "cancelled") {
    return { bg: "bg-surface-container-high", text: "text-on-surface-variant" }
  }
  if (res.reservation_type === "priority") {
    return { bg: "bg-[#F0B4E5]/30", text: "text-[#6B3B65]" }
  }
  if (res.reservation_type === "walk-in") {
    return { bg: "bg-surface-container-high", text: "text-on-surface-variant" }
  }
  return { bg: "bg-primary-fixed-dim/40", text: "text-primary" }
}

const PAGE_SIZE = 10

/* ── Time slot helpers ── */

function generateTimeSlots() {
  const slots: string[] = []
  for (let h = 6; h <= 22; h++) {
    slots.push(`${h.toString().padStart(2, "0")}:00:00`)
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

function formatSlotLabel(slot: string) {
  const [h] = slot.split(":")
  const hour = parseInt(h, 10) % 24
  const ampm = hour >= 12 ? "PM" : "AM"
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12}:00 ${ampm}`
}

/* ── Walk-in Modal ── */

function WalkInModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { data: courts, isLoading: courtsLoading } = useCourts({ status: "available" })
  const createMutation = useCreateReservation()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [courtId, setCourtId] = useState("")
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0])
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName("")
      setEmail("")
      setPhone("")
      setCourtId("")
      setDate(new Date().toISOString().split("T")[0])
      setStartTime("")
      setEndTime("")
      setNotes("")
      setError(null)
      createMutation.reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !createMutation.isPending) onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onClose, createMutation.isPending])

  // Filter end time slots to be after start time
  const endTimeSlots = startTime
    ? TIME_SLOTS.filter((s) => s > startTime)
    : []

  // Selected court info
  const selectedCourt = courts?.find((c: Court) => c.id === courtId)

  // Calculate estimated total
  const estimatedTotal =
    selectedCourt && startTime && endTime
      ? (() => {
          const [sh] = startTime.split(":").map(Number)
          const [eh] = endTime.split(":").map(Number)
          return selectedCourt.price_per_hour * (eh - sh)
        })()
      : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name || !email || !phone || !courtId || !date || !startTime || !endTime) {
      setError("Please fill in all required fields.")
      return
    }

    try {
      await createMutation.mutateAsync({
        court_id: courtId,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        date,
        start_time: startTime,
        end_time: endTime,
        reservation_type: "walk-in",
        notes: notes || undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create reservation")
    }
  }

  if (!open) return null

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
        onClick={() => !createMutation.isPending && onClose()}
      />
      <div
        className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-[5vh]"
        onClick={() => !createMutation.isPending && onClose()}
      >
        <form
          onSubmit={handleSubmit}
          className="relative w-full max-w-lg rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline-variant/15 px-6 py-5">
            <div>
              <h3 className="font-headline text-lg font-semibold text-on-surface">
                Add Walk-in Reservation
              </h3>
              <p className="mt-0.5 font-body text-xs text-on-surface-variant">
                Register a walk-in customer for immediate booking
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="space-y-5 px-6 py-5">
            {/* Customer Info */}
            <div>
              <p className="mb-3 font-label text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">
                Customer Information
              </p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block font-label text-[11px] font-medium text-on-surface-variant">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Juan Dela Cruz"
                    className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2.5 font-body text-sm text-on-surface placeholder:text-outline outline-none transition-colors focus:border-primary"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-label text-[11px] font-medium text-on-surface-variant">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2.5 font-body text-sm text-on-surface placeholder:text-outline outline-none transition-colors focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-label text-[11px] font-medium text-on-surface-variant">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09XX XXX XXXX"
                      className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2.5 font-body text-sm text-on-surface placeholder:text-outline outline-none transition-colors focus:border-primary"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Court & Schedule */}
            <div>
              <p className="mb-3 font-label text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">
                Court & Schedule
              </p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block font-label text-[11px] font-medium text-on-surface-variant">
                    Court *
                  </label>
                  <Select value={courtId} onValueChange={(val) => setCourtId(val ?? "")}>
                    <SelectTrigger className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low font-body text-sm text-on-surface">
                      <SelectValue placeholder={courtsLoading ? "Loading courts..." : "Select a court"}>
                        {selectedCourt
                          ? `${selectedCourt.name} — ${selectedCourt.court_type} (₱${selectedCourt.price_per_hour}/hr)`
                          : courtsLoading
                          ? "Loading courts..."
                          : "Select a court"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Available Courts</SelectLabel>
                        {courts?.map((court: Court) => (
                          <SelectItem key={court.id} value={court.id}>
                            {court.name} — {court.court_type} (₱{court.price_per_hour}/hr)
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block font-label text-[11px] font-medium text-on-surface-variant">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2.5 font-body text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-label text-[11px] font-medium text-on-surface-variant">
                      Start Time *
                    </label>
                    <Select
                      value={startTime}
                      onValueChange={(val) => {
                        setStartTime(val ?? "")
                        setEndTime("")
                      }}
                    >
                      <SelectTrigger className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low font-body text-sm text-on-surface">
                        <SelectValue placeholder="Start" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Start Time</SelectLabel>
                          {TIME_SLOTS.slice(0, -1).map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              {formatSlotLabel(slot)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block font-label text-[11px] font-medium text-on-surface-variant">
                      End Time *
                    </label>
                    <Select
                      value={endTime}
                      onValueChange={(val) => setEndTime(val ?? "")}
                      disabled={!startTime}
                    >
                      <SelectTrigger className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low font-body text-sm text-on-surface disabled:opacity-50">
                        <SelectValue placeholder="End" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>End Time</SelectLabel>
                          {endTimeSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              {formatSlotLabel(slot)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-label text-[11px] font-medium text-on-surface-variant">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes..."
                    className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2.5 font-body text-sm text-on-surface placeholder:text-outline outline-none transition-colors focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Estimated Total */}
            {estimatedTotal !== null && (
              <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
                <span className="font-label text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
                  Estimated Total
                </span>
                <span className="font-headline text-xl font-bold text-primary">
                  ₱{estimatedTotal.toFixed(2)}
                </span>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="rounded-lg bg-error/5 px-4 py-2.5 font-body text-xs text-error">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-outline-variant/15 px-6 py-4">
            <Button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="flex-1 rounded-lg border border-outline-variant/30 bg-transparent px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-primary transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-60"
            >
              {createMutation.isPending ? "Creating..." : "Add Walk-in"}
            </Button>
          </div>
        </form>
      </div>
    </Portal>
  )
}

/* ── Reservation Detail Modal ── */

function ReservationDetailModal({
  reservation,
  onClose,
  onStatusChange,
  onCancelConfirmed,
  onPaymentChange,
  isPending,
  canUpdate,
}: {
  reservation: Reservation | null
  onClose: () => void
  onStatusChange: (id: string, status: ReservationStatus) => void
  onCancelConfirmed: (id: string) => void
  onPaymentChange: (id: string, status: "paid" | "refunded") => void
  isPending: boolean
  canUpdate: boolean
}) {
  const stableOnClose = useCallback(onClose, [onClose])

  useEffect(() => {
    if (!reservation) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") stableOnClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [reservation, stableOnClose])

  // Fetch receipts for this booking
  const bookingId = reservation?.id ?? ""
  const { data: receipts, isLoading: receiptsLoading } = useQuery<{ id: string; image_url: string; created_at: string }[]>({
    queryKey: ["payment-receipts", bookingId],
    queryFn: async () => {
      const res = await fetch(`/api/payment-receipts?booking_id=${bookingId}`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!reservation,
  })

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  if (!reservation) return null

  const res = reservation
  const avatar = getAvatarStyle(res)
  const isCancelled = res.status === "cancelled"

  const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-[#F59E0B]/10", text: "text-[#D97706]", label: "Pending" },
    confirmed: { bg: "bg-[#2563EB]/10", text: "text-[#2563EB]", label: "Confirmed" },
    completed: { bg: "bg-primary/10", text: "text-primary", label: "Completed" },
    cancelled: { bg: "bg-error/10", text: "text-error", label: "Cancelled" },
    "no-show": { bg: "bg-[#7C3AED]/10", text: "text-[#7C3AED]", label: "No Show" },
  }

  const paymentBadge: Record<string, { bg: string; text: string; label: string }> = {
    paid: { bg: "bg-[#16A34A]/10", text: "text-[#16A34A]", label: "Paid" },
    pending: { bg: "bg-[#F59E0B]/10", text: "text-[#D97706]", label: "Pending" },
    refunded: { bg: "bg-error/10", text: "text-error", label: "Refunded" },
    declined: { bg: "bg-error/10", text: "text-error", label: "Declined" },
  }

  const sb = statusBadge[res.status] ?? statusBadge.confirmed
  const pb = paymentBadge[res.payment_status] ?? paymentBadge.pending

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant/15 bg-surface-container-lowest px-6 py-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-nav text-sm font-bold ${avatar.bg} ${avatar.text}`}>
                {getInitials(res.customer_name)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-headline text-base font-semibold text-on-surface">
                    {res.customer_name}
                  </h3>
                  <span className={`rounded-full px-2.5 py-0.5 font-label text-[10px] font-bold uppercase tracking-widest ${sb.bg} ${sb.text}`}>
                    {sb.label}
                  </span>
                </div>
                <p className="truncate font-mono text-xs text-on-surface-variant">
                  #{res.booking_code} &middot; {res.customer_email} &middot; {res.customer_phone}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">

            {/* Left Column - Booking Details (spans 1 col, 2 rows) */}
            <div className="md:row-span-2 rounded-lg bg-surface-container-low p-4">
              <p className="mb-3 font-label text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">
                Booking Details
              </p>
              <div className="space-y-3">
                <div>
                  <span className="font-body text-[10px] text-on-surface-variant">Type</span>
                  <p className="font-nav text-sm font-semibold text-on-surface">{getTypeLabel(res.reservation_type)}</p>
                </div>
                <div>
                  <span className="font-body text-[10px] text-on-surface-variant">Court(s)</span>
                  {(res.booking_items ?? []).map((item: BookingItem) => (
                    <p key={item.id} className="font-nav text-sm font-semibold text-on-surface">
                      {item.courts?.name ?? "Court"} <span className="font-normal text-xs text-on-surface-variant capitalize">({item.courts?.court_type ?? ""})</span>
                    </p>
                  ))}
                </div>
                <div>
                  <span className="font-body text-[10px] text-on-surface-variant">Date</span>
                  <p className="font-nav text-sm font-semibold text-on-surface">{formatDate(res.booking_date)}</p>
                </div>
                <div>
                  <span className="font-body text-[10px] text-on-surface-variant">Time</span>
                  {(res.booking_items ?? []).length > 1 ? (
                    <div className="mt-0.5 flex flex-col gap-1">
                      {(res.booking_items ?? []).map((item: BookingItem, i: number) => (
                        <div key={item.id} className="flex items-center gap-1.5">
                          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 font-label text-[9px] font-bold text-primary">
                            {i + 1}
                          </span>
                          <p className="font-nav text-sm font-semibold text-primary">{formatTimeSlot(item.start_time, item.end_time)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-nav text-sm font-semibold text-primary">
                      {res.booking_items?.[0] ? formatTimeSlot(res.booking_items[0].start_time, res.booking_items[0].end_time) : "—"}
                    </p>
                  )}
                </div>
                <div>
                  <span className="font-body text-[10px] text-on-surface-variant">Duration</span>
                  <p className="font-nav text-sm font-semibold text-on-surface">
                    {(res.booking_items ?? []).reduce((sum: number, item: BookingItem) => sum + Number(item.duration_hours), 0)}h
                  </p>
                </div>
                {res.notes && (
                  <div>
                    <span className="font-body text-[10px] text-on-surface-variant">Notes</span>
                    <p className="font-body text-xs text-on-surface mt-0.5">{res.notes}</p>
                  </div>
                )}
                <div className="pt-2 border-t border-outline-variant/15">
                  <span className="font-body text-[10px] text-on-surface-variant">Booked</span>
                  <p className="font-body text-xs text-on-surface-variant">
                    {new Date(res.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Middle Column - Receipt */}
            <div className="rounded-lg border border-outline-variant/20 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-headline text-xs font-bold text-on-surface">Velocity Pickleball Hub</p>
                  <p className="font-body text-[9px] text-on-surface-variant">Official Receipt</p>
                </div>
                <p className="font-mono text-[9px] text-on-surface-variant">#{res.booking_code}</p>
              </div>

              <div className="border-t border-dashed border-outline-variant/30 pt-2.5 space-y-1.5">
                {(res.booking_items ?? []).map((item: BookingItem, i: number) => {
                  const courtName = item.courts?.name ?? "Court"
                  return (
                    <div key={item.id}>
                      <div className="flex justify-between font-body text-xs">
                        <span className="text-on-surface-variant">{courtName}</span>
                      </div>
                      <div className="flex justify-between font-body text-xs">
                        <span className="text-on-surface-variant">{(res.booking_items?.length ?? 0) > 1 ? `Slot ${i + 1} ` : ""}({formatTimeSlot(item.start_time, item.end_time)})</span>
                        <span className="text-on-surface">₱{Number(item.total_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-outline-variant/30 mt-2.5 pt-2.5 flex justify-between items-center">
                <span className="font-headline text-sm font-bold text-on-surface">Total</span>
                <span className={`font-headline text-lg font-bold ${isCancelled ? "text-outline line-through" : "text-primary"}`}>
                  ₱{Number(res.total_amount).toFixed(2)}
                </span>
              </div>

              <div className="mt-2.5">
                <span className={`rounded-full px-2.5 py-0.5 font-label text-[10px] font-bold uppercase tracking-widest ${pb.bg} ${pb.text}`}>
                  {pb.label}
                </span>
              </div>
            </div>

            {/* Right Column - Actions */}
            <div className="rounded-lg bg-surface-container-low p-4">
              <p className="mb-3 font-label text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">
                Actions
              </p>
              <div className="space-y-2">
                {canUpdate && res.status === "pending" && (
                  <>
                    <Button
                      onClick={() => { onClose(); onStatusChange(res.id, "confirmed") }}
                      disabled={isPending}
                      className="w-full rounded-lg bg-primary px-3 py-2 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-primary transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-60"
                    >
                      Confirm Booking
                    </Button>
                    <Button
                      onClick={() => { onClose(); onStatusChange(res.id, "cancelled") }}
                      disabled={isPending}
                      className="w-full rounded-lg border border-error/30 bg-transparent px-3 py-2 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-error transition-colors hover:bg-error/5 disabled:opacity-60"
                    >
                      Decline
                    </Button>
                  </>
                )}
                {canUpdate && res.status === "confirmed" && (
                  <>
                    <Button
                      onClick={() => { onClose(); onStatusChange(res.id, "completed") }}
                      disabled={isPending}
                      className="w-full rounded-lg bg-primary px-3 py-2 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-primary transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-60"
                    >
                      Mark Completed
                    </Button>
                    <Button
                      onClick={() => { onClose(); onStatusChange(res.id, "no-show") }}
                      disabled={isPending}
                      className="w-full rounded-lg border border-outline-variant/30 bg-transparent px-3 py-2 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60"
                    >
                      Mark No Show
                    </Button>
                    <Button
                      onClick={() => { onClose(); onCancelConfirmed(res.id) }}
                      disabled={isPending}
                      className="w-full rounded-lg border border-error/30 bg-transparent px-3 py-2 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-error transition-colors hover:bg-error/5 disabled:opacity-60"
                    >
                      Cancel Booking
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Payment Proof - spans middle and right columns */}
            <div className="md:col-span-2 rounded-lg bg-surface-container-low p-4">
              <p className="mb-3 font-label text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">
                Payment Proof
              </p>
              {receiptsLoading ? (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="aspect-square animate-pulse rounded-lg bg-surface-container" />
                  ))}
                </div>
              ) : receipts && receipts.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {receipts.map((receipt) => (
                    <button
                      key={receipt.id}
                      type="button"
                      onClick={() => setLightboxUrl(receipt.image_url)}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-outline-variant/20 bg-surface-container-lowest transition-all hover:border-primary/30 hover:shadow-md"
                    >
                      <img
                        src={receipt.image_url}
                        alt="Payment proof"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          <line x1="11" y1="8" x2="11" y2="14" />
                          <line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                      </div>
                      <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 font-body text-[9px] text-white">
                        {new Date(receipt.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-outline-variant/30 bg-surface-container-lowest/50 p-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-on-surface-variant/40">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <p className="font-body text-xs text-on-surface-variant/60">No payment proof uploaded by the customer</p>
                </div>
              )}
            </div>

          </div>

          {/* Lightbox */}
          {lightboxUrl && (
            <>
              <div
                className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm"
                onClick={() => setLightboxUrl(null)}
              />
              <div className="fixed inset-0 z-[80] flex items-center justify-center p-8" onClick={() => setLightboxUrl(null)}>
                <div className="relative max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
                  <img
                    src={lightboxUrl}
                    alt="Payment proof"
                    className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
                  />
                  <button
                    onClick={() => setLightboxUrl(null)}
                    className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg text-on-surface transition-colors hover:bg-surface-container"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  )
}

/* ── Confirmation Modal ── */

function ConfirmationModal({
  open,
  title,
  message,
  confirmLabel,
  confirmVariant = "primary",
  onConfirm,
  onCancel,
  isPending,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  confirmVariant?: "primary" | "destructive"
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4" onClick={onCancel}>
        <div
          className="relative w-full max-w-sm rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 pt-6 pb-2">
            <h3 className="font-headline text-base font-bold text-on-surface">{title}</h3>
            <p className="mt-2 font-body text-sm text-on-surface-variant">{message}</p>
          </div>
          <div className="flex gap-3 px-6 py-4">
            <button
              onClick={onCancel}
              disabled={isPending}
              className="flex-1 rounded-lg border border-outline-variant/30 bg-transparent px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className={`flex-1 rounded-lg px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] transition-colors disabled:opacity-60 ${
                confirmVariant === "destructive"
                  ? "bg-error text-white hover:bg-error/80"
                  : "bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container"
              }`}
            >
              {isPending ? "Updating…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

/* ── Component ── */

export default function ReservationsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [courtFilter, setCourtFilter] = useState("")
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 })
  const [walkInModalOpen, setWalkInModalOpen] = useState(false)
  const [detailReservation, setDetailReservation] = useState<Reservation | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    title: string
    message: string
    confirmLabel: string
    confirmVariant: "primary" | "destructive"
    onConfirm: () => void
  } | null>(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: filterCourts = [] } = useCourts()

  const filters = {
    date: dateFilter || undefined,
    status: (statusFilter || undefined) as ReservationStatus | undefined,
    court_id: courtFilter || undefined,
    search: searchQuery || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
  }

  const { data: result, isLoading } = useReservations(filters)
  useReservationsRealtime()
  const updateMutation = useUpdateReservation()
  const { data: me } = useMe()
  const canCreateBooking = me?.permissions.bookings_create ?? false
  const canUpdateBooking = me?.permissions.bookings_update ?? false

  const reservations = result?.data ?? []
  const pagination = result?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 }

  const confirmMessages: Record<string, { title: string; message: string; label: string; variant: "primary" | "destructive" }> = {
    confirmed: { title: "Confirm Booking", message: "Are you sure you want to confirm this booking? The payment status will be set to paid.", label: "Confirm", variant: "primary" },
    cancelled: { title: "Decline Booking", message: "Are you sure you want to decline this booking? The payment status will be set to declined.", label: "Decline", variant: "destructive" },
    cancel_confirmed: { title: "Cancel Booking", message: "Are you sure you want to cancel this booking? The payment status will be set to declined.", label: "Cancel", variant: "destructive" },
    completed: { title: "Complete Booking", message: "Are you sure you want to mark this booking as completed?", label: "Complete", variant: "primary" },
    "no-show": { title: "Mark No Show", message: "Are you sure you want to mark this booking as no-show?", label: "Mark No Show", variant: "destructive" },
    paid: { title: "Mark as Paid", message: "Are you sure you want to mark this payment as paid?", label: "Mark Paid", variant: "primary" },
    refunded: { title: "Refund Payment", message: "Are you sure you want to refund this payment?", label: "Refund", variant: "destructive" },
  }

  function handleStatusChange(id: string, status: ReservationStatus) {
    const msg = confirmMessages[status] ?? { title: "Update Status", message: `Set status to "${status}"?`, label: "Update", variant: "primary" as const }
    setActionMenuId(null)
    setConfirmAction({
      title: msg.title,
      message: msg.message,
      confirmLabel: msg.label,
      confirmVariant: msg.variant,
      onConfirm: () => {
        const extra =
          status === "confirmed" ? { payment_status: "paid" as const } :
          status === "cancelled" ? { payment_status: "declined" as const } :
          {}
        updateMutation.mutate({ id, status, ...extra }, {
          onSuccess: (updated) => {
            setDetailReservation((prev) => prev?.id === id ? { ...prev, status: updated.status, payment_status: updated.payment_status } : prev)
          },
        })
      },
    })
  }

  function handleCancelConfirmed(id: string) {
    const msg = confirmMessages["cancel_confirmed"]
    setActionMenuId(null)
    setConfirmAction({
      title: msg.title,
      message: msg.message,
      confirmLabel: msg.label,
      confirmVariant: msg.variant,
      onConfirm: () => {
        updateMutation.mutate({ id, status: "cancelled", payment_status: "declined" }, {
          onSuccess: (updated) => {
            setDetailReservation((prev) => prev?.id === id ? { ...prev, status: updated.status, payment_status: updated.payment_status } : prev)
          },
        })
      },
    })
  }

  function handlePaymentStatusChange(id: string, payment_status: "paid" | "refunded") {
    const msg = confirmMessages[payment_status] ?? { title: "Update Payment", message: `Set payment to "${payment_status}"?`, label: "Update", variant: "primary" as const }
    setActionMenuId(null)
    setConfirmAction({
      title: msg.title,
      message: msg.message,
      confirmLabel: msg.label,
      confirmVariant: msg.variant,
      onConfirm: () => {
        updateMutation.mutate({ id, payment_status }, {
          onSuccess: (updated) => {
            setDetailReservation((prev) => prev?.id === id ? { ...prev, payment_status: updated.payment_status } : prev)
          },
        })
      },
    })
  }

  const totalPages = pagination.totalPages
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
    return start + i
  })

  return (
    <div className="p-4 lg:p-8">
      {/* Walk-in Modal */}
      <WalkInModal open={walkInModalOpen} onClose={() => setWalkInModalOpen(false)} />

      {/* Detail Modal */}
      <ReservationDetailModal
        reservation={detailReservation}
        onClose={() => setDetailReservation(null)}
        onStatusChange={handleStatusChange}
        onCancelConfirmed={handleCancelConfirmed}
        onPaymentChange={handlePaymentStatusChange}
        isPending={updateMutation.isPending}
        canUpdate={canUpdateBooking}
      />

      {/* ── Header + Filters ── */}
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-headline text-3xl font-extrabold tracking-tight text-primary lg:text-4xl">
              Reservations
            </h2>
            <p className="mt-1 font-body text-sm font-medium text-secondary">
              Manage and track all court schedules
            </p>
          </div>
          {/* {canCreateBooking && (
            <button
              onClick={() => setWalkInModalOpen(true)}
              className="shrink-0 flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 sm:px-4 font-nav text-[11px] font-semibold uppercase tracking-wider text-on-primary shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/25 active:scale-[0.98]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="hidden sm:inline">Add Walk-in</span>
              <span className="sm:hidden">Walk-in</span>
            </button>
          )} */}
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, phone, code, or date..."
            className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest py-2.5 pl-10 pr-10 font-body text-sm text-on-surface placeholder:text-outline outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(""); setSearchQuery("") }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-on-surface"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Date */}
          <div className="flex flex-col gap-1">
            <span className="ml-1 font-label text-[10px] font-bold uppercase tracking-widest text-outline">
              Date
            </span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="rounded-md bg-surface-container-high px-3 py-2 font-body text-xs font-semibold text-on-surface outline-none"
            />
          </div>

          {/* Court */}
          <div className="flex flex-col gap-1">
            <span className="ml-1 font-label text-[10px] font-bold uppercase tracking-widest text-outline">
              Court
            </span>
            <Select value={courtFilter} onValueChange={(v) => { setCourtFilter(v ?? ""); setCurrentPage(1) }}>
              <SelectTrigger className="h-[34px] min-w-[140px] rounded-md bg-surface-container-high px-3 font-body text-xs font-semibold text-on-surface border-none">
                <SelectValue placeholder="All Courts">
                  {courtFilter
                    ? (() => { const c = filterCourts.find((c) => c.id === courtFilter); return c ? `${c.name}` : "All Courts" })()
                    : "All Courts"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Courts</SelectItem>
                {filterCourts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <span className="ml-1 font-label text-[10px] font-bold uppercase tracking-widest text-outline">
              Status
            </span>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? ""); setCurrentPage(1) }}>
              <SelectTrigger className="h-[34px] min-w-[130px] rounded-md bg-surface-container-high px-3 font-body text-xs font-semibold text-on-surface border-none">
                <SelectValue placeholder="Any Status">
                  {statusFilter
                    ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)
                    : "Any Status"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear filters */}
          {(dateFilter || statusFilter || courtFilter) && (
            <button
              onClick={() => {
                setDateFilter("")
                setStatusFilter("")
                setCourtFilter("")
                setCurrentPage(1)
              }}
              className="mt-auto flex h-[34px] items-center gap-1.5 rounded-md bg-surface-container-high px-3 font-nav text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && <LoadingPage message="Loading reservations..." />}

      {/* ── Reservations Table ── */}
      {!isLoading && (
        <div className="overflow-x-auto pb-4">
          <table className="w-full min-w-[640px] text-left" style={{ borderSpacing: "0 0.75rem", borderCollapse: "separate" }}>
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline">
                <th className="px-6 py-2 font-bold">Transaction</th>
                <th className="px-6 py-2 font-bold">Schedule &amp; Slot</th>
                <th className="px-6 py-2 font-bold">Court</th>
                <th className="px-6 py-2 font-bold">Customer</th>
                <th className="px-6 py-2 text-center font-bold">Payment</th>
                <th className="px-6 py-2 text-right font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((res) => {
                const isCancelled = res.status === "cancelled"
                const isPriority = res.reservation_type === "priority"
                const avatar = getAvatarStyle(res)

                return (
                  <tr
                    key={res.id}
                    onClick={() => setDetailReservation(res)}
                    className={`group rounded-lg shadow-sm transition-all hover:shadow-md cursor-pointer ${
                      isCancelled
                        ? "bg-surface-dim/50 opacity-75"
                        : "bg-surface-container-lowest"
                    } ${isPriority ? "border-l-[3px] border-l-primary" : ""}`}
                  >
                    {/* Transaction */}
                    <td className="rounded-l-xl px-6 py-6">
                      <span className="mb-1 block font-mono text-xs text-outline">
                        #{res.booking_code}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider ${
                          isPriority ? "font-bold text-primary" : "text-outline"
                        }`}
                      >
                        {getTypeLabel(res.reservation_type)}
                      </span>
                      <span className={`mt-1.5 block w-fit rounded px-1.5 py-0.5 font-label text-[9px] font-extrabold uppercase tracking-widest ${
                        res.status === "pending" ? "bg-[#F59E0B]/10 text-[#D97706]" :
                        res.status === "confirmed" ? "bg-[#2563EB]/10 text-[#2563EB]" :
                        res.status === "cancelled" ? "bg-error/10 text-error" :
                        res.status === "completed" ? "bg-primary/10 text-primary" :
                        res.status === "no-show" ? "bg-[#7C3AED]/10 text-[#7C3AED]" :
                        "bg-surface-container text-on-surface-variant"
                      }`}>
                        {res.status}
                      </span>
                    </td>

                    {/* Schedule */}
                    <td className="border-l border-outline-variant/15 px-6 py-6">
                      <p className="mb-0.5 text-xs font-medium text-on-surface-variant">
                        {formatDate(res.booking_date)}
                      </p>
                      {res.booking_items && res.booking_items.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {res.booking_items.map((item: BookingItem) => (
                            <p
                              key={item.id}
                              className={`font-headline text-base font-extrabold tracking-tight ${
                                isCancelled ? "text-outline line-through" : "text-primary"
                              }`}
                            >
                              {formatTimeSlot(item.start_time, item.end_time)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-outline">No slots</p>
                      )}
                    </td>

                    {/* Court */}
                    <td className="border-l border-outline-variant/15 px-6 py-6">
                      <div className={`inline-flex flex-col gap-1 ${isCancelled ? "grayscale" : ""}`}>
                        {res.booking_items && res.booking_items.length > 0 ? (
                          res.booking_items.map((item: BookingItem) => (
                            <div key={item.id} className="flex flex-col">
                              <span
                                className={`text-[10px] font-extrabold uppercase tracking-widest ${
                                  item.courts?.court_type === "indoor" && !isCancelled
                                    ? "text-[#6B3B65]"
                                    : "text-outline"
                                }`}
                              >
                                {item.courts?.court_type}
                              </span>
                              <span
                                className={`font-headline text-2xl font-extrabold leading-tight ${
                                  isCancelled ? "text-outline" : "text-on-surface"
                                }`}
                              >
                                {item.courts?.name}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-outline">—</span>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="border-l border-outline-variant/15 px-6 py-6">
                      <div className={isCancelled ? "grayscale" : ""}>
                        <p className="font-nav text-sm font-bold text-on-surface">
                          {res.customer_name}
                        </p>
                        <p className="font-body text-[11px] text-on-surface-variant">
                          {res.customer_email}
                        </p>
                      </div>
                    </td>

                    {/* Payment */}
                    <td className="border-l border-outline-variant/15 px-6 py-6 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="font-headline text-sm font-bold text-on-surface">
                          ₱{res.total_amount.toFixed(2)}
                        </span>
                        {res.payment_status === "refunded" ? (
                          <span className="rounded bg-error/5 px-2 py-0.5 font-label text-[10px] font-extrabold uppercase tracking-widest text-error">
                            Refunded
                          </span>
                        ) : res.payment_status === "declined" ? (
                          <span className="rounded bg-error/10 px-2 py-0.5 font-label text-[10px] font-extrabold uppercase tracking-widest text-error">
                            Declined
                          </span>
                        ) : res.payment_status === "paid" ? (
                          <span className="rounded bg-[#16A34A]/10 px-2 py-0.5 font-label text-[10px] font-extrabold uppercase tracking-widest text-[#16A34A]">
                            Paid
                          </span>
                        ) : (
                          <span className="rounded bg-[#F59E0B]/10 px-2 py-0.5 font-label text-[10px] font-extrabold uppercase tracking-widest text-[#D97706]">
                            Pending
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="relative rounded-r-xl px-6 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                          setActionMenuId(actionMenuId === res.id ? null : res.id)
                        }}
                        className="rounded-md p-2 transition-colors hover:bg-surface-container"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-outline">
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </button>

                      {/* Dropdown */}
                      {actionMenuId === res.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setActionMenuId(null)}
                          />
                          <div className="fixed z-50 w-48 rounded-lg border border-outline-variant/20 bg-surface-container-lowest py-1 shadow-xl" style={{ top: menuPos.top, right: menuPos.right }}>
                            {/* View Details — always available */}
                            <button
                              onClick={() => { setDetailReservation(res); setActionMenuId(null) }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left font-nav text-xs font-medium text-on-surface transition-colors hover:bg-surface-container"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              View Details
                            </button>

                            {/* Status actions */}
                            {canUpdateBooking && res.status === "pending" && (
                              <>
                                <div className="mx-3 my-1 border-t border-outline-variant/15" />
                                <button
                                  onClick={() => handleStatusChange(res.id, "confirmed")}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left font-nav text-xs font-medium text-primary transition-colors hover:bg-surface-container"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                  </svg>
                                  Confirm Booking
                                </button>
                                <button
                                  onClick={() => handleStatusChange(res.id, "cancelled")}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left font-nav text-xs font-medium text-error transition-colors hover:bg-surface-container"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                  </svg>
                                  Decline
                                </button>
                              </>
                            )}
                            {canUpdateBooking && res.status === "confirmed" && (
                              <>
                                <div className="mx-3 my-1 border-t border-outline-variant/15" />
                                <button
                                  onClick={() => handleStatusChange(res.id, "completed")}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left font-nav text-xs font-medium text-primary transition-colors hover:bg-surface-container"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                  </svg>
                                  Mark Completed
                                </button>
                                <button
                                  onClick={() => handleStatusChange(res.id, "no-show")}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left font-nav text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                  </svg>
                                  Mark No Show
                                </button>
                                <button
                                  onClick={() => handleCancelConfirmed(res.id)}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left font-nav text-xs font-medium text-error transition-colors hover:bg-surface-container"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                  </svg>
                                  Cancel Booking
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}

              {reservations.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center gap-3 rounded-xl bg-surface-container-lowest py-16">
                      <svg className="text-outline" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <p className="font-nav text-sm font-semibold text-on-surface-variant">
                        No reservations found
                      </p>
                      <p className="font-body text-xs text-outline">
                        {dateFilter || statusFilter || courtFilter
                          ? "Try adjusting your filters"
                          : "Reservations will appear here once customers book"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {!isLoading && pagination.total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="font-body text-xs font-medium tracking-tight text-on-surface-variant">
            Showing{" "}
            <span className="font-bold text-on-surface">
              {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-on-surface">{pagination.total}</span>{" "}
            reservations
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-outline transition-colors disabled:opacity-50 hover:text-primary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            {pageNumbers.map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border font-nav text-sm font-bold transition-colors ${
                  currentPage === page
                    ? "border-primary bg-primary text-on-primary shadow-sm shadow-primary/20"
                    : "border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-outline transition-colors disabled:opacity-50 hover:text-primary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <ConfirmationModal
        open={!!confirmAction}
        title={confirmAction?.title ?? ""}
        message={confirmAction?.message ?? ""}
        confirmLabel={confirmAction?.confirmLabel ?? ""}
        confirmVariant={confirmAction?.confirmVariant ?? "primary"}
        onConfirm={() => { setConfirmAction(null); confirmAction?.onConfirm() }}
        onCancel={() => setConfirmAction(null)}
        isPending={updateMutation.isPending}
      />
    </div>
  )
}
