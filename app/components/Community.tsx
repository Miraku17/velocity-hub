import Image from "next/image";
import Link from "next/link";

const AVATAR_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAvp-7hq0e-D6ex2n9WBlJks-Ju9r_MMveFWCsfhIMHFlNp2bgSLm9grjASxwYRJwy8dZpuAu2kdBvS2dHtyfNEWAz95Ra5L_iiFsELWyc12kFHmb5LcBHkUyysxbaiIYwIEqgC1akv-XOkg0dchhzOEncCHaQOMRYCudIepobN7vfilA2xHyz5kcMwmNDaLfrBWoV24NL3CshfsBwmOYzhd93xcNyZgbAm3p7Caxh_xvS_UwhBBFu6agXVe9mXNmC0-k2sMdkLpzW1";

interface TestimonialProps {
  quote: string;
  name: string;
  role: string;
}

function StarRating() {
  return (
    <div className="flex gap-0.5 mb-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="material-symbols-outlined text-primary text-sm"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          star
        </span>
      ))}
    </div>
  );
}

function TestimonialCard({ quote, name, role }: TestimonialProps) {
  return (
    <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_2px_40px_rgba(27,28,24,0.04)] group hover:shadow-[0_8px_50px_rgba(27,28,24,0.08)] transition-all duration-500 relative overflow-hidden">
      {/* Tonal hover shift */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative z-10">
        <StarRating />
        <p className="font-body text-on-surface italic mb-8 leading-relaxed">
          &ldquo;{quote}&rdquo;
        </p>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-fixed overflow-hidden relative ring-2 ring-surface-container-low">
            <Image src={AVATAR_URL} alt={name} fill className="object-cover" />
          </div>
          <div>
            <h5 className="font-headline font-bold text-sm">{name}</h5>
            <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60">
              {role}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const TESTIMONIALS: TestimonialProps[] = [
  {
    quote:
      "The best indoor courts in the city. The surface is consistent and the vibe is always electric.",
    name: "Carlo Santos",
    role: "Local Member",
  },
  {
    quote:
      "I started as a total beginner. The drills clinics here completely transformed my game in just a month.",
    name: "Maya Rodriguez",
    role: "Clinic Regular",
  },
  {
    quote:
      "Professional setup, great lighting, and the community is super welcoming. My favorite place to play.",
    name: "James Tan",
    role: "Weekend Warrior",
  },
];

export default function Community() {
  return (
    <section id="community" className="max-w-7xl mx-auto px-4 sm:px-8 py-24 relative">
      {/* Ambient decorative element */}
      <div className="absolute top-20 left-0 w-[300px] h-[300px] bg-primary-fixed/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="text-center mb-20 relative z-10">
        <span className="font-label text-xs uppercase tracking-[0.3em] text-primary font-bold mb-4 block">
          Our Community
        </span>
        <h2 className="font-headline text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-[-0.03em] mb-6">
          Join 500+ Players in Cebu
        </h2>
        <p className="font-body text-on-surface-variant max-w-2xl mx-auto italic text-base md:text-lg">
          &ldquo;Velocity isn&apos;t just a court, it&apos;s where the community
          finds its rhythm.&rdquo;
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 relative z-10">
        {TESTIMONIALS.map((testimonial) => (
          <TestimonialCard key={testimonial.name} {...testimonial} />
        ))}
      </div>

      <div className="flex justify-center relative z-10">
        <Link
          href="#"
          className="group inline-flex items-center gap-4 px-8 py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-lg font-label font-bold uppercase tracking-widest hover:shadow-[0_8px_30px_rgba(24,41,22,0.25)] hover:translate-y-[-1px] transition-all duration-300"
        >
          Follow us on Instagram
          <span className="material-symbols-outlined group-hover:rotate-[-15deg] transition-transform duration-300">
            link
          </span>
        </Link>
      </div>
    </section>
  );
}
