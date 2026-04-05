import { NextResponse } from "next/server"
import { sendReceiptEmail } from "@/lib/email"

export async function GET() {
  try {
    await sendReceiptEmail({
      customerName: "Test User",
      customerEmail: "zhaztedv@gmail.com",
      date: "2026-04-05",
      reservationType: "walk-in",
      reservationCode: "TEST-001",
      totalAmount: 1100,
      notes: null,
      courts: [
        {
          courtName: "Court 1",
          courtType: "indoor",
          slots: [
            { startTime: "22:00", endTime: "23:00", amount: 500 },
            { startTime: "23:00", endTime: "24:00", amount: 600 },
          ],
        },
      ],
    })

    return NextResponse.json({ success: true, message: "Test email sent to zhaztedv@gmail.com" })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
