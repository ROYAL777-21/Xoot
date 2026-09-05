import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { describe, expect, it } from "vitest";
import { LegalLayout } from "./LegalLayout";

/**
 * The legal pages say who the reader is contracting with, and how to reach a human.
 *
 * ⚠️ **Written because these two additions were planned, approved, and then silently not made.**
 * A previous session's plan committed to both and the session moved on. Nothing caught it because
 * nothing was watching — which is the same shape as the green check that reviewed nothing and the
 * fixture that could not fail, both of which this repository has already shipped.
 *
 * The source is `design/handoff-2026-09-03/Xoot Legal.dc.html`, whose own drafting constraints say:
 * *"Xoot is not currently registered, so no document names a company, registration number or
 * registered address… A policy that names a non-existent entity is worse than no policy: it
 * misrepresents who the customer is contracting with, which is itself a Consumer Protection Act
 * problem."*
 */
const renderLayout = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <LegalLayout
          eyebrow="Legal"
          title="Terms"
          description="Test"
          lastUpdated="2026-09-05"
          canonical="/legal/terms"
        >
          <p>body</p>
        </LegalLayout>
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("the legal layout states what it must", () => {
  it("says Xoot is not yet registered", () => {
    // Without this a reader assumes there is a company behind the contract. There is not, yet —
    // `Footer.test.tsx` asserts the same fact from the other end by forbidding "(Pty)" and "Ltd".
    renderLayout();
    expect(screen.getByText(/not yet a registered company/i)).toBeInTheDocument();
  });

  it("gives a POPIA data subject somewhere to write, and states the 30-day window", () => {
    /*
     * ⛔ There was no email address on ANY legal page. The design flags a marketing address as the
     * wrong destination for a POPIA request; having none at all is worse than having the wrong one,
     * because the statutory clock runs either way.
     */
    const { container } = renderLayout();
    const mailto = container.querySelector('a[href^="mailto:"]');
    expect(mailto, "no contact route on the legal pages").toBeTruthy();
    expect(mailto?.getAttribute("href")).toMatch(/@xoot\.co\.za$/);
    expect(container.textContent).toMatch(/30\s*days/i);
    expect(container.textContent).toMatch(/POPIA/);
  });

  it("keeps the counsel-review caveat", () => {
    // The pages remain drafts. Adding the registration statement must not read as promoting them
    // to reviewed documents.
    renderLayout();
    expect(screen.getByText(/reviewed by South African legal counsel/i)).toBeInTheDocument();
  });
});
