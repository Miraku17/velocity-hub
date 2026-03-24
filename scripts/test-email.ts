import { config } from "dotenv"
import { resolve } from "path"

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") })

import { sendBookingNotification, sendReceiptEmail } from "../lib/email"

async function main() {
  const today = new Date().toISOString().split("T")[0]

  await sendBookingNotification({
    reservationId: "test-123",
    customerName: "Juan dela Cruz",
    customerEmail: process.env.ADMIN_NOTIFY_EMAIL!,
    customerPhone: "+63 912 345 6789",
    courtName: "Court 1",
    courtType: "indoor",
    date: today,
    startTime: "09:00",
    endTime: "10:00",
    reservationType: "regular",
    notes: "This is a test booking notification.",
  })
  console.log("✓ Admin notification sent to", process.env.ADMIN_NOTIFY_EMAIL)

  await sendReceiptEmail({
    customerName: "Juan dela Cruz",
    customerEmail: process.env.ADMIN_NOTIFY_EMAIL!,
    courtName: "Court 1",
    courtType: "indoor",
    date: today,
    startTime: "09:00",
    endTime: "10:00",
    reservationType: "regular",
    reservationCode: "VPH-20260325-001",
    totalAmount: 500,
    notes: "Please prepare extra paddles.",
  })
  console.log("✓ Customer receipt sent to", process.env.ADMIN_NOTIFY_EMAIL)
}

main().catch(console.error)
