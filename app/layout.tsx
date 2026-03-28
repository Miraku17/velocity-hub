import type { Metadata } from "next";
import { Space_Grotesk, Manrope, Lexend, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/lib/providers";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-headline",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

const lexend = Lexend({
  variable: "--font-label",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});


export const metadata: Metadata = {
  title: {
    default: "Velocity Pickleball Hub | Pickleball Courts in Cebu — Book Online",
    template: "%s | Velocity Pickleball Hub",
  },
  description:
    "Book pickleball courts in Cebu at Velocity Pickleball Hub — 6 premium indoor & outdoor courts open daily. Walk-ins welcome, no membership needed. Reserve online in seconds.",
  keywords: [
    "pickleball courts Cebu",
    "pickleball Cebu",
    "indoor pickleball Cebu",
    "book pickleball court Cebu",
    "Velocity Pickleball Hub",
    "pickleball court rental Cebu",
    "pickleball Philippines",
    "Cebu pickleball",
    "pickleball near me Cebu",
    "best pickleball courts Cebu",
    "outdoor pickleball Cebu",
    "pickleball hub Cebu City",
    "pickleball Cebu City",
    "pickleball court booking online",
    "walk-in pickleball Cebu",
  ],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  metadataBase: new URL("https://velocitypickleballcebu.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_PH",
    siteName: "Velocity Pickleball Hub",
    title: "Velocity Pickleball Hub | Pickleball Courts in Cebu",
    description:
      "6 premium pickleball courts in Cebu — covered & outdoor. No membership required. Book your court online in seconds.",
    url: "https://velocitypickleballcebu.com",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 800,
        alt: "Velocity Pickleball Hub Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Velocity Pickleball Hub | Pickleball Courts in Cebu",
    description:
      "Book pickleball courts in Cebu — 6 premium courts, no membership needed. Reserve online now.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "sports",
  other: {
    "geo.region": "PH-CEB",
    "geo.placename": "Cebu City",
    "geo.position": "10.3167497;123.9000693",
    "ICBM": "10.3167497, 123.9000693",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(spaceGrotesk.variable, manrope.variable, lexend.variable, "font-sans", geist.variable)}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          async
          defer
        ></script>
      </head>
      <body className="bg-surface text-on-surface font-body">
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors />
        <Analytics />
      </body>
    </html>
  );
}
