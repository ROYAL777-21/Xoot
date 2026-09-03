import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "./Footer";

describe("Footer copyright notice", () => {
  it("carries the © symbol, not a bare year", () => {
    // The notice read "2026 Xoot. All rights reserved." for the life of the site — a year and a
    // claim with the one character that makes it a copyright notice missing.
    //
    // Copyright subsists automatically under the Copyright Act 98 of 1978 whether or not it is
    // marked, so this was never fatal. What the mark does is put a copier on notice: without it
    // an infringer can argue innocent infringement in mitigation of damages.
    //
    // Guarded because it is exactly the kind of character a redesign drops silently.
    render(<Footer />);
    expect(screen.getByText(/©\s*\d{4}\s+Xoot\. All rights reserved\./)).toBeInTheDocument();
  });

  it("tracks the current year rather than a hardcoded one", () => {
    // A stale copyright year is the commonest tell that a site is abandoned, and it is read that
    // way by customers deciding whether a company still exists.
    render(<Footer />);
    expect(
      screen.getByText(new RegExp(`©\\s*${new Date().getFullYear()}\\b`)),
    ).toBeInTheDocument();
  });

  it("claims no company form the repository cannot evidence", () => {
    // "Xoot (Pty) Ltd" would be a statement about the company on every page of the site. No
    // registered entity name or registration number is recorded anywhere in this repository —
    // docs/legal/intellectual-property.md §6 asks the founder for both.
    //
    // Until one exists, the trading name alone is the only version of this line that is true.
    // When the founder supplies it, this assertion is what forces the test to be updated
    // deliberately rather than the footer being edited and forgotten.
    const { container } = render(<Footer />);
    expect(container.textContent).not.toMatch(/\(Pty\)|\bLtd\b|\bInc\b|\bLLC\b/);
  });
});

describe("repository-level IP assertions", () => {
  const root = process.cwd();

  it("has a LICENSE that grants nothing", () => {
    // A repository carrying no licence invites the argument that the work was released openly.
    // This one is explicitly proprietary; the guard is that it stays that way, because an
    // "add a LICENSE" pass that reaches for a default template would reach for MIT.
    const license = readFileSync(join(root, "LICENSE"), "utf8");
    expect(license).toMatch(/PROPRIETARY AND CONFIDENTIAL/);
    // Whitespace-tolerant: the phrase wraps across a line break in the file, and pinning the
    // wrap position would make the guard fail on a reflow rather than on a licence change.
    expect(license).toMatch(/No licence,\s+express\s+or\s+implied,\s+is\s+granted/);
    expect(license).not.toMatch(/MIT License|Apache License|GNU GENERAL PUBLIC/);
  });

  it("cannot be published to npm by accident", () => {
    // Two independent guards, because they fail in different ways: `private` blocks the publish,
    // `license` states the terms if the package is ever read outside the publish path.
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(pkg.private).toBe(true);
    expect(pkg.license).toBe("UNLICENSED");
  });
});
