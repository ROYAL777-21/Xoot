// Non-native fallback must not request location or import native Mapbox.
export function PrivateJobLocationPublisher({ bookingId: _bookingId }: { bookingId: string }) {
  return null;
}
