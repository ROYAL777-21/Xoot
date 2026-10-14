import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Info, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { GiftCard, giftCardTints } from "@/components/kit/GiftCard";
import { Logo } from "@/components/kit/Logo";
import { ServiceIcon } from "@/components/kit/ServiceIcon";
import {
  GiftOrderError,
  loadGiftQuote,
  quoteGift,
  saveGiftOrder,
  type GiftDraft,
  type GiftOrderResult,
} from "@/lib/gift-order";
import { ANNUAL_WEEKLY_VISITS, giftAppBundles, giftOccasions, readGiftSelection } from "@/lib/gift-selection";
import { formatRand } from "@/lib/xoot-pricing";
import "@/styles/gift-care-handoff.css";
import "@/styles/gift-flow.css";

const services = [
  { key: "regular", label: "Regular cleaning" },
  { key: "airbnb", label: "Airbnb cleaning" },
  { key: "express", label: "Express cleaning" },
  { key: "office", label: "Office cleaning" },
  { key: "moving", label: "Moving cleaning" },
] as const;
const bundles = giftAppBundles;
const notes = [
  ["Just because", "Thought you could use a break."],
  ["Just because", "No occasion. You just deserve a quiet weekend."],
  ["Thank you", "For everything you did last month. Take the day off."],
  ["Thank you", "A small thank you, from all of us."],
  [
    "New home",
    "Welcome to the new place. Let someone else do the first clean.",
  ],
  ["New baby", "Congratulations. One less thing to think about."],
  ["Hard week", "Heard it’s been a rough one. This is on me."],
  ["Birthday", "Happy birthday. Spend the day not cleaning."],
];

export default function GiftClean() {
  const { user, loading } = useAuth();
  // Personalisation and receipts belong to one account. Never retain them across sign-out/account switches.
  return <GiftFlow key={user?.id ?? "guest"} authPending={loading} />;
}

function GiftFlow({ authPending }: { authPending: boolean }) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);
  const [draft, setDraft] = useState<GiftDraft>(() => {
    const chosen = readGiftSelection(params);
    const count =
      params.has("visits") &&
      [1, 3, 4, 6, 12].includes(Number(params.get("visits")))
        ? Number(params.get("visits"))
        : 3;
    return {
      service:
        services.find((service) => service.key === params.get("service"))
          ?.key ?? chosen.service,
      count,
      tint: params.has("occasion")
        ? giftOccasions[chosen.occasion].tint
        : "blush",
      delivery: "email",
      recipientName: "",
      recipientEmail: "",
      senderName:
        typeof user?.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : "",
      note: "",
      occasion: params.has("occasion")
        ? giftOccasions[chosen.occasion].label
        : "",
    };
  });
  const [receipt, setReceipt] = useState<GiftOrderResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const requestKey = useRef<{ definition: string; key: string } | null>(null);
  const quoteQuery = useQuery({
    queryKey: ["gift-quote", user?.id, draft.service, draft.count],
    enabled: Boolean(user),
    retry: false,
    queryFn: () => loadGiftQuote(draft.service, draft.count),
  });
  const estimatedQuote = quoteGift(draft.service, draft.count);
  const quote = quoteQuery.data?.quote ?? estimatedQuote;
  const update = (change: Partial<GiftDraft>) => {
    setDraft((previous) => ({ ...previous, ...change }));
    setError("");
  };
  const name = services.find((service) => service.key === draft.service)!.label;
  const title = `${draft.count} ${draft.count === 1 ? "clean" : "cleans"}`;
  const counts =
    params.get("visits") === "4"
      ? [
          ...bundles.slice(0, 2),
          { count: 4, label: "Four cleans", note: "About four weeks if used weekly" },
          ...bundles.slice(2),
        ]
      : bundles;
  const next = () => {
    if (!user) {
      const selection = new URLSearchParams({
        service: draft.service,
        visits: String(draft.count),
      });
      if (params.has("occasion"))
        selection.set("occasion", params.get("occasion")!);
      const search = "?" + selection;
      navigate("/auth", { state: { from: { pathname: "/gifts", search } } });
      return;
    }
    setStage((value) => value + 1);
  };
  const save = async () => {
    if (!user || !quoteQuery.data || saving) return;
    const definition = JSON.stringify(draft);
    if (requestKey.current?.definition !== definition)
      requestKey.current = { definition, key: crypto.randomUUID() };
    setSaving(true);
    setError("");
    try {
      setReceipt(
        await saveGiftOrder(
          draft,
          quoteQuery.data.quote,
          requestKey.current.key,
        ),
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The gift could not be saved.",
      );
      if (failure instanceof GiftOrderError && failure.revisedQuote)
        await quoteQuery.refetch();
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="xoot-gift-flow">
      <div className="xoot-gift-flow-brand">
        <Link to="/" aria-label="Xoot home">
          <Logo tone="violet" size={24} />
        </Link>
      </div>
      <section className="xoot-gift-flow-frame" aria-label="Gift setup">
        <header className="xoot-gift-flow-header">
          <button
            type="button"
            aria-label="Back"
            disabled={saving}
            onClick={() =>
              receipt
                ? navigate("/#gift")
                : stage > 0
                  ? setStage(stage - 1)
                  : navigate("/#gift")
            }
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Gift a clean</h1>
            <p>
              {receipt
                ? "Your gift request"
                : `${["Choose", "Personalise", "Pay"][stage]} · step ${stage + 1} of 3`}
            </p>
          </div>
        </header>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (stage < 2) next();
            else void save();
          }}
        >
          <div className="xoot-gift-flow-body">
            <div className="xoot-gift-flow-card">
              <GiftCard
                tint={draft.tint}
                title={title}
                note={stage >= 1 ? draft.note : undefined}
                from={stage >= 1 ? draft.senderName : undefined}
                style={{
                  width: stage === 0 ? 240 : 190,
                  height: stage === 0 ? 200 : 160,
                }}
              />
            </div>
            {receipt ? (
              <div className="xoot-gift-flow-receipt" role="status">
                <Check size={30} />
                <h2>
                  {receipt.status === "pending_payment"
                    ? "Gift request saved"
                    : "Gift request status"}
                </h2>
                <p>
                  Your {receipt.quote.count}{" "}
                  {receipt.quote.count === 1 ? "visit is" : "visits are"}{" "}
                  recorded at {formatRand(receipt.quote.totalCents)}.
                </p>
                {receipt.status === "pending_payment" ? (
                  <p>
                    Payment is pending. Your gift has not been charged, emailed
                    or made redeemable.
                  </p>
                ) : (
                  <p>
                    Status:{" "}
                    {receipt.status
                      .replace(/_/g, " ")
                      .replace(/^./, (letter) => letter.toUpperCase())}
                  </p>
                )}
                <small>Reference: {receipt.order_id}</small>
                <Link
                  to="/app/gifts"
                  onClick={() => {
                    setReceipt(null);
                    setStage(0);
                    requestKey.current = null;
                  }}
                >
                  Set up another gift
                </Link>
              </div>
            ) : stage === 0 ? (
              <>
                <fieldset>
                  <legend>Which service?</legend>
                  <div className="xoot-gift-flow-services">
                    {services.map((service) => (
                      <button
                        type="button"
                        key={service.key}
                        aria-pressed={draft.service === service.key}
                        onClick={() => update({ service: service.key })}
                      >
                        <ServiceIcon service={service.key} size={38} />
                        <strong>{service.label}</strong>
                      </button>
                    ))}
                    <button type="button" disabled>
                      <ServiceIcon service="laundry" size={38} />
                      <strong>Laundry & ironing</strong>
                      <small>Not available yet</small>
                    </button>
                  </div>
                </fieldset>
                <fieldset>
                  <legend>How many?</legend>
                  <div className="xoot-gift-flow-bundles">
                    {counts.map((bundle) => (
                      <button
                        type="button"
                        key={bundle.count}
                        aria-pressed={draft.count === bundle.count}
                        onClick={() => update({ count: bundle.count })}
                      >
                        <strong>{bundle.label}</strong>
                        <span>{bundle.note}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <p className="xoot-gift-availability">At one clean per week, {ANNUAL_WEEKLY_VISITS} visits make a full year. These gift bundles are individual visits, not a recurring annual plan; annual gifting is not available yet.</p>
                <div className="xoot-gift-flow-total">
                  <span>
                    <strong>Total{!quoteQuery.data ? " estimate" : ""}</strong>
                    <small>
                      {formatRand(quote.perVisitCents)} a clean · {quote.hours}{" "}
                      hrs · booking fees included
                    </small>
                  </span>
                  <b>{formatRand(quote.totalCents)}</b>
                </div>
              </>
            ) : stage === 1 ? (
              <>
                <fieldset>
                  <legend>Pick a colour</legend>
                  <div className="xoot-gift-flow-tints">
                    {giftCardTints.map((tint) => (
                      <button
                        type="button"
                        key={tint}
                        aria-label={tint}
                        aria-pressed={draft.tint === tint}
                        onClick={() => update({ tint })}
                        style={{ backgroundColor: `var(--xoot-${tint}-mid)` }}
                      >
                        {draft.tint === tint ? <Check size={18} /> : null}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>How should we send it?</legend>
                  <div className="xoot-gift-flow-delivery">
                    {(
                      [
                        {
                          key: "email",
                          title: "Send an email",
                          detail: "After payment and delivery are enabled",
                        },
                        {
                          key: "link",
                          title: "Get a link to share",
                          detail: "A shareable gift after payment",
                        },
                      ] as const
                    ).map((option) => (
                      <label key={option.key}>
                        <input
                          type="radio"
                          name="delivery"
                          value={option.key}
                          checked={draft.delivery === option.key}
                          onChange={() => update({ delivery: option.key })}
                        />
                        <span>
                          <strong>{option.title}</strong>
                          <small>{option.detail}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                {draft.delivery === "email" ? (
                  <>
                    <label>
                      Their name
                      <input
                        required
                        maxLength={120}
                        autoComplete="off"
                        value={draft.recipientName}
                        onChange={(event) =>
                          update({ recipientName: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Their email
                      <input
                        required
                        type="email"
                        maxLength={254}
                        autoComplete="off"
                        value={draft.recipientEmail}
                        onChange={(event) =>
                          update({ recipientEmail: event.target.value })
                        }
                      />
                    </label>
                  </>
                ) : null}
                <label>
                  Your name
                  <input
                    required
                    maxLength={120}
                    autoComplete="name"
                    value={draft.senderName}
                    onChange={(event) =>
                      update({ senderName: event.target.value })
                    }
                  />
                </label>
                <div className="xoot-gift-flow-note">
                  <label htmlFor="gift-note">Add a note</label>
                  <div className="xoot-gift-flow-notes">
                    {notes.map(([group, note]) => (
                      <button
                        type="button"
                        key={note}
                        aria-pressed={draft.note === note}
                        onClick={() =>
                          update({
                            note: draft.note === note ? "" : note,
                            occasion: group,
                          })
                        }
                      >
                        {group}
                      </button>
                    ))}
                  </div>
                  <textarea
                    id="gift-note"
                    rows={3}
                    maxLength={90}
                    placeholder="Thought you could use a break."
                    value={draft.note}
                    onChange={(event) => update({ note: event.target.value })}
                  />
                  <small>{draft.note.length}/90 · it goes on the card</small>
                </div>
              </>
            ) : (
              <>
                <div className="xoot-gift-flow-review">
                  <span className="xoot-gift-flow-label">
                    What you’re giving
                  </span>
                  <p>
                    <span>
                      {name} · {quote.hours} hrs × {quote.count}
                    </span>
                    <b>{formatRand(quote.basePerVisitCents * quote.count)}</b>
                  </p>
                  <p>
                    <span>Booking fees × {quote.count}</span>
                    <b>{formatRand(quote.feePerVisitCents * quote.count)}</b>
                  </p>
                  <p>
                    <span>To</span>
                    <strong>
                      {draft.delivery === "email"
                        ? draft.recipientName
                        : "A shareable link"}
                    </strong>
                  </p>
                  <hr />
                  <p>
                    <strong>Total</strong>
                    <em>{formatRand(quote.totalCents)}</em>
                  </p>
                  <small>
                    The standard non-member price for these visits. No gifting
                    markup or bundle discount.
                  </small>
                </div>
                <div className="xoot-gift-flow-notice">
                  <Info size={18} />
                  <p>
                    Gift payment and redemption are not available yet. You can
                    save the reviewed gift request. No money is taken and
                    nothing is sent to the recipient.
                  </p>
                </div>
              </>
            )}
            {!receipt && user && quoteQuery.isError ? (
              <div className="xoot-gift-flow-error" role="alert">
                <p>
                  The gift quote could not be confirmed. Saving needs a current
                  server quote.
                </p>
                <button type="button" onClick={() => void quoteQuery.refetch()}>
                  Try again
                </button>
              </div>
            ) : null}
            {error ? (
              <p className="xoot-gift-flow-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          {!receipt ? (
            <footer className="xoot-gift-flow-dock">
              <button
                className="xoot-source-button"
                type="submit"
                disabled={
                  authPending ||
                  saving ||
                  (stage === 2 && (!quoteQuery.data || quoteQuery.isFetching))
                }
              >
                {saving
                  ? "Saving your gift…"
                  : stage === 2
                    ? "Save gift request"
                    : stage === 1
                      ? "Review"
                      : user
                        ? "Continue"
                        : "Sign in to continue"}
                {stage === 2 ? <Lock size={18} /> : <ArrowRight size={18} />}
              </button>
              {stage === 2 ? (
                <small>
                  Unpaid until checkout is available and you choose to pay.
                </small>
              ) : null}
            </footer>
          ) : null}
        </form>
      </section>
    </main>
  );
}
