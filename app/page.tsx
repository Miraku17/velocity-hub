import Header from "./components/Header";
import Hero from "./components/Hero";
import Services from "./components/Services";
import Booking from "./components/Booking";
import Facility from "./components/Facility";
import Community from "./components/Community";
import Events from "./components/Events";
import Location from "./components/Location";
import Footer from "./components/Footer";
import StickyBookingCTA from "./components/StickyBookingCTA";

export default function Home() {
  return (
    <>
      <Header />
      <main className="pt-24">
        <Hero />
        <Services />
        <Booking />
        <Facility />
        <Community />
        <Events />
        <Location />
      </main>
      <Footer />
      <StickyBookingCTA />
    </>
  );
}
