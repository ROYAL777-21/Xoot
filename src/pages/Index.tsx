import { Navbar } from "@/components/zoot/Navbar";
import { BookingHero } from "@/components/zoot/BookingHero";
import { Services } from "@/components/zoot/Services";
import { NearbyWorkers } from "@/components/zoot/NearbyWorkers";
import { HowItWorks } from "@/components/zoot/HowItWorks";
import { SafetyTrust } from "@/components/zoot/SafetyTrust";
import { BecomeZooter } from "@/components/zoot/BecomeZooter";
import { TrustedBy } from "@/components/zoot/TrustedBy";
import { CtaBand } from "@/components/zoot/CtaBand";
import { Footer } from "@/components/zoot/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <h1 className="sr-only">Zoot - Premium home services with trust, safety, and retention workflows</h1>
        <BookingHero />
        <TrustedBy />
        <Services />
        <SafetyTrust />
        <NearbyWorkers />
        <HowItWorks />
        <BecomeZooter />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
