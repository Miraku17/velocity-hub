import type { Metadata } from "next"
import Link from "next/link"
import Header from "@/app/components/Header"
import Footer from "@/app/components/Footer"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Velocity Pickleball Hub collects, uses, and protects your personal information.",
}

const SECTIONS = [
  {
    title: "1. Information We Collect",
    body: "When you make a reservation through our online booking platform, we collect your name, email address, and phone number. We do not require you to create an account. We may also collect basic usage data (pages visited, device type) through analytics tools to improve our website.",
  },
  {
    title: "2. How We Use Your Information",
    body: "Your personal information is used exclusively to confirm and manage your court reservation, send you booking confirmation and reminder emails, and contact you in case of any changes to your scheduled session. We do not use your information for marketing purposes without your explicit consent.",
  },
  {
    title: "3. Data Sharing",
    body: "We do not sell, trade, or rent your personal information to third parties. Your data may be shared only with trusted service providers who assist us in operating our platform (such as email delivery services), and only to the extent necessary to provide those services. These providers are bound by confidentiality obligations.",
  },
  {
    title: "4. Data Retention",
    body: "We retain your booking information for a period necessary to fulfill the purposes outlined in this policy and to comply with any legal obligations. Reservation records are typically retained for up to one year from the date of the session.",
  },
  {
    title: "5. Cookies & Analytics",
    body: "Our website may use cookies and similar tracking technologies to understand how visitors interact with the site. This data is aggregated and anonymous. You can disable cookies in your browser settings, though this may affect some website functionality.",
  },
  {
    title: "6. Data Security",
    body: "We take reasonable technical and organizational measures to protect your personal information from unauthorized access, loss, or misuse. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.",
  },
  {
    title: "7. Your Rights",
    body: "You have the right to request access to the personal information we hold about you, to request corrections, or to request deletion of your data. To exercise any of these rights, please contact us through our social media channels or visit our facility.",
  },
  {
    title: "8. Third-Party Links",
    body: "Our website may contain links to third-party websites (such as social media platforms). We are not responsible for the privacy practices of those sites and encourage you to review their policies separately.",
  },
  {
    title: "9. Children's Privacy",
    body: "Our services are not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will take steps to remove it.",
  },
  {
    title: "10. Changes to This Policy",
    body: "We may update this Privacy Policy from time to time. Any changes will be posted on this page with a revised date. Continued use of our services after such changes constitutes your acceptance of the updated policy.",
  },
  {
    title: "11. Contact Us",
    body: "If you have any questions or concerns about this Privacy Policy or how your data is handled, please reach us through our social media channels or visit us at our facility beside QC Pavilion, Gorordo Ave, Cebu City.",
  },
]

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="font-[Poppins] text-sm text-primary/40">
              Last updated: March 2026
            </p>
          </div>

          {/* Intro */}
          <p className="font-[Poppins] text-base text-primary/60 leading-relaxed mb-12">
            At Velocity Pickleball Hub, your privacy matters to us. This policy explains what personal information we collect, how we use it, and how we protect it when you use our website or book a court.
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
              <Link href="/terms" className="text-primary hover:underline">
                Terms &amp; Conditions
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
