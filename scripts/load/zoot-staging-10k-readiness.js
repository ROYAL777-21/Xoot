import http from "k6/http";
import { check } from "k6";

const BASE_URL = requireEnv("BASE_URL");
const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_ANON_KEY = requireEnv("SUPABASE_ANON_KEY");
const LOAD_TEST_ENV = requireEnv("LOAD_TEST_ENV");

const USER_AGENT = "XootStagingLoadReadiness/1.0";
const RESPONSE_TIMEOUT = __ENV.RESPONSE_TIMEOUT || "10s";

const publicRoutes = ["/", "/care-plus", "/install", "/trust-centre", "/articles"];
const staticRoutes = ["/manifest.webmanifest", "/robots.txt"];

export const options = {
  scenarios: {
    public_web_10k: {
      executor: "shared-iterations",
      vus: Number(__ENV.WEB_VUS || 50),
      iterations: 7000,
      maxDuration: __ENV.MAX_DURATION || "10m",
      exec: "publicWeb",
    },
    static_assets_10k: {
      executor: "shared-iterations",
      vus: Number(__ENV.STATIC_VUS || 20),
      iterations: 1500,
      maxDuration: __ENV.MAX_DURATION || "10m",
      exec: "staticAssets",
    },
    supabase_public_reads_10k: {
      executor: "shared-iterations",
      vus: Number(__ENV.API_VUS || 30),
      iterations: 1500,
      maxDuration: __ENV.MAX_DURATION || "10m",
      exec: "supabasePublicReads",
    },
  },
  thresholds: {
    checks: ["rate>0.99"],
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000", "p(99)<2000"],
  },
};

validateTarget();

export function publicWeb() {
  const route = publicRoutes[Math.floor(Math.random() * publicRoutes.length)];
  const response = http.get(`${BASE_URL}${route}`, requestOptions("public_web"));

  check(response, {
    "public route returns 2xx/3xx": (res) => res.status >= 200 && res.status < 400,
    "public route has meaningful body": (res) => Boolean(res.body && res.body.length > 500),
    "public route does not expose stack trace": (res) => !hasServerLeak(res.body),
  });
}

export function staticAssets() {
  const route = staticRoutes[Math.floor(Math.random() * staticRoutes.length)];
  const response = http.get(`${BASE_URL}${route}`, requestOptions("static_assets"));

  check(response, {
    "static route does not server-error": (res) => res.status < 500,
    "static route is not an auth redirect": (res) => ![301, 302, 307, 308].includes(res.status),
  });
}

export function supabasePublicReads() {
  const response = http.get(
    `${SUPABASE_URL}/rest/v1/subscription_plans?select=id,name,price_cents&limit=5`,
    {
      ...requestOptions("supabase_public_reads"),
      headers: {
        ...requestHeaders(),
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    },
  );

  check(response, {
    "Supabase responds without 5xx": (res) => res.status < 500,
    "Supabase returns expected auth/read status": (res) => [200, 401, 403].includes(res.status),
    "Supabase does not expose stack trace": (res) => !hasServerLeak(res.body),
  });
}

export function handleSummary(data) {
  const summaryPath = __ENV.LOAD_TEST_SUMMARY_PATH;
  const summary = {
    target: "zoot-staging-10000-request-readiness",
    base_url_host: safeHost(BASE_URL),
    supabase_host: safeHost(SUPABASE_URL),
    requested_iterations: 10000,
    metrics: pickMetrics(data.metrics),
    threshold_results: pickThresholds(data.metrics),
    check_results: data.root_group?.checks || [],
  };

  const outputs = {
    stdout: [
      "Xoot staging 10,000-request readiness run complete.",
      `Host: ${summary.base_url_host}`,
      `Supabase: ${summary.supabase_host}`,
      "Do not treat this as a 10,000-concurrent-user result.",
      "",
    ].join("\n"),
  };

  if (summaryPath) {
    outputs[summaryPath] = `${JSON.stringify(summary, null, 2)}\n`;
  }

  return outputs;
}

function requestOptions(name) {
  return {
    tags: { zoot_check: name },
    timeout: RESPONSE_TIMEOUT,
    headers: requestHeaders(),
  };
}

function requestHeaders() {
  return {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
  };
}

function requireEnv(name) {
  const value = __ENV[name];
  if (!value) {
    throw new Error(`${name} is required for the staging 10,000-request readiness run.`);
  }

  return value;
}

function validateTarget() {
  if (LOAD_TEST_ENV !== "staging") {
    throw new Error("Set LOAD_TEST_ENV=staging. Use zoot-smoke.js for local checks.");
  }

  const baseHost = safeHost(BASE_URL);
  const supabaseHost = safeHost(SUPABASE_URL);
  if (!baseHost || !supabaseHost) {
    throw new Error("BASE_URL and SUPABASE_URL must be valid absolute URLs.");
  }

  const productionLike = isProductionHost(baseHost);
  if (productionLike && __ENV.ALLOW_PRODUCTION_LOAD_TEST !== "true") {
    throw new Error("Refusing to run a staging readiness test against the production host.");
  }

  const localhostLike = isLocalhost(baseHost) || isLocalhost(supabaseHost);
  if (localhostLike && __ENV.ALLOW_LOCALHOST_LOAD_TEST !== "true") {
    throw new Error("Refusing to run the 10,000-request readiness script against localhost.");
  }

  const stagingLike =
    baseHost.includes("staging") ||
    baseHost.includes("preview") ||
    baseHost.includes("netlify") ||
    baseHost.includes("vercel") ||
    baseHost.includes("pages.dev");

  if (!stagingLike && __ENV.ALLOW_NON_STAGING_BASE_URL !== "true") {
    throw new Error("BASE_URL must look like staging/preview, or set ALLOW_NON_STAGING_BASE_URL=true for an approved non-production target.");
  }
}

function safeHost(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isProductionHost(host) {
  return host === "xoot.co.za" || host === "www.xoot.co.za";
}

function isLocalhost(host) {
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("[::1]");
}

function hasServerLeak(body) {
  if (!body) return false;
  return /(postgres:\/\/|service_role|stack trace|supabase_service_role|deno\.serve)/i.test(String(body));
}

function pickMetrics(metrics) {
  const names = [
    "checks",
    "http_req_failed",
    "http_req_duration",
    "http_reqs",
    "iteration_duration",
    "vus_max",
  ];

  return names.reduce((acc, name) => {
    if (metrics[name]) {
      acc[name] = metrics[name];
    }
    return acc;
  }, {});
}

function pickThresholds(metrics) {
  return Object.entries(metrics).reduce((acc, [name, metric]) => {
    if (metric.thresholds) {
      acc[name] = metric.thresholds;
    }
    return acc;
  }, {});
}
