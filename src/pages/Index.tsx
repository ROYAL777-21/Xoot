import { Navbar } from "@/components/zoot/Navbar";
import { BookingHero } from "@/components/zoot/BookingHero";
import { Services } from "@/components/zoot/Services";
import { NearbyWorkers } from "@/components/zoot/NearbyWorkers";
import { HowItWorks } from "@/components/zoot/HowItWorks";
import { SafetyTrust } from "@/components/zoot/SafetyTrust";
import { BecomeXooter } from "@/components/zoot/BecomeXooter";
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
  name: "Xoot",
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
        title="Xoot - Premium cleaning and home care in Johannesburg"
        description="Book vetted Xooters for cleaning, Airbnb turns, office resets, move-out cleans and Care+ home care across Johannesburg launch suburbs."
        canonical="/"
        jsonLd={homeStructuredData}
      />
      <Navbar />
      <main className="relative z-20">
        <h1 className="sr-only">Xoot - Premium home services with trust, safety, and retention workflows</h1>
        <BookingHero />
        <TrustedBy />
        <ServiceAreaMap />
        <Services />
        <SafetyTrust />
        <NearbyWorkers />
        <HowItWorks />
        <BecomeXooter />
        <HomeExpansion />
        <FeedbackSection />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
