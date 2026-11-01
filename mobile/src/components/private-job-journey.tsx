// React Native Web / Expo Go fallback: never load native Mapbox or a private GPS feed.
// PrivateJobJourney.native.tsx is available only in an installed native build.
export function PrivateJobJourney({ bookingId: _bookingId, destinationAddress: _destinationAddress }: { bookingId: string; destinationAddress?: string | null }) {
  return null;
}
