/** Release gate: the service transaction alone does not complete the crew lifecycle. */
export function bookingSubmissionAvailable(): boolean {
  return false;
}
