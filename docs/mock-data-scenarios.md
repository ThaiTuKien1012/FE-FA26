# Demo scenarios

Four grocery stores reuse the existing local product images: Thảo Điền (vegetables), Ba Đình (breakfast), Hải Châu (fruit), Ninh Kiều (pantry). Each has distinct numeric staff IDs and customer IDs, prices in VND, categories, inventory batches, two approved groups, one pending candidate, a published ACTIVE layout and another draft. Each seeded layout has banner, bundle, FBT and cross-sell placements. Fixture costs start at 70% of selling price; they are illustrative references only.

## Walkthrough

1. Run `npm run dev:mock -- --port 3005` and open `/merchandising/lab`.
2. Choose Merchandiser and Store 1. Open Recommendations, approve the pending group and open Layout Editor.
3. Add approved groups with drag/drop or Add. Choose placement types, edit banner text/image, use Up/Down, preview mobile, and save a named draft. Existing ACTIVE is unchanged.
4. Open F08. Select A and the new draft B, create a campaign, choose seed/traffic and run simulation. Rerunning identical inputs reproduces metrics; history records each run. Draft campaigns can be edited; edits invalidate current eligibility while preserving history.
5. Publish B. Switch to Store Admin and explicitly activate that campaign.
6. Switch to Customer. The saved ordering/banner appears. Open a group and add it atomically to the cart. Refresh preserves cart and active layout. Change stores to see isolated catalog/cart/layout.
7. Switch back to staff, open F11 and filter simulation dates. Inspect reference group utility/price differences, current cart activity, and synthetic CTR/conversion/revenue separately.
8. Store Admin can edit catalog/categories/batches, import a CSV and inspect transactions. System Admin can manage demo accounts/configuration and start synthetic mining requests. Demo results do not represent HUI-Miner/EFIM measurements.
9. Reset demo data restores the scenario; no real session is deleted.

Empty/error conditions: missing group selection, empty draft publication, wrong-store IDs, invalid roles, stock shortage and stale simulation after price change all fail visibly. No partial group addition occurs. Historical snapshot rows are unavailable for seeded reference snapshots; create a new snapshot to inspect its matrix. No real email, payment, order submission or external integration handshake occurs.

Seed prices and catalog membership are deterministic. Simulation metrics depend on seed, visitors and captured offer inputs; run timestamps reflect the current UTC time. Historical transaction dates are explicitly fixed November 2026 reference fixtures, not live sales.
