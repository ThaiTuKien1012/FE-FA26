# Customer Storefront Implementation Plan

> Use Superpowers subagent-driven-development for isolated implementation and review; use test-driven-development and verification-before-completion.

**Goal:** Deliver a responsive storefront and validated activated-merchandising boundary without pretending missing backend integration exists.
**Architecture:** Pure customer domain validation + injected asynchronous source + existing shared cart + reusable placements/detail components.
**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind 4, Node test runner/tsx, native dialog.

## Global constraints
- No F06 administration requests, fabricated activation, catalog-order bundles, discounts or stock.
- No new dependencies or backend/admin edits.
- Keep existing per-store cart, search, saved items and navigation.
- Development fixtures only in tests; production default returns no merchandising.

## Tasks
- [x] P0: Audit local source and backend, record research access limitations and visual design.
- [x] P1a: Add customer layout types, runtime normalization, group resolution, selected totals and atomic purchase validation. Write failing Node tests for store/status/order/missing references/quantity/stock/duplicate cases, then implement and rerun.
- [x] P1b: Add source hook with race-safe store switching and revalidation; default unavailable source performs no network request. Extend shared cart with atomic additions checked against current snapshot.
- [x] P1c: Replace storefront presentation and arbitrary pairs with configurable banner/group renderer; add accessible group detail and preserve filters/store/cart interactions.
- [x] P2: Add product-relevant FBT selection and explicit cross-sell; reuse current prices and cart validation.
- [x] P3: Verify type checking, full Node tests, production build; exercise desktop/mobile, dialogs, stock, cart and layout changes with isolated browser fixtures. Inspect screenshots and request independent review; resolve findings.

## Verification commands
`npm test` (baseline 104 passing); `npm run lint` (TypeScript); `npm run build`; fixture browser script with a temporary Chrome profile. Record actual results, not assumed outcomes.

## Backend dependency
No implemented public F09 contract exists. Frontend adapter is proposed, not live integration. Backend F07/F08/F09 owner must provide store directory, current customer catalog, ACTIVE version + placements, inventory/price validity and checkout contract. Named owner is unavailable in repository documentation.

## Completion evidence
See customer-storefront-report.md. All frontend tasks completed and fixture-verified; live F07/F08/F09 integration remains blocked by the documented missing backend contract.
