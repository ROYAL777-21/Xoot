import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const verifier = join(process.cwd(), "scripts", "ops", "verify-rendered-site.mjs");
const servers: ReturnType<typeof createServer>[] = [];
const artifacts: string[] = [];
const authPage = '<main><h1>Welcome back</h1><label>Your email<input type="email"></label><button>Send one-time code</button><button onclick="document.getElementById(\'password-form\').hidden=false">Use your password instead</button><div id="password-form" hidden><label>Password<input type="password"></label><button type="submit">Continue</button></div></main>';
const unconfiguredRoster = '<span data-xoot-roster-state="unconfigured" data-xoot-app-environment="development">Live roster temporarily unavailable</span>';
const homePage = `<main><h1>Premium home care, built on trust</h1><a href="/auth">Sign in</a>${unconfiguredRoster}</main>`;
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

const signupFirstPage = `<main><h1>Create your account</h1>
  <label>Full name<input name="name"></label>
  <label>Your email<input type="email"></label>
  <label>Password<input type="password"></label>
  <button disabled>Get started</button>
  <button onclick="renderAuth()">Been here before? Pick up where you left off</button>
</main><script>${renderAuthScript}</script>`;

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  })));
  for (const directory of artifacts.splice(0)) {
    if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith("xoot-rendered-smoke-")) {
      throw new Error("Refusing to remove a path outside the smoke test's temporary directories");
    }
    rmSync(directory, { recursive: true, force: true });
  }
});

type FixturePage = string | { body: string; status: number } | ((request: IncomingMessage, response: ServerResponse) => void);

const serve = async (pages: Record<string, FixturePage>) => {
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://fixture.local").pathname;
    const page = pages[path] ?? { body: "missing", status: 404 };
    if (typeof page === "function") {
      response.setHeader("content-type", "text/html; charset=utf-8");
      page(request, response);
      return;
    }
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

const directoryPath = "/functions/v1/public-xooter-directory";
// Explicit synthetic adapter: it reproduces the app's public observable contract
// and browser fetch without introducing fixture switches into application code.
const rosterHome = ({ request = true, settle = true, count, endpoint }: {
  request?: boolean; settle?: boolean; count?: number; endpoint?: string;
} = {}) => `<h1>Premium home care, built on trust</h1><a href="/auth">Sign in</a>
  <span data-xoot-roster-state="loading" data-xoot-app-environment="production">Live roster checking availability</span>
  <script>
    const roster = document.querySelector('[data-xoot-roster-state]');
    const endpoint = ${endpoint ? JSON.stringify(endpoint) : `location.origin + '${directoryPath}'`};
    roster.setAttribute('data-xoot-roster-endpoint', endpoint);
    ${request ? `fetch(endpoint, {method: 'POST', body: '{}'}).then(async response => {
      if (!response.ok) throw new Error('Directory unavailable');
      const payload = await response.json();
      if (!Array.isArray(payload.xooters) || !Number.isInteger(payload.total) || payload.total < 0) throw new Error('Invalid directory');
      ${settle ? `roster.setAttribute('data-xoot-roster-state', 'ready');
      roster.textContent = 'Live roster ' + ${count === undefined ? "payload.total" : count} + ' approved Xooters';` : ""}
    }).catch(() => {
      roster.setAttribute('data-xoot-roster-state', 'error');
      roster.textContent = 'Live roster temporarily unavailable';
    });` : ""}
  </script>`;

const jsonResponse = (payload: unknown, status = 200, delay = 0): FixturePage => (_request, response) => {
  const send = () => {
    if (response.destroyed) return;
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(payload));
  };
  if (delay) {
    const timer = setTimeout(send, delay);
    response.once("close", () => clearTimeout(timer));
  } else send();
};

describe("rendered site smoke", () => {
  it("accepts signup-first entry and still verifies returning-user code and password controls", async () => {
    const url = await serve({ "/": homePage, "/auth": signupFirstPage });
    const result = await runVerifier(["--url", url]);
    expect(result.code, result.output).toBe(0);
    expect(result.output).toContain("Rendered site smoke passed");
  }, 30_000);

  it.each([
    { name: "signup fields", auth: signupFirstPage.replace("Full name", "Unlabelled field") },
    { name: "returning-user email field", auth: signupFirstPage.replace("emailLabel.append(email);", "emailLabel.append(email); emailLabel.hidden = true;") },
    { name: "email-code action", auth: signupFirstPage.replace("Send one-time code", "Disabled") },
    { name: "password action", auth: signupFirstPage.replace("Use your password instead", "Disabled") },
  ])("rejects a signup-first entry with broken $name", async ({ auth }) => {
    const url = await serve({ "/": homePage, "/auth": auth });
    const result = await runVerifier(["--url", url], { XOOT_SMOKE_TIMEOUT_MS: "1000" });
    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(/Auth navigation.*missing/);
  }, 30_000);

  it.each([404, 503])("waits on home and rejects a two-second delayed directory HTTP %s", async (status) => {
    let authVisits = 0;
    let responseSent = false;
    const url = await serve({
      "/": rosterHome(),
      [directoryPath]: (_request, response) => {
        const timer = setTimeout(() => {
          responseSent = true;
          response.writeHead(status, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ code: "NOT_FOUND" }));
        }, 2000);
        response.once("close", () => clearTimeout(timer));
      },
      "/auth": (_request, response) => { authVisits++; response.end(authPage); },
    });
    const result = await runVerifier(["--url", url]);
    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toContain(`Directory returned HTTP ${status}`);
    expect(responseSent).toBe(true);
    expect(authVisits).toBe(0);
  }, 30_000);

  it.each([0, 3])("accepts a delayed real response and settled rendered total %s before auth", async (total) => {
    let responseSent = false;
    const url = await serve({
      "/": rosterHome(),
      [directoryPath]: (_request, response) => {
        const timer = setTimeout(() => {
          responseSent = true;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ xooters: [], total }));
        }, 2000);
        response.once("close", () => clearTimeout(timer));
      },
      "/auth": (_request, response) => {
        expect(responseSent).toBe(true);
        response.end(authPage);
      },
    });
    const result = await runVerifier(["--url", url]);
    expect(result.code, result.output).toBe(0);
    expect(result.output).toContain(`settled roster (${total} approved Xooters)`);
  }, 30_000);

  it.each([
    { name: "missing request despite healthy DOM", home: rosterHome({ request: false }).replace('state="loading"', 'state="ready"').replace("Live roster checking availability", "Live roster 0 approved Xooters"), handler: jsonResponse({ xooters: [], total: 0 }), diagnostic: /Configured directory request was not observed/ },
    { name: "never-settling response", home: rosterHome(), handler: (() => undefined) as FixturePage, diagnostic: /Directory response did not settle/ },
    { name: "unfinished successful response body", home: rosterHome(), handler: ((_request, response) => { response.writeHead(200, { "Content-Type": "application/json" }); response.write('{"xooters":'); }) as FixturePage, diagnostic: /Directory response body did not finish/ },
    { name: "network failure", home: rosterHome(), handler: ((_request, response) => response.destroy()) as FixturePage, diagnostic: /Directory network request failed/ },
    { name: "invalid JSON", home: rosterHome(), handler: ((_request, response) => { response.setHeader("Content-Type", "application/json"); response.end("not-json"); }) as FixturePage, diagnostic: /Directory returned invalid JSON/ },
    { name: "rendered state never settles", home: rosterHome({ settle: false }), handler: jsonResponse({ xooters: [], total: 0 }), diagnostic: /did not render its settled truthful count/ },
    { name: "rendered count disagrees with response", home: rosterHome({ count: 9 }), handler: jsonResponse({ xooters: [], total: 0 }), diagnostic: /did not render its settled truthful count/ },
  ])("rejects $name with a bounded diagnostic before auth", async ({ home, handler, diagnostic }) => {
    let authVisits = 0;
    const url = await serve({ "/": home, [directoryPath]: handler, "/auth": (_request, response) => { authVisits++; response.end(authPage); } });
    const result = await runVerifier(["--url", url], { XOOT_SMOKE_TIMEOUT_MS: "1000" });
    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(diagnostic);
    expect(authVisits).toBe(0);
  }, 30_000);

  it.each([null, { total: 0 }, { xooters: {}, total: 0 }, { xooters: [], total: -1 }, { xooters: [], total: 1.5 }, { xooters: [], total: "0" }])("rejects invalid directory shape %j", async (payload) => {
    const url = await serve({ "/": rosterHome(), [directoryPath]: jsonResponse(payload), "/auth": authPage });
    const result = await runVerifier(["--url", url]);
    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(/xooters array and a nonnegative integer total/);
  }, 30_000);

  it.each(["production", "staging"])("does not skip unconfigured %s", async (environment) => {
    const url = await serve({ "/": homePage.replace('environment="development"', `environment="${environment}"`), "/auth": authPage });
    const result = await runVerifier(["--url", url]);
    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(/release environments require the real roster/);
  }, 30_000);

  it("rejects a homepage without observable roster configuration", async () => {
    const url = await serve({ "/": homePage.replace(unconfiguredRoster, ""), "/auth": authPage });
    const result = await runVerifier(["--url", url], { XOOT_SMOKE_TIMEOUT_MS: "1000" });
    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(/roster readiness is missing/);
  }, 30_000);

  it("does not accept a successful request to a different backend than the configured endpoint", async () => {
    const wrongApi = await serve({ [directoryPath]: (_request, response) => {
      response.setHeader("Access-Control-Allow-Origin", "*");
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ xooters: [], total: 0 }));
    } });
    const home = rosterHome({ request: false }).replace("</script>", `
      fetch(${JSON.stringify(new URL(directoryPath, wrongApi).href)}, {method: 'POST', body: '{}'}).catch(() => {});
    </script>`);
    const url = await serve({ "/": home, [directoryPath]: jsonResponse({ xooters: [], total: 0 }), "/auth": authPage });
    const result = await runVerifier(["--url", url], { XOOT_SMOKE_TIMEOUT_MS: "1000" });
    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(/Configured directory request was not observed/);
  }, 30_000);

  it("rejects query-bearing directory configuration without printing private query data", async () => {
    const url = await serve({ "/": rosterHome({ endpoint: "https://synthetic.test/functions/v1/public-xooter-directory?access=synthetic-private-query", request: false }), "/auth": authPage });
    const result = await runVerifier(["--url", url]);
    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(/valid public directory endpoint/);
    expect(result.output).not.toContain("synthetic-private-query");
  }, 30_000);

  it.each([
    { name: "hero", home: homePage.replace("Premium home care, built on trust", "Wrong page"), auth: authPage },
    { name: "sign-in link", home: homePage.replace('<a href="/auth">Sign in</a>', ""), auth: authPage },
    { name: "email-code action", home: homePage, auth: authPage.replace("Send one-time code", "Disabled") },
    { name: "password action", home: homePage, auth: authPage.replace("Use your password instead", "Disabled") },
  ])("retains the required $name check", async ({ home, auth }) => {
    const url = await serve({ "/": home, "/auth": auth });
    const result = await runVerifier(["--url", url], { XOOT_SMOKE_TIMEOUT_MS: "1000" });
    expect(result.code, result.output).not.toBe(0);
  }, 30_000);

  it("retains intended homepage location checks", async () => {
    const url = await serve({ "/": (_request, response) => { response.writeHead(302, { Location: "/unexpected" }); response.end(); }, "/unexpected": homePage, "/auth": authPage });
    const result = await runVerifier(["--url", url]);
    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(/instead of the intended URL/);
  }, 30_000);

  it("retains the runtime guard even with a successful settled roster", async () => {
    const url = await serve({ "/": `${rosterHome()}<script>throw new Error('synthetic runtime fault')</script>`, [directoryPath]: jsonResponse({ xooters: [], total: 0 }), "/auth": authPage });
    const result = await runVerifier(["--url", url]);
    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(/Relevant runtime problem detected.*synthetic runtime fault/);
  }, 30_000);

  it("retains the unavailable overlay guard outside the truthful development roster", async () => {
    const url = await serve({ "/": `${homePage}<div role="alert">Service temporarily unavailable</div>`, "/auth": authPage });
    const result = await runVerifier(["--url", url]);
    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(/Configuration failure overlay/);
  }, 30_000);

  it("accepts a rendered homepage that reaches usable sign-in controls", async () => {
    const url = await serve({
      "/": homePage,
      "/auth": authPage,
    });

    const result = await runVerifier(["--url", url]);

    expect(result.code, result.output).toBe(0);
    expect(result.output).toMatch(/rendered site smoke passed/i);
    expect(result.output).toContain("explicitly unconfigured development (real roster not checked)");
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
      "/": homePage,
      "/auth": { body: "missing", status: 404 },
    });

    const result = await runVerifier(["--url", url]);

    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(/auth.*successful response|successful response.*auth/i);
  }, 30_000);

  it("rejects an auth error status even when the error document includes sign-in controls", async () => {
    const url = await serve({
      "/": homePage,
      "/auth": { body: authPage, status: 404 },
    });
    const result = await runVerifier(["--url", url]);
    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toMatch(/Auth navigation.*404/);
  }, 30_000);

  it("rejects a broken auth deep link even when client-side navigation renders the form", async () => {
    const home = `${homePage}<script>
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
    const directory = makeArtifact(`<body>${unconfiguredRoster}<script>
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
    const directory = makeArtifact(`<body>${unconfiguredRoster}<script>
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
      "/": `${homePage}<img alt="" src="/missing-image?access=synthetic-private-query">`,
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
