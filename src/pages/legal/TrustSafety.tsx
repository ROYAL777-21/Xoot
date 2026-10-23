import { Navbar } from "@/components/xoot/Navbar";
import { Footer } from "@/components/xoot/Footer";
import { SEO } from "@/components/SEO";
import { TrustMechanisms } from "@/components/xoot/TrustMechanisms";
import "@/styles/homepage-sections.css";

const TrustSafety = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Xoot Trust Centre - Access windows, screening and honest limits"
      description="Read Xoot's trust mechanisms, access-window illustration and screening requirements, including what is built and what is not switched on yet."
      canonical="/trust-centre"
    />
    <Navbar />
    <main><TrustMechanisms page /></main>
    <Footer />
  </div>
);

export default TrustSafety;
