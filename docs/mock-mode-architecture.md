# Standalone PASPM mock mode

## Run without backend services

```sh
npm install
npm run dev:mock -- --port 3005
```

Open `http://127.0.0.1:3005/merchandising/lab`. No Spring Boot, MySQL, Supabase, email, payment or mining service is required. Use the **Demo Mode** toolbar to select Merchandiser, Store Admin, Customer or System Admin and one of four stores. `npm run build:mock` creates an explicitly opted-in demo build. Alternatively set `VITE_DATA_MODE=mock` in your local environment. Unset it or set `api` for the original backend mode. Vite variables are build-time values; rebuild when switching modes.

## Boundaries

`authService.ts` is the mode-selecting facade. `auth.api-adapter.ts` preserves the original API/session implementation. `DemoAuthService` never constructs the real auth session, refreshes tokens, or requests credentials. Its persona and local avatar state use demo-only storage keys. Email/password/Google security operations are explicitly unavailable; they are replaced by persona selection for demonstration.

Existing F02–F05 application service contracts still call `authService.request`. In mock mode this calls `demoRequest`, an in-process adapter returning the same response shapes. It never falls through to fetch. Unknown operations return an explicit local error. Typed `demo.repository` holds catalog, categories, inventory batches, users, utility settings, transactions/CSV imports, snapshots and simulated mining requests. Product IDs map deterministically between numeric staff IDs and the existing customer fixture IDs.

F06 local approvals feed `approvedGroups`; F07–F11 use the existing typed merchandising repository and pure lifecycle engine. Standalone mode gives that repository a separate key and a populated scenario. Storefront, editor and simulator resolve current product prices/stock from the business repository. Inventory changes notify the customer adapter. Layouts retain their saved structure when stock changes; cart guards reject unavailable products. A/B history retains captured price/utility inputs, while publishing requires a simulation matching the current inputs.

## Persistence and reset

- Business data: `paspm.demo.business.v1` in localStorage.
- Persona/avatar: demo-prefixed localStorage keys.
- Approvals: `paspm_demo_approvals_v1` in localStorage.
- Standalone layouts/campaigns: `paspm_demo_merchandising_v1` in localStorage; the earlier opt-in F07 lab key is untouched.
- Carts: `paspm_demo_shopping_v1` in sessionStorage, separated by store.
- Selected customer store: `paspm_demo_customer_store` in sessionStorage.

Schema v1 loaders reject incompatible structures or conservatively migrate optional fields. Invalid merchandising snapshots fail closed rather than invent activation. Reset restores seeded business data, approvals and merchandising layouts, clears demo carts, and retains the selected persona. A reset epoch clears carts in other open tabs. Real auth and API-mode cart keys are never cleared. Disabled browser storage degrades to memory; data then does not survive closing the page. This is a single-browser prototype, not a multi-user database or a production security boundary.

## Permissions and metrics

Mock service methods check roles and store scope, independently of hidden buttons. Only Merchandiser composes/publishes and approves F06 groups; only Store Admin activates published layouts. One active pointer per store is replaced atomically. Customer projections omit utility and costs. F11 separates current demo cart amounts, synthetic campaign results, and reference fixture price differences. Utility is a fixture score, never realized profit. There are no measured HUI-Miner/EFIM fixtures: charts show an explicit unavailable state. F05's local candidate filtering is labeled synthetic and does not claim to execute those algorithms.

## Validation

See `docs/qa/standalone-results.json` for backend-blocked Chrome results. Unit tests cover API/default isolation, persona persistence, role/store permissions, CRUD, import/mining fixtures, draft/publication/activation, historical evidence, approval/reset and cart guards. The browser exercises the complete F07–F11 flow, F06 approval, category CRUD/reload, inventory and all persona startup; all `/api/` and external HTTP requests fail the test. No backend fixtures are intercepted with successful responses in this suite.

Final executed checks: `npm test` 163 passed / 0 failed; `npm run lint`, `npm run build`, `npm run build:mock`, and `git diff --check` passed. Chrome standalone suite passed at 1440/390/320px with zero backend/external requests and zero console errors. Existing Vite `__dirname` and large-chunk warnings remain. The earlier auth-session browser suite's baseline Web Locks count issue is documented in the prior F07–F11 report; it was not claimed fixed or rerun as passing here.
