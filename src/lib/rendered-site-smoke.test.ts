import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const verifier = join(process.cwd(), "scripts", "ops", "verify-rendered-site.mjs");
const servers: ReturnType<typeof createServer>[] = [];
const artifacts: string[] = [];
const authPage = '<main><h1>Welcome back</h1><label>Your email<input type="email"></label><button>Send one-time code</button><button onclick="document.getElementById(\'password-form\').hidden=false">Use your password instead</button><div id="password-form" hidden><label>Password<input type="password"></label><button type="submit">Continue</button></div></main>';
// Browser fixture uses ordinary DOM creation, subject to the same unsafe-DOM
// scan as application code. No sanitizer exception is needed for these tests.
const renderAuthScript = `function renderAuth() {
  const main = document.createElement('main');
  const heading = document.createElement('h1'); heading.textContent = 'Welcome back';
  const emailLabel = document.createElement('label'); emailLabel.textContent = 'Your email';
  const email = document.createElement('input'); email.type = 'email'; emailLabel.append(email);
  const send = document.createElement('button'); send.textContent = 'Send one-time code';
  const toggle = document.createElement('button'); toggle.textContent = 'Use your password instead';
  const passwordForm = document.createElement('div'); passwordForm.hidden = true;
  const passwordLabel = document.createElement('label'); passwordLabel.textContent = 'Password';
  const password = document.createElement('input'); password.type = 'password'; passwordLabel.append(password);
  const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = 'Continue';
  passwordForm.append(passwordLabel, submit);
  toggle.addEventListener('click', () => { passwordForm.hidden = false; });
  main.append(heading, emailLabel, send, toggle, passwordForm);
  document.body.replaceChildren(main);
}`;

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  for (const directory of artifacts.splice(0)) {
    if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith("xoot-rendered-smoke-")) {
      throw new Error("Refusing to remove a path outside the smoke test's temporary directories");
    }
    rmSync(directory, { recursive: true, force: true });
  }
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

const makeArtifact = (html: string) => {
  const directory = mkdtempSync(join(tmpdir(), "xoot-rendered-smoke-"));
  artifacts.push(directory);
  writeFileSync(join(directory, "index.html"), html);
  return directory;
};

const runVerifier = (args: string[], environment: Record<string, string> = {}) =>
  new Promise<{ code: number | null; output: string }>((resolve) => {
    const child = spawn(process.execPath, [verifier, ...args], {
      cwd: process.cwd(),
      env: { ...process.env, XOOT_SMOKE_TIMEOUT_MS: "5000", ...environment },
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
      "/auth": authPage,
    });

    const result = await runVerifier(["--url", url]);

    expect(result.code, result.output).toBe(0);
    expect(result.output).toMatch(/rendered site smoke passed/i);
  }, 30_000);

  it("rejects the configuration overlay even when the document returns 200", async () => {
    const url = await serve({
      "/": '<main role="alert"><h1>Configuration Error</h1><p>Contact support.</p></main>',
    });

    const result = await runVerifier(["--url", url]);

    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(/configuration/i);
  }, 30_000);

  it("rejects sign-in navigation when the host cannot serve the auth deep link", async () => {
    const url = await serve({
      "/": '<main><h1>Premium home care, built on trust</h1><a href="/auth">Sign in</a></main>',
      "/auth": { body: "missing", status: 404 },
    });

    const result = await runVerifier(["--url", url]);

    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(/auth.*successful response|successful response.*auth/i);
  }, 30_000);

  it("rejects an auth error status even when the error document includes sign-in controls", async () => {
    const url = await serve({
      "/": '<h1>Premium home care, built on trust</h1><a href="/auth">Sign in</a>',
      "/auth": { body: authPage, status: 404 },
    });
    const result = await runVerifier(["--url", url]);
    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(/Auth navigation.*404/);
  }, 30_000);

  it("rejects a broken auth deep link even when client-side navigation renders the form", async () => {
    const home = `<h1>Premium home care, built on trust</h1><a href="/auth">Sign in</a><script>
      ${renderAuthScript}
      document.querySelector('a').addEventListener('click', event => {
        event.preventDefault(); history.pushState({}, '', '/auth');
        renderAuth();
      });
    </script>`;
    const url = await serve({ "/": home, "/auth": { body: "missing", status: 404 } });
    const result = await runVerifier(["--url", url]);
    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(/Auth.*successful response.*404/);
  }, 30_000);

  it("leaves backend traffic real and preserves the configured artifact origin", async () => {
    // Both fixture origins are loopback. Public HTTPS -> loopback is intentionally
    // blocked by Chromium's local-network permission and is not our deployment path.
    const origin = "http://127.0.0.1:0";
    const observedOrigins: string[] = [];
    const api = createServer((request, response) => {
      observedOrigins.push(request.headers.origin ?? "missing");
      if (/^http:\/\/127\.0\.0\.1:\d+$/.test(request.headers.origin ?? "")) {
        response.setHeader("Access-Control-Allow-Origin", request.headers.origin!);
      }
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ heading: "Premium home care, built on trust" }));
    });
    servers.push(api);
    await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
    const address = api.address();
    if (!address || typeof address === "string") throw new Error("API did not bind");
    const directory = makeArtifact(`<body><script>
      ${renderAuthScript}
      if (location.pathname === '/auth') renderAuth();
      else fetch('http://127.0.0.1:${address.port}/').then(response => response.json()).then(data => {
        const heading = document.createElement('h1'); heading.textContent = data.heading;
        document.body.append(heading);
        const link = document.createElement('a'); link.href = '/auth'; link.textContent = 'Sign in';
        document.body.append(link);
      });
    </script></body>`);

    const result = await runVerifier(["--artifact", directory], { XOOT_SMOKE_ARTIFACT_ORIGIN: origin });
    expect(result.code, result.output).toBe(0);
    expect(observedOrigins.length).toBeGreaterThan(0);
    expect(observedOrigins.every((value) => value === observedOrigins[0])).toBe(true);
    expect(result.output).toContain(`${observedOrigins[0]}/`);
  }, 30_000);

  it("loads only the built website files at an HTTPS public origin, including the auth route", async () => {
    const origin = "https://artifact.xoot.test";
    const directory = makeArtifact(`<body><script>
      ${renderAuthScript}
      if (location.origin !== ${JSON.stringify(origin)}) throw new Error('Wrong artifact origin');
      if (location.pathname === '/auth') renderAuth();
      else {
        const heading = document.createElement('h1'); heading.textContent = 'Premium home care, built on trust';
        const link = document.createElement('a'); link.href = '/auth'; link.textContent = 'Sign in';
        document.body.append(heading, link);
      }
    </script></body>`);
    const result = await runVerifier(["--artifact", directory], { XOOT_SMOKE_ARTIFACT_ORIGIN: origin });
    expect(result.code, result.output).toBe(0);
    expect(result.output).toContain(origin);
  }, 30_000);

  it("identifies failed resources without disclosing their query parameters", async () => {
    const url = await serve({
      "/": '<h1>Premium home care, built on trust</h1><a href="/auth">Sign in</a><img alt="" src="/missing-image?access=synthetic-private-query">',
      "/auth": authPage,
    });
    const result = await runVerifier(["--url", url]);
    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toContain(`HTTP 404 GET ${new URL(url).origin}/missing-image`);
    expect(result.output).not.toContain("synthetic-private-query");
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
