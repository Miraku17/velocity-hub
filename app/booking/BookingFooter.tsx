import Link from "next/link";

export function BookingFooter({ bg, surface }: { bg: string; surface: string }) {
  return (
    <footer
      className="relative z-10 mt-6 sm:mt-10"
      style={{ borderTop: `1px solid ${bg}08`, backgroundColor: surface }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-4 sm:py-6 flex items-center justify-between">
        <p
          className="font-[Poppins] text-[9px] sm:text-[10px]"
          style={{ color: `${bg}30` }}
        >
          &copy; {new Date().getFullYear()} Velocity Pickleball Hub
        </p>
        <Link
          href="https://www.facebook.com/velocitypickleballhub"
          target="_blank"
          rel="noopener noreferrer"
          className="font-[Poppins] text-[9px] sm:text-[10px] transition-colors"
          style={{ color: `${bg}30` }}
        >
          Facebook
        </Link>
      </div>
    </footer>
  );
}
