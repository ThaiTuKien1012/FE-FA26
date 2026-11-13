# F07–F11 mock frontend handoff

Source: `test-layout` at `25a901f97e5e9bc5b52236422d9be3654ac56942` (unchanged).
Development: `feature/f07-f11-mock` only. No merge or deployment.

## Run locally

```sh
VITE_ENABLE_MERCHANDISING_MOCK=true npm run dev -- --host 127.0.0.1 --port 3003
```

Sign in with an existing backend Merchandiser or Store Admin account and open **F07–F11 Workspace** (`/merchandising/lab`). Authentication is unchanged; browser tests intercept auth only inside isolated test Chrome. The lab and mock customer adapter require explicit opt-in, including development. The fixture stores are independent of backend store IDs.

Merchandiser: add/drag approved groups; configure banner, bundle, FBT and cross-sell; preview desktop/mobile; save immutable draft versions; restore old versions into a new draft. Create a campaign with neutral or saved layout A and saved draft B. Run a seeded simulation and publish B. Publication never activates it.

Store Admin: explicitly activate a published B. `/customer-home` displays only that store’s ACTIVE projection and responds to activation from another tab. Existing cart supports individual/group additions, stock limits, current-price totals and per-store session persistence. Checkout remains a demo.

Analytics reads the same campaign results: utility, revenue, orders, A/B bars and per-layout performance. Simulation uses seeded illustrative bundle purchase events, not observed customer behavior. HUI-Miner/EFIM runtime and memory bars use explicitly synthetic historical fixtures; mismatched dataset/threshold/model/hardware/repeat/output conditions are excluded.

The shared typed mock state lives in localStorage. Browser storage can be cleared or tampered with and is not a server authorization boundary. Cart remains in sessionStorage; no real transactions are submitted.

## Executed verification

- `npm test`: 145 passed, 0 failed.
- `npm run lint`: passed (TypeScript check).
- `npm run build`: passed; existing Vite `__dirname` and large bundle warnings remain.
- `git diff --check`: passed.
- `PASPM_TEST_ORIGIN=http://127.0.0.1:3003 node tests/f07-f11.browser.mjs`: passed. Draft restore, four placements, preview isolation, seeded simulation, publication separate from activation, role guard, cross-tab activation, cart reload, 1440/390/320px overflow checks.
- Existing `customer-storefront.browser.mjs` against default-mode port 3004: passed, including rapid stock cap, invalid layout rejection, atomic bundle additions, FBT/cross-sell, focus refresh and source retry; no console errors.
- Previous auth-session browser baseline has an existing Web Locks assertion (3 versus 2), reproduced before this implementation; authentication behavior was not changed to mask it.

Browser evidence: `docs/qa/f07-f11-results.json` and `f07-f11-{editor,campaigns,analytics,customer-active}.png`.

## Backend dependencies and synchronization

Server layout/campaign persistence, server role checks and concurrency/version control; real approved mining-group feed; active catalog projection; inventory reservation and checkout; measured sales telemetry and benchmark artifacts remain backend work. Existing API integrations and sign-in remain intact.

GitHub push is blocked by HTTP 403: remote denies write permission to authenticated user `khoinm04` for `ThaiTuKien1012/FE-FA26`. Do not force-push or alter `test-layout`. Retry the normal push once repository write access is available.

Lovable workspace inventory checked on 2026-11-13: the connected workspace contains zero projects. This implementation is local repository work; Lovable synchronization is not established.
