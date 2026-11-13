# Frontend audit

## Source and architecture
Verified source: local FE_Kien checkout, origin https://github.com/ThaiTuKien1012/FE-FA26.git. Started clean on test-layout; isolated work branch codex/customer-storefront. Lovable connection succeeds but lists zero projects. No AGENTS.md found.

React 19, TypeScript 7, Vite 8, Tailwind 4, lucide-react and motion. App.tsx uses custom screen routing with navigationRouter.ts; customer-home is public, storefront uses existing customer authentication gate. Pages are feature components, with presentation and hooks partially separated. httpClient delegates to authService.request (session handling). No query cache library. Shopping state uses useSyncExternalStore and sessionStorage, scoped per demo store.

## Reuse and redesign
Reuse AppLogo, auth/profile callbacks, session state, local grocery assets, current catalog types, price formatter, store selection and shared cart. Redesign customer storefront, product presentation/dialog, header, active placements and group details. Existing CustomerHomeView and StorefrontView duplicate shopping presentation; consolidate customer entry presentation while retaining navigation callbacks.

## Gaps and risks
Everyday pairs takes first four catalog items. No active layout state or backend F09 request. Product detail is a native dialog without FBT/cross-sell. Catalog and four stores are explicitly illustrative; no verified mapping to backend numeric IDs. Checkout is demo-only. Tiny 6–11px text and tap controls need correction. Product quantity updates do not currently guard inventory.

## Backend evidence
Inspected sibling ../BE source read-only. docs/features/README.md marks F07–F11 UNDEFINED_IN_AVAILABLE_DOCS. F06 approval is not publication/activation. Product APIs permit STORE_ADMIN/MERCHANDISER; system store directory permits SYSTEM_ADMIN. No customer-safe ACTIVE layout endpoint found. Do not call staff APIs or infer mappings. Backend team owning F07/F08/F09 must deliver the customer projection; named owner not documented.

## Checks and sequence
Node test runner via tsx (104 tests passing before changes); lint is tsc --noEmit; build is vite build; existing browser scripts use raw CDP and Windows default Chrome path. Sequence: validated domain, source lifecycle/cart, homepage placements, detail recommendations, responsive/browser QA. New recommendation fixtures remain test-only.
