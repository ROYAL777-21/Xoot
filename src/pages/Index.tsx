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
import { BotanicalEdges } from "@/components/zoot/BotanicalEdges";
import { FeedbackSection } from "@/components/zoot/FeedbackSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <BotanicalEdges />
      <main className="relative z-20">
        <h1 className="sr-only">Zoot - Premium home services with trust, safety, and retention workflows</h1>
        <BookingHero />
        <TrustedBy />
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
