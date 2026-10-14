#!/usr/bin/env node
/**
 * Release-branch-only source gate for the founder-selected September 2026 handoff.
 *
 * This is an intentionally narrow pre-build tripwire: it cannot certify visual
 * fidelity, but it prevents a green Vercel build of the known older homepage.
 * The independent Playwright gate verifies the rendered page and editable fields.
 */
import { readFileSync } from "node:fs";

export const inspectApprovedHandoff = (home, nativeLayer) => {
  const problems = [];
  if (!home.includes('data-xoot-design-version="2026-09-handoff"')) {
    problems.push("Approved handoff homepage identity is missing");
  }
  const expected = ["<BookingHero />", "<GiftBand />", "<CarePlusBand />", "<TrustedBy />", "<Reviews />", "<FeedbackSection />"];
  let last = -1;
  for (const entry of expected) {
    const current = home.indexOf(entry);
    if (current === -1) problems.push("Approved handoff component missing: " + entry);
    else if (current <= last) problems.push("Approved homepage section order has reverted near " + entry);
    if (current !== -1) last = current;
  }
  if (/window\.addEventListener\(\s*["']scroll["']\s*,\s*blurActiveField/.test(nativeLayer)) {
    problems.push("Global scroll blur handler would dismiss the mobile keyboard");
  }
  return problems;
};

if (process.argv.includes("--self-test")) {
  const fakeOldHome = '<div><BookingHero /><TrustedBy /><Reviews /><FeedbackSection /></div>';
  const fakeRevertedKeyboard = 'window.addEventListener("scroll", blurActiveField, { passive: true })';
  const validHome = '<div data-xoot-design-version="2026-09-handoff"><BookingHero /><GiftBand /><CarePlusBand /><TrustedBy /><Reviews /><FeedbackSection /></div>';
  if (!inspectApprovedHandoff(fakeOldHome, "").some(issue => issue.includes("handoff"))) {
    throw new Error("Negative control did not detect the pre-redesign homepage");
  }
  if (!inspectApprovedHandoff(validHome, fakeRevertedKeyboard).some(issue => issue.includes("mobile keyboard"))) {
    throw new Error("Negative control did not detect the scroll keyboard regression");
  }
  if (inspectApprovedHandoff(validHome, "").length) throw new Error("Positive source gate fixture failed");
  console.log("PASS: source gate rejects older design and keyboard regression; accepts redesigned fixture");
} else {
  const home = readFileSync("src/pages/Index.tsx", "utf8");
  const nativeLayer = readFileSync("src/components/xoot/NativeInteractionLayer.tsx", "utf8");
  const errors = inspectApprovedHandoff(home, nativeLayer);
  if (errors.length) {
    errors.forEach(error => console.error("FAIL: " + error));
    process.exitCode = 1;
  } else {
    console.log("PASS: approved September Xoot homepage structure and mobile keyboard focus guard");
  }
}
