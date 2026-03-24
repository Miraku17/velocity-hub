import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Pickleball Court in Cebu — Online Reservation",
  description:
    "Reserve a pickleball court at Velocity Pickleball Hub in Cebu. Choose from 6 premium indoor and outdoor courts. No membership required — book online in seconds.",
  keywords: [
    "book pickleball court Cebu",
    "pickleball reservation Cebu",
    "rent pickleball court Cebu City",
    "online pickleball booking Philippines",
    "Velocity Pickleball Hub booking",
  ],
  openGraph: {
    title: "Book a Pickleball Court — Velocity Pickleball Hub",
    description:
      "Reserve your court online at Velocity Pickleball Hub, Cebu. 6 premium courts, no membership needed.",
    url: "https://velocitypickleballcebu.com/booking",
  },
};

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
