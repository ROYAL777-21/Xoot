-- Local disposable PostgreSQL only, after the positive contract.
insert into public.xooter_applications(id,user_id) values('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002');
insert into storage.objects(bucket_id,name,metadata) values
 ('kyc-docs','00000000-0000-4000-8000-000000000002/concurrent-a.pdf','{"size":12,"mimetype":"application/pdf"}'),
 ('kyc-docs','00000000-0000-4000-8000-000000000002/concurrent-b.pdf','{"size":12,"mimetype":"application/pdf"}');
update private.kyc_quarantine_limits set maximum=used+1 where kind='inspection';
-- Two separate service-role connections inspect these objects concurrently.
-- Exactly one may return metadata. Both attempts stay one-shot; no reset or retry spend.
