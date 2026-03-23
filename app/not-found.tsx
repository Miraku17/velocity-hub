import Link from "next/link"
import Image from "next/image"

export default function NotFound() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-surface px-6">
      {/* Background dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(#182916 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Grain */}
      <div className="grain-overlay absolute inset-0" />

      {/* Content */}
      <div className="relative z-10 flex max-w-md flex-col items-center text-center">
        {/* Logo */}
        <Image
          src="/logo.png"
          alt="Velocity Pickleball Hub"
          width={48}
          height={48}
          className="mb-8"
        />

        {/* 404 number */}
        <p className="font-headline text-[120px] font-extrabold leading-none tracking-tighter text-primary/10 sm:text-[160px]">
          404
        </p>

        {/* Message */}
        <h1 className="mt-2 font-headline text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          Out of bounds
        </h1>
        <p className="mt-3 font-body text-sm leading-relaxed text-on-surface-variant">
          Looks like this shot landed outside the court. The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Court line accent */}
        <div className="mt-6 h-[3px] w-16 rounded-full bg-gradient-to-r from-primary to-primary-container" />

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 font-nav text-sm font-medium tracking-wide text-on-primary transition-all hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98]"
          >
            Back to Home
          </Link>
          <Link
            href="/booking"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-outline-variant/40 bg-transparent px-6 font-nav text-sm font-medium tracking-wide text-on-surface transition-all hover:bg-surface-container active:scale-[0.98]"
          >
            Book a Court
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 font-label text-[10px] text-outline">
        &copy; 2026 Velocity Pickleball Hub
      </p>
    </div>
  )
}
