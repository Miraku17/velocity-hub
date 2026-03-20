import Link from "next/link";

interface ServiceCardProps {
  icon: string;
  title: string;
  description: string;
  linkText: string;
  href: string;
  index: number;
}

function ServiceCard({
  icon,
  title,
  description,
  linkText,
  href,
  index,
}: ServiceCardProps) {
  return (
    <div
      className="group bg-surface-container-low p-8 rounded-xl hover:bg-surface-container transition-all duration-500 relative overflow-hidden"
      style={{ animationDelay: `${index * 100 + 100}ms` }}
    >
      {/* Subtle hover gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10">
        <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-lg flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-[-2deg] transition-all duration-500 shadow-[0_4px_20px_rgba(24,41,22,0.15)]">
          <span className="material-symbols-outlined text-3xl">{icon}</span>
        </div>
        <h3 className="font-headline text-2xl font-bold mb-4 tracking-tight">
          {title}
        </h3>
        <p className="font-body text-on-surface-variant text-sm leading-relaxed mb-6">
          {description}
        </p>
        <Link
          href={href}
          className="font-label text-xs font-bold uppercase tracking-widest text-primary inline-flex items-center gap-2 group-hover:gap-4 transition-all duration-300"
        >
          {linkText}
          <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </Link>
      </div>
    </div>
  );
}

const SERVICES = [
  {
    icon: "sports_tennis",
    title: "Court Rentals",
    description:
      "World-class indoor courts with pro-level lighting and surfacing. Available for private bookings.",
    linkText: "View Rates",
    href: "#",
  },
  {
    icon: "groups",
    title: "Open Play",
    description:
      "Join our social sessions. Meet new players, rotate in, and experience the community spirit.",
    linkText: "Check Schedule",
    href: "#",
  },
  {
    icon: "fitness_center",
    title: "Coaching",
    description:
      "Expert instruction for all levels. Private lessons or group clinics to sharpen your skills.",
    linkText: "Meet Coaches",
    href: "#",
  },
  {
    icon: "emoji_events",
    title: "Tournaments",
    description:
      "Competitive leagues and seasonal tournaments. Test your velocity against the best.",
    linkText: "Register Now",
    href: "#",
  },
];

export default function Services() {
  return (
    <section id="services" className="max-w-7xl mx-auto px-4 sm:px-8 py-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
        <div>
          <span className="font-label text-xs uppercase tracking-[0.3em] text-primary font-bold mb-4 block">
            Engineered for Play
          </span>
          <h2 className="font-headline text-4xl md:text-5xl font-black tracking-tight uppercase court-line">
            Elite Court Services
          </h2>
        </div>
        <p className="font-body text-on-surface-variant max-w-md text-sm md:text-base">
          Everything you need to master the game, from professional court
          rentals to elite coaching sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {SERVICES.map((service, i) => (
          <ServiceCard key={service.title} {...service} index={i} />
        ))}
      </div>
    </section>
  );
}
