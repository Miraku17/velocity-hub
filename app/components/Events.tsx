interface EventCardProps {
  date: string;
  dateStyle: "default" | "closed";
  icon: string;
  title: string;
  description: string;
  buttonText: string;
}

function EventCard({
  date,
  dateStyle,
  icon,
  title,
  description,
  buttonText,
}: EventCardProps) {
  return (
    <div className="bg-white/[0.04] backdrop-blur-md rounded-2xl p-8 border border-white/8 group hover:bg-white/[0.08] hover:border-white/15 transition-all duration-500 relative overflow-hidden">
      {/* Hover glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-fixed/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <span
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest ${
              dateStyle === "closed"
                ? "bg-error text-white"
                : "bg-primary-fixed text-on-primary-fixed"
            }`}
          >
            {date}
          </span>
          <span className="material-symbols-outlined text-primary-fixed-dim opacity-60 group-hover:opacity-100 group-hover:rotate-[-8deg] transition-all duration-300">
            {icon}
          </span>
        </div>
        <h3 className="font-headline text-2xl font-bold mb-2 tracking-tight">
          {title}
        </h3>
        <p className="font-body text-white/65 text-sm mb-6 leading-relaxed">
          {description}
        </p>
        <button className="w-full py-3 border border-white/15 rounded-lg font-label text-xs font-bold uppercase tracking-widest group-hover:bg-white group-hover:text-primary group-hover:border-white transition-all duration-300">
          {buttonText}
        </button>
      </div>
    </div>
  );
}

const EVENTS: EventCardProps[] = [
  {
    date: "Oct 28",
    dateStyle: "default",
    icon: "event",
    title: "Beginner Fundamentals",
    description:
      "Master the basics: serves, returns, and kitchen play. 2-hour session with Coach Marcus.",
    buttonText: "Register Now",
  },
  {
    date: "Nov 04",
    dateStyle: "closed",
    icon: "emoji_events",
    title: "Winter Open Doubles",
    description:
      "Cebu's premier amateur tournament. Mixed categories from 3.0 to 4.5+ DUPR.",
    buttonText: "Registration Closed",
  },
  {
    date: "Weekly",
    dateStyle: "default",
    icon: "groups",
    title: "Velocity League",
    description:
      "Join our Tuesday night ladder league. Consistent competition for all skill levels.",
    buttonText: "Join Waitlist",
  },
];

export default function Events() {
  return (
    <section className="bg-gradient-to-br from-primary via-primary to-primary-container text-on-primary py-24 overflow-hidden relative grain-overlay">
      <div className="absolute inset-0 kinetic-overlay" />

      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-fixed/[0.04] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary-container/30 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
          <div>
            <span className="font-label text-xs uppercase tracking-[0.3em] text-primary-fixed-dim font-bold mb-4 block">
              Competition Schedule
            </span>
            <h2 className="font-headline text-4xl md:text-5xl font-black uppercase tracking-tight leading-none">
              The Calendar
            </h2>
          </div>
          <button className="bg-white/8 backdrop-blur-sm border border-white/15 px-6 py-3 rounded-lg font-label text-xs font-bold uppercase tracking-widest hover:bg-white/15 hover:border-white/25 transition-all duration-300">
            View Full Schedule
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EVENTS.map((event) => (
            <EventCard key={event.title} {...event} />
          ))}
        </div>
      </div>
    </section>
  );
}
