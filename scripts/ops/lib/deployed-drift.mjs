/**
 * Does what is deployed match what is in this repository?
 *
 * Nothing asked that question until 2026-08-07, and the answer was: no, not one of the 42
 * production Edge Functions. Two things had been running unnoticed for weeks — production
 * charging a pricing model the repo had replaced, and every function serving the old domain
 * in its CORS allow-list. Both were invisible because every guard in the suite reads the repo
 * file, and the repo file was right.
 *
 * The logic lives here, separate from the CLI, because the subtle part is worth testing and
 * the network part is not. The subtlety is `_shared`: a function's deployed bytes include
 * every shared module it imports, bundled at deploy time. A first pass that compared each
 * function directory against its own git history reported five functions in step; counting
 * `_shared` the true figure was zero. That gap is the whole reason this drift went unseen,
 * so it is what these functions are built around.
 */

/** `_shared/x.ts` imports named anywhere in a source file. */
export const sharedImportsOf = (source) =>
  new Set([...String(source ?? "").matchAll(/_shared\/([\w.-]+\.ts)/g)].map((match) => match[1]));

/**
 * Shared modules a file *inside* `_shared` imports, which it writes as plain siblings.
 *
 * `twilio-webhook.ts` imports `./governance-utils.ts`, not `../_shared/governance-utils.ts` —
 * there is no `_shared/` in that string for `sharedImportsOf` to match. Only correct for sources
 * that live in `_shared`: in `functions/<slug>/index.ts` a `./x.ts` is a sibling of *that*
 * function, not a shared module, so the two scanners must stay separate.
 */
export const siblingImportsOf = (source) =>
  new Set([...String(source ?? "").matchAll(/from\s+["']\.\/([\w.-]+\.ts)["']/g)].map((match) => match[1]));

/**
 * Every `_shared` module a function pulls in, following shared-to-shared imports.
 *
 * Two such imports exist — `twilio-webhook.ts` -> `./governance-utils.ts` and
 * `admin-action-utils.ts` -> `./action-utils.ts` — and until 2026-08-08 neither was followed,
 * because both are written as siblings and the entry-file regex cannot see them. That hid real
 * staleness in exactly the direction this file exists to prevent: when `governance-utils.ts`
 * changed, the five twilio webhooks were not reported stale, and the same blind spot covered the
 * seven `admin-*` functions via `action-utils.ts`. It also understated the deploy bundle, which is
 * worse than a bad report — deploying a twilio webhook from the old closure ships
 * `twilio-webhook.ts` without `governance-utils.ts`, a bundle that cannot resolve its imports.
 */
export function sharedClosure(entrySource, sharedSources) {
  const seen = new Set();
  const queue = [...sharedImportsOf(entrySource)];

  while (queue.length > 0) {
    const name = queue.pop();
    // Cycle-safe: a shared module importing back into the graph must not loop forever.
    if (seen.has(name)) continue;
    seen.add(name);
    const source = sharedSources[name];
    // Both spellings, because this source is itself in `_shared`.
    for (const next of [...sharedImportsOf(source), ...siblingImportsOf(source)]) {
      if (!seen.has(next)) queue.push(next);
    }
  }

  return seen;
}

/**
 * The newest commit time that affects what this function would deploy as.
 *
 * Returns the time and what drove it, because "stale" on its own sends someone to the wrong
 * file — the common case is a function whose own source has not moved in six weeks and whose
 * shared dependency moved this morning.
 */
export function effectiveSourceTime({ ownTime = 0, closure = new Set(), sharedTimes = {} }) {
  let newest = ownTime;
  let driver = "own source";

  for (const name of closure) {
    const time = sharedTimes[name] ?? 0;
    if (time > newest) {
      newest = time;
      driver = `_shared/${name}`;
    }
  }

  return { newest, driver };
}

/**
 * One row per deployed function, newest drift first.
 *
 * `deployedAt` older than the effective source time means the deployment cannot contain the
 * repository's current code. The reverse does not prove they match — a function deployed from
 * a different branch or by hand would still look current — so a clean result here is a
 * necessary condition, not a sufficient one. `check-deployed-drift.mjs` says so in its output
 * rather than letting a green run be read as a guarantee.
 */
export function classifyDrift({ deployments = [], ownTimes = {}, closures = {}, sharedTimes = {} }) {
  const rows = deployments.map(({ slug, deployedAt }) => {
    const { newest, driver } = effectiveSourceTime({
      ownTime: ownTimes[slug] ?? 0,
      closure: closures[slug] ?? new Set(),
      sharedTimes,
    });
    return { slug, deployedAt, sourceAt: newest, driver, stale: newest > deployedAt };
  });

  const stale = rows
    .filter((row) => row.stale)
    .sort((a, b) => b.sourceAt - a.sourceAt || a.slug.localeCompare(b.slug));

  return {
    stale,
    inStep: rows.filter((row) => !row.stale).sort((a, b) => a.slug.localeCompare(b.slug)),
    /** Deployed with no directory in the repo — source of truth is missing entirely. */
    orphans: deployments
      .filter(({ slug }) => !(slug in ownTimes))
      .map(({ slug }) => slug)
      .sort(),
  };
}
