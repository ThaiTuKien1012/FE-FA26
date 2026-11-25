# PASPM frontend agent guide

PASPM (FA26SE048) helps retail teams analyse product utility, design Store layouts, simulate campaigns, and present a public storefront. This repository, `ThaiTuKien1012/FE-FA26`, uses React 19, Vite, TypeScript and Tailwind CSS 4. See [package.json](package.json).

## Product decisions and Backend contracts

The latest Product Owner decision wins, whether recorded as a DEC or explicitly confirmed in the working session (BE `DEC-20261125-02`). If code and docs disagree, report both with their locations and ask the PO before changing either. Treat TBD as undecided. Record new PO decisions in the Backend decision log before or with the change that applies them.

Use Backend repo `PhanHoangDuy61/CP_FA26_PASPM_BE`. Start with its `dev` branch and confirm the revision deployed in the integration environment before treating an API as available.

| What to check | Backend path |
|---|---|
| Routes, request and response fields, status codes and RBAC | `docs/api/*` |
| Runtime-derived schema and operation IDs | `docs/api/openapi.json` |
| Screen workflows, examples and breaking changes | `docs/frontend_handoff/*` |
| Rules and their approval history | `docs/decisions/*` |

Read the relevant API contract and handoff before changing an integration. Never invent endpoints, fields or permissions. Stop the affected work and report the missing contract or runtime mismatch. Label fixtures as fixtures. A planned contract, an existing mock, or a passing fixture test does not establish Backend availability.

## Project layout and routing

- Keep feature-specific API adapters, types, hooks and views in `src/features/<feature>/`. Follow [F04's adapter](src/features/f04/f04.api.ts) and [its DTO types](src/features/f04/f04.types.ts) for co-location. Keep request types separate from response types. Reuse cross-feature utilities from `src/shared/`, transport and session services from `src/services/`, and shared UI from `src/components/`.
- Follow the screen-to-path mapping and history helpers in [navigationRouter.ts](src/utils/navigationRouter.ts) and route metadata in [routes.ts](src/app/routes.ts). Check [App.tsx](src/App.tsx) for dispatch by session and role. Use the existing staff shell in [AppLayout.tsx](src/components/layout/AppLayout.tsx), and follow the existing [PublicLayout](src/layouts/PublicLayout.tsx) and [AuthLayout](src/layouts/AuthLayout.tsx) for public and authentication screens.
- Reuse shared components in [src/components/common](src/components/common) and Tailwind utilities backed by the `--hupm-*` tokens in [src/index.css](src/index.css). Keep existing screens and styles unless the task explicitly requests a visual change.

## API, session and Store scope

- Use relative `/api/...` URLs. [vite.config.ts](vite.config.ts) serves local development on port 3000 and proxies `/api` to `http://localhost:8080`. Keep the existing AI Studio HMR and watch setup.
- Follow the feature's existing `*.api.ts` adapter. Send only allowed, typed request fields. Build the payload from the request contract rather than copying an entire response DTO.
- Use [httpClient.ts](src/services/httpClient.ts) for simple JSON calls where a message-only error is sufficient. It delegates to [authService.ts](src/services/authService.ts). For calls that need HTTP status and error `code`, follow [f03.api.ts](src/features/f03/f03.api.ts), which uses `authService.request` and preserves both. See [f07f08.api.ts](src/features/f07f08/f07f08.api.ts) for a feature-specific response parser.
- [authSession.ts](src/services/authSession.ts) manages the Bearer access token in memory, refresh cookies with `credentials: 'include'`, and CSRF for the session endpoints. Use the existing login, refresh, logout and session recovery flow. Feature code must not store or parse refresh tokens. Leave expiry recovery to the session service, which can replay eligible reads and does not automatically replay writes.
- A 401 follows session recovery. A normal 403 means access denied. A **403 with `code: STORE_INACTIVE`** ends the local session and displays the existing inactive-Store notice. Keep this handling centralized. See [session tests](tests/auth-session.test.ts) and [Store management tests](tests/store-management.test.ts).
- For staff Store-scoped routes, the Backend resolves the Store from the authenticated account. Follow the contract for routes with a public `storeSlug` or a System Admin Store selector. Never add an arbitrary Store override to a scoped request. Treat cross-Store 404 as not found, using the same UI as an absent resource.
- A 409 can mean a version conflict or another business rule. Use the returned code/status and the feature contract. For a versioned write, send the version from the last read in the contract's location, such as `expectedVersion` or the quoted `If-Match` for F10 cart once available. On a version conflict, reload and let the user decide whether to reapply the edit. Do not automatically replay the write. [Store management tests](tests/store-management.test.ts) cover the difference between a stale version and another 409.

## Display and verification

- Show VND as whole đồng using Vietnamese formatting. Reuse the customer price convention in [customerCatalog.ts](src/features/customer/data/customerCatalog.ts), preserving the contract's numerical value and rounding only for display. Keep utility scores separate from currency.
- Preserve the difference between missing and zero. For example, [f08.simulation.ts](src/features/f07f08/f08.simulation.ts) shows `chưa có` for a null or unavailable priority coverage and formats numeric zero as a percentage. Keep a zero price as `0 ₫`.
- Use Node 22 and `npm ci`, matching [frontend CI](.github/workflows/frontend-checks.yml). For code changes run `npm run lint` (the `tsc --noEmit` check, also available through `npm exec -- tsc --noEmit`), `npm test` for `tests/*.test.ts`, and `npm run build`.
- For affected UI flows, start Vite with `npm run dev`. Run the relevant [browser test](tests) with Node and Chrome. [package.json](package.json) exposes `npm run test:session:browser` and `npm run test:f07:browser`. See [auth-session.browser.mjs](tests/auth-session.browser.mjs) for `PASPM_TEST_ORIGIN` and `SESSION_TEST_CHROME` and [f07.browser.mjs](tests/f07.browser.mjs) for `F07_TEST_ORIGIN` and `F07_TEST_CHROME`. Other scripts can be run with `node tests/<feature>.browser.mjs` after checking their setup comments. Report fixture-based browser results separately from live Backend checks.

## Git and delivery

- Use one branch per task from the latest `dev`. Keep unrelated working-tree changes out of the branch.
- Never push directly to `dev`, force-push, or bypass hooks. Merge into `dev` only through a PR with green CI. Commit, push or merge only with the user's authorization.
- Report in Vietnamese and keep technical terms in English. Separate verified results from assumptions and identify checks that were NOT RUN. Include the commands and results actually observed.
