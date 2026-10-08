// Preserve the handoff's two store slots while release listings are unavailable.
// These are status labels, without a download action or a misleading store-search URL.
export function AppAvailability() {
  return (
    <div className="xoot-store-availability" aria-label="Mobile apps are not yet available">
      <div className="xoot-store-status">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M17.05 12.54c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.77 2.29-1.61 2.79-.41 6.92 1.15 9.18.76 1.11 1.67 2.35 2.86 2.31 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 3 .72 1.24-.02 2.02-1.13 2.78-2.24.88-1.29 1.24-2.54 1.26-2.6-.03-.01-2.41-.93-2.4-3.7zM14.79 5.6c.63-.77 1.06-1.83.94-2.9-.91.04-2.01.61-2.67 1.37-.59.68-1.1 1.76-.96 2.8 1.01.08 2.05-.51 2.69-1.27z" />
        </svg>
        <span><small>Not yet available</small><strong>App Store</strong></span>
      </div>
      <div className="xoot-store-status">
        <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3.6 1.8a1.9 1.9 0 0 0-.5 1.3v17.8c0 .5.2 1 .5 1.3l9.2-10.2z" fill="#00D2FF" />
          <path d="M16.6 15.2 12.8 12l3.8-3.2 4.3 2.4c.9.5.9 1.7 0 2.2z" fill="#FFC400" />
          <path d="M3.6 1.8 12.8 12l3.8-3.2L5.4 1.3c-.6-.3-1.3-.2-1.8.5z" fill="#00E676" />
          <path d="M3.6 22.2c.5.6 1.2.8 1.8.4l11.2-6.4-3.8-3.2z" fill="#FF3D47" />
        </svg>
        <span><small>Not yet available</small><strong>Google Play</strong></span>
      </div>
    </div>
  );
}
