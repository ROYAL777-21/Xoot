import { describe, expect, it } from 'vitest';
import { assertCompletedSecurityReview } from '../../scripts/security/assert-claude-review-result.mjs';

describe('security review completion evidence', () => {
  it('rejects the observed credit failure even if the action reports zero findings', () => {
    expect(() => assertCompletedSecurityReview({ error: 'Credit balance is too low', findings: [] })).toThrow(/did not complete/);
  });
  it.each([null, [], {}, { findings: null }, { findings: 0 }])('rejects missing or malformed review output %j', result => {
    expect(() => assertCompletedSecurityReview(result)).toThrow();
  });
  it('distinguishes completed empty and nonempty reviews without hiding findings', () => {
    expect(assertCompletedSecurityReview({ findings: [] })).toBe(0);
    expect(assertCompletedSecurityReview({ findings: [{ title: 'Review this issue', severity: 'high' }] })).toBe(1);
  });
});
