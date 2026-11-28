# F10 / F11 — Frontend integration

## Baseline

- FE base: `origin/dev` at `89e51de` (2026-11-28).
- Compared the customer implementation with `origin/F07-F08` at `8df2674`. The newer customer design restored by PR #21 (`b703404`) and auth fixes in PR #22 are retained. The older branch is not copied over those fixes.
- BE contracts and source inspected read-only at local `dev` `2871d2b`: `F09_STOREFRONT_API.md`, `F10_BUNDLE_CART_API.md`, `F11_DASHBOARD_API.md`, and their frontend handoffs.

## Screens and requests

| Screen | Role | Data |
| --- | --- | --- |
| `/customer-home` | Public / End-Customer | F09 Store list, home and Product catalogue |
| `/storefront?store={slug}` | Public / End-Customer | F09 home/catalogue, authenticated F10 cart and bundle actions |
| `/product/{id}?store={slug}` | Public / End-Customer | F09 Product detail, authenticated F10 cart |
| `/cart` | Public / End-Customer | Select a Store from the live F09 Store list |
| `/cart?store={slug}` | End-Customer; guests see sign-in | Full F10 cart, quantity changes, removal, confirmed clear |
| `/store/dashboard` | Store Admin / Merchandiser | Independent F11 utility, bundle activity and saved A/B simulation panels |

F10 uses all six routes under `/api/storefront/{storeSlug}/cart`: GET root, POST `/items`, PATCH `/items/{itemId}`, DELETE `/items/{itemId}`, DELETE root and POST `/bundles`. All writes send the strong quoted `If-Match` version from the last confirmed cart. IDs/versions are preserved as decimal strings when read from numeric int64 JSON. The cart is scoped by account and Store; obsolete in-flight responses are ignored. Conflicting/uncertain writes trigger a read, never an automatic write replay.

The cart page and quick dialog share one line editor. Clear requires an explicit confirmation. Increase stops at 99; stale lines remain removable/reducible. Totals use server values with whole VND HALF_UP display. Null prices remain distinct from zero. Bundle results show added/requested quantities per component, including skipped components. Unavailable bundle keys reload the Store home. Guest sign-in carries the Store and cart/product destination back into the existing F01 session flow.

F11 uses `/api/dashboard/snapshot-utilities` with pagination and optional `snapshotId`, and `/api/dashboard/bundle-additions` with an optional campaign and paired date range (maximum 90 inclusive days). A missing selected snapshot clears the filter and refreshes the own-Store list. Saved simulations reuse GET `/api/campaigns`, `/api/campaigns/{id}/reports` and `/api/campaign-reports/{reportId}`. Failed panels show retry/error states rather than zero metrics.

## Mock cleanup

Customer, F10 and F11 requests use relative `/api` paths through the existing session transport / Vite proxy to port 8080. They do not fall back to generated or fixture inventory. Decorative home artwork remains separate from Store and Product data.

Removed the unused `src/mocks/miningData.ts`, its `mining.mock.ts` export, the two retired mining setup/benchmark mock views and their unused setup page export. The active F05 workspace remains the API-backed implementation. The removed tracked files are recoverable from Git history. Controlled fixtures remain under `tests/` only.

## Verification

- Node `v22.19.0`, `npm ci`: passed.
- `npm run lint`: passed.
- `npm test`: 744 Node tests + 27 F11 tests + 37 customer/F09/F10 tests passed (808 total).
- `npm run build`: passed.
- `node --import tsx tests/customer-resume.browser.mjs`: passed with controlled API fixtures, including all six F10 routes, partial bundle add, clear cancel/confirm, cart sign-in return, Store branding, and product/Store/F06 return paths.
- `node --import tsx tests/customer-home.browser.mjs`: passed with controlled API fixtures, including the restored customer design, search, catalogue categories, saved filters, loading/empty/error states, navigation and mobile menu.
- `node tests/f11.browser.mjs`: passed with controlled API fixtures, including both staff roles, snapshot ID filtering/404 recovery, pagination, date limits, report loading, independent errors, and inactive-Store session handling.
- `node tests/auth-session.browser.mjs`: passed with controlled API fixtures, including sign-in, cookie recovery, cross-tab sessions, inactivity, refresh and logout flows.
- Cart screenshots reviewed at 1440 and 390 px; dashboard reviewed at 390 px. Browser checks also cover 768 px cart and 1024/768 px dashboard without document overflow.
- Browser scripts use `PASPM_TEST_ORIGIN=http://127.0.0.1:3000` and their Chrome environment variables on macOS (see `BROWSER_TESTS.md`). No browser fixture run writes to a live Backend.
- Initial implementation checks did not have a running Backend. Follow-up live verification on 2026-11-28 started Docker/MySQL/Mailpit/Backend and exercised real F07–F11 APIs and browser flows. See [live results and configuration findings](testing/F07_F11_LIVE_2026-11-28.md). No Backend source files were modified.
- Dependency installation reported 4 existing advisories (3 moderate, 1 high); dependency upgrades are outside this change.
