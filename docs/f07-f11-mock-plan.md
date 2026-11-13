# F07–F11 interconnected mock increment

Source baseline: test-layout at 25a901f97e5e9bc5b52236422d9be3654ac56942. All work exclusively on feature/f07-f11-mock. Remote push currently denied to khoinm04 (403); do not overwrite baseline or force-push.

## Design and scope
Use the existing React/Tailwind architecture, native dialogs and existing customer placement renderer/cart. Add a dedicated authenticated merchandising lab for Merchandiser and Store Admin. Keep real inventory, mining, account and authentication APIs unchanged. Mock capability is explicitly opt-in via VITE_ENABLE_MERCHANDISING_MOCK=true (also in development); production defaults off. A visible simulation notice accompanies every mock surface. Fixture stores are explicitly independent of backend numeric stores.

One typed store-scoped service persists approved fixture groups, immutable draft versions, campaigns, seeded simulations, publication and active-layout pointers. F07 only saves drafts; F08 publication requires a saved eligible layout and a matching simulation, activation requires Store Admin and a published version. Activating B does not mutate A; there is one active pointer per fixture store. Failed actions leave state unchanged. Reload restores data; tab changes notify subscribers. No real sales/revenue are implied.

F07: native drag/drop plus keyboard/touch Add and Up/Down controls; configure banner/bundle/FBT/cross-sell, title, quantities, anchor; save immutable DRAFT revision; restore a prior version into an editable draft; desktop/mobile preview through existing storefront placement components.
F08: campaign creation with immutable A/B references; reproducible seeded metrics, matching dataset/traffic settings; publish B separately; Store Admin explicitly activates it.
F09/F10: existing storefront reads only shared ACTIVE projection. Source changes invalidate customer data; cart stays stock-aware, persisted and demo-only. Draft preview cannot change ACTIVE. No activation means neutral catalog with no invented groups.
F11: Total Utility in fixture utility units, simulated bundle revenue and A/B charts, layout performance and clearly labeled historical synthetic benchmark rows. Compare HUI-Miner/EFIM only with matching dataset hash, threshold, utility model, hardware, repeat protocol and output set checksum; no fabricated superiority claims.

Visual direction: retain forest/mint tokens, generous readable cards, 44px controls, responsive editor and restrained chart bars. Keep every simulated/historical status explicit, no custom chart dependency.

## Ordered implementation
- [ ] Domain/tests: typed fixtures and pure state transitions, deterministic simulator, projection and persistence validation. Test roles, scope, draft versions, publication vs activation, seed reproducibility and current totals.
- [ ] Service adapter and F09/F10 wiring: single external store, local storage recovery, subscriptions and active-only source. Test updates/reload/cart.
- [ ] F07 editor and F08 campaign UI: accessible draft interactions, preview, publish/activate state machine. Preserve existing authenticated routes and add isolated lab navigation.
- [ ] F11 analytics: charts with textual values, matching benchmark fixtures and simulation labels, connected to shared campaign results.
- [ ] Browser verification/review: complete merchant→admin→customer flow using intercepted auth fixtures, desktop/mobile, stock/cart and real route guard; run npm test, npm run lint, npm run build, git diff --check.
- [ ] Commit verified increments and push only feature/f07-f11-mock; verify baseline unchanged and local/remote SHAs if permitted.

## Validation and backend handoff
No live F07–F11 backend contract exists in the verified baseline. Future integration must replace the explicit mock adapter with authenticated server persistence/permissions, real activated catalog projection, concurrency/versioning, checkout reservation and real analytics/benchmark evidence. Mock localStorage is a development convenience, not a security boundary or multi-user database.
