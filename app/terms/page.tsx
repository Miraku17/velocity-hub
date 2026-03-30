import type { Metadata } from "next"
import Link from "next/link"
import Header from "@/app/components/Header"
import Footer from "@/app/components/Footer"

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for using Velocity Pickleball Hub's courts and booking services.",
}

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing our facilities or using our online booking platform, you agree to be bound by these Terms and Conditions. If you do not agree to any part of these terms, please do not use our services.",
  },
  {
    title: "2. Court Bookings",
    body: "All court reservations are subject to availability. A booking is only confirmed once you receive a confirmation email with a reservation code. Velocity Pickleball Hub reserves the right to cancel or reschedule bookings due to facility maintenance, safety concerns, or force majeure events.",
  },
  {
    title: "3. Payment",
    body: "Payment is due at the time of play unless otherwise arranged. We accept cash and major digital payment methods. Prices are listed in Philippine Peso (₱) and are subject to change without prior notice.",
  },
  {
    title: "4. No Cancellation Policy",
    body: "Once confirmed, no cancellations or refunds. Can't make it? Find someone to take your slot and settle payment directly.",
  },
  {
    title: "5. Walk-In Policy",
    body: "Walk-in players are welcome subject to court availability. We cannot guarantee court access for walk-ins during peak hours. We recommend booking online in advance to secure your preferred time slot.",
  },
  {
    title: "6. Player Conduct",
    body: "All players are expected to behave respectfully toward staff, other players, and the facility. Velocity Pickleball Hub reserves the right to remove any individual from the premises for disruptive, unsafe, or inappropriate behavior without a refund.",
  },
  {
    title: "7. Liability Waiver",
    body: "Pickleball is a physical sport that carries inherent risks of injury. By using our facilities, you acknowledge these risks and agree that Velocity Pickleball Hub, its owners, staff, and affiliates are not liable for any personal injury, loss, or damage to property sustained during your visit.",
  },
  {
    title: "8. Facility Rules",
    body: "Players must wear proper non-marking athletic shoes on all courts. Food and beverages are not permitted on the court surface. Outside alcohol is strictly prohibited. Please observe proper court etiquette and time management during your session.",
  },
  {
    title: "9. Privacy",
    body: "Personal information collected during booking (name, email, phone number) is used solely to manage your reservation and communicate with you regarding your session. We do not sell your data to third parties. See our Privacy Policy for full details.",
  },
  {
    title: "10. Changes to Terms",
    body: "Velocity Pickleball Hub reserves the right to update these Terms and Conditions at any time. Continued use of our services after any changes constitutes your acceptance of the revised terms.",
  },
  {
    title: "11. Contact",
    body: "For questions about these terms, please reach us through our social media channels or visit us at our facility beside QC Pavilion, Gorordo Ave, Cebu City.",
  },
]

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface pt-24 pb-24">
        <div className="max-w-3xl mx-auto px-6 sm:px-10">

          {/* Header */}
          <div className="mb-14">
            <span className="inline-block font-['Clash_Display'] text-xs font-bold uppercase tracking-[0.2em] text-primary/40 mb-4">
              Legal
            </span>
            <h1 className="font-['Clash_Display'] text-4xl sm:text-5xl font-bold tracking-tight text-primary mb-4">
              Terms &amp; Conditions
            </h1>
            <p className="font-[Poppins] text-sm text-primary/40">
              Last updated: March 2026
            </p>
          </div>

          {/* Intro */}
          <p className="font-[Poppins] text-base text-primary/60 leading-relaxed mb-12">
            Please read these terms carefully before booking a court or visiting Velocity Pickleball Hub. These terms govern your use of our facilities and online booking services.
          </p>

          {/* Sections */}
          <div className="space-y-10">
            {SECTIONS.map((section) => (
              <div key={section.title} className="border-t border-primary/8 pt-8">
                <h2 className="font-['Clash_Display'] text-lg font-bold text-primary mb-3">
                  {section.title}
                </h2>
                <p className="font-[Poppins] text-sm text-primary/60 leading-relaxed">
                  {section.body}
                </p>
              </div>
            ))}
          </div>

          {/* Footer link */}
          <div className="mt-16 pt-10 border-t border-primary/8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <p className="font-[Poppins] text-sm text-primary/40">
              Also see our{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
            <Link
              href="/"
              className="font-[Poppins] text-sm font-semibold text-primary hover:text-primary/60 transition-colors"
            >
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
