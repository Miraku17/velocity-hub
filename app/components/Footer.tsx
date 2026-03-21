"use client";

import Link from "next/link";
import { Facebook, Instagram, Youtube } from "lucide-react";

const NAV_COLUMNS = [
  {
    title: "Home",
    links: [
      { href: "#services", label: "About" },
      { href: "#community", label: "Membership" },
      { href: "#facility", label: "Coaches" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "#facility", label: "Accessories" },
      { href: "#", label: "Terms & Conditions" },
      { href: "#", label: "Privacy Policy" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "#", label: "FAQ" },
      { href: "#", label: "Contact Us" },
      { href: "#", label: "Help Center" },
    ],
  },
];

const SOCIAL_LINKS = [
  { icon: Facebook, label: "Facebook", href: "https://www.facebook.com/velocitypickleballhub" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Youtube, label: "YouTube", href: "#" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-surface relative overflow-hidden">
      {/* ── Top section ── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left: Headline + Email */}
          <div>
            <h2 className="font-['Clash_Display'] text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1] tracking-tight text-primary mb-12">
              Let&apos;s Start Your
              <br />
              <span className="text-primary-fixed-dim italic font-medium">
                Journey Here
              </span>
            </h2>

            <form
              className="flex items-center gap-4 max-w-lg"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="flex-1 relative">
                <input
                  type="email"
                  placeholder="Send email to us"
                  className="w-full bg-transparent border-b border-primary/20 pb-3 pt-1 text-sm font-[Poppins] text-primary placeholder:text-primary/30 focus:outline-none focus:border-primary-fixed-dim transition-colors"
                />
              </div>
              <button
                type="submit"
                className="px-8 py-3 bg-primary-fixed-dim text-primary font-[Poppins] font-semibold text-sm rounded-full hover:bg-primary hover:text-white transition-all duration-300 shrink-0"
              >
                Submit
              </button>
            </form>
          </div>

          {/* Right: Nav columns + Social */}
          <div className="flex flex-col gap-12">
            <div className="grid grid-cols-3 gap-8">
              {NAV_COLUMNS.map((col) => (
                <div key={col.title}>
                  <h5 className="font-['Clash_Display'] font-bold text-sm text-primary mb-5">
                    {col.title}
                  </h5>
                  <ul className="space-y-3">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="font-[Poppins] text-sm text-primary/50 hover:text-primary transition-colors duration-300"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Social icons */}
            <div className="flex gap-3 justify-end">
              {SOCIAL_LINKS.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-11 h-11 rounded-full bg-primary flex items-center justify-center hover:bg-primary-fixed-dim transition-colors duration-300 group"
                >
                  <social.icon className="w-4.5 h-4.5 text-white group-hover:text-primary transition-colors duration-300" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="h-px bg-primary/10" />
      </div>

      {/* ── Giant brand watermark ── */}
      <div className="relative overflow-hidden py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
          <span className="font-['Clash_Display'] text-[clamp(5rem,15vw,14rem)] font-bold leading-none tracking-tight text-primary/[0.04] select-none block">
            Velocity
          </span>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-[Poppins] text-xs text-primary/30">
            Copyright&copy; {currentYear} Velocity Pickleball Hub. All Rights
            Reserved.
          </p>

          <div className="flex items-center gap-8">
            <Link
              href="#"
              className="font-[Poppins] text-xs text-primary/30 hover:text-primary transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="#"
              className="font-[Poppins] text-xs text-primary/30 hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
