import { Resend } from "resend"

const getEnv = () => ({
  resend: new Resend(process.env.RESEND_API_KEY),
  FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? "noreply@velocitypickleballcebu.com",
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "https://velocitypickleballcebu.com",
  ADMIN_EMAIL: process.env.ADMIN_NOTIFY_EMAIL ?? "",
})

const formatTime = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`
}

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")

const formatDate = (date: string) =>
  new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

export interface CourtGroup {
  courtName: string
  courtType: string
  slots: { startTime: string; endTime: string }[]
}

export interface CourtGroupWithAmount {
  courtName: string
  courtType: string
  slots: { startTime: string; endTime: string; amount: number }[]
}

export interface BookingEmailData {
  customerName: string
  customerEmail: string
  customerPhone: string
  date: string
  reservationType: string
  notes?: string | null
  reservationCode: string
  courts: CourtGroup[]
}

export interface ReceiptEmailData {
  customerName: string
  customerEmail: string
  date: string
  reservationType: string
  reservationCode: string
  totalAmount: number
  notes?: string | null
  courts: CourtGroupWithAmount[]
}

export async function sendBookingNotification(data: BookingEmailData) {
  const { resend, FROM_EMAIL, ADMIN_EMAIL, SITE_URL } = getEnv()
  const LOGO_URL = `${SITE_URL}/logo.png`

  if (!ADMIN_EMAIL) return

  const { customerName, customerEmail, customerPhone, date, reservationType, notes, reservationCode, courts } = data

  const formattedDate = formatDate(date)
  const totalSlots = courts.reduce((sum, c) => sum + c.slots.length, 0)

  const courtsHtml = courts.map((court) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border:1px solid #d1fae5;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="background:#d1fae5;padding:8px 12px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;font-weight:700;color:#065f46;">${escapeHtml(court.courtName)}</td>
              <td align="right" style="font-size:11px;font-weight:600;color:#047857;text-transform:capitalize;">${escapeHtml(court.courtType)}</td>
            </tr>
          </table>
        </td>
      </tr>
      ${court.slots.map((s, i) => `
      <tr>
        <td style="padding:7px 12px;background:#f0fdf4;border-top:1px solid #d1fae5;">
          <span style="font-size:12px;font-weight:600;color:#065f46;">${i + 1}. ${formatTime(s.startTime)} &ndash; ${formatTime(s.endTime)}</span>
        </td>
      </tr>`).join("")}
    </table>
  `).join("")

  await resend.emails.send({
    from: `Velocity Pickleball Hub <${FROM_EMAIL}>`,
    to: ADMIN_EMAIL,
    subject: `New Booking — ${escapeHtml(customerName)} · ${formattedDate} (${totalSlots} slot${totalSlots > 1 ? "s" : ""}, ${courts.length} court${courts.length > 1 ? "s" : ""})`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1b4332 0%,#2d6a4f 100%);border-radius:12px 12px 0 0;padding:32px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.5);">Velocity Pickleball Hub</p>
                  <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">New Court Booking</h1>
                  <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.6);">${courts.length > 1 ? `${courts.length} courts · ${totalSlots} time slots` : `${totalSlots} time slot${totalSlots > 1 ? "s" : ""}`}</p>
                </td>
                <td align="right" valign="top">
                  <img src="${LOGO_URL}" alt="Velocity Pickleball Hub" width="48" height="48" style="border-radius:10px;display:block;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Date highlight bar -->
        <tr>
          <td style="background:#d1fae5;padding:14px 36px;border-left:4px solid #059669;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:15px;font-weight:700;color:#065f46;">${formattedDate}</td>
                <td align="right" style="font-size:13px;font-weight:600;color:#047857;text-transform:capitalize;">${escapeHtml(reservationType)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:28px 36px;border:1px solid #e5e7eb;border-top:none;">

            <!-- Customer section -->
            <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">Customer</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="padding:10px 14px;background:#f9fafb;border-radius:8px 8px 0 0;border-bottom:1px solid #f3f4f6;">
                  <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Name</p>
                  <p style="margin:3px 0 0;font-size:15px;font-weight:600;color:#111827;">${escapeHtml(customerName)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 14px;background:#f9fafb;border-bottom:1px solid #f3f4f6;">
                  <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Email</p>
                  <p style="margin:3px 0 0;font-size:14px;font-weight:500;">
                    <a href="mailto:${escapeHtml(customerEmail)}" style="color:#2d6a4f;text-decoration:none;">${escapeHtml(customerEmail)}</a>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 14px;background:#f9fafb;border-radius:0 0 8px 8px;">
                  <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Phone</p>
                  <p style="margin:3px 0 0;font-size:14px;font-weight:500;">
                    <a href="tel:${escapeHtml(customerPhone)}" style="color:#2d6a4f;text-decoration:none;">${escapeHtml(customerPhone)}</a>
                  </p>
                </td>
              </tr>
            </table>

            <!-- Courts & slots -->
            <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">Courts &amp; Time Slots</p>
            ${courtsHtml}

            ${notes ? `
            <!-- Notes -->
            <p style="margin:16px 0 10px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">Notes</p>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;">
              <p style="margin:0;font-size:14px;color:#92400e;line-height:1.5;">${escapeHtml(notes)}</p>
            </div>` : ""}

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:16px 36px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Transaction ID: <code style="font-family:monospace;background:#f3f4f6;padding:2px 6px;border-radius:4px;color:#6b7280;font-size:11px;">${reservationCode}</code>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  })
}

export interface CancellationEmailData {
  customerName: string
  customerEmail: string
  date: string
  reservationCode: string
  courts: CourtGroup[]
}

export async function sendCancellationEmail(data: CancellationEmailData) {
  const { resend, FROM_EMAIL, ADMIN_EMAIL, SITE_URL } = getEnv()
  const LOGO_URL = `${SITE_URL}/logo.png`

  const { customerName, customerEmail, date, reservationCode, courts } = data
  const formattedDate = formatDate(date)
  const totalSlots = courts.reduce((sum, c) => sum + c.slots.length, 0)

  const courtsHtml = courts.map((court) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border:1px solid #fecaca;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="background:#fef2f2;padding:8px 12px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;font-weight:700;color:#991b1b;">${escapeHtml(court.courtName)}</td>
              <td align="right" style="font-size:11px;font-weight:600;color:#b91c1c;text-transform:capitalize;">${escapeHtml(court.courtType)}</td>
            </tr>
          </table>
        </td>
      </tr>
      ${court.slots.map((s, i) => `
      <tr>
        <td style="padding:7px 12px;background:#fff5f5;border-top:1px solid #fecaca;">
          <span style="font-size:12px;font-weight:600;color:#991b1b;text-decoration:line-through;">${i + 1}. ${formatTime(s.startTime)} &ndash; ${formatTime(s.endTime)}</span>
        </td>
      </tr>`).join("")}
    </table>
  `).join("")

  // Send to customer
  await resend.emails.send({
    from: `Velocity Pickleball Hub <${FROM_EMAIL}>`,
    to: customerEmail,
    subject: `Booking Cancelled — ${reservationCode}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(150deg,#7f1d1d 0%,#991b1b 100%);border-radius:12px 12px 0 0;padding:28px 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td valign="middle">
                  <img src="${LOGO_URL}" alt="Velocity Pickleball Hub" width="40" height="40" style="border-radius:8px;display:block;" />
                </td>
                <td valign="middle" style="padding-left:12px;">
                  <p style="margin:0;font-size:13px;font-weight:700;color:#ffffff;letter-spacing:0.01em;">Velocity Pickleball Hub</p>
                  <p style="margin:1px 0 0;font-size:11px;color:rgba(255,255,255,0.45);letter-spacing:0.08em;text-transform:uppercase;">Cebu</p>
                </td>
                <td align="right" valign="middle">
                  <span style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:#ffffff;letter-spacing:0.08em;text-transform:uppercase;">Cancelled</span>
                </td>
              </tr>
            </table>
            <div style="margin-top:24px;">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Booking Cancelled</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.55);">Hi ${escapeHtml(customerName.split(" ")[0])}, your booking has been cancelled.</p>
            </div>
          </td>
        </tr>

        <!-- Reservation code band -->
        <tr>
          <td style="background:#111827;padding:12px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.4);">Reservation Code</td>
                <td align="right" style="font-family:monospace;font-size:15px;font-weight:700;color:#fca5a5;letter-spacing:0.08em;text-decoration:line-through;">${reservationCode}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:24px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Date</p>
            <p style="margin:0 0 20px;font-size:14px;font-weight:600;color:#111827;">${formattedDate}</p>

            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">Cancelled Slots</p>
            ${courtsHtml}

            <div style="margin-top:20px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;">
              <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.5;">This booking has been cancelled. The time slots are now available for others to book.</p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#1b4332;padding:20px 32px;border-radius:0 0 12px 12px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);">Want to rebook? Visit our website anytime.</p>
                  <p style="margin:10px 0 0;font-size:11px;color:rgba(255,255,255,0.35);">
                    Velocity Pickleball Hub &mdash; Cebu &nbsp;&middot;&nbsp;
                    <a href="${SITE_URL}" style="color:rgba(255,255,255,0.35);text-decoration:none;">${SITE_URL.replace("https://", "")}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  })

  // Notify admin
  if (ADMIN_EMAIL) {
    resend.emails.send({
      from: `Velocity Pickleball Hub <${FROM_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: `Booking Cancelled — ${escapeHtml(customerName)} · ${formattedDate} (${totalSlots} slot${totalSlots > 1 ? "s" : ""})`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td style="background:#7f1d1d;border-radius:12px 12px 0 0;padding:24px 36px;">
            <h1 style="margin:0;font-size:20px;font-weight:800;color:#ffffff;">Booking Cancelled by Customer</h1>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.6);">${escapeHtml(customerName)} &middot; ${formattedDate}</p>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:24px 36px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Reservation Code</p>
            <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#991b1b;font-family:monospace;">${reservationCode}</p>
            ${courtsHtml}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
      `,
    }).catch(console.error)
  }
}

export async function sendReceiptEmail(data: ReceiptEmailData) {
  const { resend, FROM_EMAIL, SITE_URL } = getEnv()
  const LOGO_URL = `${SITE_URL}/logo.png`

  const { customerName, customerEmail, date, reservationType, reservationCode, totalAmount, notes, courts } = data

  const formattedDate = formatDate(date)
  const formattedAmount = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(totalAmount)

  const courtsHtml = courts.map((court) => {
    const courtSubtotal = court.slots.reduce((sum, s) => sum + s.amount, 0)
    const formattedSubtotal = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(courtSubtotal)
    return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="background:#f0fdf4;padding:8px 14px;border-bottom:1px solid #d1fae5;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;font-weight:700;color:#14532d;">${escapeHtml(court.courtName)}</td>
              <td align="right">
                <span style="display:inline-block;background:#d1fae5;border:1px solid #bbf7d0;border-radius:20px;padding:2px 9px;font-size:11px;font-weight:600;color:#15803d;text-transform:capitalize;">${escapeHtml(court.courtType)}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${court.slots.map((s) => {
        const amt = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(s.amount)
        return `
      <tr>
        <td style="padding:8px 14px;border-bottom:1px solid #f3f4f6;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;font-weight:600;color:#111827;">${formatTime(s.startTime)} &ndash; ${formatTime(s.endTime)}</td>
              <td align="right" style="font-size:13px;font-weight:600;color:#6b7280;">${amt}</td>
            </tr>
          </table>
        </td>
      </tr>`
      }).join("")}
      ${courts.length > 1 ? `
      <tr>
        <td style="padding:7px 14px;background:#f9fafb;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Subtotal</td>
              <td align="right" style="font-size:13px;font-weight:700;color:#111827;">${formattedSubtotal}</td>
            </tr>
          </table>
        </td>
      </tr>` : ""}
    </table>`
  }).join("")

  await resend.emails.send({
    from: `Velocity Pickleball Hub <${FROM_EMAIL}>`,
    to: customerEmail,
    subject: `Booking Confirmed — ${reservationCode}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(150deg,#1b4332 0%,#2d6a4f 100%);border-radius:12px 12px 0 0;padding:28px 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td valign="middle">
                  <img src="${LOGO_URL}" alt="Velocity Pickleball Hub" width="40" height="40" style="border-radius:8px;display:block;" />
                </td>
                <td valign="middle" style="padding-left:12px;">
                  <p style="margin:0;font-size:13px;font-weight:700;color:#ffffff;letter-spacing:0.01em;">Velocity Pickleball Hub</p>
                  <p style="margin:1px 0 0;font-size:11px;color:rgba(255,255,255,0.45);letter-spacing:0.08em;text-transform:uppercase;">Cebu</p>
                </td>
                <td align="right" valign="middle">
                  <span style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:#ffffff;letter-spacing:0.08em;text-transform:uppercase;">Confirmed</span>
                </td>
              </tr>
            </table>
            <div style="margin-top:24px;">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Court Booking Receipt</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.55);">Hi ${escapeHtml(customerName.split(" ")[0])}, your reservation is all set.</p>
            </div>
          </td>
        </tr>

        <!-- Receipt code band -->
        <tr>
          <td style="background:#111827;padding:12px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.4);">Reservation Code</td>
                <td align="right" style="font-family:monospace;font-size:15px;font-weight:700;color:#6ee7b7;letter-spacing:0.08em;">${reservationCode}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Receipt body -->
        <tr>
          <td style="background:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:20px 32px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0">

                    <!-- Date & session type -->
                    <tr>
                      <td style="padding:11px 0;border-bottom:1px dashed #e5e7eb;">
                        <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Date</p>
                        <p style="margin:3px 0 0;font-size:14px;font-weight:600;color:#111827;">${formattedDate}</p>
                      </td>
                      <td align="right" style="padding:11px 0;border-bottom:1px dashed #e5e7eb;vertical-align:bottom;">
                        <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Session Type</p>
                        <p style="margin:3px 0 0;font-size:14px;font-weight:600;color:#111827;text-transform:capitalize;">${escapeHtml(reservationType)}</p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>

              <!-- Courts & slots -->
              <tr>
                <td style="padding:16px 32px 0;">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">Courts &amp; Time Slots</p>
                  ${courtsHtml}
                </td>
              </tr>

              <!-- Total row -->
              <tr>
                <td style="padding:0 32px 4px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:14px 16px;border:1px solid #e5e7eb;">
                    <tr>
                      <td style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280;">Total Amount Due</td>
                      <td align="right" style="font-size:22px;font-weight:800;color:#1b4332;">${formattedAmount}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <div style="margin:24px 0 0;border-top:2px dashed #e5e7eb;"></div>

            <!-- Before you arrive -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:20px 32px 24px;">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">Before You Arrive</p>
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding:5px 0;">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="width:20px;vertical-align:top;padding-top:1px;">
                              <div style="width:16px;height:16px;background:#d1fae5;border-radius:50%;text-align:center;line-height:16px;font-size:9px;color:#059669;font-weight:700;">✓</div>
                            </td>
                            <td style="font-size:13px;color:#374151;padding-left:8px;">Arrive 10 minutes before your session.</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="width:20px;vertical-align:top;padding-top:1px;">
                              <div style="width:16px;height:16px;background:#d1fae5;border-radius:50%;text-align:center;line-height:16px;font-size:9px;color:#059669;font-weight:700;">✓</div>
                            </td>
                            <td style="font-size:13px;color:#374151;padding-left:8px;">Present your code <strong style="color:#1b4332;">${reservationCode}</strong> at the front desk.</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="width:20px;vertical-align:top;padding-top:1px;">
                              <div style="width:16px;height:16px;background:#d1fae5;border-radius:50%;text-align:center;line-height:16px;font-size:9px;color:#059669;font-weight:700;">✓</div>
                            </td>
                            <td style="font-size:13px;color:#374151;padding-left:8px;">Wear proper court shoes — no outdoor footwear on indoor courts.</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#1b4332;padding:20px 32px;border-radius:0 0 12px 12px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <p style="margin:0;font-size:14px;font-style:italic;color:rgba(255,255,255,0.7);">&ldquo;Wishing you a great match.&rdquo;</p>
                  <p style="margin:10px 0 0;font-size:11px;color:rgba(255,255,255,0.35);">
                    Velocity Pickleball Hub &mdash; Cebu &nbsp;&middot;&nbsp;
                    <a href="${SITE_URL}" style="color:rgba(255,255,255,0.35);text-decoration:none;">${SITE_URL.replace("https://", "")}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  })
}
