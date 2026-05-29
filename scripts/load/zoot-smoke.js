import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:4173";
const SUPABASE_URL = __ENV.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || "";

export const options = {
  scenarios: {
    public_web: {
      executor: "ramping-vus",
      stages: [
        { duration: "30s", target: 25 },
        { duration: "1m", target: 100 },
        { duration: "30s", target: 0 },
      ],
      exec: "publicWeb",
    },
    api_readiness: {
      executor: "constant-arrival-rate",
      rate: Number(__ENV.API_RATE || 25),
      timeUnit: "1s",
      duration: __ENV.API_DURATION || "2m",
      preAllocatedVUs: 50,
      maxVUs: 250,
      exec: "apiReadiness",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
};

const routes = ["/", "/auth", "/auth/reset", "/care-plus", "/install", "/trust-centre"];

export function publicWeb() {
  const route = routes[Math.floor(Math.random() * routes.length)];
  const response = http.get(`${BASE_URL}${route}`);
  check(response, {
    "public route returns 2xx/3xx": (res) => res.status >= 200 && res.status < 400,
    "public route has body": (res) => res.body && res.body.length > 500,
  });
  sleep(1);
}

export function apiReadiness() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    check(null, { "Supabase env skipped": () => true });
    sleep(1);
    return;
  }

  const response = http.get(`${SUPABASE_URL}/rest/v1/subscription_plans?select=id,name,price_cents&limit=5`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  check(response, {
    "Supabase public read reachable": (res) => [200, 401, 403].includes(res.status),
    "Supabase does not return server error": (res) => res.status < 500,
  });
  sleep(1);
}
