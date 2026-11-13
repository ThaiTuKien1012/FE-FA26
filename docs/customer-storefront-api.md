# Customer storefront integration boundary

## Verified gap

The adjacent backend checkout exposes no F07/F08/F09 active-layout controller. `../BE/docs/features/README.md` labels F07–F11 undefined; `../BE/docs/features/F06/README.md` explicitly separates recommendation approval from publishing, activation, and stock reservation. F06 `/api/recommendations` and F02 `/api/products` permit only Merchandiser/Store Admin. `/api/system/stores` permits only System Admin. None is a public customer data source.

The frontend's `store-d1`, `store-q1`, `store-c1`, and `store-n1` identifiers are demo identifiers. They have no verified mapping to numeric backend Store IDs. Local physical shelf placement storage and simulated campaign publication are not activation evidence.

## Proposed contract, not an implemented endpoint

`CustomerStorefrontSource(storeId, signal)` returns `{ storeId, products, activeLayout }`. No URL is guessed or requested by default. The backend F07/F08/F09 owners must agree on an endpoint, public/customer authorization, canonical store identities, and customer-safe current catalog data; no named individual owner is established in accessible documentation.

`products` uses the frontend customer product shape: stable `id`, `name`, `sku`, `category`, `priceVnd` (nonnegative finite VND), `stockQuantity` (current sellable quantity), `status` (`In Stock`, `Low Stock`, `Out of Stock`), `isActive` (required boolean), optional `image`, `unit`, `brand`, and `description`. Internal costs, utility, evidence, and mining fields are discarded. Image URLs accept same-origin paths or HTTPS only.

`activeLayout` is null when no layout is active; otherwise it contains `id`, string `version`, `status: ACTIVE`, `storeId`, and `placements`. A placement contains stable `id`, supported `type` (`BANNER`, `BUNDLE`, `FBT`, `CROSS_SELL`, `PRODUCT_COLLECTION`), nonnegative integer `order`, customer-visible `title`, `groupId`, optional `description`, `imageUrl`, and `anchorProductId`, plus `items: [{productId, quantity}]`. Quantities must be positive safe integers. Cross-sell requires the current product as explicit anchor; FBT requires the current product among its items. Bundle/FBT purchase groups support 2–4 unique products. Invalid references remain unavailable, never replaced by catalog neighbors.

The backend must return only placements selected through composition and activation. F06 approval alone is insufficient. The frontend independently verifies ACTIVE status/store scope, discards unsupported placements, strips nonpublic metadata, and sorts by order then stable ID. It does not infer discounts or use utility as a price. Frontend totals are estimates from current price × quantity; backend checkout must revalidate and calculate authoritative totals.

## Lifecycle and testing

`useActiveStorefront` defaults to unavailable with no network request. An injected source is called on mount/store change, manual refresh, window focus, visible-tab return, and every 60 seconds while visible. Data is cleared while revalidating; abort signals and generation guards prevent late responses from repopulating old data. Render-time store/source checks prevent a frame of another store's data. Fetch errors expose a retryable error state without retaining stale groups.

Development fixtures belong only to tests or explicitly isolated preview entry points. Production does not turn demo inventory into merchandising. Existing demo catalog/cart remains clearly labeled until a real source is wired. Live end-to-end activation and checkout cannot be certified until the backend contracts exist.
