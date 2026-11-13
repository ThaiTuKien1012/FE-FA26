# Customer storefront engineering report

## Delivered

Implementation source: `codex/customer-storefront`. Git delivery branch: `test-layout`, preserving its existing history. The frontend is committed for GitHub synchronization; no production deployment is included. See Git history for the delivery commit.

The baseline already had React customer home/shop views, local grocery imagery, illustrative per-store inventory, product/cart native dialogs, saved products, custom navigation and session authentication. Its pairs came from catalog order, with no activation integration.

The customer home and storefront now share a Vietnamese grocery presentation: forest/mint tokens, editorial hero, readable cards, category/brand/search/sort controls, store selection and responsive native dialogs. Existing logo, profile/auth callbacks, local images, price formatter and shared session cart are reused. The home logo stays on home and the existing shop navigation remains available. Vietnamese search accepts unaccented input.

Added:
- Validated customer-safe ACTIVE-layout projection, configured placement order and unknown-type rejection.
- Banner-to-associated-group navigation, 2–4-product bundles, group details, quantities, current price totals, individual stock states and atomic add-all.
- Product-relevant selectable FBT and directional cross-sell, separate from homepage placements.
- Atomic stock-aware cart writes that validate against the latest shared cart snapshot, including rapid repeated clicks and duplicate item references.
- Abort/race and render-time scope guards; revalidation on focus, visible return, interval and retry; stale merchandising cleared during refresh.
- Missing-reference, unavailable, empty, loading and retry states. No catalog-order recommendations or mining values appear.

## Workflow boundary and backend dependency

F06 candidates are never fetched by this customer implementation. Only the injected customer source's ACTIVE layout supplies placements. F07 selection and F08 activation remain backend responsibilities, with store/status validation as frontend defense in depth.

**No real F09 integration is claimed.** The verified backend has no F07/F08/F09 endpoint and its catalog/store-directory APIs are staff-only. The source adapter deliberately has no guessed URL. Default browsing retains explicitly labeled demo catalog/cart and renders no merchandising groups. Fixtures are isolated under tests and absent from the production entry graph. Backend owners must supply canonical store directory/IDs (replacing demo store selection), public current catalog, active layout/version and authoritative checkout; see customer-storefront-api.md. No named owner could be verified. Checkout remains unavailable; demo completion never creates an order or collects money.

## Research and design

Mobbin refused access because a paid plan is required. No Mobbin findings or links are invented. The exact FreshMart Dribbble shot was successfully inspected in the in-app browser after web-fetch failure. Adapted its bold grocery imagery, green palette, rounded product surfaces and scannable shopping structure; no proprietary assets or delivery/discount claims were copied.

Taste Skill informed consistent spacing, typography, buttons, honest copy, contrast and restrained motion. The supplied storefront architecture/art direction takes priority over its generic marketing templates. Its automated checker could not start Chrome in the sandbox:

`GATE: ERROR` — copy shell had no rendered main/section/h1; consistency exited with Chrome exited early; layout checker reported Chrome did not start. No Taste gate pass is claimed. Record: qa/taste-gate.json. The separate isolated CDP browser suite successfully rendered and tested the app.

Superpowers supplied design/planning, test-first domain/cart increments, implementation subtasks, independent review and executed verification. Four review findings were fixed: home navigation, invalid FBT size bypass, misleading stock-limit wording and accent-insensitive search.

## Executed checks

| Check | Result |
|---|---|
| `npm test` | 125 tests pass, 0 fail (baseline: 104) |
| `npm run lint` | Pass; this script runs TypeScript type checking |
| `npm run build` | Pass; existing Vite config-loader and >500kB chunk warnings remain |
| `git diff --check` | Pass |
| `PASPM_TEST_ORIGIN=http://127.0.0.1:3001 node tests/customer-storefront.browser.mjs` | Pass; no console errors, no API calls |
| Existing auth-session browser suite | Fails Web Locks simultaneous rotation assertion at line 262: 3 requests vs expected 2 |
| Same auth suite on untouched HEAD exported to a temporary checkout | Same failure at same assertion, with same 3 vs 2 result; not introduced by storefront changes |

Storefront browser checks cover default no-group fallback, search, product modal add, per-store cart isolation, reload persistence, configured placement order, correct banner destination, quantities/totals, unavailable/missing item blocking, Tab/Escape, selectable FBT, cross-sell quick-add, rapid-click stock cap, focus/version revalidation, draft/wrong-store/empty rejection and error retry. Page overflow was checked at 1440, 768, 390 and 320px; group dialog overflow at 320px.

The auth regression passed its initial login, /me, credential storage, inactivity/session dialog, focus/Escape and reload checks before reaching the shared baseline failure. Authentication source was not modified.

## Visual QA

Inspected captured desktop, mobile and group-dialog screenshots: original split hero, high-contrast type, readable product/detail prices, consistent controls and stacked mobile content. No page overflow at tested sizes; the group dialog fits 320px and retains disabled purchase explanation. Existing local images are reused; production asset licensing still needs owner confirmation. This is a fixture/browser check, not live backend activation verification or a formal accessibility/performance audit.

- qa/storefront-desktop.png — default public homepage, 1440px
- qa/storefront-mobile.png — default public homepage, 390px
- qa/storefront-active-desktop.png — isolated ACTIVE-layout fixture, 1440px
- qa/storefront-active-mobile.png — isolated ACTIVE-layout fixture, 390px
- qa/storefront-group-mobile.png — stock-limited group details, 390px

## Change map

Presentation: CustomerHomeView, CustomerStorefrontView, CustomerHeader, CustomerCommerce, CustomerShoppingDialog, new StorefrontMerchandising and storefront.css.

Behavior: useCustomerStorefront, useCustomerShopping, new useActiveStorefront, merchandising.ts, cartRules.ts, customerSearch.ts; Vietnamese VND formatting in customerCatalog.

Evidence: frontend-audit.md, ui-ux-research.md, customer-storefront-design.md, customer-storefront-implementation-plan.md, customer-storefront-api.md; domain/cart/search/SSR tests and isolated browser fixture/script.

## Before production

Deliver and wire the customer backend contract and canonical store directory; verify real F06→F09 activation and price/stock changes; implement authoritative checkout; resolve the pre-existing session concurrency failure; confirm asset rights; obtain Mobbin access if reference validation is still required; address the existing application bundle warning in a separate performance task.

## Git synchronization verification (2026-11-13)

Re-ran 125 unit/component tests, TypeScript, production build, diff whitespace checks and the storefront browser suite before the delivery commit: all passed. Build warnings remain as described above. The known auth concurrency failure is prior evidence, not a new run for this synchronization task. Lovable project listing again returned no accessible projects, so neither a linked project nor its synchronized branch can be verified. Pushing test-layout does not establish Lovable editor synchronization.
