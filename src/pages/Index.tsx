import { Navbar } from "@/components/zoot/Navbar";
import { BookingHero } from "@/components/zoot/BookingHero";
import { Services } from "@/components/zoot/Services";
import { NearbyWorkers } from "@/components/zoot/NearbyWorkers";
import { HowItWorks } from "@/components/zoot/HowItWorks";
import { SafetyTrust } from "@/components/zoot/SafetyTrust";
import { BecomeZooter } from "@/components/zoot/BecomeZooter";
import { TrustedBy } from "@/components/zoot/TrustedBy";
import { HomeExpansion } from "@/components/zoot/HomeExpansion";
import { CtaBand } from "@/components/zoot/CtaBand";
import { Footer } from "@/components/zoot/Footer";
import { FeedbackSection } from "@/components/zoot/FeedbackSection";
import { SEO } from "@/components/SEO";
import { ServiceAreaMap } from "@/components/zoot/ServiceAreaMap";

const homeStructuredData = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://zoothome.co.za/#org",
  name: "Zoot",
  description: "Premium home-services marketplace for vetted cleaning, Airbnb turns, office resets, Care+, and trusted recurring home care.",
  url: "https://zoothome.co.za/",
  areaServed: ["Sandton", "Bryanston", "Rosebank", "Midrand", "Fourways", "Waterfall", "Hyde Park", "Parkhurst", "Melville"],
  priceRange: "R",
  serviceType: ["House cleaning", "Office cleaning", "Move-out cleaning", "Airbnb cleaning", "Premium home care"],
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Zoot - Premium cleaning and home care in Johannesburg"
        description="Book vetted Zooters for cleaning, Airbnb turns, office resets, move-out cleans and Care+ home care across Johannesburg launch suburbs."
        canonical="/"
        jsonLd={homeStructuredData}
      />
      <Navbar />
      <main className="relative z-20">
        <h1 className="sr-only">Zoot - Premium home services with trust, safety, and retention workflows</h1>
        <BookingHero />
        <TrustedBy />
        <ServiceAreaMap />
        <Services />
        <SafetyTrust />
        <NearbyWorkers />
        <HowItWorks />
        <BecomeZooter />
        <HomeExpansion />
        <FeedbackSection />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
