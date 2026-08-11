---
name: plan-before-executing
description: >
  Decide the whole sequence before spending the first token on it, and read only what the
  decision needs. Encodes the specific waste this repo has already paid for — whole files read
  for one constant, a 900-line design export opened raw when its README has an extraction
  snippet, Edge Function sources hand-transcribed when the CLI uploads from disk, a polling loop
  that could never exit. Use at the start of any multi-step task, and before any read or tool
  call whose output will be large.
user-invocable: true
---

# Plan first, then read only what the plan needs

Context is the budget. Every file read, every tool result, every re-transcription of something
already on disk is spent from it — and when it runs out mid-task, the work does not fail
cleanly, it fails *quietly*, halfway through, with the reasoning lost. This session has been
summarised and resumed several times, and each summary is a lossy compression of decisions that
were expensive to reach the first time.

## The rule

**Write the sequence before executing any of it.** Not a gesture at one — the actual ordered
list, with the files each step touches. Then execute it without re-deriving.

A plan costs a few hundred tokens. Discovering step 3 was unnecessary *after* reading four files
for it costs tens of thousands, and the four files stay in context either way.

## Before any read, ask what you need from it

| Need | Do this | Not this |
|---|---|---|
| One constant, one export name | `Grep -n` for the symbol | `Read` the whole file |
| Whether a pattern exists anywhere | `Grep` with `files_with_matches` | `Read` candidates one by one |
| A section of a long file | `Read` with `offset`/`limit` | `Read` all 2000 lines |
| Broad "where does X live" across many dirs | one `Explore` agent | a dozen serial `Grep`s |
| A file already read this session | use what is in context | read it again to be sure |

`Read` on a file you edited moments ago is close to pure waste — `Edit` errors if the change did
not apply, so re-reading verifies nothing the tool has not already told you.

## The four expensive mistakes this repo has actually made

**1. Transcribing what a tool can upload.** Redeploying seven `admin-*` Edge Functions through
`deploy_edge_function` means pasting the entry file *plus* `admin-action-utils.ts` *plus*
`action-utils.ts` for each one — roughly 98KB of transcription for a change that is already on
disk. Before hand-carrying file contents through a tool argument, check whether a CLI path
(`supabase functions deploy`) or a `--from-json`/`--file`/`--from-file` style escape hatch
exists. Almost every tool has one; it is cheaper to spend a minute looking than an hour typing.

**2. Opening a generated file raw.** `design/Xoot_App.html` is the Claude Design export — 197
components, every asset base64 gzip. `design/README.md` carries the extraction snippet precisely
so nobody opens the HTML whole. **When a directory has a README, read the README first.** It
usually exists because someone already hit the expensive path.

**3. Re-implementing a tool in shell.** A `curl` loop was written to poll GitHub Actions for CI
status. The Actions API returns **403** unauthenticated, so `grep -q "completed"` never matched
and the `until` loop spun to timeout producing no output — the token cost of a long-running
command with nothing to show for it, twice, in parallel. `mcp__github__pull_request_read` with
`get_check_runs` carries the credentials and answers in one call. **Prefer the MCP tool over the
shell re-implementation of it**, and never `sleep`-poll for something the harness will wake you
for.

**4. Acting before reading the tool's semantics.** `apply_migration` assigns its own timestamp
version and ignores the filename you give it. Applying eleven migrations without knowing that
put both projects out of alignment with the repo, and repairing it meant a `schema_migrations`
UPDATE against production. **One read of the tool description before the first call would have
cost nothing.**

## Batch what does not depend on anything

Independent calls belong in one message. `git status` + `ls` + reading two unrelated files is one
turn, not four. Sequential turns each re-send the conversation; the saving compounds over a long
task.

The counterpart: if call B needs call A's output, do **not** guess A's output to batch them. That
trades a small saving for a wrong branch of work.

## When the plan changes

It will. Findings invalidate steps — that is what findings are for. When a step becomes
unnecessary, **say so in one line and drop it**; do not execute it because it was on the list, and
do not re-litigate the whole plan around it. This session dropped "port 197 components" to
"build the ~4 primitives the kit is actually made of" on discovering 50 shadcn primitives already
covered Button, Card, Sheet, Badge and Avatar. One paragraph of reading, most of the work gone.

## Stop conditions, decided in advance

Before a loop, a retry, or a broad search, name what would make you stop. "Retry the push up to 4
times with backoff" is a stop condition. "Poll until it completes" is not — it has no bound and
no failure branch, which is exactly how the `curl` loop became a timeout.

## Do not ask to proceed

The founder's standing instruction: **work to completion, then list what genuinely needs them.**
A mid-task "shall I continue?" spends a full turn to learn nothing. Ask only when the answer
changes the work and no reasonable default exists — otherwise state the assumption in one line
and carry on. `evidence-before-claims` covers how to report what you did and did not verify at
the end.
