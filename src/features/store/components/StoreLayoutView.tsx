import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Grid2X2,
  Map,
  Package,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  WandSparkles,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { F02Product, storeApi } from "../store.api";

type LayoutMap = Record<string, number | null>;
type Aisle = {
  id: number;
  name: string;
  x: number;
  y: number;
  capacity: number;
};
const images = [
  "/products/tomato.png",
  "/products/orange.png",
  "/products/baguette.png",
  "/products/milk.png",
  "/products/apple.png",
];
const defaultAisles: Aisle[] = [
  { id: 1, name: "Đồ ăn nhanh", x: 95, y: 205, capacity: 6 },
  { id: 2, name: "Đồ uống", x: 635, y: 205, capacity: 6 },
  { id: 3, name: "Gia dụng", x: 95, y: 365, capacity: 6 },
  { id: 4, name: "Hàng thiết yếu", x: 635, y: 365, capacity: 6 },
];
const slotKey = (aisleId: number, slotIndex: number) =>
  `aisle-${aisleId}-slot-${slotIndex + 1}`;

export const StoreLayoutView: React.FC = () => {
  const [products, setProducts] = useState<F02Product[]>([]);
  const [aisles, setAisles] = useState<Aisle[]>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("store-aisles-v2") || "null") ||
        defaultAisles
      );
    } catch {
      return defaultAisles;
    }
  });
  const [layout, setLayout] = useState<LayoutMap>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("store-product-layout-v2") || "null",
      );
      if (saved) return saved;
      const old = JSON.parse(
        localStorage.getItem("store-product-layout-v1") || "{}",
      );
      const migrated: LayoutMap = {};
      Object.entries(old).forEach(([key, value]) => {
        const oldIndex = Number(key.replace("shelf-", "")) - 1;
        if (oldIndex >= 0)
          migrated[slotKey(Math.floor(oldIndex / 6) + 1, oldIndex % 6)] =
            value as number | null;
      });
      return migrated;
    } catch {
      return {};
    }
  });
  const [selectedAisle, setSelectedAisle] = useState<number | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);
  const [movingAisle, setMovingAisle] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(0.82);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragPointRef = useRef<[number, number] | null>(null);
  const dragFrameRef = useRef<number | null>(null);

  useEffect(() => {
    storeApi
      .listProducts({ page: 0, pageSize: 100, status: "ACTIVE" })
      .then((data) => setProducts(data.content || []))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Không thể tải sản phẩm"),
      )
      .finally(() => setLoading(false));
  }, []);
  useEffect(
    () => () => {
      if (dragFrameRef.current !== null)
        cancelAnimationFrame(dragFrameRef.current);
    },
    [],
  );
  const allSlots = useMemo(
    () =>
      aisles.flatMap((aisle) =>
        Array.from({ length: aisle.capacity }, (_, index) =>
          slotKey(aisle.id, index),
        ),
      ),
    [aisles],
  );
  const placed = useMemo(
    () =>
      new Set(
        Object.values(layout).filter(
          (id): id is number => typeof id === "number",
        ),
      ),
    [layout],
  );
  const available = products.filter((product) => !placed.has(product.id));
  const byId = (id: number | null) =>
    products.find((product) => product.id === id);
  const imageFor = (product: F02Product) => images[product.id % images.length];
  const aisleById = (id: number) => aisles.find((aisle) => aisle.id === id);
  const aisleSlots = (aisle: Aisle) =>
    Array.from({ length: aisle.capacity }, (_, index) =>
      slotKey(aisle.id, index),
    );
  const place = (slot: string, id: number) =>
    setLayout((current) => {
      const next = { ...current };
      Object.keys(next).forEach((key) => {
        if (next[key] === id) next[key] = null;
      });
      next[slot] = id;
      return next;
    });
  const autoArrange = () => {
    const next: LayoutMap = {};
    [...products]
      .sort(
        (a, b) =>
          Number(b.requiresExpiry) - Number(a.requiresExpiry) ||
          b.stockQuantity - a.stockQuantity,
      )
      .slice(0, allSlots.length)
      .forEach((product, index) => {
        next[allSlots[index]] = product.id;
      });
    setLayout(next);
    setNotice("Đã tự động xếp sản phẩm vào toàn bộ ô kệ.");
  };
  const save = () => {
    localStorage.setItem("store-product-layout-v2", JSON.stringify(layout));
    localStorage.setItem("store-aisles-v2", JSON.stringify(aisles));
    setNotice("Đã lưu kệ, vị trí và sản phẩm.");
  };
  const addAisle = () => {
    const id = aisles.length
      ? Math.max(...aisles.map((aisle) => aisle.id)) + 1
      : 1;
    const x = aisles.length % 2 ? 760 : 70;
    const y = 170 + Math.floor(aisles.length / 2) * 190;
    setAisles((current) => [
      ...current,
      { id, name: `Khu mới ${id}`, x, y, capacity: 6 },
    ]);
    setSelectedAisle(id);
    setNotice(`Đã thêm kệ A${id}. Kéo kệ trên bản vẽ để đặt vị trí.`);
  };
  const removeAisle = (id: number) => {
    const aisle = aisleById(id);
    if (!aisle || !window.confirm(`Xoá ${aisle.name} và các sản phẩm trên kệ?`))
      return;
    setAisles((current) => current.filter((item) => item.id !== id));
    setLayout((current) => {
      const next = { ...current };
      aisleSlots(aisle).forEach((slot) => delete next[slot]);
      return next;
    });
    setSelectedAisle(null);
  };
  const changeCapacity = (id: number, delta: number) =>
    setAisles((current) =>
      current.map((aisle) =>
        aisle.id === id
          ? {
              ...aisle,
              capacity: Math.max(1, Math.min(12, aisle.capacity + delta)),
            }
          : aisle,
      ),
    );
  const dropProps = (slot: string) => ({
    onClick: () => {
      if (dragged !== null) {
        place(slot, dragged);
        setDragged(null);
      }
    },
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      const id = Number(event.dataTransfer.getData("text/plain")) || dragged;
      if (id !== null) {
        place(slot, id);
        setDragged(null);
      }
    },
  });
  const mapPoint = (
    event: React.PointerEvent<SVGSVGElement>,
  ): [number, number] => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return [0, 0];
    return [
      ((event.clientX - rect.left) / rect.width) * 1400,
      ((event.clientY - rect.top) / rect.height) * 1300,
    ];
  };
  const moveAisle = (event: React.PointerEvent<SVGSVGElement>) => {
    if (movingAisle === null) return;
    event.preventDefault();
    dragPointRef.current = mapPoint(event);
    if (dragFrameRef.current !== null) return;
    dragFrameRef.current = requestAnimationFrame(() => {
      dragFrameRef.current = null;
      if (movingAisle === null || !dragPointRef.current) return;
      const [x, y] = dragPointRef.current;
      const snap = (value: number) => Math.round(value / 20) * 20;
      setAisles((current) =>
        current.map((aisle) =>
          aisle.id === movingAisle
            ? {
                ...aisle,
                x: Math.max(25, Math.min(1105, snap(x - 135))),
                y: Math.max(25, Math.min(1145, snap(y - 35))),
              }
            : aisle,
        ),
      );
    });
  };
  const finishMove = () => {
    if (movingAisle !== null) {
      setNotice("Đã di chuyển kệ. Bấm Lưu sơ đồ để lưu vị trí.");
      setMovingAisle(null);
    }
  };

  const aisleGroup = (aisle: Aisle) => {
    const slotsForAisle = aisleSlots(aisle);
    const rows = Math.ceil(aisle.capacity / 6);
    const height = rows > 1 ? 166 : 136;
    const filled = slotsForAisle.filter((slot) => layout[slot] !== null).length;
    const selected = selectedAisle === aisle.id || movingAisle === aisle.id;
    return (
      <g
        key={aisle.id}
        role="button"
        tabIndex={0}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          setMovingAisle(aisle.id);
        }}
        onClick={() => setSelectedAisle(aisle.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter") setSelectedAisle(aisle.id);
        }}
        className="cursor-grab active:cursor-grabbing"
      >
        <rect
          x={aisle.x + 5}
          y={aisle.y + 6}
          width="290"
          height={height}
          rx="14"
          fill="#173D32"
          opacity="0.12"
        />
        <rect
          x={aisle.x}
          y={aisle.y}
          width="290"
          height={height}
          rx="14"
          fill="#FFFFFF"
          stroke={selected ? "#E8896B" : "#314A5E"}
          strokeWidth={selected ? "5" : "3"}
        />
        <rect
          x={aisle.x}
          y={aisle.y}
          width="290"
          height="42"
          rx="14"
          fill="#263B4A"
        />
        <rect
          x={aisle.x}
          y={aisle.y + 28}
          width="290"
          height="14"
          fill="#263B4A"
        />
        <text
          x={aisle.x + 16}
          y={aisle.y + 27}
          fill="#FFFFFF"
          fontSize="15"
          fontWeight="800"
        >
          A{aisle.id} ·{" "}
          {aisle.name.length > 18 ? `${aisle.name.slice(0, 18)}…` : aisle.name}
        </text>
        <rect
          x={aisle.x + 228}
          y={aisle.y + 11}
          width="48"
          height="21"
          rx="10"
          fill="#F4D7C7"
        />
        <text
          x={aisle.x + 252}
          y={aisle.y + 26}
          textAnchor="middle"
          fill="#263B4A"
          fontSize="11"
          fontWeight="700"
        >
          {filled}/{aisle.capacity}
        </text>
        <text
          x={aisle.x + 274}
          y={aisle.y + 27}
          textAnchor="end"
          fill="#B9D8C7"
          fontSize="14"
        >
          ⋮⋮
        </text>
        <rect
          x={aisle.x + 12}
          y={aisle.y + 51}
          width="266"
          height={rows > 1 ? 86 : 57}
          rx="8"
          fill="#F5F7F8"
          stroke="#D9E0E5"
        />
        {slotsForAisle.map((slot, index) => (
          <g key={slot}>
            <rect
              x={aisle.x + 19 + (index % 6) * 43}
              y={aisle.y + 59 + Math.floor(index / 6) * 42}
              width="35"
              height="35"
              rx="6"
              fill={layout[slot] === null ? "#FFFDF9" : "#E6EEF3"}
              stroke={layout[slot] === null ? "#B8C4CB" : "#5E7A8A"}
              strokeWidth="2"
              strokeDasharray={layout[slot] === null ? "4 3" : undefined}
            />
            {byId(layout[slot]) && (
              <image
                href={imageFor(byId(layout[slot])!)}
                x={aisle.x + 22 + (index % 6) * 43}
                y={aisle.y + 62 + Math.floor(index / 6) * 42}
                width="29"
                height="29"
                preserveAspectRatio="xMidYMid meet"
              />
            )}
          </g>
        ))}
        <line
          x1={aisle.x + 18}
          y1={aisle.y + (rows > 1 ? 146 : 113)}
          x2={aisle.x + 272}
          y2={aisle.y + (rows > 1 ? 146 : 113)}
          stroke="#D9E0E5"
        />
        <text
          x={aisle.x + 18}
          y={aisle.y + (rows > 1 ? 158 : 126)}
          fill="#71808A"
          fontSize="10"
        >
          {selected ? "Đang chọn kệ" : "Bấm để mở · kéo để di chuyển"}
        </text>
      </g>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#314A5E]">
            Store Operations · Layout
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
            Sơ đồ mặt bằng cửa hàng
          </h1>
          <p className="mt-1 text-sm text-[#707973]">
            Thêm kệ, tăng số ô và kéo trực tiếp kệ trên bản vẽ.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={addAisle}
            className="rounded-xl border border-[#C6B8A8] bg-[#FCFAF7] px-3 py-2 text-sm font-bold text-[#314A5E]"
          >
            <Plus className="mr-2 inline h-4 w-4" />
            Thêm kệ
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border border-[#E7E2D8] bg-white px-3 py-2 text-sm"
          >
            <RefreshCw className="mr-2 inline h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={autoArrange}
            disabled={loading || !products.length}
            className="rounded-xl bg-[#E8EEF2] px-3 py-2 text-sm font-bold text-[#263B4A] disabled:opacity-50"
          >
            <WandSparkles className="mr-2 inline h-4 w-4" />
            Tự động xếp
          </button>
          <button
            onClick={save}
            className="rounded-xl bg-[#263B4A] px-3 py-2 text-sm font-semibold text-white"
          >
            <Save className="mr-2 inline h-4 w-4" />
            Lưu sơ đồ
          </button>
        </div>
      </header>
      {notice && (
        <div className="rounded-xl border border-[#D9E0E5] bg-[#F5F7F8] px-4 py-3 text-sm text-[#314A5E]">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}
      <div
        className="grid min-w-0 gap-6"
        style={{ gridTemplateColumns: "270px minmax(0, 1fr)" }}
      >
        <aside className="rounded-2xl border border-[#E7E2D8] bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold">Sản phẩm active</h2>
              <p className="text-xs text-gray-500">
                {available.length} sản phẩm chưa xếp · {allSlots.length} ô
              </p>
            </div>
            <Package className="h-5 w-5 text-[#314A5E]" />
          </div>
          {dragged !== null && (
            <p className="mb-3 rounded-lg bg-[#E8EEF2] px-3 py-2 text-xs font-semibold text-[#263B4A]">
              Đã chọn sản phẩm — kéo hoặc bấm vào ô kệ
            </p>
          )}
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Đang tải...
            </p>
          ) : (
            <div className="max-h-[680px] space-y-2 overflow-y-auto pr-1">
              {available.map((product) => (
                <div
                  key={product.id}
                  draggable={true}
                  onClick={() => setDragged(product.id)}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "copy";
                    event.dataTransfer.setData(
                      "text/plain",
                      String(product.id),
                    );
                    setDragged(product.id);
                  }}
                  onDragEnd={() => setDragged(null)}
                  className={`cursor-grab rounded-xl border p-3 ${dragged === product.id ? "border-[#E8896B] bg-[#F4E4D8]" : "border-[#E7E2D8] bg-[#FAF8F5]"}`}
                >
                  <img
                    src={imageFor(product)}
                    alt={product.name}
                    className="mb-2 h-12 w-12 object-contain"
                  />
                  <p className="truncate text-sm font-semibold">
                    {product.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {product.sku} · tồn {product.stockQuantity}
                  </p>
                </div>
              ))}
            </div>
          )}
        </aside>
        <section className="min-w-0 rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold">Bản vẽ mặt bằng</h2>
              <p className="text-xs text-gray-500">
                Kéo kệ để di chuyển · bấm kệ để mở ô sản phẩm.
              </p>
            </div>
            <Map className="h-5 w-5 text-[#314A5E]" />
          </div>
          <div className="mb-3 flex items-center justify-between rounded-xl bg-[#FAF8F5] px-3 py-2">
            <p className="text-xs text-[#707973]">
              Vùng làm việc lớn · cuộn để xem các kệ ở xa
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setZoom((value) =>
                    Math.max(0.6, Number((value - 0.1).toFixed(2))),
                  )
                }
                className="rounded-lg border bg-white p-2"
                title="Thu nhỏ"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="w-12 text-center text-xs font-bold text-[#314A5E]">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() =>
                  setZoom((value) =>
                    Math.min(1.5, Number((value + 0.1).toFixed(2))),
                  )
                }
                className="rounded-lg border bg-white p-2"
                title="Phóng to"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoom(0.82)}
                className="rounded-lg border bg-white p-2"
                title="Thu toàn cảnh"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="max-h-[720px] overflow-auto rounded-2xl border-0 bg-[#F8F5EF]">
            <svg
              ref={svgRef}
              onPointerMove={moveAisle}
              onPointerUp={finishMove}
              onPointerCancel={finishMove}
              viewBox="0 0 1400 1300"
              className="block touch-none"
              style={{
                width: `${1400 * zoom}px`,
                height: `${1300 * zoom}px`,
                minWidth: "100%",
              }}
              preserveAspectRatio="xMidYMid meet"
              aria-label="Bản vẽ mặt bằng cửa hàng"
            >
              <rect
                x="18"
                y="18"
                width="1364"
                height="1264"
                rx="18"
                fill="#FCFBF8"
              />
              {aisles.map(aisleGroup)}
            </svg>
          </div>
          {selectedAisle !== null &&
            (() => {
              const aisle = aisleById(selectedAisle);
              if (!aisle) return null;
              return (
                <div className="mt-4 rounded-2xl border-2 border-[#C6B8A8] bg-[#FCFAF7] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-[#263B4A]">
                        A{aisle.id} · {aisle.name}
                      </h3>
                      <p className="text-xs text-[#71808A]">
                        Kéo sản phẩm từ cột bên trái vào từng ô kệ
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => changeCapacity(aisle.id, -1)}
                        disabled={aisle.capacity <= 1}
                        className="rounded-lg border bg-white px-2 py-1 text-sm disabled:opacity-40"
                      >
                        − ô
                      </button>
                      <span className="text-xs font-bold text-[#314A5E]">
                        {aisle.capacity} ô
                      </span>
                      <button
                        onClick={() => changeCapacity(aisle.id, 1)}
                        disabled={aisle.capacity >= 12}
                        className="rounded-lg border bg-white px-2 py-1 text-sm disabled:opacity-40"
                      >
                        + ô
                      </button>
                      <button
                        onClick={() => removeAisle(aisle.id)}
                        className="rounded-lg bg-rose-50 p-2 text-rose-600"
                        title="Xoá kệ"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setSelectedAisle(null)}
                        className="rounded-lg bg-white p-2 text-gray-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {aisleSlots(aisle).map((slot) => {
                      const product = byId(layout[slot]);
                      return (
                        <div
                          key={slot}
                          {...dropProps(slot)}
                          className="min-h-[120px] rounded-xl border-2 border-dashed border-[#B8C4CB] bg-white p-2 text-center"
                        >
                          {product ? (
                            <>
                              <img
                                src={imageFor(product)}
                                alt={product.name}
                                className="mx-auto h-12 w-12 object-contain"
                              />
                              <p className="mt-1 line-clamp-2 text-xs font-bold">
                                {product.name}
                              </p>
                              <button
                                onClick={() =>
                                  setLayout((current) => ({
                                    ...current,
                                    [slot]: null,
                                  }))
                                }
                                className="mt-1 text-[10px] text-rose-600"
                              >
                                Gỡ sản phẩm
                              </button>
                            </>
                          ) : (
                            <>
                              <Grid2X2 className="mx-auto mt-4 h-5 w-5 text-[#B8C4CB]" />
                              <p className="mt-2 text-[10px] text-[#71808A]">
                                Kéo vào đây
                              </p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
        </section>
      </div>
    </div>
  );
};
