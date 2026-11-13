# Customer storefront design

Approved scope: user's PASPM storefront brief, 2026-11-13.

Use the existing React/Vite application and shared tab-scoped shopping state. Preserve search, saved products, store switching, cart, authentication and navigation. Both customer entry points share the redesigned storefront. No backend/admin changes.

Visual direction: grocery retail, deep forest #0A1D11, green #36543A, off-white #F4F5F5, mint #C2D0CE, warm unavailable accent #AB422F. Existing DM Sans with an editorial serif hero, generous spacing, restrained borders, 44px controls, visible keyboard focus and reduced motion. Existing local grocery assets only; their production licensing needs owner confirmation. No promotion claims. Plain Vietnamese voice: useful, calm, concrete.

Approaches considered: calling F06 directly violates activation boundaries; inventing a public endpoint falsely implies integration; a typed injected customer source with a fail-closed default preserves boundaries and allows contract tests. Choose the third until backend delivers F09.

A customer-safe source returns store-scoped current catalog and ACTIVE layout. Runtime validation rejects wrong store, inactive status, malformed quantities and unknown placements. The source is not wired to any invented URL. Existing demo catalog remains explicitly labeled; it never generates recommendations. Layout renderer follows configured order. BANNER opens its configured group. BUNDLE shows 2–4 products and a group dialog. FBT is limited to groups containing the current product; selections recalculate totals. CROSS_SELL uses explicit anchor IDs and excludes the current product. Missing products block whole-group purchase. Cart mutations validate current stock including existing cart quantities and commit a whole group once.

Native dialogs retain focus containment and Escape behavior. Product navigation within group detail uses the existing product dialog. Source refresh on focus, visibility and a bounded interval clears obsolete groups; store switches cannot expose previous-store data. No mining evidence is part of the presentation model.
