import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  completedTrainingIds, getVerificationSteps, parseTrainingModule, parseTrainingProgress,
  parseXooterApplication, parseXooterDocumentStatus, reviewTone,
} from '../src/lib/native-xooter-trust';

const application = {
  id: 'app-1', status: 'submitted', background_check_status: 'pending',
  id_verification_status: 'approved', selfie_verification_status: 'in_review',
  address_verification_status: null, banking_verification_status: 'pending',
  reference_verification_status: 'pending',
  // Database fields these projections must never return:
  id_number: 'HIDDEN-ID', bank_account_number: 'HIDDEN-BANK',
  selfie_storage_path: 'HIDDEN-PATH', verification_notes: 'HIDDEN-NOTES',
  reviewer_notes: 'HIDDEN-STAFF-NOTES',
};
test('Xooter application projection strips all identity, banking and notes', () => {
  const parsed = parseXooterApplication(application);
  assert.equal(parsed?.status, 'submitted');
  assert.deepEqual(Object.keys(parsed ?? {}).sort(), [
    'id','status','background_check_status','id_verification_status',
    'selfie_verification_status','address_verification_status',
    'banking_verification_status','reference_verification_status',
  ].sort());
  assert.ok(!JSON.stringify(parsed).includes('HIDDEN'));
  assert.equal(parseXooterApplication(null), null);
  assert.equal(parseXooterApplication({id:'app-1'}), null);
  assert.equal(reviewTone('submitted'), 'warning');
  assert.equal(reviewTone('approved'), 'success');
  assert.equal(reviewTone('rejected'), 'danger');
  assert.equal(getVerificationSteps(parsed!).length, 6);
});
test('only document metadata survives parsing, not storage or rejected notes', () => {
  const parsed = parseXooterDocumentStatus({
    id:'doc-1', doc_type:'identity_document', status:'pending',
    created_at:'2026-10-15T00:00:00Z',
    storage_path:'HIDDEN-PATH', rejected_reason:'HIDDEN-REASON',
  });
  assert.deepEqual(parsed, {
    id:'doc-1', doc_type:'identity_document', status:'pending',
    created_at:'2026-10-15T00:00:00Z',
  });
  assert.equal(parseXooterDocumentStatus({id:'doc-1',doc_type:'ID',status:'pending',created_at:'not-a-date'}),null);
});
test('training metadata strips the grading key and never converts recognition to money', () => {
  const module = parseTrainingModule({
    id:'module-1', title:'The Xoot Standard', required:true,
    description:'Required standards', duration_min:15, rank_points:40, badge_label:'Xoot Certified',
    quiz_questions:[{q:'SECRET',correct:'SECRET-ANSWER'}],
  });
  assert.equal(module?.title,'The Xoot Standard');
  assert.equal(module?.rank_points,40);
  assert.ok(!JSON.stringify(module).includes('SECRET'));
  assert.equal(parseTrainingModule({id:'module-1',title:'Bad',required:'yes'}),null);
  const visible = [module!, parseTrainingModule({
    id:'module-2',title:'Optional learning',required:false,description:null,
    duration_min:10,rank_points:10,badge_label:null,
  })!];
  const progress = [
    parseTrainingProgress({module_id:'module-1',completed:true,completed_at:'2026-10-15T00:00:00Z'})!,
    parseTrainingProgress({module_id:'module-2',completed:false,completed_at:null})!,
    parseTrainingProgress({module_id:'hidden-other-profile',completed:true,completed_at:null})!,
  ];
  assert.deepEqual([...completedTrainingIds(progress,visible)],['module-1']);
});
test('native routes query exact owner-bound fields, isolate account switches and use authenticated web handoff', () => {
  const verification=readFileSync(new URL('../src/app/xooter/kyc.tsx',import.meta.url),'utf8');
  const training=readFileSync(new URL('../src/app/xooter/training.tsx',import.meta.url),'utf8');
  const account=readFileSync(new URL('../src/app/account.tsx',import.meta.url),'utf8');
  assert.match(account,/router\.push\("\/xooter\/kyc"\)/);
  assert.match(account,/router\.push\("\/xooter\/training"\)/);
  for(const page of [verification,training]){
    assert.match(page,/key=\{user\.id\}/);
    assert.match(page,/\.eq\('user_id',userId\)/);
    assert.match(page,/WebBrowser\.openBrowserAsync/);
    assert.doesNotMatch(page,/Linking\.openURL/);
    assert.doesNotMatch(page,/select\(['"]\*['"]\)/);
  }
  assert.match(verification,/select\('id,doc_type,status,created_at'\)/);
  assert.doesNotMatch(verification,/select\([^)]*bank_account_number/);
  assert.doesNotMatch(verification,/select\([^)]*storage_path/);
  assert.match(training,/select\('id,title,description,required,duration_min,badge_label,rank_points'\)/);
  assert.doesNotMatch(training,/select\([^)]*quiz_questions/);
  assert.match(training,/\.eq\('xooter_id',owner\.data\.id\)/);
  assert.match(training,/does not contain quiz answers|does not receive quiz answers/);
  assert.match(training,/recognition points/i);
  assert.doesNotMatch(training,/payout every Friday|awardCertif|grading locally/);
});
