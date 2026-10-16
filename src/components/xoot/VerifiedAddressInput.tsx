import { useEffect, useRef, useState } from "react";
import { MapPin, ShieldCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import { mapboxAddressSearchUrl, parseMapboxAddressSuggestions, type MapboxAddressSuggestion } from "@/lib/mapbox-geocoding";

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

export const VerifiedAddressInput = ({
  value, onChange, placeholder, inputClassName, label = "Service address", showIcon = true,
}: VerifiedAddressInputProps) => {
  const [suggestions, setSuggestions] = useState<MapboxAddressSuggestion[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "results" | "empty" | "error">("idle");
  const [selectedText, setSelectedText] = useState("");
  const requestId = useRef(0);
  const hasAddress = value.trim().length > 0;

  useEffect(() => {
    const url = selectedText === value ? null : mapboxAddressSearchUrl(value, browserToken);
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
  }, [selectedText, value]);

  const updateValue = (next: string) => {
    setSelectedText("");
    onChange(next);
  };

  const chooseSuggestion = (suggestion: MapboxAddressSuggestion) => {
    // Human-readable text only. We do not persist Mapbox result coordinates, IDs or the
    // response itself; temporary geocoding results must not become a stored location DB.
    setSelectedText(suggestion.label);
    setSuggestions([]);
    setSearchState("idle");
    onChange(suggestion.label);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        {showIcon && <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
        <Input
          aria-label={label}
          aria-autocomplete={browserToken.startsWith("pk.") ? "list" : "none"}
          aria-controls="xoot-address-suggestions"
          aria-expanded={suggestions.length > 0}
          role="combobox"
          value={value}
          onChange={event => updateValue(event.target.value)}
          placeholder={placeholder ?? "Enter your South African address..."}
          autoComplete="street-address"
          maxLength={160}
          className={`h-12 rounded-xl text-base ${showIcon ? "pl-10" : ""} ${inputClassName ?? ""}`}
        />
      </div>
      {suggestions.length > 0 && (
        <ul id="xoot-address-suggestions" role="listbox" aria-label="South African address suggestions"
          className="max-h-60 overflow-y-auto rounded-xl border border-border bg-background shadow-md">
          {suggestions.map(suggestion => (
            <li key={suggestion.id} role="presentation">
              <button type="button" role="option" aria-selected={false}
                onClick={() => chooseSuggestion(suggestion)}
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {hasAddress && (
        <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-background px-3 py-2 text-xs font-medium text-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0">
            {selectedText === value && selectedText
              ? "Suggested by Mapbox. Confirm the street, unit or entrance in booking; coverage and Xooter availability are not yet confirmed."
              : "Enter your address to continue. Xoot confirms actual service coverage and available Xooters during booking."}
          </span>
        </div>
      )}
      {searchState === "loading" && <p role="status" className="text-xs text-muted-foreground">Finding nearby addresses…</p>}
      {searchState === "error" && <p role="status" className="text-xs text-muted-foreground">Address suggestions are unavailable. You can enter your address manually.</p>}
      {searchState === "empty" && <p role="status" className="text-xs text-muted-foreground">No suggestions found. Check the address manually in booking.</p>}
      {browserToken.startsWith("pk.") && hasAddress && (
        <p className="text-xs text-muted-foreground">When you type, address search is sent to Mapbox. No exact coordinates are stored by this search.</p>
      )}
    </div>
  );
};
