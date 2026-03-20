import Image from "next/image";

const COURTS_IMAGE =
  "https://lh3.googleusercontent.com/aida/ADBb0ujgUjZ4vpAeLoKy-PGL3pgg2-K5Jf57KNEvrM1x5_om2UWxjPJsx_DRg2Qf6I9FhAxJGykxQHUQ_Wh1knt4j-jQTa8kHSIf7_6_vVT24V5Yn0WAemq9wlhnbYAxhVRUQHvtdOdfmfIGkhP1QO68Ko8aa2d5ijP3RuCGktwq-thbtImJOej9rpUirR3tjC-UJqJlYU2ySy-ZvIQTEI49bfqkXyIcZ4adq3IUdCP9j4JKyK8OJ9p0Q-PEvQKs6Vdvknijh6SooV04eQQ";

const LIGHTING_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBUy94cny_tdRLwAUxQCst2ObT2V8pw23sZ6YDlvj2mC22MGwQGa5mRtDiuOVLWcdVcTlhE6j5ylgPqTt82-P_ppDnK6BnNHJawWlD35liOpumVgp1cOA7EleNcMEi4ONLwWQWff-ULhbcCT4fRg_yopCZ8YkobjZoH_CQMd0hoB0OIc55iWXoIF2nOkVPzsZPiQZm6InEw9MrKyKx65SiPu8toC0m_66tCQ2vx1XLu-LbLUDcei2Fb4SNJMxXBg44Vj0Oh9qjtmUOG";

const BRANDS = [
  { icon: "new_releases", label: "Selkirk Pro Gear" },
  { icon: "high_quality", label: "Joola Authorized" },
  { icon: "verified", label: "PPA Certified" },
];

export default function Facility() {
  return (
    <section
      id="facility"
      className="py-24 bg-surface-container-low overflow-hidden relative"
    >
      {/* Subtle ambient glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-primary/[0.02] rounded-full blur-[120px] pointer-events-none" />

      {/* Section header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <span className="font-label text-xs uppercase tracking-[0.3em] text-primary font-bold mb-4 block">
            World-Class Venue
          </span>
          <h2 className="font-headline text-4xl md:text-5xl font-black uppercase tracking-tight leading-none court-line">
            The Arena
          </h2>
        </div>
        <p className="font-body text-on-surface-variant max-w-sm italic text-sm md:text-base">
          &ldquo;Precision in every corner, performance in every bounce.&rdquo;
        </p>
      </div>

      {/* Image grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 px-4 sm:px-8 max-w-7xl mx-auto">
        {/* Main courts image */}
        <div className="md:col-span-8 h-[350px] md:h-[500px] rounded-2xl overflow-hidden group relative">
          <Image
            src={COURTS_IMAGE}
            alt="Main Courts"
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-[1200ms] ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute bottom-8 left-8">
            <span className="bg-primary/90 text-white px-4 py-2 rounded-lg font-label font-bold text-xs uppercase tracking-widest backdrop-blur-md shadow-lg">
              Professional Courts
            </span>
          </div>
          {/* Asymmetric court number overlay */}
          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-500">
            <span className="font-headline text-8xl font-black text-white/10 leading-none">
              06
            </span>
          </div>
        </div>

        {/* Right column */}
        <div className="md:col-span-4 grid grid-rows-2 gap-4 md:gap-6">
          {/* Lighting card */}
          <div className="h-[200px] md:h-auto rounded-2xl overflow-hidden group relative">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/30 to-transparent flex flex-col justify-end p-8 text-white z-10">
              <h4 className="font-headline text-xl font-bold uppercase">
                Pro Lighting
              </h4>
              <p className="text-xs opacity-80 mt-2">
                No-glare LED engineering
              </p>
            </div>
            <Image
              src={LIGHTING_IMAGE}
              alt="Lighting Detail"
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-700"
            />
          </div>

          {/* Lounge card */}
          <div className="bg-gradient-to-br from-primary-container to-primary rounded-2xl p-8 flex flex-col justify-between group relative overflow-hidden">
            <div className="absolute inset-0 kinetic-overlay opacity-50 pointer-events-none" />
            <div className="flex justify-between items-start relative z-10">
              <span className="material-symbols-outlined text-primary-fixed-dim text-4xl group-hover:rotate-[-8deg] transition-transform duration-300">
                weekend
              </span>
              <span className="font-label text-[10px] text-white/40 uppercase tracking-widest">
                Amenities
              </span>
            </div>
            <div className="relative z-10">
              <h4 className="font-headline text-xl font-bold text-white uppercase mb-2">
                Social Lounge
              </h4>
              <p className="text-xs text-primary-fixed-dim leading-relaxed">
                Ergonomic seating areas designed for post-match recovery and
                community building.
              </p>
            </div>
          </div>
        </div>

        {/* Brands bar */}
        <div className="md:col-span-12 py-12 md:py-16 bg-surface-container-lowest rounded-2xl flex flex-wrap items-center justify-around px-8 gap-8 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
          {BRANDS.map((brand) => (
            <div
              key={brand.label}
              className="flex flex-col items-center gap-3 group/brand"
            >
              <span className="material-symbols-outlined text-4xl text-primary group-hover/brand:scale-110 transition-transform">
                {brand.icon}
              </span>
              <span className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {brand.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
