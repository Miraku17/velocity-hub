import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface PaymentQrCode {
  id: string
  name: string
  type: string
  image_url: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PaymentQrCodeInput {
  name: string
  type: string
  image_url: string
  sort_order?: number
}

const QUERY_KEY = ["payment-qr-codes"]

export function usePaymentQrCodes() {
  return useQuery<PaymentQrCode[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/payment-qr-codes")
      if (!res.ok) throw new Error("Failed to fetch QR codes")
      return res.json()
    },
  })
}

export function useCreatePaymentQrCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PaymentQrCodeInput) => {
      const res = await fetch("/api/payment-qr-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create QR code")
      }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdatePaymentQrCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PaymentQrCode> & { id: string }) => {
      const res = await fetch(`/api/payment-qr-codes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update QR code")
      }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeletePaymentQrCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/payment-qr-codes/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to delete QR code")
      }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
