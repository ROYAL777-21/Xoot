/** Native Xooter trust/training: project only owner-scoped metadata, never documents, quiz answers or bank data. */
export type ReviewFlag = {
  label: string;
  status: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
};
export type XooterApplicationStatus = {
  id: string; status: string; background_check_status: string | null;
  id_verification_status: string | null; selfie_verification_status: string | null;
  address_verification_status: string | null; banking_verification_status: string | null;
  reference_verification_status: string | null;
};
export type XooterDocumentStatus = {
  id: string; doc_type: string; status: string; created_at: string;
};
export type XooterTrainingModule = {
  id: string; title: string; description: string | null; required: boolean;
  duration_min: number | null; badge_label: string | null; rank_points: number | null;
};
export type XooterTrainingProgress = {
  module_id: string; completed: boolean; completed_at: string | null;
};
const record=(value:unknown):value is Record<string,unknown> =>
  value!==null && typeof value==='object'&&!Array.isArray(value);
const plain=(value:unknown)=>typeof value==='string' && value.trim().length>0 ? value.trim() : null;
const validDate=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value))?value:null;
const cap=(value:string)=>value.replace(/[_-]+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());
export const readableReviewStatus=(status:string|null)=>status?cap(status):'Not recorded';
export const reviewTone=(status:string|null):ReviewFlag['tone']=>{
  if(status==='approved'||status==='verified'||status==='passed'||status==='completed')return 'success';
  if(status==='rejected'||status==='failed')return 'danger';
  if(status==='submitted'||status==='pending'||status==='in_review'||status==='under_review')return 'warning';
  return 'neutral';
};
export function parseXooterApplication(value:unknown):XooterApplicationStatus|null{
  if(!record(value)||!plain(value.id)||!plain(value.status))return null;
  return {
    id:value.id as string,status:value.status as string,
    background_check_status:plain(value.background_check_status),
    id_verification_status:plain(value.id_verification_status),
    selfie_verification_status:plain(value.selfie_verification_status),
    address_verification_status:plain(value.address_verification_status),
    banking_verification_status:plain(value.banking_verification_status),
    reference_verification_status:plain(value.reference_verification_status),
  };
}
export function parseXooterDocumentStatus(value:unknown):XooterDocumentStatus|null{
  if(!record(value)||!plain(value.id)||!plain(value.doc_type)||!plain(value.status)||!validDate(value.created_at))return null;
  // Explicit projection, do not spread sensitive storage_path, ID number or reviewer notes.
  return {id:value.id as string,doc_type:value.doc_type as string,status:value.status as string,created_at:value.created_at as string};
}
export function getVerificationSteps(application:XooterApplicationStatus):ReviewFlag[]{
  const fields=[
    ['Identity',application.id_verification_status],
    ['Selfie match',application.selfie_verification_status],
    ['Address',application.address_verification_status],
    ['Bank verification',application.banking_verification_status],
    ['References',application.reference_verification_status],
    ['Background check',application.background_check_status],
  ] as const;
  return fields.map(([label,status])=>({
    label,status:readableReviewStatus(status),tone:reviewTone(status),
  }));
}
export function parseTrainingModule(value:unknown):XooterTrainingModule|null{
  if(!record(value)||!plain(value.id)||!plain(value.title)||typeof value.required!=='boolean')return null;
  const duration=typeof value.duration_min==='number'&&Number.isInteger(value.duration_min)&&value.duration_min>=0?value.duration_min:null;
  const points=typeof value.rank_points==='number'&&Number.isInteger(value.rank_points)&&value.rank_points>=0?value.rank_points:null;
  return {id:value.id as string,title:value.title as string,description:plain(value.description),
    required:value.required,duration_min:duration,badge_label:plain(value.badge_label),rank_points:points};
}
export function parseTrainingProgress(value:unknown):XooterTrainingProgress|null{
  if(!record(value)||!plain(value.module_id)||typeof value.completed!=='boolean')return null;
  return {module_id:value.module_id as string,completed:value.completed,completed_at:validDate(value.completed_at)};
}
export function completedTrainingIds(rows:XooterTrainingProgress[],visibleModules:XooterTrainingModule[]){
  const validIds=new Set(visibleModules.map(module=>module.id));
  return new Set(rows.filter(row=>row.completed&&validIds.has(row.module_id)).map(row=>row.module_id));
}
