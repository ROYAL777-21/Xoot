# Xoot production handoff

The [production checklist](production-checklist.md) is the single current register for
launch evidence, owner actions, delivery order and release gates. Follow its
[owner steps](production-checklist.md#owner-steps-in-order) and
[delivery sequence](production-checklist.md#delivery-and-rollback-sequence).

Vercel is the approved website host. A read-only public check on 7 October returned
HTTP 200 with Vercel headers and the older `02bb284` build stamp. This proves hosting
and the served commit only; it does not close source fidelity, backend, payment or
authenticated journey gates. The previous GoDaddy/Netlify instructions are superseded.

The incoming engineering source adds split-fare clients, Xooter task checklists,
default-home constraints and request/RLS/storage hardening. Local integration does
not establish hosted delivery or completed website/mobile coverage. The checklist
records the new migration/function prerequisites, invoice settings, Expo public
variables and native association-file settings alongside the remaining checks.

Enter credentials only in protected provider/GitHub settings. Preserve environment
separation and disabled payment capabilities until the reviewed release gates pass.
