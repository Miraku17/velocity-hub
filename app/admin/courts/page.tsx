"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingPage } from "@/components/ui/loading"
import {
  useCourts,
  useCreateCourt,
  useUpdateCourt,
  useDeleteCourt,
  type Court,
  type CourtType,
  type CourtStatus,
  type ScheduleInput,
} from "@/lib/hooks/useCourts"

/* ── Types ── */

type ModalMode = "add" | "edit" | "delete" | null

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface ScheduleFormEntry {
  enabled: boolean
  open_time: string
  close_time: string
}

interface FormState {
  name: string
  court_type: CourtType
  status: CourtStatus
  price_per_hour: string
  description: string
  schedules: ScheduleFormEntry[]
}

const defaultSchedule: ScheduleFormEntry = {
  enabled: true,
  open_time: "06:00",
  close_time: "22:00",
}

const emptyForm: FormState = {
  name: "",
  court_type: "indoor",
  status: "available",
  price_per_hour: "",
  description: "",
  schedules: Array.from({ length: 7 }, () => ({ ...defaultSchedule })),
}

/* ── Helpers ── */

const statusLabel: Record<CourtStatus, string> = {
  available: "Active",
  occupied: "Occupied",
  maintenance: "Maintenance",
}

const statusAccent: Record<CourtStatus, string> = {
  available: "bg-primary",
  occupied: "bg-[#6B5B00]",
  maintenance: "bg-[#6B3B65]",
}

const statusBadgeBg: Record<CourtStatus, string> = {
  available: "bg-primary/10",
  occupied: "bg-[#6B5B00]/10",
  maintenance: "bg-[#6B3B65]/10",
}

const statusBadgeText: Record<CourtStatus, string> = {
  available: "text-primary",
  occupied: "text-[#6B5B00]",
  maintenance: "text-[#6B3B65]",
}

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

/* ── Component ── */

export default function CourtsPage() {
  const { data: courts = [], isLoading } = useCourts()
  const createCourt = useCreateCourt()
  const updateCourt = useUpdateCourt()
  const deleteCourt = useDeleteCourt()

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [formData, setFormData] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const totalCourts = courts.length
  const activeCourts = courts.filter((c) => c.status === "available").length
  const maintenanceCourts = courts.filter((c) => c.status === "maintenance").length

  const submitting = createCourt.isPending || updateCourt.isPending || deleteCourt.isPending

  function openAdd() {
    setFormData(emptyForm)
    setSelectedCourt(null)
    setError(null)
    setModalMode("add")
  }

  function openEdit(court: Court) {
    // Build schedules from court data, defaulting to closed for days without a schedule
    const schedules: ScheduleFormEntry[] = Array.from({ length: 7 }, (_, i) => {
      const existing = court.court_schedules?.find((s) => s.day_of_week === i)
      if (existing) {
        return {
          enabled: !existing.is_closed,
          open_time: existing.open_time.slice(0, 5), // "HH:MM:SS" → "HH:MM"
          close_time: existing.close_time.slice(0, 5),
        }
      }
      return { enabled: false, open_time: "06:00", close_time: "22:00" }
    })

    setFormData({
      name: court.name,
      court_type: court.court_type,
      status: court.status,
      price_per_hour: court.price_per_hour.toString(),
      description: court.description || "",
      schedules,
    })
    setSelectedCourt(court)
    setError(null)
    setModalMode("edit")
  }

  function openDelete(court: Court) {
    setSelectedCourt(court)
    setError(null)
    setModalMode("delete")
  }

  function closeModal() {
    setModalMode(null)
    setSelectedCourt(null)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const price = parseFloat(formData.price_per_hour)
    if (isNaN(price) || price < 0) {
      setError("Enter a valid price")
      return
    }

    // Build schedule entries from form — send all 7 days
    const schedulesToSend: ScheduleInput[] = formData.schedules.map((s, i) => ({
      day_of_week: i,
      open_time: s.open_time,
      close_time: s.close_time,
      is_closed: !s.enabled,
    }))

    const body = {
      name: formData.name,
      court_type: formData.court_type,
      status: formData.status,
      price_per_hour: price,
      description: formData.description || null,
      schedules: schedulesToSend,
    }

    if (modalMode === "edit" && selectedCourt) {
      updateCourt.mutate(
        { id: selectedCourt.id, ...body },
        {
          onSuccess: () => closeModal(),
          onError: (err) => setError(err.message),
        }
      )
    } else {
      createCourt.mutate(body, {
        onSuccess: () => closeModal(),
        onError: (err) => setError(err.message),
      })
    }
  }

  function handleDelete() {
    if (!selectedCourt) return
    deleteCourt.mutate(selectedCourt.id, {
      onSuccess: () => closeModal(),
      onError: (err) => setError(err.message),
    })
  }

  return (
    <div className="p-4 lg:p-8">
      {/* ── Header + Metrics ── */}
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary lg:text-4xl">
            Court Monitor
          </h1>
          <span className="font-body text-sm font-medium text-secondary">
            Facility Management
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-1 rounded-xl bg-surface-container-low p-1">
            <div className="min-w-[100px] rounded-lg bg-surface-container-lowest px-4 py-3 text-center lg:min-w-[120px] lg:px-6">
              <p className="mb-1 font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                Total Courts
              </p>
              <p className="font-headline text-2xl font-extrabold text-on-surface">
                {totalCourts.toString().padStart(2, "0")}
              </p>
            </div>
            <div className="min-w-[100px] px-4 py-3 text-center lg:min-w-[120px] lg:px-6">
              <p className="mb-1 font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                Active
              </p>
              <p className="font-headline text-2xl font-extrabold text-primary">
                {activeCourts.toString().padStart(2, "0")}
              </p>
            </div>
            <div className="min-w-[100px] px-4 py-3 text-center lg:min-w-[120px] lg:px-6">
              <p className="mb-1 font-label text-[10px] font-bold uppercase tracking-widest text-outline">
                Maintenance
              </p>
              <p className="font-headline text-2xl font-extrabold text-[#6B3B65]">
                {maintenanceCourts.toString().padStart(2, "0")}
              </p>
            </div>
          </div>

          <Button
            onClick={openAdd}
            className="h-10 gap-2 rounded-lg bg-primary px-5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-primary transition-all hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Court
          </Button>
        </div>
      </div>

      {/* ── Courts Grid ── */}
      {isLoading ? (
        <LoadingPage message="Loading courts..." />
      ) : courts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <span className="material-symbols-outlined text-[40px] text-outline" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
            sports_tennis
          </span>
          <p className="mt-3 font-nav text-sm font-medium text-on-surface-variant">
            No courts yet
          </p>
          <p className="mt-1 font-body text-xs text-outline">
            Add your first court to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courts.map((court) => (
            <div
              key={court.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container-lowest transition-all hover:border-outline-variant/30 hover:shadow-md"
            >
              {/* Court surface — the visual court representation */}
              <div className={`relative h-40 overflow-hidden ${court.court_type === "indoor" ? "bg-primary" : "bg-[#2D6A4F]"}`}>
                {/* Court lines SVG */}
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 400 200"
                  preserveAspectRatio="xMidYMid slice"
                  fill="none"
                >
                  {/* Outer boundary */}
                  <rect x="20" y="15" width="360" height="170" rx="2" stroke="white" strokeWidth="2" opacity="0.25" />
                  {/* Center line */}
                  <line x1="200" y1="15" x2="200" y2="185" stroke="white" strokeWidth="2" opacity="0.25" />
                  {/* Non-volley zone (kitchen) lines */}
                  <line x1="130" y1="15" x2="130" y2="185" stroke="white" strokeWidth="1.5" opacity="0.2" strokeDasharray="6 4" />
                  <line x1="270" y1="15" x2="270" y2="185" stroke="white" strokeWidth="1.5" opacity="0.2" strokeDasharray="6 4" />
                  {/* Kitchen zones fill */}
                  <rect x="130" y="15" width="70" height="170" fill="white" opacity="0.06" />
                  <rect x="200" y="15" width="70" height="170" fill="white" opacity="0.06" />
                  {/* Center service lines */}
                  <line x1="20" y1="100" x2="130" y2="100" stroke="white" strokeWidth="1.5" opacity="0.18" />
                  <line x1="270" y1="100" x2="380" y2="100" stroke="white" strokeWidth="1.5" opacity="0.18" />
                  {/* Net */}
                  <line x1="200" y1="8" x2="200" y2="192" stroke="white" strokeWidth="3" opacity="0.12" />
                </svg>

                {/* Court name overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="font-headline text-3xl font-extrabold tracking-tight text-white/90 drop-shadow-sm">
                    {court.name}
                  </p>
                  <p className="mt-1 font-label text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                    {court.court_type === "indoor" ? "Indoor Facility" : "Outdoor Court"}
                  </p>
                </div>

                {/* Status badge */}
                <div className="absolute top-3 right-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm ${
                    court.status === "available"
                      ? "bg-white/20 text-white"
                      : court.status === "maintenance"
                        ? "bg-[#6B3B65]/60 text-white"
                        : "bg-[#6B5B00]/60 text-white"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      court.status === "available" ? "bg-green-400 animate-pulse" : court.status === "maintenance" ? "bg-amber-300" : "bg-yellow-400"
                    }`} />
                    {statusLabel[court.status]}
                  </span>
                </div>

                {/* Type icon */}
                <div className="absolute top-3 left-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-[18px] text-white/80" style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>
                      {court.court_type === "indoor" ? "house" : "wb_sunny"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div className="flex flex-1 flex-col px-5 py-4">
                {/* Price row */}
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="font-headline text-xl font-bold tracking-tight text-on-surface">
                      {formatCurrency(court.price_per_hour)}
                      <span className="font-body text-xs font-normal text-on-surface-variant"> /hr</span>
                    </p>
                  </div>
                </div>

                {/* Description */}
                {court.description && (
                  <p className="mt-2 font-body text-xs leading-relaxed text-on-surface-variant line-clamp-2">
                    {court.description}
                  </p>
                )}

                {/* Schedule summary */}
                {court.court_schedules && court.court_schedules.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {DAY_SHORT.map((day, i) => {
                      const sched = court.court_schedules?.find((s) => s.day_of_week === i)
                      const isOpen = sched && !sched.is_closed
                      return (
                        <span
                          key={i}
                          title={isOpen ? `${sched.open_time.slice(0, 5)} – ${sched.close_time.slice(0, 5)}` : "Closed"}
                          className={`inline-flex h-6 w-9 items-center justify-center rounded font-nav text-[9px] font-bold uppercase tracking-wider ${
                            isOpen
                              ? "bg-primary/8 text-primary"
                              : "bg-surface-container-high text-outline/50 line-through"
                          }`}
                        >
                          {day}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex gap-2 border-t border-outline-variant/10 pt-4">
                  <button
                    onClick={() => openEdit(court)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-surface-container-high py-2.5 font-nav text-xs font-semibold uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-container-highest active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Edit
                  </button>
                  <button
                    onClick={() => openDelete(court)}
                    className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-error/8 text-error transition-colors hover:bg-error/15 active:scale-[0.98]"
                    aria-label="Delete court"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {(modalMode === "add" || modalMode === "edit") && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/15 px-6 py-5">
                <div>
                  <h2 className="font-headline text-lg font-bold text-on-surface">
                    {modalMode === "add" ? "Add New Court" : "Edit Court"}
                  </h2>
                  <p className="mt-0.5 font-body text-xs text-on-surface-variant">
                    {modalMode === "add"
                      ? "Configure a new court for your facility"
                      : `Editing ${selectedCourt?.name}`}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5">
                <div className="space-y-5">
                  {/* Court Name */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="court-name"
                      className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant"
                    >
                      Court Name
                    </Label>
                    <Input
                      id="court-name"
                      placeholder="Court 01"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      disabled={submitting}
                      className="h-11 rounded-lg border-outline-variant/50 bg-surface-container-low px-3.5 font-body text-sm text-on-surface placeholder:text-outline transition-all focus-visible:border-primary focus-visible:ring-primary/20"
                    />
                  </div>

                  {/* Court Type */}
                  <div className="space-y-2">
                    <Label className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                      Court Type
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["indoor", "outdoor"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          disabled={submitting}
                          onClick={() =>
                            setFormData({ ...formData, court_type: type })
                          }
                          className={`flex flex-col items-center gap-2 rounded-lg border-2 px-4 py-4 transition-all ${
                            formData.court_type === type
                              ? "border-primary bg-primary/5"
                              : "border-outline-variant/30 bg-surface-container-low hover:border-outline-variant/60"
                          }`}
                        >
                          {type === "indoor" ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={formData.court_type === type ? "text-primary" : "text-on-surface-variant"}>
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={formData.court_type === type ? "text-primary" : "text-on-surface-variant"}>
                              <circle cx="12" cy="12" r="5" />
                              <line x1="12" y1="1" x2="12" y2="3" />
                              <line x1="12" y1="21" x2="12" y2="23" />
                              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                              <line x1="1" y1="12" x2="3" y2="12" />
                              <line x1="21" y1="12" x2="23" y2="12" />
                              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                          )}
                          <span className={`font-nav text-xs font-semibold uppercase tracking-wider ${formData.court_type === type ? "text-primary" : "text-on-surface-variant"}`}>
                            {type}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price per Hour */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="price"
                      className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant"
                    >
                      Price per Hour (₱)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-body text-sm text-on-surface-variant">
                        ₱
                      </span>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="400.00"
                        value={formData.price_per_hour}
                        onChange={(e) =>
                          setFormData({ ...formData, price_per_hour: e.target.value })
                        }
                        required
                        disabled={submitting}
                        className="h-11 rounded-lg border-outline-variant/50 bg-surface-container-low pl-8 pr-3.5 font-body text-sm text-on-surface placeholder:text-outline transition-all focus-visible:border-primary focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant"
                    >
                      Description
                      <span className="ml-1 normal-case tracking-normal text-outline">(optional)</span>
                    </Label>
                    <textarea
                      id="description"
                      rows={2}
                      placeholder="e.g. Standard court with LED lighting"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      disabled={submitting}
                      className="w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-3.5 py-2.5 font-body text-sm text-on-surface placeholder:text-outline outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                      Status
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {(["available", "maintenance"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={submitting}
                          onClick={() =>
                            setFormData({ ...formData, status: s })
                          }
                          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-wider transition-all ${
                            formData.status === s
                              ? s === "available"
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-[#6B3B65] bg-[#6B3B65]/5 text-[#6B3B65]"
                              : "border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/60"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              formData.status === s
                                ? s === "available"
                                  ? "bg-primary"
                                  : "bg-[#6B3B65]"
                                : "bg-outline-variant"
                            }`}
                          />
                          {s === "available" ? "Active" : "Maintenance"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                        Operating Hours
                      </Label>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          const allEnabled = formData.schedules.every((s) => s.enabled)
                          setFormData({
                            ...formData,
                            schedules: formData.schedules.map((s) => ({
                              ...s,
                              enabled: !allEnabled,
                            })),
                          })
                        }}
                        className="font-nav text-[10px] font-semibold uppercase tracking-wider text-primary hover:text-primary/80"
                      >
                        {formData.schedules.every((s) => s.enabled) ? "Close All" : "Open All"}
                      </button>
                    </div>

                    <div className="space-y-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
                      {formData.schedules.map((sched, dayIndex) => (
                        <div
                          key={dayIndex}
                          className={`flex items-center gap-2 rounded-md px-2.5 py-2 transition-colors ${sched.enabled ? "bg-surface-container-lowest" : ""}`}
                        >
                          {/* Day toggle */}
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => {
                              const updated = [...formData.schedules]
                              updated[dayIndex] = { ...updated[dayIndex], enabled: !updated[dayIndex].enabled }
                              setFormData({ ...formData, schedules: updated })
                            }}
                            className={`flex h-7 w-12 items-center justify-center rounded font-nav text-[10px] font-bold uppercase tracking-wider transition-all ${
                              sched.enabled
                                ? "bg-primary text-on-primary"
                                : "bg-outline-variant/20 text-outline line-through"
                            }`}
                          >
                            {DAY_SHORT[dayIndex]}
                          </button>

                          {sched.enabled ? (
                            <div className="flex flex-1 items-center gap-1.5">
                              <input
                                type="time"
                                value={sched.open_time}
                                disabled={submitting}
                                onChange={(e) => {
                                  const updated = [...formData.schedules]
                                  updated[dayIndex] = { ...updated[dayIndex], open_time: e.target.value }
                                  setFormData({ ...formData, schedules: updated })
                                }}
                                className="h-7 w-full rounded border border-outline-variant/40 bg-transparent px-2 font-body text-[11px] text-on-surface outline-none focus:border-primary"
                              />
                              <span className="font-body text-[10px] text-outline">to</span>
                              <input
                                type="time"
                                value={sched.close_time}
                                disabled={submitting}
                                onChange={(e) => {
                                  const updated = [...formData.schedules]
                                  updated[dayIndex] = { ...updated[dayIndex], close_time: e.target.value }
                                  setFormData({ ...formData, schedules: updated })
                                }}
                                className="h-7 w-full rounded border border-outline-variant/40 bg-transparent px-2 font-body text-[11px] text-on-surface outline-none focus:border-primary"
                              />
                            </div>
                          ) : (
                            <span className="flex-1 font-body text-[11px] italic text-outline">
                              Closed
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex items-center justify-end gap-3 border-t border-outline-variant/15 pt-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    disabled={submitting}
                    className="h-10 rounded-lg border-outline-variant/40 px-5 font-nav text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-10 gap-2 rounded-lg bg-primary px-5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-primary transition-all hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98] disabled:opacity-60"
                  >
                    {submitting ? (
                      "Saving..."
                    ) : modalMode === "add" ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Court
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {modalMode === "delete" && selectedCourt && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="w-full max-w-sm rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icon */}
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-error">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <div className="mt-4 text-center">
                <h3 className="font-headline text-lg font-semibold text-on-surface">
                  Delete Court
                </h3>
                <p className="mt-2 font-body text-sm text-on-surface-variant">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-on-surface">
                    {selectedCourt.name}
                  </span>
                  ? This action cannot be undone.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={closeModal}
                  disabled={submitting}
                  className="flex-1 rounded-lg border border-outline-variant/30 bg-transparent px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant transition-colors hover:bg-surface-container"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-error px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-error transition-colors hover:bg-error/90 disabled:opacity-60"
                >
                  {submitting ? "Deleting..." : "Delete Court"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
