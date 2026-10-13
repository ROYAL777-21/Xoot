import { Navbar } from "@/components/xoot/Navbar";
import { Footer } from "@/components/xoot/Footer";
import { SEO } from "@/components/SEO";
import { TrustMechanisms } from "@/components/xoot/TrustMechanisms";

const TrustSafety = () => <div className="min-h-screen bg-background">
  <SEO title="Xoot Trust Centre - Home details and feature availability" description="Read how Xoot is designed to protect home details, review Xooters and keep booking communication together, including what is not available yet." canonical="/trust-centre" />
  <Navbar />
  <main><TrustMechanisms page /></main>
  <Footer />
</div>;

export default TrustSafety;
