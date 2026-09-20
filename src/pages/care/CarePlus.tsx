import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/xoot/Navbar";
import { Footer } from "@/components/xoot/Footer";
import { CarePlusBand } from "@/components/xoot/CarePlusBand";
import { SEO } from "@/components/SEO";
import { useCarePlus } from "@/hooks/useCarePlus";
import { formatZAR } from "@/lib/format";

const date = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Not scheduled" : new Intl.DateTimeFormat("en-ZA", {dateStyle: "medium"}).format(parsed);
};

/** Public Care+ uses the supplied SiteFoot composition and the real membership state. */
export default function CarePlus() {
  const carePlus = useCarePlus();
  const state = carePlus.state;
  const join = async () => {
    try {
      await carePlus.requestMembership();
      toast.success("Care+ request saved. Payment confirmation is required before benefits activate.");
    } catch {
      toast.error("Care+ setup could not start. Please try again or contact support.");
    }
  };
  const joinButton = state.status === "unauthenticated"
    ? <Link to="/auth" state={{from: {pathname: "/care-plus"}}} className="xoot-source-button xoot-source-button-care">Continue to Care+ <ArrowRight size={20} /></Link>
    : state.status === "not_member" || state.status === "cancelled"
      ? <button type="button" onClick={() => void join()} disabled={carePlus.loading || carePlus.actionLoading || Boolean(carePlus.error)} className="xoot-source-button xoot-source-button-care">{carePlus.actionLoading ? <Loader2 className="animate-spin" size={20} /> : null}Join for {formatZAR(carePlus.plan.priceZar)}/month</button>
      : <Link to="/app/plans" className="xoot-source-button xoot-source-button-care">{state.status === "active" ? "Manage Care+" : "Review membership"} <ArrowRight size={20} /></Link>;

  return <div className="xoot-care-page" style={{background:"var(--xoot-surface-page)",color:"var(--xoot-text-primary)"}}>
    <SEO title="Xoot Care+ — membership for your home" description="Review Care+ membership, booking-fee savings, saved home details and your current membership status." canonical="/care-plus" />
    <Navbar />
    <main>
      <CarePlusBand headingAs="h1" detailsId="included" actions={<>{joinButton}<Link to="/legal/care-plus-terms" className="xoot-source-button xoot-source-button-outline">Membership terms</Link></>} />
      <section className="xoot-care-account" aria-label="Your Care+ membership"><div className="xoot-care-account-card">
        {carePlus.loading ? <p role="status"><Loader2 size={18} className="inline animate-spin" /> Loading membership…</p> : carePlus.error ? <>
          <h2>Membership could not be loaded</h2><p role="alert">{carePlus.error}</p><button type="button" className="xoot-source-button" onClick={() => void carePlus.refresh()}>Try again</button>
        </> : state.status === "active" ? <>
          <h2>Your Care+ membership</h2><dl className="xoot-care-account-data"><div><dt>Status</dt><dd>Active</dd></div><div><dt>Renews</dt><dd>{date(state.membership.renewsAt)}</dd></div><div><dt>Favourite Xooter</dt><dd>{state.favourite?.name ?? "No favourite selected"}</dd></div><div><dt>Saved properties</dt><dd>{carePlus.properties.length}</dd></div></dl>
          <div className="xoot-care-actions"><Link to="/app/profile" className="xoot-source-button">Home details</Link><Link to="/app/plans" className="xoot-source-button xoot-source-button-outline">Manage or cancel membership</Link></div>
        </> : state.status === "pending_payment" ? <>
          <h2>Payment confirmation pending</h2><p>Your request is saved. Care+ benefits activate only after the payment is confirmed. Review the request in your membership account.</p><Link to="/app/plans">Review membership request →</Link>
        </> : state.status === "past_due" ? <>
          <h2>Your membership needs attention</h2><p>Payment is overdue. Review your membership or contact support for help.</p><Link to="/app/plans">Review membership →</Link>
        </> : <>
          <h2>{state.status === "cancelled" ? "Your previous membership has ended" : "A little more continuity for your home"}</h2><p>Read the membership terms before joining. Your membership request and payment status will appear here; requesting membership does not confirm payment.</p>
          <Link to="/legal/care-plus-terms">Read Care+ terms →</Link>
        </>}
      </div></section>
    </main><Footer />
  </div>;
}
