import { config } from "dotenv"
import { resolve } from "path"

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") })

import { sendBookingNotification, sendReceiptEmail } from "../lib/email"

async function main() {
  const today = new Date().toISOString().split("T")[0]

  await sendBookingNotification({
    reservationCode: "VL-00001",
    customerName: "Juan dela Cruz",
    customerEmail: process.env.ADMIN_NOTIFY_EMAIL!,
    customerPhone: "+63 912 345 6789",
    date: today,
    reservationType: "regular",
    notes: "This is a test booking notification.",
    courts: [
      {
        courtName: "Court 1",
        courtType: "indoor",
        slots: [
          { startTime: "09:00", endTime: "10:00" },
          { startTime: "10:00", endTime: "11:00" },
        ],
      },
      {
        courtName: "Court 2",
        courtType: "outdoor",
        slots: [
          { startTime: "09:00", endTime: "10:00" },
        ],
      },
    ],
  })
  console.log("✓ Admin notification sent to", process.env.ADMIN_NOTIFY_EMAIL)

  await sendReceiptEmail({
    customerName: "Juan dela Cruz",
    customerEmail: process.env.ADMIN_NOTIFY_EMAIL!,
    date: today,
    reservationType: "regular",
    reservationCode: "VPH-20260325-001",
    totalAmount: 750,
    notes: "Please prepare extra paddles.",
    courts: [
      {
        courtName: "Court 1",
        courtType: "indoor",
        slots: [
          { startTime: "09:00", endTime: "10:00", amount: 300 },
          { startTime: "10:00", endTime: "11:00", amount: 300 },
        ],
      },
      {
        courtName: "Court 2",
        courtType: "outdoor",
        slots: [
          { startTime: "09:00", endTime: "10:00", amount: 150 },
        ],
      },
    ],
  })
  console.log("✓ Customer receipt sent to", process.env.ADMIN_NOTIFY_EMAIL)
}

main().catch(console.error)
