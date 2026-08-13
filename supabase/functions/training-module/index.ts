import {
  cleanId,
  cleanText,
  fail,
  getServiceClient,
  handlePreflight,
  ok,
  readJson,
  requireAuth,
} from "../_shared/action-utils.ts";

/**
 * Serves training questions without their answers, and grades submitted attempts.
 *
 * The client used to write `passed` and `score` on `xooter_training_completions` directly,
 * which meant "completed the safety module" only ever asserted that someone sent a row saying
 * so. `20260802120000_client_write_surface_lockdown.sql` revoked that write and
 * `20260802140000` revoked read access to the answer key, so both halves of self-certification
 * are closed and this is the only remaining path.
 *
 * Everything here runs on the service role, so no request body is trusted for identity: the
 * user comes from the verified JWT, never from the payload.
 */

/** Maximum answers accepted in one submission. Bounded so a payload cannot be used to grind. */
const MAX_ANSWERS = 100;

/** Attempts allowed per module per day, per user. Slows brute-forcing a multiple-choice key. */
const MAX_ATTEMPTS_PER_DAY = 5;

type QuizQuestion = { q: string; a: string[]; correct: number };

/** Strips `correct` before a question ever leaves the server. */
function withoutAnswers(questions: QuizQuestion[]) {
  return questions.map((question, index) => ({
    index,
    q: question.q,
    a: Array.isArray(question.a) ? question.a : [],
  }));
}

/**
 * Percentage of questions answered correctly, rounded down.
 *
 * An unanswered question is wrong rather than skipped — otherwise submitting a single correct
 * answer and omitting the rest scores 100%.
 */
function grade(questions: QuizQuestion[], answers: number[]) {
  if (questions.length === 0) return { score: 0, correct: 0, total: 0 };
  let correct = 0;
  for (const [index, question] of questions.entries()) {
    if (answers[index] === question.correct) correct += 1;
  }
  return {
    score: Math.floor((correct / questions.length) * 100),
    correct,
    total: questions.length,
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user } = auth as { user: { id: string } };

  // The caller's own client cannot read quiz_questions any more, by design.
  const supa = getServiceClient();

  try {
    const body = await readJson(req);
    const action = cleanText(body.action, 20) || "questions";
    const moduleId = cleanId(body.moduleId ?? body.module_id);
    if (!moduleId) return fail("module_id required", origin, 400);

    const { data: module, error: moduleError } = await supa
      .from("training_modules")
      .select("id,title,pass_score,quiz_questions,required,rank_points,badge_label")
      .eq("id", moduleId)
      .maybeSingle();

    if (moduleError || !module?.id) return fail("module not found", origin, 404);

    const questions: QuizQuestion[] = Array.isArray(module.quiz_questions)
      ? module.quiz_questions
      : [];

    if (action === "questions") {
      return ok(
        {
          module: {
            id: module.id,
            title: module.title,
            passScore: module.pass_score,
            required: module.required,
          },
          questions: withoutAnswers(questions),
        },
        origin,
      );
    }

    if (action !== "submit") return fail("unknown action", origin, 400);

    const submitted = body.answers;
    if (!Array.isArray(submitted) || submitted.length > MAX_ANSWERS) {
      return fail("answers must be an array of choice indexes", origin, 400);
    }
    // Anything that is not a whole number becomes -1, which matches no valid choice index.
    const answers = submitted.map((value) =>
      Number.isInteger(value) ? (value as number) : -1,
    );

    // Rate limit before grading, so a rejected attempt costs nothing and reveals nothing.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supa
      .from("xooter_training_completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("module_id", module.id)
      .gte("completed_at", since);

    if (countError) return fail("attempt history unavailable", origin, 500);
    if ((count ?? 0) >= MAX_ATTEMPTS_PER_DAY) {
      return fail("too many attempts today", origin, 429, { retryAfterHours: 24 });
    }

    const { score, correct, total } = grade(questions, answers);
    const passed = score >= (module.pass_score ?? 100);

    const { error: insertError } = await supa.from("xooter_training_completions").insert({
      user_id: user.id,
      module_id: module.id,
      passed,
      score,
      completed_at: new Date().toISOString(),
    });

    if (insertError) return fail("could not record attempt", origin, 500);

    // `xooter_training_progress` is keyed by xooter, not user, and only exists once someone is
    // an active Xooter. Trainees who are still applicants have a completion but no progress
    // row, so a missing xooter is not an error.
    if (passed) {
      const { data: xooter } = await supa
        .from("xooters")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (xooter?.id) {
        await supa.from("xooter_training_progress").upsert(
          {
            xooter_id: xooter.id,
            module_id: module.id,
            completed: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "xooter_id,module_id" },
        );
      }
    }

    // The response says what was scored and whether it passed. It does not say which questions
    // were wrong — that turns five daily attempts into a guided search for the answer key.
    return ok({ passed, score, correct, total, passScore: module.pass_score }, origin);
  } catch (_error) {
    return fail("training request failed", origin, 500);
  }
});
