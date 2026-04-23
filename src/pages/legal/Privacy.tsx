import { Navbar } from "@/components/zoot/Navbar";
import { Footer } from "@/components/zoot/Footer";

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container max-w-3xl py-12 md:py-20">
      <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Legal</p>
      <h1 className="font-display text-4xl md:text-6xl font-bold mb-6">Privacy Policy</h1>
      <div className="prose prose-sm md:prose-base max-w-none text-muted-foreground space-y-4">
        <p>Zoot is committed to protecting your privacy and complying with the Protection of Personal Information Act, 2013 (POPIA).</p>
        <h2 className="font-display text-foreground">What we collect</h2>
        <p>Account details (name, email, phone), addresses, booking history, payment metadata, and communications between you and your Zooter.</p>
        <h2 className="font-display text-foreground">How we use it</h2>
        <p>To match you with Zooters, process bookings, send transactional notifications, prevent fraud, and improve the platform. We never sell your data to third parties.</p>
        <h2 className="font-display text-foreground">Security</h2>
        <p>All data is encrypted in transit (TLS 1.2+) and at rest. Sensitive identifiers (ID numbers, bank details) are stored in private buckets with strict row-level access control. Passwords are hashed with industry-standard algorithms.</p>
        <h2 className="font-display text-foreground">Your rights</h2>
        <p>You may request access, correction, or deletion of your personal information at any time by contacting support@zoot.co.za.</p>
      </div>
    </main>
    <Footer />
  </div>
);
export default Privacy;
