import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:4199/";
const output = resolve(process.argv[3] || "outputs/visual-fidelity");
mkdirSync(output, { recursive: true });
const evidence = { url, checkedAt: new Date().toISOString(), checks: [], errors: [] };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
page.on("pageerror", (error) => evidence.errors.push(error.message));
const home = async () => {
  await page.goto(url);
  await page.getByRole("heading", { name: /Premium home care/ }).waitFor();
  await page.evaluate(() => document.fonts.ready);
};
try {
  await home();
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.locator("#xoot-mobile-menu").waitFor({ state: "visible" });
  await page.screenshot({ path: resolve(output, "website-mobile-menu.png") });
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#xoot-mobile-menu").count(), 0);
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.locator("#xoot-mobile-menu").getByRole("link", { name: "Services", exact: true }).click();
  await page.waitForURL((target) => target.hash === "#services");
  assert.equal(await page.locator("#xoot-mobile-menu").count(), 0);
  evidence.checks.push("Mobile menu opens, closes with Escape and closes after anchor navigation.");

  for (const [label, service] of [["Regular cleaning", "residential"], ["Airbnb cleaning", "airbnb"], ["Express cleaning", "express"], ["Office cleaning", "office"], ["Moving cleaning", "moving"]]) {
    await home();
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.getByRole("textbox", { name: "Service address", exact: true }).fill("Sandton");
    await page.locator(".xoot-hero-card").getByRole("button", { name: "Book now", exact: true }).click();
    await page.waitForURL((target) => target.pathname === "/auth");
    await page.getByRole("textbox", { name: "Email", exact: true }).waitFor();
    const target = await page.evaluate(() => window.history.state?.usr?.from?.pathname);
    assert.equal(target, `/app?service=${service}&address=Sandton`);
  }
  evidence.checks.push("All five supported service choices preserve the service and address in the sign-in handoff.");
  await page.screenshot({ path: resolve(output, "website-sign-in-390.png") });

  await home();
  await page.getByRole("button", { name: "Laundry & ironing, currently unavailable", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Laundry & ironing is not available yet" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Service unavailable", exact: true }).isDisabled(), true);
  assert.equal(await page.locator(".xoot-store-availability a, .xoot-store-availability button").count(), 0);
  evidence.checks.push("Unavailable laundry cannot start checkout; unpublished app listings have no false download links.");

  for (const viewport of [{ width: 844, height: 390 }, { width: 720, height: 500 }]) {
    await page.setViewportSize(viewport);
    await home();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    const menu = await page.locator("#xoot-mobile-menu").boundingBox();
    assert.ok(menu && menu.y + menu.height <= viewport.height, "Menu must fit the available screen height");
    await page.screenshot({ path: resolve(output, `website-${viewport.width}x${viewport.height}.png`) });
  }
  evidence.checks.push("Landscape 844×390 and 720×500 (1440px browser at 200% zoom equivalent) reflow without overflow; menu fits vertically.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await home();
  const longest = page.locator(".xoot-flip-phrase").filter({ hasText: "Experience the difference" });
  await longest.waitFor({ state: "visible", timeout: 18000 });
  const fit = await longest.evaluate((node) => {
    const host = node.parentElement.getBoundingClientRect();
    const text = node.getBoundingClientRect();
    const styles = [node, node.parentElement, node.closest("h1")].map((element) => {
      const style = getComputedStyle(element);
      return { transform: style.transform, filter: style.filter, willChange: style.willChange };
    });
    return { fits: text.width <= host.width, styles };
  });
  assert.equal(fit.fits, true);
  assert.ok(fit.styles.every((style) => style.transform === "none" && style.filter === "none" && style.willChange === "auto"));
  evidence.checks.push("Longest animated heading fits using font size, with no text transform, blur or retained compositing hint.");

  const dense = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  await dense.goto(url);
  await dense.getByRole("heading", { name: /Premium home care/ }).waitFor();
  await dense.evaluate(() => document.fonts.ready);
  const sharpPortrait = await dense.locator(".xoot-hero-photo img").evaluate(async (image) => {
    const bitmap = await createImageBitmap(await (await fetch(image.currentSrc)).blob());
    const adequate = bitmap.width >= image.getBoundingClientRect().width * devicePixelRatio;
    bitmap.close();
    return adequate;
  });
  assert.equal(sharpPortrait, true, "The selected portrait must cover its actual high-density display size");
  await dense.screenshot({ path: resolve(output, "website-1440-dpr2.png") });
  await dense.close();
  evidence.checks.push("Captured 1440×1000 at device pixel ratio 2 with the original variable fonts and artwork.");
  assert.deepEqual(evidence.errors, []);
  console.log(evidence.checks.join("\n"));
} finally {
  await browser.close();
  writeFileSync(resolve(output, "interaction-checks.json"), JSON.stringify(evidence, null, 2) + "\n");
}
