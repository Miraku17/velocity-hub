import Image from "next/image";
import Link from "next/link";

const LOGO_URL =
  "https://lh3.googleusercontent.com/aida/ADBb0uh3ZE7MyDSIXVrH4wEurM-BCLoSHOAu6XRNPv7Hd_Vbxitg0mOl8SSicVemvmXsPTHSbQe9VFDm0WxSSgB3H0I5qVamnlFw1jSanMW2Oxfp0DkmGO_8tckV0TJXdRfSQvRrhLrjwdRYYPY5bAwVISp1ICJ0sCBKK8sYHpdVHkbXruYw3kwdSFMRzA2_4xRw3ErvuF48h-U_SLyA8xLgbompY69Q6LKLlqiJAbL7diMW18tHZEuktuGYOabOLKc0p_SlM4MrX7eMsgU";

const QUICK_LINKS = [
  { href: "#booking", label: "Book a Court" },
  { href: "#services", label: "Membership Rates" },
  { href: "#", label: "Event Schedule" },
  { href: "#", label: "Pro Shop" },
];

const SOCIAL_ICONS = [
  { icon: "facebook", label: "Facebook" },
  { icon: "public", label: "Website" },
  { icon: "chat", label: "WhatsApp" },
];

export default function Footer() {
  return (
    <footer className="bg-tertiary text-white pt-24 pb-12 relative overflow-hidden">
      {/* Subtle kinetic overlay */}
      <div className="absolute inset-0 kinetic-overlay opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-20 border-b border-white/8 pb-20">
          {/* Brand */}
          <div className="space-y-6">
            <div className="text-2xl font-black text-white tracking-[-0.06em] font-headline flex items-center">
              <Image
                src={LOGO_URL}
                alt="Velocity Logo"
                width={32}
                height={32}
                className="h-8 w-auto mr-3 invert opacity-90"
              />
              Velocity
            </div>
            <p className="font-body text-sm text-stone-400 leading-relaxed max-w-xs">
              Cebu&apos;s premier indoor pickleball destination. Built for
              performance, designed for community.
            </p>
            <div className="flex gap-3">
              {SOCIAL_ICONS.map((social) => (
                <Link
                  key={social.icon}
                  href="#"
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center hover:bg-white hover:text-primary transition-all duration-300 group"
                >
                  <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">
                    {social.icon}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h5 className="font-headline font-bold uppercase tracking-widest text-xs mb-8 text-white/80">
              Quick Links
            </h5>
            <ul className="space-y-4">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="font-body text-sm text-stone-400 hover:text-white hover:pl-1 transition-all duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h5 className="font-headline font-bold uppercase tracking-widest text-xs mb-8 text-white/80">
              Contact
            </h5>
            <ul className="space-y-4">
              <li className="flex gap-3 font-body text-sm text-stone-400">
                <span className="material-symbols-outlined text-sm text-stone-500">
                  phone
                </span>
                +63 912 345 6789
              </li>
              <li className="flex gap-3 font-body text-sm text-stone-400">
                <span className="material-symbols-outlined text-sm text-stone-500">
                  mail
                </span>
                play@velocitypickleball.ph
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h5 className="font-headline font-bold uppercase tracking-widest text-xs mb-8 text-white/80">
              Newsletter
            </h5>
            <p className="font-body text-xs text-stone-400 mb-6 leading-relaxed">
              Get the latest tournament news and member-only court access codes.
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="Email Address"
                className="bg-white/5 border border-white/10 rounded-l-lg px-4 py-2.5 text-xs w-full focus:outline-none focus:border-primary-fixed-dim/50 focus:bg-white/8 transition-all placeholder:text-stone-500"
              />
              <button className="bg-primary-fixed text-on-primary-fixed px-5 py-2.5 rounded-r-lg font-label text-[10px] font-bold uppercase hover:bg-white transition-colors duration-300 flex-shrink-0">
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-label uppercase tracking-widest text-stone-500">
            &copy; 2024 Velocity Pickleball Hub. Kinetic Precision Engineering.
          </p>
          <div className="flex gap-8">
            <Link
              href="#"
              className="text-[10px] font-label uppercase tracking-widest text-stone-500 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-[10px] font-label uppercase tracking-widest text-stone-500 hover:text-white transition-colors"
            >
              Terms of Play
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
