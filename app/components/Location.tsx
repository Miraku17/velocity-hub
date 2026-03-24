export default function Location() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 py-24">
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
        {/* Google Map */}
        <div className="flex-1 w-full h-[350px] md:h-[400px] rounded-[2rem] overflow-hidden relative group">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d981.3286480348152!2d123.9001117081166!3d10.31668871646746!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33a999004fe8bcd5%3A0x7259e73e0d931092!2sVELOCITY%20PICKLEBALL%20HUB!5e0!3m2!1sen!2sph!4v1774325927158!5m2!1sen!2sph"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Velocity Pickleball Hub Location"
          />
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
              Located beside QC Pavilion along Gorordo Ave, Cebu City. Easily accessible with ample parking for all players.
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
                    Beside QC Pavilion, Gorordo Ave, Cebu City, 6000 Cebu
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
