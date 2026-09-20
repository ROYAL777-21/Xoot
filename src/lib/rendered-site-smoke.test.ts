import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const verifier = join(process.cwd(), "scripts", "ops", "verify-rendered-site.mjs");
const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

type FixturePage = string | { body: string; status: number };

const serve = async (pages: Record<string, FixturePage>) => {
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://fixture.local").pathname;
    const page = pages[path] ?? { body: "missing", status: 404 };
    const body = typeof page === "string" ? page : page.body;
    response.statusCode = typeof page === "string" ? 200 : page.status;
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(body);
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("fixture server did not bind");
  return `http://127.0.0.1:${address.port}/`;
};

const runVerifier = (url: string) =>
  new Promise<{ code: number | null; output: string }>((resolve) => {
    const child = spawn(process.execPath, [verifier, "--url", url], {
      cwd: process.cwd(),
      env: { ...process.env, XOOT_SMOKE_TIMEOUT_MS: "5000" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += String(chunk)));
    child.stderr.on("data", (chunk) => (output += String(chunk)));
    child.on("close", (code) => resolve({ code, output }));
  });

describe("rendered site smoke", () => {
  it("accepts a rendered homepage that reaches usable sign-in controls", async () => {
    const url = await serve({
      "/": '<main><h1>Premium home care, built on trust</h1><a href="/auth">Sign in</a></main>',
      "/auth": '<main><h1>Welcome back</h1><label>Your email<input type="email"></label><button>Send one-time code</button><button onclick="document.getElementById(\'password-form\').hidden=false">Use your password instead</button><div id="password-form" hidden><label>Password<input type="password"></label><button type="submit">Continue</button></div></main>',
    });

    const result = await runVerifier(url);

    expect(result.code, result.output).toBe(0);
    expect(result.output).toMatch(/rendered site smoke passed/i);
  }, 30_000);

  it("rejects the configuration overlay even when the document returns 200", async () => {
    const url = await serve({
      "/": '<main role="alert"><h1>Configuration Error</h1><p>Contact support.</p></main>',
    });

    const result = await runVerifier(url);

    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(/configuration/i);
  }, 30_000);

  it("rejects sign-in navigation when the host cannot serve the auth deep link", async () => {
    const url = await serve({
      "/": '<main><h1>Premium home care, built on trust</h1><a href="/auth">Sign in</a></main>',
      "/auth": { body: "missing", status: 404 },
    });

    const result = await runVerifier(url);

    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(/auth.*successful response|successful response.*auth/i);
  }, 30_000);

  it("gates local verification, CI artifacts, and the matched live deployment", () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const testsWorkflow = readFileSync(join(process.cwd(), ".github/workflows/tests.yml"), "utf8");
    const previewWorkflow = readFileSync(join(process.cwd(), ".github/workflows/web-preview.yml"), "utf8");
    const liveWorkflow = readFileSync(join(process.cwd(), ".github/workflows/verify-live-deploy.yml"), "utf8");

    expect(packageJson.scripts["ops:smoke:rendered:artifact"]).toBe(
      "node scripts/ops/verify-rendered-site.mjs --artifact dist",
    );
    expect(packageJson.scripts["ops:smoke:rendered:live"]).toBe(
      "node scripts/ops/verify-rendered-site.mjs --url",
    );
    expect(packageJson.scripts.verify).toContain("npm run ops:smoke:rendered:artifact");
    expect(testsWorkflow).toContain("bun run ops:smoke:rendered:artifact");
    expect(testsWorkflow.indexOf("playwright install --with-deps chromium")).toBeLessThan(
      testsWorkflow.indexOf("run: bun run test"),
    );
    expect(previewWorkflow).toContain("npm run ops:smoke:rendered:artifact");
    expect(liveWorkflow).toContain('npm run ops:smoke:rendered:live -- "$SITE"');

    for (const workflow of [testsWorkflow, previewWorkflow, liveWorkflow]) {
      expect(workflow).toMatch(/playwright install(?: --with-deps)? chromium/);
    }
  });
});
