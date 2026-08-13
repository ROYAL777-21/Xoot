import { CheckCircle2, MapPin, ShieldCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import { approvedLaunchRegions } from "@/lib/operations";

type VerifiedAddressInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const normaliseAddress = (value: string) => value.trim().toLowerCase();

const findCoverageRegion = (value: string) => {
  const address = normaliseAddress(value);
  if (!address) return null;
  return approvedLaunchRegions.find((region) => address.includes(region)) ?? null;
};

const toDisplayRegion = (region: string) => region.replace(/\b\w/g, (character) => character.toUpperCase());

export const VerifiedAddressInput = ({ value, onChange, placeholder }: VerifiedAddressInputProps) => {
  const coverageRegion = findCoverageRegion(value);
  const hasAddress = value.trim().length > 0;

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? "Search your South African address..."}
          autoComplete="street-address"
          className="h-12 rounded-xl pl-10 text-base"
        />
      </div>

      {hasAddress && (
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background px-3 py-2 text-xs font-medium text-foreground">
          {coverageRegion ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0">
            {coverageRegion
              ? `${toDisplayRegion(coverageRegion)} is in active Xoot coverage.`
              : "This address will go through coverage review before dispatch."}
          </span>
        </div>
      )}
    </div>
  );
};
