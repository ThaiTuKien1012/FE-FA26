# Standalone mock implementation

Approved scope: user-provided standalone mock task, 2026-11-13. Work only on feature/f07-f11-mock; preserve test-layout and existing API contracts.

Architecture: VITE_DATA_MODE=mock selects local service adapters before any network call. Keep existing API mode as default. One versioned local demo repository backs staff CRUD, catalog/inventory and approved recommendation evidence; the existing merchandising store backs immutable layouts/campaigns with explicit bridges to the shared catalog. Persona state is isolated from real auth/session state. Reset only demo-owned keys. Unsupported operations fail visibly rather than falling through to network.

1. Audit requests and screens; implement persistent local business adapter with role/store authorization and deterministic fixtures.
2. Implement isolated demo authentication/persona switcher and reset controls; preserve real auth path.
3. Extend merchandising campaigns with edits, CTR/conversion and result history; remove invented algorithm benchmarks, use explicit unavailable state absent measured fixtures.
4. Connect seeded approved groups and active layouts for all demo stores to live local catalog; improve analytics filters/provenance and UI.
5. Verify unit, type/build, browser startup with backend requests forbidden, persona CRUD and full F07–F11 flow; record evidence.
6. Commit verified changes, attempt normal push, inspect actual Lovable linkage without creating/replacing a project. Document blockers and migration steps.

No deployment, no default branch writes. Demo permissions are testable rules, not production security. Simulated revenue never includes cart totals. Existing visual system and FreshMart-inspired components are retained.
