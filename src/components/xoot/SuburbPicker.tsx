import { useId, useState } from "react";
import { approvedLaunchRegions } from "@/lib/operations";

const suburbs = approvedLaunchRegions.map(region => region.replace(/\b\w/g, letter => letter.toUpperCase()));

/** A native picker remains discoverable on phones; other suburbs stay enterable. */
export function SuburbPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  const [other, setOther] = useState(Boolean(value && !suburbs.includes(value)));
  return (
    <div className="xoot-booking-field">
      <label htmlFor={id}>Suburb</label>
      <select id={id} value={other ? "other" : value} autoComplete="address-level3"
        onChange={event => { const manual = event.target.value === "other"; setOther(manual); onChange(manual ? "" : event.target.value); }}>
        <option value="" disabled>Choose your suburb</option>
        {suburbs.map(suburb => <option key={suburb} value={suburb}>{suburb}</option>)}
        <option value="other">Another suburb</option>
      </select>
      {other && <label className="xoot-booking-field">Your suburb
        <input value={value} onChange={event => onChange(event.target.value)} autoComplete="address-level3"
          maxLength={80} placeholder="Enter your suburb" />
      </label>}
    </div>
  );
}
