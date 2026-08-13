import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, CornerDownLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { matchOmnibox } from "@/lib/omnibox-match";
import { useConcierge } from "@/contexts/ConciergeContext";
import { useConciergeConfig } from "@/hooks/useConciergeConfig";
import { haptic } from "@/lib/haptics";

/**
 * One search field for the whole app: it goes places, and it answers questions.
 *
 * ── The split, and why it matters ───────────────────────────────────────────────
 * Matching runs locally on every keystroke via `matchOmnibox`, which never touches the network.
 * That is not only a speed decision — sending each keystroke to an Edge Function would put
 * half-typed questions on a server before the person had decided to ask, and the Concierge's whole
 * privacy posture is that questions do not go anywhere until they are sent deliberately.
 *
 * Anything the matcher cannot confidently place is treated as a question and handed to the
 * Concierge panel **pre-filled but unsent**, so it can be read and edited first — which also keeps
 * the "no secrets, OTPs or access codes" guard in front of it.
 *
 * ── It degrades to a navigator ──────────────────────────────────────────────────
 * When the Concierge is switched off — `concierge.enabled`, `concierge.web.enabled` or
 * `concierge.kill.global` — the ask affordance disappears and the search bar keeps working. A kill
 * switch on the AI should not take the app's navigation with it.
 */
export const ConciergeOmnibox = () => {
  const navigate = useNavigate();
  const concierge = useConcierge();
  const { webEnabled } = useConciergeConfig();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => matchOmnibox(query), [query]);
  const trimmed = query.trim();
  // Offer to ask only when there is nowhere obvious to go — otherwise the row competes with a
  // perfectly good destination and turns one clear action into two.
  const canAsk = webEnabled && Boolean(concierge) && trimmed.length >= 3 && results.length === 0;
  const showPanel = focused && (results.length > 0 || canAsk);

  const goTo = (to: string) => {
    haptic("selection");
    setQuery("");
    setFocused(false);
    inputRef.current?.blur();
    navigate(to);
  };

  const ask = () => {
    if (!concierge || !trimmed) return;
    haptic("selection");
    concierge.openConcierge(trimmed);
    setQuery("");
    setFocused(false);
    inputRef.current?.blur();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    // Enter takes the best destination if there is one, and asks otherwise. Never both.
    if (results.length > 0) return goTo(results[0].to);
    if (canAsk) return ask();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative mb-4">
      <form onSubmit={submit} role="search">
        <label htmlFor="xoot-omnibox" className="sr-only">
          Search Xoot or ask the Concierge
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="xoot-omnibox"
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            // Delayed so a click on a result lands before the panel unmounts. Without this the
            // blur fires first and the click hits nothing.
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            onKeyDown={onKeyDown}
            maxLength={200}
            autoComplete="off"
            placeholder={webEnabled ? "Search Xoot, or ask a question..." : "Search Xoot..."}
            className="native-input rounded-full bg-card/80 pl-10"
          />
        </div>
      </form>

      {showPanel && (
        <div
          className="liquid-glass-shell absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-3xl border border-border/60 shadow-warm"
          role="listbox"
          aria-label="Search results"
        >
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              role="option"
              aria-selected={false}
              // `onMouseDown` rather than `onClick`: mousedown beats the input's blur, so the
              // navigation happens even though the panel is about to close.
              onMouseDown={(event) => {
                event.preventDefault();
                goTo(result.to);
              }}
              className="liquid-glass-interactive flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/8"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{result.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{result.hint}</span>
              </span>
              <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          ))}

          {canAsk && (
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                ask();
              }}
              className="liquid-glass-interactive flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/8"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">
                  Ask the Concierge
                </span>
                <span className="block truncate text-xs text-muted-foreground">“{trimmed}”</span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
