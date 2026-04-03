"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Portal } from "@/components/ui/portal"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingPage } from "@/components/ui/loading"
import {
  useVenueSettings,
  useUpdateVenueSettings,
  type OperatingHour,
  type SocialLinks,
} from "@/lib/hooks/useVenueSettings"
import {
  usePaymentQrCodes,
  useCreatePaymentQrCode,
  useUpdatePaymentQrCode,
  useDeletePaymentQrCode,
  type PaymentQrCode,
} from "@/lib/hooks/usePaymentQrCodes"

/* ── Constants ── */

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const QR_TYPES = [
  { value: "gcash", label: "GCash" },
  { value: "maya", label: "Maya" },
  { value: "bank", label: "Bank Transfer" },
  { value: "other", label: "Other" },
]

/* ── Tab type ── */

type Tab = "general" | "hours" | "tags" | "payments"

/* ── Component ── */

export default function VenueSettingsPage() {
  const { data: settings, isLoading } = useVenueSettings()
  const updateSettings = useUpdateVenueSettings()
  const { data: qrCodes = [], isLoading: qrLoading } = usePaymentQrCodes()
  const createQr = useCreatePaymentQrCode()
  const updateQr = useUpdatePaymentQrCode()
  const deleteQr = useDeletePaymentQrCode()

  const [activeTab, setActiveTab] = useState<Tab>("payments")
  const [saved, setSaved] = useState(false)

  // ── General fields ──
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({})

  // ── Operating hours ──
  const [hours, setHours] = useState<{ enabled: boolean; open_time: string; close_time: string }[]>(
    Array.from({ length: 7 }, () => ({ enabled: true, open_time: "06:00", close_time: "22:00" }))
  )

  // ── Tags ──
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")

  // ── Payment QR codes ──
  const [qrModal, setQrModal] = useState(false)
  const [qrForm, setQrForm] = useState<{ name: string; type: string; image_url: string }>({ name: "", type: "gcash", image_url: "" })
  const [editingQrId, setEditingQrId] = useState<string | null>(null)

  // ── Photos ──
  const [photos, setPhotos] = useState<string[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingQr, setUploadingQr] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const qrInputRef = useRef<HTMLInputElement>(null)

  // Load settings into form
  useEffect(() => {
    if (!settings) return
    setName(settings.name || "")
    setDescription(settings.description || "")
    setAddress(settings.address || "")
    setPhone(settings.phone || "")
    setEmail(settings.email || "")
    setSocialLinks(settings.social_links || {})
    setTags(settings.tags || [])
    setPhotos(settings.photos || [])

    // Load operating hours
    const h = Array.from({ length: 7 }, (_, i) => {
      const existing = (settings.operating_hours || []).find((oh: OperatingHour) => oh.day_of_week === i)
      if (existing) {
        return {
          enabled: !existing.is_closed,
          open_time: existing.open_time.slice(0, 5),
          close_time: existing.close_time.slice(0, 5),
        }
      }
      return { enabled: false, open_time: "06:00", close_time: "22:00" }
    })
    setHours(h)
  }, [settings])

  const submitting = updateSettings.isPending

  function handleSave() {
    const operating_hours: OperatingHour[] = hours.map((h, i) => ({
      day_of_week: i,
      open_time: h.open_time,
      close_time: h.close_time,
      is_closed: !h.enabled,
    }))

    updateSettings.mutate(
      {
        name,
        description: description || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
        operating_hours,
        tags,
        photos,
        social_links: socialLinks,
      },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        },
      }
    )
  }

  function addTag() {
    const tag = newTag.trim()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setNewTag("")
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  async function uploadFile(file: File, folder: string): Promise<string | null> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", folder)
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Upload failed")
        return null
      }
      const data = await res.json()
      return data.url as string
    } catch {
      alert("Upload failed — check your connection")
      return null
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    const url = await uploadFile(file, "photos")
    if (url) setPhotos((prev) => [...prev, url])
    setUploadingPhoto(false)
    if (photoInputRef.current) photoInputRef.current.value = ""
  }

  async function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingQr(true)
    const url = await uploadFile(file, "qr-codes")
    if (url) setQrForm((prev) => ({ ...prev, image_url: url }))
    setUploadingQr(false)
    if (qrInputRef.current) qrInputRef.current.value = ""
  }

  function removePhoto(url: string) {
    setPhotos(photos.filter((p) => p !== url))
  }

  function openAddQr() {
    setQrForm({ name: "", type: "gcash", image_url: "" })
    setEditingQrId(null)
    setQrModal(true)
  }

  function openEditQr(qr: PaymentQrCode) {
    setQrForm({ name: qr.name, type: qr.type, image_url: qr.image_url })
    setEditingQrId(qr.id)
    setQrModal(true)
  }

  function saveQr() {
    if (!qrForm.name.trim() || !qrForm.image_url.trim()) return
    if (editingQrId) {
      updateQr.mutate({ id: editingQrId, ...qrForm }, { onSuccess: () => setQrModal(false) })
    } else {
      createQr.mutate(qrForm, { onSuccess: () => setQrModal(false) })
    }
  }

  function removeQr(id: string) {
    deleteQr.mutate(id)
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    // { key: "general", label: "General", icon: "store" },
    // { key: "hours", label: "Hours", icon: "schedule" },
    // { key: "tags", label: "Tags & Photos", icon: "sell" },
    { key: "payments", label: "Payments", icon: "qr_code_2" },
  ]

  const qrSaving = createQr.isPending || updateQr.isPending || deleteQr.isPending

  if (isLoading || qrLoading) return <LoadingPage message="Loading venue settings..." />

  return (
    <div className="p-4 lg:p-8">
      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary lg:text-4xl">
            Venue Settings
          </h1>
          <span className="font-body text-sm font-medium text-secondary">
            Manage your venue information
          </span>
        </div>

        <Button
          onClick={handleSave}
          disabled={submitting}
          className="h-10 gap-2 rounded-lg bg-primary px-6 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-primary transition-all hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? (
            "Saving..."
          ) : saved ? (
            <>
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Saved
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px]">save</span>
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* ── Tabs ── */}
      <div className="mb-8 flex gap-1 overflow-x-auto rounded-xl bg-surface-container-low p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 font-nav text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === tab.key
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: activeTab === tab.key ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 400" }}
            >
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-6 md:p-8">
        {/* ═══ GENERAL ═══ */}
        {false && activeTab === "general" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="font-headline text-lg font-bold text-on-surface">General Information</h2>
              <p className="mt-1 font-body text-xs text-on-surface-variant">Basic venue details visible to the public.</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                  Venue Name
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  className="h-11 rounded-lg border-outline-variant/50 bg-surface-container-low px-3.5 font-body text-sm text-on-surface"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                  Description
                </Label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-3.5 py-2.5 font-body text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                  Address
                </Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={submitting}
                  placeholder="Cebu City, Philippines"
                  className="h-11 rounded-lg border-outline-variant/50 bg-surface-container-low px-3.5 font-body text-sm text-on-surface"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                    Phone
                  </Label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting}
                    placeholder="+63 917 123 4567"
                    className="h-11 rounded-lg border-outline-variant/50 bg-surface-container-low px-3.5 font-body text-sm text-on-surface"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    placeholder="info@velocitypickleball.com"
                    className="h-11 rounded-lg border-outline-variant/50 bg-surface-container-low px-3.5 font-body text-sm text-on-surface"
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-3 border-t border-outline-variant/10 pt-5">
                <Label className="font-nav text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                  Social Links
                </Label>
                {["facebook", "instagram", "tiktok"].map((platform) => (
                  <div key={platform} className="flex items-center gap-3">
                    <span className="w-20 font-nav text-[11px] font-semibold capitalize text-on-surface-variant">
                      {platform}
                    </span>
                    <Input
                      value={socialLinks[platform] || ""}
                      onChange={(e) =>
                        setSocialLinks({ ...socialLinks, [platform]: e.target.value })
                      }
                      disabled={submitting}
                      placeholder={`https://${platform}.com/...`}
                      className="h-9 flex-1 rounded-lg border-outline-variant/50 bg-surface-container-low px-3 font-body text-xs text-on-surface"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ OPERATING HOURS ═══ */}
        {activeTab === "hours" && (
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline text-lg font-bold text-on-surface">Operating Hours</h2>
                <p className="mt-1 font-body text-xs text-on-surface-variant">Venue-wide operating hours shown on the website.</p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  const allEnabled = hours.every((h) => h.enabled)
                  setHours(hours.map((h) => ({ ...h, enabled: !allEnabled })))
                }}
                className="font-nav text-[10px] font-semibold uppercase tracking-wider text-primary hover:text-primary/80"
              >
                {hours.every((h) => h.enabled) ? "Close All" : "Open All"}
              </button>
            </div>

            <div className="space-y-2">
              {hours.map((h, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${h.enabled ? "bg-surface-container-low" : ""}`}
                >
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      const updated = [...hours]
                      updated[dayIndex] = { ...updated[dayIndex], enabled: !updated[dayIndex].enabled }
                      setHours(updated)
                    }}
                    className={`flex h-8 w-14 items-center justify-center rounded-lg font-nav text-[10px] font-bold uppercase tracking-wider transition-all ${
                      h.enabled
                        ? "bg-primary text-on-primary"
                        : "bg-outline-variant/20 text-outline line-through"
                    }`}
                  >
                    {DAY_SHORT[dayIndex]}
                  </button>

                  <span className="w-24 font-body text-sm text-on-surface-variant">
                    {DAY_LABELS[dayIndex]}
                  </span>

                  {h.enabled ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="time"
                        value={h.open_time}
                        disabled={submitting}
                        onChange={(e) => {
                          const updated = [...hours]
                          updated[dayIndex] = { ...updated[dayIndex], open_time: e.target.value }
                          setHours(updated)
                        }}
                        className="h-9 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 font-body text-sm text-on-surface outline-none focus:border-primary"
                      />
                      <span className="font-body text-xs text-outline">to</span>
                      <input
                        type="time"
                        value={h.close_time}
                        disabled={submitting}
                        onChange={(e) => {
                          const updated = [...hours]
                          updated[dayIndex] = { ...updated[dayIndex], close_time: e.target.value }
                          setHours(updated)
                        }}
                        className="h-9 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 font-body text-sm text-on-surface outline-none focus:border-primary"
                      />
                    </div>
                  ) : (
                    <span className="flex-1 font-body text-sm italic text-outline">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ TAGS & PHOTOS ═══ */}
        {activeTab === "tags" && (
          <div className="max-w-2xl space-y-8">
            {/* Tags */}
            <div className="space-y-4">
              <div>
                <h2 className="font-headline text-lg font-bold text-on-surface">Tags & Amenities</h2>
                <p className="mt-1 font-body text-xs text-on-surface-variant">Highlight features and amenities of your venue.</p>
              </div>

              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  disabled={submitting}
                  placeholder="e.g. Free Wi-Fi, Parking, Pro Shop"
                  className="h-10 flex-1 rounded-lg border-outline-variant/50 bg-surface-container-low px-3.5 font-body text-sm text-on-surface"
                />
                <Button
                  type="button"
                  onClick={addTag}
                  disabled={submitting || !newTag.trim()}
                  className="h-10 rounded-lg bg-primary px-4 font-nav text-xs font-semibold uppercase tracking-wider text-on-primary"
                >
                  Add
                </Button>
              </div>

              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-3 py-1.5 font-label text-xs font-semibold text-primary"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        disabled={submitting}
                        className="flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-primary/20"
                      >
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="font-body text-xs italic text-outline">No tags added yet</p>
              )}
            </div>

            {/* Photos */}
            <div className="space-y-4 border-t border-outline-variant/10 pt-6">
              <div>
                <h2 className="font-headline text-lg font-bold text-on-surface">Photos</h2>
                <p className="mt-1 font-body text-xs text-on-surface-variant">Upload photos for your venue gallery. JPEG, PNG, WebP, or GIF (max 5MB).</p>
              </div>

              <div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoUpload}
                  disabled={submitting || uploadingPhoto}
                  className="hidden"
                />
                <Button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={submitting || uploadingPhoto}
                  className="h-10 gap-2 rounded-lg bg-primary px-5 font-nav text-xs font-semibold uppercase tracking-wider text-on-primary"
                >
                  {uploadingPhoto ? (
                    "Uploading..."
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">upload</span>
                      Upload Photo
                    </>
                  )}
                </Button>
              </div>

              {photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photos.map((url) => (
                    <div
                      key={url}
                      className="group relative aspect-video overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container-low"
                    >
                      <Image
                        src={url}
                        alt="Venue photo"
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        className="object-cover"
                      />
                      <button
                        onClick={() => removePhoto(url)}
                        disabled={submitting}
                        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-body text-xs italic text-outline">No photos added yet</p>
              )}
            </div>
          </div>
        )}

        {/* ═══ PAYMENTS ═══ */}
        {activeTab === "payments" && (
          <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-headline text-lg font-bold text-on-surface">Payment QR Codes</h2>
                <p className="mt-1 font-body text-xs text-on-surface-variant">
                  QR codes displayed during checkout for customer payments.
                </p>
              </div>
              {qrCodes.length > 0 && (
                <Button
                  onClick={openAddQr}
                  disabled={qrSaving}
                  className="h-10 gap-2 rounded-xl bg-primary px-5 font-nav text-xs font-semibold uppercase tracking-wider text-on-primary shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                  Add Payment Method
                </Button>
              )}
            </div>

            {qrCodes.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {qrCodes.map((qr) => (
                  <div
                    key={qr.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm transition-all hover:shadow-md"
                  >
                    {/* QR Image area */}
                    <div className="relative flex aspect-square items-center justify-center bg-white p-6">
                      {qr.image_url ? (
                        <Image
                          src={qr.image_url}
                          alt={qr.name}
                          fill
                          sizes="200px"
                          className="object-contain"
                        />
                      ) : (
                        <span
                          className="material-symbols-outlined text-[64px] text-outline/30"
                          style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}
                        >
                          qr_code_2
                        </span>
                      )}

                    </div>

                    {/* Card footer */}
                    <div className="flex items-center gap-3 border-t border-outline-variant/10 px-4 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
                        <span
                          className="material-symbols-outlined text-[16px] text-primary"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {qr.type === "gcash" ? "smartphone" : qr.type === "maya" ? "account_balance_wallet" : qr.type === "bank" ? "account_balance" : "payments"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-headline text-sm font-bold text-on-surface">{qr.name}</p>
                        <span className="font-label text-[10px] font-semibold uppercase tracking-wider text-primary">
                          {QR_TYPES.find((t) => t.value === qr.type)?.label || qr.type}
                        </span>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => openEditQr(qr)}
                          disabled={qrSaving}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-primary/8 hover:text-primary disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => removeQr(qr.id)}
                          disabled={qrSaving}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error/8 hover:text-error disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant/20 bg-surface-container-low/50 py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
                  <span
                    className="material-symbols-outlined text-[32px] text-primary/40"
                    style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                  >
                    qr_code_2
                  </span>
                </div>
                <p className="mt-4 font-headline text-sm font-bold text-on-surface">No payment methods yet</p>
                <p className="mt-1 max-w-xs text-center font-body text-xs text-on-surface-variant">
                  Add QR codes for GCash, Maya, or bank transfers to display at checkout.
                </p>
                <Button
                  onClick={openAddQr}
                  className="mt-5 h-9 gap-1.5 rounded-xl bg-primary/10 px-4 font-nav text-xs font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary/15"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Add Your First QR Code
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── QR Code Modal ── */}
      {qrModal && (
        <Portal>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setQrModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between bg-primary/5 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <span className="material-symbols-outlined text-[20px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                      qr_code_2
                    </span>
                  </div>
                  <div>
                    <h2 className="font-headline text-base font-bold text-on-surface">
                      {editingQrId ? "Edit Payment Method" : "New Payment Method"}
                    </h2>
                    <p className="font-body text-[11px] text-on-surface-variant">
                      Upload a QR code image for customer checkout
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setQrModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="space-y-6 px-6 py-6">
                {/* QR Image upload — prominent at top */}
                <div className="space-y-2">
                  <Label className="font-nav text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    QR Code Image
                  </Label>
                  <input
                    ref={qrInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleQrUpload}
                    disabled={uploadingQr}
                    className="hidden"
                  />
                  {qrForm.image_url ? (
                    <div className="relative mx-auto w-fit">
                      <div className="flex items-center justify-center rounded-2xl border border-outline-variant/15 bg-white p-5 shadow-sm">
                        <Image src={qrForm.image_url} alt="QR Preview" width={192} height={192} className="h-48 w-48 object-contain" />
                      </div>
                      <button
                        type="button"
                        onClick={() => qrInputRef.current?.click()}
                        disabled={uploadingQr}
                        className="absolute -right-2 -bottom-2 flex h-9 items-center gap-1.5 rounded-full bg-surface-container-high px-3 shadow-md transition-colors hover:bg-surface-container"
                      >
                        <span className="material-symbols-outlined text-[14px] text-on-surface-variant">edit</span>
                        <span className="font-nav text-[10px] font-semibold text-on-surface-variant">
                          {uploadingQr ? "Uploading..." : "Change"}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => qrInputRef.current?.click()}
                      disabled={uploadingQr}
                      className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-outline-variant/25 bg-surface-container-low/50 py-10 transition-all hover:border-primary/40 hover:bg-primary/5"
                    >
                      {uploadingQr ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                          <span className="font-nav text-xs font-semibold text-primary">Uploading...</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8">
                            <span className="material-symbols-outlined text-[28px] text-primary/60" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
                              cloud_upload
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="block font-nav text-xs font-semibold text-on-surface">
                              Click to upload QR code
                            </span>
                            <span className="mt-0.5 block font-body text-[10px] text-outline">
                              JPEG, PNG, WebP, GIF — max 5MB
                            </span>
                          </div>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Name + Type side by side */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="font-nav text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      Label
                    </Label>
                    <Input
                      value={qrForm.name}
                      onChange={(e) => setQrForm({ ...qrForm, name: e.target.value })}
                      placeholder="e.g. GCash - Velocity"
                      className="h-11 rounded-xl border-outline-variant/40 bg-surface-container-low px-3.5 font-body text-sm text-on-surface"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-nav text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      Type
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {QR_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setQrForm({ ...qrForm, type: type.value })}
                          className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 font-nav text-[10px] font-bold uppercase tracking-wider transition-all ${
                            qrForm.type === type.value
                              ? "border-primary bg-primary/8 text-primary shadow-sm"
                              : "border-outline-variant/25 text-on-surface-variant hover:border-outline-variant/50"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: qrForm.type === type.value ? "'FILL' 1" : "'FILL' 0" }}>
                            {type.value === "gcash" ? "smartphone" : type.value === "maya" ? "account_balance_wallet" : type.value === "bank" ? "account_balance" : "payments"}
                          </span>
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-end gap-3 border-t border-outline-variant/10 bg-surface-container-low/50 px-6 py-4">
                <Button
                  type="button"
                  onClick={() => setQrModal(false)}
                  className="h-10 rounded-xl border border-outline-variant/30 bg-transparent px-5 font-nav text-xs font-semibold uppercase tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveQr}
                  disabled={!qrForm.name.trim() || !qrForm.image_url.trim() || qrSaving}
                  className="h-10 gap-2 rounded-xl bg-primary px-6 font-nav text-xs font-semibold uppercase tracking-[0.1em] text-on-primary shadow-sm transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-60"
                >
                  {qrSaving ? (
                    "Saving..."
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {editingQrId ? "check_circle" : "add_circle"}
                      </span>
                      {editingQrId ? "Save Changes" : "Add QR Code"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
