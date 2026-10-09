import { fail, handlePreflight, json, readJson, requireAuth } from '../_shared/action-utils.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;
  try {
    const { response: authFailure, user, supa } = await requireAuth(req, origin);
    if (authFailure || !user || !supa) return authFailure ?? fail('Authentication required', origin, 401);
    const body = await readJson(req, 8192);
    const bookingId = body.bookingId;
    const rating = body.rating;
    const notes = body.notes;
    if (typeof bookingId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)
      || !Number.isInteger(rating) || rating < 1 || rating > 5
      || (notes !== null && notes !== undefined && (typeof notes !== 'string' || notes.length > 1000))) return fail('Invalid visit rating', origin, 400);
    const { data, error } = await supa.rpc('save_solo_visit_review', {
      p_actor_id: user.id, p_booking_id: bookingId, p_rating: rating, p_notes: typeof notes === 'string' ? notes.trim() || null : null,
    });
    if (error || !data) return fail('Rating saves are unavailable. Please retry shortly.', origin, 503);
    if (!data.ok) return fail(data.code === 'crew_pending' ? 'Crew ratings are not available yet.' : 'This visit is not eligible for a rating.', origin, data.code === 'not_found' ? 404 : 409);
    return json(data, 200, origin);
  } catch {
    return fail('Rating could not be saved. Please retry.', origin, 500);
  }
});
