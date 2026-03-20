export default function Location() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 py-24">
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
        {/* Map placeholder */}
        <div className="flex-1 w-full h-[350px] md:h-[400px] bg-surface-container-highest rounded-[2rem] overflow-hidden relative group">
          <div className="absolute inset-0 grid-pattern opacity-15 group-hover:opacity-30 transition-opacity duration-700" />

          {/* Ambient glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl text-primary animate-bounce">
                location_on
              </span>
              <p className="font-headline font-black text-2xl mt-4 uppercase tracking-tight">
                IT Park, Cebu City
              </p>
            </div>
          </div>
          <div className="absolute bottom-6 right-6">
            <button className="bg-surface-container-lowest text-primary px-6 py-3 rounded-lg font-label font-bold text-xs shadow-[0_4px_20px_rgba(27,28,24,0.08)] flex items-center gap-2 hover:bg-primary hover:text-white transition-all duration-300">
              Open in Maps
              <span className="material-symbols-outlined text-sm">
                open_in_new
              </span>
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="lg:w-1/3 space-y-10">
          <div>
            <span className="font-label text-xs uppercase tracking-[0.3em] text-primary font-bold mb-4 block">
              Find Us
            </span>
            <h2 className="font-headline text-4xl font-black uppercase tracking-tight mb-6 court-line">
              Locate Velocity
            </h2>
            <p className="font-body text-on-surface-variant leading-relaxed mb-8 text-sm md:text-base">
              Located in the heart of Cebu, our facility is easily accessible
              with ample parking for all players.
            </p>

            <div className="space-y-6">
              <div className="flex gap-4 group/item">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary group-hover/item:text-white transition-colors duration-300">
                  <span className="material-symbols-outlined text-primary group-hover/item:text-white transition-colors">
                    location_on
                  </span>
                </div>
                <div>
                  <h5 className="font-headline font-bold uppercase text-sm mb-1">
                    Address
                  </h5>
                  <p className="text-on-surface-variant text-sm font-body leading-relaxed">
                    Velocity Hub, Unit 4B, Central Bloc IT Park, Cebu City,
                    Philippines
                  </p>
                </div>
              </div>
              <div className="flex gap-4 group/item">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary group-hover/item:text-white transition-colors duration-300">
                  <span className="material-symbols-outlined text-primary group-hover/item:text-white transition-colors">
                    schedule
                  </span>
                </div>
                <div>
                  <h5 className="font-headline font-bold uppercase text-sm mb-1">
                    Opening Hours
                  </h5>
                  <p className="text-on-surface-variant text-sm font-body">
                    Monday &ndash; Sunday: 06:00 AM &ndash; 11:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
