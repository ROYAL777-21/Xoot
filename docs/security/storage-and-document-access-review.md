# Storage And Document Access Review

Reviewed: 2026-07-02

## Bucket Classes

| Class | Examples | Access model |
| --- | --- | --- |
| Public marketing | Approved blog/marketing images | Public read, controlled write |
| User private | Zooter ID/selfie, screening documents, bank evidence | Private, owner/admin/trust-scoped |
| Support private | Attachments, incident evidence | Private, support/admin/trust-scoped |
| Booking private | Invoice PDFs, completion proof, access-related assets | Private, owner/admin or assigned role as appropriate |
| Generated drafts | Article/media drafts, KIE outputs | Private until editorial approval |

## Required Controls

- Private buckets must have explicit RLS/storage policies.
- Uploads validate file type, MIME, size, and filename.
- Sensitive documents use signed or Edge-mediated access, not public URLs.
- Invoice and certificate PDFs must not be publicly readable.
- Do not expose access codes or identity documents through email, push, widgets, analytics, or Concierge.

## Open Items

- Final storage-object read policies for invoice and certificate PDFs require Supabase CLI/dashboard access with the correct storage policy owner role.
- Run bucket policy readback in staging and production after policy deployment.
- Add periodic review for stale identity documents, support evidence, and generated drafts.
