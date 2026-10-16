import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { summariseXooterGrowth, xooterGrowthPercentage } from '../src/lib/native-xooter-growth';
import type { XooterTrainingModule, XooterTrainingProgress } from '../src/lib/native-xooter-trust';

const required: XooterTrainingModule = {
  id: 'required-id', title: 'The Xoot Standard', description: 'Service and care',
  required: true, duration_min: 30, badge_label: 'Standard', rank_points: 40,
};
const optional: XooterTrainingModule = {
  id: 'optional-id', title: 'Quiet client care', description: null,
  required: false, duration_min: 15, badge_label: 'Client Care', rank_points: 25,
};
const completed: XooterTrainingProgress = {
  module_id: 'required-id', completed: true, completed_at: '2026-10-15T11:00:00Z',
};

test('counts only stored completions, separating required learning from optional recognition', () => {
  const summary = summariseXooterGrowth([required, optional], [completed]);
  assert.ok(summary);
  assert.equal(summary!.requiredTotal, 1);
  assert.equal(summary!.requiredCompleted, 1);
  assert.equal(summary!.optionalTotal, 1);
  assert.equal(summary!.optionalCompleted, 0);
  assert.equal(summary!.earnedPoints, 40);
  assert.equal(summary!.availablePoints, 65);
  assert.deepEqual(summary!.badges, [
    { moduleId: required.id, title: required.title, label: 'Standard' },
  ]);
  assert.deepEqual([...summary!.completeModuleIds], [required.id]);
});
test('discards unrelated module completions and does not award unearned badges', () => {
  const rows: XooterTrainingProgress[] = [
    { module_id: optional.id, completed: false, completed_at: null },
    { module_id: 'hidden-worker-or-old-module', completed: true, completed_at: null },
  ];
  const summary = summariseXooterGrowth([required, optional], rows);
  assert.equal(summary?.earnedPoints, 0);
  assert.deepEqual(summary?.badges, []);
  assert.equal(summary?.requiredCompleted, 0);
});
test('duplicate module IDs, duplicate progress and unsafe points fail closed', () => {
  assert.equal(summariseXooterGrowth([required, required], [completed]), null);
  assert.equal(summariseXooterGrowth([required], [completed, completed]), null);
  assert.equal(summariseXooterGrowth([{ ...required, rank_points: -1 }], [completed]), null);
  assert.equal(summariseXooterGrowth([{ ...required, rank_points: Number.MAX_SAFE_INTEGER },
    { ...optional, rank_points: 30 }], [completed]), null);
  assert.equal(summariseXooterGrowth([required], [
    { ...completed, module_id: 'orphan' }, { ...completed, module_id: 'orphan' },
  ]), null);
});
test('percentage is bounded and never claims completed progress with zero/invalid data', () => {
  assert.equal(xooterGrowthPercentage(1, 4), 25);
  assert.equal(xooterGrowthPercentage(4, 4), 100);
  assert.equal(xooterGrowthPercentage(0, 0), 0);
  assert.equal(xooterGrowthPercentage(5, 4), 0);
  assert.equal(xooterGrowthPercentage(-1, 4), 0);
});
test('the native growth route is owner-bound, excludes exam keys and has honest unavailable states', () => {
  const growth = readFileSync(new URL('../src/app/xooter/growth.tsx', import.meta.url), 'utf8');
  const dashboard = readFileSync(new URL('../src/app/xooter/index.tsx', import.meta.url), 'utf8');
  const training = readFileSync(new URL('../src/app/xooter/training.tsx', import.meta.url), 'utf8');

  assert.match(growth, /key=\{user\.id\}/);
  assert.match(growth, /\.eq\('user_id', userId\)/);
  assert.match(growth, /\.eq\('xooter_id', owner\.data\.id\)/);
  assert.match(growth, /\.limit\(101\)/);
  assert.match(growth, /!state\.truncated && state\.hasXooterProfile/);
  assert.match(growth, /summariseXooterGrowth/);
  assert.match(growth, /not an automatic pay rise/i);
  assert.match(growth, /do not change your pay/i);
  assert.match(growth, /Tapping a badge cannot award it/i);
  assert.doesNotMatch(growth, /select\(['"][^'"]*quiz_questions/);
  assert.doesNotMatch(growth, /paid out|pays out|give yourself points|awardCertif/i);
  assert.match(dashboard, /router\.push\('\/xooter\/growth'\)/);
  assert.match(training, /router\.push\('\/xooter\/growth'\)/);
});
