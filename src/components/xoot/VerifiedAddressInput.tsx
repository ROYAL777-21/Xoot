import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";
import { mapboxAddressSearchUrl, mapboxPermanentAddressUrl, parseMapboxAddressSuggestions, type MapboxAddressSuggestion } from "@/lib/mapbox-geocoding";

type VerifiedAddressInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputClassName?: string;
  label?: string;
  showIcon?: boolean;
};

// Public browser token bundled by Vite. A token name in Vercel is not proof of permission
// to call Geocoding; failed/blocked requests must leave manual entry fully usable.
const browserToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN?.trim() ?? "";
// Selected suggestions require paid Permanent Geocoding before they can be saved.
// Manual entry remains the default until the owner approves that operating cost.
const mapboxAddressSuggestionsEnabled = import.meta.env.VITE_MAPBOX_ADDRESS_SUGGESTIONS_ENABLED === "true";

export const VerifiedAddressInput = ({
  value, onChange, placeholder, inputClassName, label = "Service address", showIcon = true,
}: VerifiedAddressInputProps) => {
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [suggestions, setSuggestions] = useState<MapboxAddressSuggestion[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "results" | "empty" | "error">("idle");
  const [selectedText, setSelectedText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const confirmation = useRef<AbortController | null>(null);
  useEffect(() => () => confirmation.current?.abort(), []);
  const requestId = useRef(0);
  const suggestionsId = useId();
  const hasAddress = value.trim().length > 0;

  useEffect(() => {
    const url = searchEnabled && selectedText !== value && mapboxAddressSuggestionsEnabled ? mapboxAddressSearchUrl(value, browserToken) : null;
    if (!url) {
      setSearchState("idle");
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const serial = ++requestId.current;
    setSuggestions([]);
    setSearchState("loading");
    const timer = window.setTimeout(() => {
      void fetch(url, { signal: controller.signal, cache: "no-store" })
        .then(async response => {
          if (!response.ok) throw new Error("Mapbox address suggestions unavailable");
          const json: unknown = await response.json();
          if (serial !== requestId.current || controller.signal.aborted) return;
          const options = parseMapboxAddressSuggestions(json);
          setSuggestions(options);
          setSearchState(options.length ? "results" : "empty");
        })
        .catch(() => {
          if (serial !== requestId.current || controller.signal.aborted) return;
          setSuggestions([]);
          setSearchState("error");
        });
    }, 400);
    return () => { window.clearTimeout(timer); controller.abort(); requestId.current += 1; };
  }, [searchEnabled, selectedText, value]);

  const updateValue = (next: string) => {
    confirmation.current?.abort();
    setConfirming(false);
    setSelectedText("");
    onChange(next);
  };

  const chooseSuggestion = async (suggestion: MapboxAddressSuggestion) => {
    if (!mapboxAddressSuggestionsEnabled) return;
    // Autocomplete suggestions are TEMPORARY and may not be persisted. Only accept their
    // label into booking state after a separate licensed PERMANENT Geocoding confirmation.
    // A failed Permanent request leaves the original user input intact for manual entry.
    confirmation.current?.abort();
    const url = mapboxPermanentAddressUrl(suggestion.label, browserToken);
    if (!url) { setSearchState("error"); return; }
    const controller = new AbortController();
    confirmation.current = controller;
    requestId.current += 1;
    setSuggestions([]);
    setConfirming(true);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("Permanent Mapbox geocoding unavailable");
      const body: unknown = await response.json();
      if (controller.signal.aborted) return;
      const confirmed = parseMapboxAddressSuggestions(body).find(item => item.id === suggestion.id);
      if (!confirmed) throw new Error("Unable to verify South African address");
      setSelectedText(confirmed.label);
      setSearchState("idle");
      onChange(confirmed.label);
    } catch {
      if (!controller.signal.aborted) setSearchState("error");
    } finally {
      if (!controller.signal.aborted) setConfirming(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        {showIcon && <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
        <Input
          aria-label={label}
          aria-autocomplete={searchEnabled ? "list" : "none"}
          aria-controls={suggestionsId}
          aria-expanded={suggestions.length > 0}
          value={value}
          onChange={event => updateValue(event.target.value)}
          placeholder={placeholder ?? "Enter your South African address..."}
          autoComplete="street-address"
          maxLength={160}
          className={`h-12 rounded-xl text-base ${showIcon ? "pl-10" : ""} ${inputClassName ?? ""}`}
        />
      </div>
      {mapboxAddressSuggestionsEnabled && browserToken.startsWith("pk.") && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <button type="button" aria-pressed={searchEnabled}
            className="shrink-0 rounded-full border border-border px-3 py-1.5 font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            onClick={() => { setSearchEnabled(current => !current); setSuggestions([]); setSearchState("idle"); }}>
            {searchEnabled ? "Disable Mapbox suggestions" : "Enable Mapbox suggestions"}
          </button>
          <span>{searchEnabled ? "Your address search is being sent to Mapbox." : "Optional: sends what you type to Mapbox for South African address suggestions."}</span>
        </div>
      )}
      {suggestions.length > 0 && (
        <ul id={suggestionsId} role="listbox" aria-label="South African address suggestions"
          className="max-h-60 overflow-y-auto rounded-xl border border-border bg-background shadow-md">
          {suggestions.map(suggestion => (
            <li key={suggestion.id} role="presentation">
              <button type="button" role="option" aria-selected={false}
                onClick={() => void chooseSuggestion(suggestion)}
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedText === value && selectedText && <p className="text-xs text-muted-foreground">Address found. Check the unit and entrance details.</p>}
      {confirming && <p role="status" className="text-xs text-muted-foreground">Confirming selected address…</p>}
      {searchState === "loading" && !confirming && <p role="status" className="text-xs text-muted-foreground">Finding nearby addresses…</p>}
      {searchState === "error" && <p role="status" className="text-xs text-muted-foreground">Address lookup or confirmation is unavailable. You can enter your address manually.</p>}
      {searchState === "empty" && <p role="status" className="text-xs text-muted-foreground">No suggestions found. Check the address manually in booking.</p>}
      {searchEnabled && hasAddress && (
        <p className="text-xs text-muted-foreground">Selected suggestions are confirmed under licensed Permanent Geocoding before booking; no exact coordinates are stored here.</p>
      )}
    </div>
  );
};
