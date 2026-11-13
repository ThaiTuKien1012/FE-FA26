# Mock-to-API migration

`VITE_DATA_MODE=api` (or unset) uses the preserved backend auth/session and request adapter. Demo persona, stock, approvals, cart and layout state are separate storage namespaces and are not uploaded or used as server truth. `VITE_ENABLE_MERCHANDISING_MOCK=true` still supports the earlier isolated F07 lab with real login; leave it unset for normal API mode.

Future server work: durable layout/version/campaign APIs; server-owned F06 approvals and utility provenance; transaction-safe publication/activation with optimistic concurrency; active catalog projection; authoritative price/stock/checkout reservation; measured campaign telemetry and compatible benchmark artifacts. Replace the explicit customer source adapter with the real active-layout contract when available. Never infer realized revenue from demo-cart totals or import synthetic utility evidence as measured output.

Keep the current service interfaces and validation tests when introducing server adapters. Move role/store checks to server enforcement, retain UI guards for usability, and add contract tests for stale versions, stock changes and wrong-store IDs. Mock browser tests continue to run independently; real API integration tests require a controlled backend environment.

Prototype limitations: local storage provides no multi-user conflict resolution/security; demo account invitation does not send email; profile password/Google flows require API mode; local mining is reproducible candidate filtering, not an algorithm benchmark; initial historical fixtures have no raw measured mining evidence. Real external-service configuration remains an API-mode integration concern.
