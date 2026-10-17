import React, { useEffect, useRef, useState } from "react";
import { Plus, RefreshCw, X } from "lucide-react";
import { ActiveNavScreen } from "../../../types/mining";
import { F02Batch, F02Product, F02Status, storeApi } from "../store.api";

const isExpired = (expiryDate?: string | null) =>
  Boolean(expiryDate && new Date(`${expiryDate}T23:59:59`) < new Date());

const formatReceivedAt = (receivedAt: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(receivedAt));

export const StoreBatchesView: React.FC<{
  onNavigate?: (screen: ActiveNavScreen) => void;
}> = () => {
  const [products, setProducts] = useState<F02Product[]>([]),
    [productId, setProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const productPickerRef = useRef<HTMLDivElement>(null);
  const [batches, setBatches] = useState<F02Batch[]>([]),
    [summary, setSummary] = useState<any>(null);
  const [form, setForm] = useState({
    batchCode: "",
    receivedAt: new Date().toISOString().slice(0, 16),
    expiryDate: "",
    initialQuantity: "",
    remainingQuantity: "",
  });
  const [editingBatch, setEditingBatch] = useState<F02Batch | null>(null);
  const [open, setOpen] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    void (async () => {
      try {
        const page = await storeApi.listProducts({ page: 0, pageSize: 100 });
        setProducts(page.content || []);
        if (page.content?.[0]) setProductId(String(page.content[0].id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load products.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const load = async () => {
    if (!productId) return;
    try {
      const [rows, stats] = await Promise.all([
        storeApi.listBatches(Number(productId)),
        storeApi.getSummary(Number(productId)),
      ]);
      setBatches(rows || []);
      setSummary(stats);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load batches.");
    }
  };
  useEffect(() => {
    void load();
  }, [productId]);
  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        productPickerRef.current &&
        !productPickerRef.current.contains(event.target as Node)
      )
        setProductSearch("");
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!editingBatch && selectedProduct?.requiresExpiry && !form.expiryDate) {
      setError("Please enter an expiry date for this product.");
      return;
    }
    try {
      if (editingBatch)
        await storeApi.updateBatch(editingBatch.id, {
          remainingQuantity: Number(form.remainingQuantity),
          status: editingBatch.status,
        });
      else
        await storeApi.createBatch(Number(productId), {
          batchCode: form.batchCode,
          receivedAt: new Date(form.receivedAt).toISOString(),
          expiryDate: form.expiryDate || undefined,
          initialQuantity: Number(form.initialQuantity),
        });
      setForm({
        ...form,
        batchCode: "",
        initialQuantity: "",
        remainingQuantity: "",
      });
      setEditingBatch(null);
      setOpen(false);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(
        /already exists|constraint|duplicate/i.test(message)
          ? "This batch code is already in use. Please enter a different code."
          : "We could not save this batch. Please check the information and try again.",
      );
    }
  };
  const updateStatus = async (batch: F02Batch) => {
    try {
      await storeApi.updateBatch(batch.id, {
        status: batch.status === "BLOCKED" ? "ACTIVE" : "BLOCKED",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update batch.");
    }
  };
  const openEdit = async (batch: F02Batch) => {
    try {
      const detail = await storeApi.getBatch(batch.id);
      setEditingBatch(detail);
      setForm({
        batchCode: detail.batchCode,
        receivedAt: detail.receivedAt.slice(0, 16),
        expiryDate: detail.expiryDate || "",
        initialQuantity: String(detail.initialQuantity),
        remainingQuantity: String(detail.remainingQuantity),
      });
      setOpen(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load batch details.",
      );
    }
  };
  const filteredProducts = products.filter((p) =>
    `${p.sku} ${p.name}`
      .toLowerCase()
      .includes(productSearch.toLowerCase().trim()),
  );
  const selectedProduct = products.find((p) => String(p.id) === productId);
  return (
    <div className="mx-auto max-w-6xl space-y-6 text-[#191c1b]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Inventory Batches</h1>
          <p className="mt-1 text-[#6d7974]">
            Manage stock by product batch and expiry date.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            className="rounded-lg border border-[#e7e2d8] bg-white p-3 text-[#1e3a2f]"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            disabled={!productId}
            onClick={() => {
              setEditingBatch(null);
              setForm({
                batchCode: "",
                receivedAt: new Date().toISOString().slice(0, 16),
                expiryDate: "",
                initialQuantity: "",
                remainingQuantity: "",
              });
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a2f] px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add batch
          </button>
        </div>
      </div>
      <div ref={productPickerRef} className="relative max-w-2xl">
        <input
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          placeholder="Search product by SKU or name..."
          className="w-full rounded-lg border border-[#e7e2d8] bg-white px-3 py-2 outline-none focus:border-[#1e3a2f]"
        />
        {productSearch && (
          <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[#e7e2d8] bg-white shadow-lg">
            {filteredProducts.length ? (
              filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProductId(String(p.id));
                    setProductSearch("");
                  }}
                  className="block w-full border-b border-[#eee7df] px-3 py-2 text-left hover:bg-[#faf8f5]"
                >
                  <span className="font-mono text-sm">{p.sku}</span>
                  <span className="ml-2 font-semibold">{p.name}</span>
                </button>
              ))
            ) : (
              <div className="p-3 text-sm text-[#6d7974]">
                No products found.
              </div>
            )}
          </div>
        )}
        {selectedProduct && !productSearch && (
          <div className="mt-1 text-sm text-[#6d7974]">
            Selected:{" "}
            <span className="font-semibold text-[#1e3a2f]">
              {selectedProduct.sku} — {selectedProduct.name}
            </span>
          </div>
        )}
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}
      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            ["Total", summary.totalQuantity],
            ["Sellable", summary.sellableQuantity],
            ["Expired", summary.expiredQuantity],
            ["Blocked", summary.blockedQuantity],
            ["Expiring soon", summary.expiringSoonQuantity],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-[#e7e2d8] bg-white p-4 shadow-sm"
            >
              <div className="text-xs uppercase text-[#89938f]">{label}</div>
              <div className="mt-1 text-2xl font-bold">{value as number}</div>
            </div>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-[#e7e2d8] bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-[#6d7974]">
            Loading batches…
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#faf8f5] text-xs uppercase text-[#89938f]">
              <tr>
                <th className="p-4">Batch code</th>
                <th className="p-4">Received</th>
                <th className="p-4">Expiry</th>
                <th className="p-4">Remaining</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-t border-[#eee7df]">
                  <td className="p-4 font-mono">{b.batchCode}</td>
                  <td className="whitespace-nowrap p-4">
                    {formatReceivedAt(b.receivedAt)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span>{b.expiryDate || "—"}</span>
                      {isExpired(b.expiryDate) && (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                          EXPIRED
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {b.remainingQuantity} / {b.initialQuantity}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        b.status === "BLOCKED"
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => void openEdit(b)}
                        className="text-sm font-semibold text-[#1e3a2f] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void updateStatus(b)}
                        className={`text-sm font-semibold hover:underline ${
                          b.status === "BLOCKED"
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {b.status === "BLOCKED" ? "Unblock" : "Block"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e3a2f]/30 p-4">
          <form
            onSubmit={create}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-[#e7e2d8] bg-[#fffdfb] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editingBatch ? "Edit inventory batch" : "Add inventory batch"}
              </h2>
              <button type="button" onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>
            {editingBatch ? (
              <>
                <p className="rounded-lg bg-[#eaf0eb] p-3 text-sm text-[#315445]">
                  {editingBatch.batchCode} · Initial quantity:{" "}
                  {editingBatch.initialQuantity}
                </p>
                <label className="block text-sm">
                  Remaining quantity
                  <input
                    required
                    min="0"
                    max={editingBatch.initialQuantity}
                    type="number"
                    value={form.remainingQuantity}
                    onChange={(e) =>
                      setForm({ ...form, remainingQuantity: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-[#e7e2d8] bg-white p-2"
                  />
                </label>
              </>
            ) : (
              <>
                <input
                  required
                  placeholder="Batch code"
                  value={form.batchCode}
                  onChange={(e) =>
                    setForm({ ...form, batchCode: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#e7e2d8] bg-white p-2"
                />
                <label className="block text-sm">
                  Received at
                  <input
                    required
                    type="datetime-local"
                    value={form.receivedAt}
                    onChange={(e) =>
                      setForm({ ...form, receivedAt: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-[#e7e2d8] bg-white p-2"
                  />
                </label>
                <label className="block text-sm">
                  Expiry date
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) =>
                      setForm({ ...form, expiryDate: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-[#e7e2d8] bg-white p-2"
                  />
                </label>
                <input
                  required
                  min="1"
                  type="number"
                  placeholder="Initial quantity"
                  value={form.initialQuantity}
                  onChange={(e) =>
                    setForm({ ...form, initialQuantity: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#e7e2d8] bg-white p-2"
                />
              </>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-[#e7e2d8] px-4 py-2"
              >
                Cancel
              </button>
              <button className="rounded-lg bg-[#1e3a2f] px-4 py-2 font-semibold text-white">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
