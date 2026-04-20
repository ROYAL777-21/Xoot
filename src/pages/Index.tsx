import { Navbar } from "@/components/zoot/Navbar";
import { BookingHero } from "@/components/zoot/BookingHero";
import { Services } from "@/components/zoot/Services";
import { NearbyWorkers } from "@/components/zoot/NearbyWorkers";
import { HowItWorks } from "@/components/zoot/HowItWorks";
import { CtaBand } from "@/components/zoot/CtaBand";
import { Footer } from "@/components/zoot/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <h1 className="sr-only">Zoot — Book trusted domestic workers and gardeners nearby</h1>
        <BookingHero />
        <Services />
        <NearbyWorkers />
        <HowItWorks />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
