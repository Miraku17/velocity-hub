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
export default function Home() {
  return (
    <>
      <Header />
      <main className="pt-24">
        <Hero />
        <ShotTerms />
        <Services />
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
