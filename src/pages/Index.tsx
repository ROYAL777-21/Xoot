import { Navbar } from "@/components/xoot/Navbar";
import { BookingHero } from "@/components/xoot/BookingHero";
import { Services } from "@/components/xoot/Services";
import { NearbyWorkers } from "@/components/xoot/NearbyWorkers";
import { HowItWorks } from "@/components/xoot/HowItWorks";
import { SafetyTrust } from "@/components/xoot/SafetyTrust";
import { BecomeXooter } from "@/components/xoot/BecomeXooter";
import { TrustedBy } from "@/components/xoot/TrustedBy";
import { HomeExpansion } from "@/components/xoot/HomeExpansion";
import { CtaBand } from "@/components/xoot/CtaBand";
import { Footer } from "@/components/xoot/Footer";
import { FeedbackSection } from "@/components/xoot/FeedbackSection";
import { SEO } from "@/components/SEO";
import { ServiceAreaMap } from "@/components/xoot/ServiceAreaMap";
import { GapArrow } from "@/components/xoot/GapArrow";
import { PeopleBand } from "@/components/xoot/PeopleBand";
import { Journal } from "@/components/xoot/Journal";
import { Merch } from "@/components/xoot/Merch";
import { TrustMechanisms } from "@/components/xoot/TrustMechanisms";
import { ReferSection } from "@/components/xoot/ReferSection";
import { Reviews } from "@/components/xoot/Reviews";
import { GiftClean } from "@/components/xoot/GiftClean";
import { ReferralWelcome } from "@/components/xoot/ReferralWelcome";
import { BookingModal } from "@/components/xoot/BookingModal";
import { useState } from "react";

const homeStructuredData = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://xoot.co.za/#org",
  name: "Xoot",
  description: "Premium home-services marketplace for vetted cleaning, Airbnb turns, office resets, Care+, and trusted recurring home care.",
  url: "https://xoot.co.za/",
  areaServed: ["Sandton", "Bryanston", "Rosebank", "Midrand", "Fourways", "Waterfall", "Hyde Park", "Parkhurst", "Melville"],
  priceRange: "R",
  serviceType: ["House cleaning", "Office cleaning", "Move-out cleaning", "Airbnb cleaning", "Premium home care"],
};

const Index = () => {
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Xoot - Premium cleaning and home care in Johannesburg"
        description="Book vetted Xooters for cleaning, Airbnb turns, office resets, move-out cleans and Care+ home care across Johannesburg launch suburbs."
        canonical="/"
        jsonLd={homeStructuredData}
      />
      <ReferralWelcome onBook={() => setBookingModalOpen(true)} />
      <Navbar />
      <main className="relative z-20">
        <h1 className="sr-only">Xoot - Premium home services with trust, safety, and retention workflows</h1>
        <BookingHero />
        <TrustedBy />
        <ServiceAreaMap />
        <Services />
        <GiftClean />
        {/* The three connectors sit where the 2026-09-03 handoff places them, with its own
            offsets and alternating tilt. They occupy no height, so they change the page's
            texture without changing its rhythm. */}
        <GapArrow offset={-58} rotate={-8} />
        <SafetyTrust />
        <TrustMechanisms />
        <PeopleBand />
        <Reviews />
        <GapArrow offset={-54} rotate={7} colour="var(--xoot-violet-600)" />
        <NearbyWorkers />
        <HowItWorks />
        <GapArrow offset={-58} rotate={-6} />
        <BecomeXooter />
        <HomeExpansion />
        <Merch />
        <Journal />
        <FeedbackSection />
        <ReferSection />
        <CtaBand />
      </main>
      <Footer />
      <BookingModal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
      />
    </div>
  );
};

export default Index;
