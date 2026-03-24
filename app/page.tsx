import Header from "./components/Header";
import Hero from "./components/Hero";
import Services from "./components/Services";
import Booking from "./components/Booking";
import Facility from "./components/Facility";
import Community from "./components/Community";
import Location from "./components/Location";
import Footer from "./components/Footer";
import ShotTerms from "./components/ShotTerms";
import FlowingMenuSection from "./components/FlowingMenuSection";
import CallToAction from "./components/CallToAction";
import FAQ from "./components/FAQ";
const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["SportsActivityLocation", "LocalBusiness"],
  "@id": "https://velocitypickleball.com/#business",
  name: "Velocity Pickleball Hub",
  description:
    "Premium pickleball courts in Cebu with 6 indoor and outdoor courts. No membership required — book online or walk in.",
  url: "https://velocitypickleball.com",
  logo: "https://velocitypickleball.com/logo.png",
  image: [
    "https://velocitypickleball.com/hero.png",
    "https://velocitypickleball.com/logo.png",
  ],
  sport: "Pickleball",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Cebu City",
    addressRegion: "Cebu",
    addressCountry: "PH",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 10.3157,
    longitude: 123.8854,
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    opens: "06:00",
    closes: "22:00",
  },
  priceRange: "$$",
  currenciesAccepted: "PHP",
  paymentAccepted: "GCash, Cash",
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Indoor Courts", value: true },
    { "@type": "LocationFeatureSpecification", name: "Outdoor Courts", value: true },
    { "@type": "LocationFeatureSpecification", name: "Online Booking", value: true },
    { "@type": "LocationFeatureSpecification", name: "Walk-ins Welcome", value: true },
  ],
  potentialAction: {
    "@type": "ReserveAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://velocitypickleball.com/booking",
      actionPlatform: [
        "http://schema.org/DesktopWebPlatform",
        "http://schema.org/MobileWebPlatform",
      ],
    },
    result: {
      "@type": "Reservation",
      name: "Court Reservation",
    },
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="pt-24">
        <Hero />
        <ShotTerms />
        {/* <Services /> */}
        <Booking />
        <Facility />
        <Community />
        {/* <FlowingMenuSection /> */}
        <FAQ />
        <Location />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
