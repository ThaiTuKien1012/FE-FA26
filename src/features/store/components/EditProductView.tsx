import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Image as ImageIcon,
  ChevronDown,
  Check,
  Plus,
  X,
  Upload,
  CheckCircle2,
  Trash2,
  Sparkles
} from 'lucide-react';
import { ProductItem, ProductCategory } from '../../../types/storeInventory';
import { ActiveNavScreen } from '../../../types/mining';

interface EditProductViewProps {
  productId?: string;
  onNavigate: (screen: ActiveNavScreen) => void;
  products: ProductItem[];
  onProductUpdated: (updatedProduct: ProductItem) => void;
  onProductDeleted?: (productId: string) => void;
}

const DEFAULT_CATEGORIES: string[] = [
  'Snacks',
  'Beverages',
  'Instant Food',
  'Dairy',
  'Personal Care',
  'Household'
];

export const EditProductView: React.FC<EditProductViewProps> = ({
  productId,
  onNavigate,
  products,
  onProductUpdated
}) => {
  // Find current product or default to first
  const [currentId, setCurrentId] = useState<string>(() => {
    if (productId && products.some(p => p.id === productId)) return productId;
    return products.length > 0 ? products[0].id : 'prod-001';
  });

  const product = useMemo(() => {
    return products.find(p => p.id === currentId) || products[0];
  }, [products, currentId]);

  // Form Fields State (Exact content from the uploaded image)
  const [name, setName] = useState<string>(product?.name || "Lay's Classic 70g");
  const [sku, setSku] = useState<string>(product?.sku || 'P001');
  const [category, setCategory] = useState<string>(product?.category || 'Snacks');
  const [description, setDescription] = useState<string>(
    product?.description || 'Classic potato chips, original flavor.'
  );

  // Pricing & Inventory State (storing as strings to allow formatted inputs)
  const [sellingPriceInput, setSellingPriceInput] = useState<string>(
    product?.priceVnd ? product.priceVnd.toLocaleString('en-US') : '32,000'
  );
  const [costPriceInput, setCostPriceInput] = useState<string>(
    product?.costPriceVnd ? product.costPriceVnd.toLocaleString('en-US') : '18,000'
  );
  const [stockQuantityInput, setStockQuantityInput] = useState<string>(
    product?.stockQuantity !== undefined ? String(product.stockQuantity) : '120'
  );
  const [isActive, setIsActive] = useState<boolean>(product?.isActive !== false);

  // Custom Categories list
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Image Upload State
  const [previewImage, setPreviewImage] = useState<string | null>(product?.image || null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Notification and submitting states
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when product changes
  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setSku(product.sku || '');
      setCategory(product.category || 'Snacks');
      setDescription(product.description || 'Classic potato chips, original flavor.');
      setSellingPriceInput(
        product.priceVnd !== undefined ? product.priceVnd.toLocaleString('en-US') : '32,000'
      );
      setCostPriceInput(
        product.costPriceVnd !== undefined
          ? product.costPriceVnd.toLocaleString('en-US')
          : '18,000'
      );
      setStockQuantityInput(
        product.stockQuantity !== undefined ? String(product.stockQuantity) : '120'
      );
      setIsActive(product.isActive !== false);
      setPreviewImage(product.image || null);
    }
  }, [product]);

  // Numeric parsing helpers
  const parseNum = (val: string): number => {
    const cleaned = val.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  const sellingPrice = parseNum(sellingPriceInput);
  const costPrice = parseNum(costPriceInput);
  const stockQuantity = parseNum(stockQuantityInput);

  // Calculated Margin: Margin = (Selling Price - Cost) / Selling Price
  const calculatedMargin = useMemo(() => {
    if (sellingPrice <= 0) return '0.0%';
    const margin = ((sellingPrice - costPrice) / sellingPrice) * 100;
    return `${margin.toFixed(1)}%`;
  }, [sellingPrice, costPrice]);

  // Handlers for formatted inputs
  const handleSellingPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      setSellingPriceInput('');
      return;
    }
    const num = parseInt(raw, 10);
    setSellingPriceInput(num.toLocaleString('en-US'));
  };

  const handleCostPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      setCostPriceInput('');
      return;
    }
    const num = parseInt(raw, 10);
    setCostPriceInput(num.toLocaleString('en-US'));
  };

  const handleStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setStockQuantityInput(raw);
  };

  // Add new category handler
  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (!categories.includes(trimmed)) {
      setCategories(prev => [...prev, trimmed]);
    }
    setCategory(trimmed);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  // Image Upload handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save changes handler
  const handleSave = () => {
    setIsSaving(true);

    const updatedProduct: ProductItem = {
      ...product,
      id: currentId,
      name: name.trim() || 'Product Name',
      sku: sku.trim() || 'P001',
      category: category as ProductCategory,
      description: description.trim(),
      priceVnd: sellingPrice,
      costPriceVnd: costPrice,
      stockQuantity: stockQuantity,
      isActive: isActive,
      image: previewImage || undefined,
      status: !isActive
        ? 'Out of Stock'
        : stockQuantity === 0
          ? 'Out of Stock'
          : stockQuantity <= 20
            ? 'Low Stock'
            : 'In Stock',
      updatedAt: 'Today'
    };

    setTimeout(() => {
      onProductUpdated(updatedProduct);
      setIsSaving(false);
      setToastNotice(`Product "${updatedProduct.name}" saved successfully!`);
      setTimeout(() => setToastNotice(null), 3500);
    }, 400);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12 text-[#191c1b] antialiased">
      {/* Toast Notification */}
      {toastNotice && (
        <div className="fixed top-5 right-5 z-50 bg-[#1e3a2f] text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-3 border border-[#caeada]/20">
          <CheckCircle2 className="w-4 h-4 text-[#caeada] shrink-0" />
          <span>{toastNotice}</span>
          <button
            onClick={() => setToastNotice(null)}
            className="text-white/70 hover:text-white ml-2 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Title & Back Link Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#191c1b]">
            Edit Product
          </h1>
          <p className="text-xs sm:text-sm text-[#6d7974] mt-0.5">
            Update existing product specifications, pricing, stock and visual assets.
          </p>
        </div>

        <div>
          <button
            onClick={() => onNavigate('store-inventory')}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#1e3a2f] hover:text-[#162B23] transition-colors cursor-pointer group px-3.5 py-2 rounded-lg bg-white border border-[#E7E2D8] hover:border-[#1e3a2f]/40 shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Products</span>
          </button>
        </div>
      </div>

      {/* SINGLE UNIFIED EDIT PRODUCT BOX */}
      <div className="bg-white border border-[#E7E2D8] rounded-2xl shadow-xs overflow-hidden">
        {/* Box Top Header Bar */}
        <div className="p-5 sm:px-8 border-b border-[#E7E2D8] bg-[#FAF8F5]/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center flex-wrap gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6d7974]">
              Selected Item:
            </span>
            {/* Product Switcher Dropdown */}
            {products.length > 1 ? (
              <div className="relative inline-block">
                <select
                  value={currentId}
                  onChange={(e) => setCurrentId(e.target.value)}
                  className="text-xs font-semibold text-[#191c1b] bg-white py-1.5 pl-3 pr-8 border border-[#E7E2D8] rounded-lg hover:border-[#1e3a2f] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1e3a2f] shadow-2xs"
                  title="Switch Product"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#6d7974] absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            ) : (
              <span className="text-xs font-bold text-[#191c1b]">
                {product?.sku} - {product?.name}
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#eaf0eb] text-[#1e3a2f]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a2f]" />
              SKU: {sku || product?.sku}
            </span>

            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${isActive ? 'bg-[#caeada] text-[#1E3A2F]' : 'bg-[#e9e1df] text-[#6d7974]'
              }`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Quick Save button in header */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg bg-[#1e3a2f] hover:bg-[#162B23] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-2 disabled:opacity-70"
            >
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Box Inner 2-Column Content */}
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Product Information, Pricing & Inventory, Status */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-8">
              {/* SECTION 1: Product Information */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#191c1b]">
                    Product Information
                  </h2>
                  <span className="text-[11px] font-medium text-[#6d7974]">
                    Fields marked with <span className="text-[#b3261e]">*</span> are required
                  </span>
                </div>

                {/* Product Name & SKU */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#191c1b] mb-1.5">
                      Product Name <span className="text-[#b3261e]">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Lay's Classic 70g"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E7E2D8] bg-[#FAF8F5] text-xs sm:text-sm text-[#191c1b] placeholder:text-[#89938f] focus:outline-none focus:border-[#1e3a2f] focus:ring-1 focus:ring-[#1e3a2f] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#191c1b] mb-1.5">
                      SKU <span className="text-[#b3261e]">*</span>
                    </label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="e.g. P001"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E7E2D8] bg-[#FAF8F5] font-mono text-xs sm:text-sm text-[#191c1b] placeholder:text-[#89938f] focus:outline-none focus:border-[#1e3a2f] focus:ring-1 focus:ring-[#1e3a2f] transition-all"
                    />
                  </div>
                </div>

                {/* Category with Dropdown and "+ New Category" Button */}
                <div>
                  <label className="block text-xs font-semibold text-[#191c1b] mb-1.5">
                    Category <span className="text-[#b3261e]">*</span>
                  </label>

                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full appearance-none px-3.5 py-2.5 rounded-lg border border-[#E7E2D8] bg-[#FAF8F5] text-xs sm:text-sm text-[#191c1b] pr-10 focus:outline-none focus:border-[#1e3a2f] focus:ring-1 focus:ring-[#1e3a2f] transition-all cursor-pointer"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#6d7974] absolute right-3.5 top-3 pointer-events-none" />
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(true)}
                      className="px-4 py-2.5 rounded-lg border border-[#E7E2D8] bg-[#FAF8F5] hover:bg-[#eaf0eb] text-xs sm:text-sm font-semibold text-[#1e3a2f] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      + New Category
                    </button>
                  </div>

                  {/* Inline Add Category Input Form */}
                  {isAddingCategory && (
                    <div className="mt-3 p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E2D8] flex items-center gap-2 animate-in fade-in duration-150">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter category name..."
                        autoFocus
                        className="flex-1 px-3 py-1.5 bg-white border border-[#E7E2D8] rounded-lg text-xs sm:text-sm text-[#191c1b] focus:outline-none focus:border-[#1e3a2f]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddNewCategory(e);
                          if (e.key === 'Escape') setIsAddingCategory(false);
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddNewCategory}
                        disabled={!newCategoryName.trim()}
                        className="px-3 py-1.5 bg-[#1e3a2f] text-white rounded-lg text-xs font-semibold hover:bg-[#162B23] disabled:opacity-50 cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCategory(false);
                          setNewCategoryName('');
                        }}
                        className="p-1.5 text-[#89938f] hover:text-[#191c1b] cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-[#191c1b] mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter product description..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E7E2D8] bg-[#FAF8F5] text-xs sm:text-sm text-[#191c1b] placeholder:text-[#89938f] focus:outline-none focus:border-[#1e3a2f] focus:ring-1 focus:ring-[#1e3a2f] transition-all resize-y min-h-[90px]"
                  />
                </div>
              </div>

              {/* SECTION 2: PRICING & INVENTORY */}
              <div className="space-y-4 pt-6 border-t border-[#E7E2D8]">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#6d7974]">
                  PRICING &amp; INVENTORY
                </h2>

                {/* 3 Columns: Selling Price, Cost, Stock Quantity */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#191c1b] mb-1.5">
                      Selling Price (VND) <span className="text-[#b3261e]">*</span>
                    </label>
                    <input
                      type="text"
                      value={sellingPriceInput}
                      onChange={handleSellingPriceChange}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E7E2D8] bg-[#FAF8F5] text-xs sm:text-sm text-[#191c1b] font-mono focus:outline-none focus:border-[#1e3a2f] focus:ring-1 focus:ring-[#1e3a2f] tabular-nums transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#191c1b] mb-1.5">
                      Cost (VND) <span className="text-[#b3261e]">*</span>
                    </label>
                    <input
                      type="text"
                      value={costPriceInput}
                      onChange={handleCostPriceChange}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E7E2D8] bg-[#FAF8F5] text-xs sm:text-sm text-[#191c1b] font-mono focus:outline-none focus:border-[#1e3a2f] focus:ring-1 focus:ring-[#1e3a2f] tabular-nums transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#191c1b] mb-1.5">
                      Stock Quantity <span className="text-[#b3261e]">*</span>
                    </label>
                    <input
                      type="text"
                      value={stockQuantityInput}
                      onChange={handleStockChange}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E7E2D8] bg-[#FAF8F5] text-xs sm:text-sm text-[#191c1b] font-mono focus:outline-none focus:border-[#1e3a2f] focus:ring-1 focus:ring-[#1e3a2f] tabular-nums transition-all"
                    />
                  </div>
                </div>

                {/* Calculated Margin Row */}
                <div className="pt-2 p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#6d7974]">
                      CALCULATED MARGIN
                    </div>
                    <div className="text-xl font-bold text-[#1e3a2f] font-mono mt-0.5">
                      {calculatedMargin}
                    </div>
                  </div>

                  <div className="text-xs text-[#6d7974] font-mono">
                    Margin = (Selling Price - Cost) / Selling Price
                  </div>
                </div>
              </div>

              {/* SECTION 3: STATUS */}
              <div className="space-y-3 pt-6 border-t border-[#E7E2D8]">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#6d7974]">
                  STATUS
                </h2>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-[#191c1b] cursor-pointer">
                    <input
                      type="radio"
                      name="product-status"
                      checked={isActive}
                      onChange={() => setIsActive(true)}
                      className="w-4 h-4 text-[#1e3a2f] accent-[#1e3a2f] focus:ring-[#1e3a2f] cursor-pointer"
                    />
                    <span>Active</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-[#191c1b] cursor-pointer">
                    <input
                      type="radio"
                      name="product-status"
                      checked={!isActive}
                      onChange={() => setIsActive(false)}
                      className="w-4 h-4 text-[#1e3a2f] accent-[#1e3a2f] focus:ring-[#1e3a2f] cursor-pointer"
                    />
                    <span>Inactive</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Integrated in the Box (with left border on desktop) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:border-l lg:border-[#E7E2D8] lg:pl-8">
              {/* Product Image Section */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-[#191c1b]">
                  Product Image
                </h2>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {previewImage ? (
                  <div className="relative rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] p-4 flex flex-col items-center">
                    <img
                      src={previewImage}
                      alt={name}
                      className="max-h-48 rounded-lg object-contain"
                    />
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg border border-[#E7E2D8] bg-white text-xs font-semibold text-[#191c1b] hover:bg-[#FAF8F5] cursor-pointer shadow-2xs"
                      >
                        Change Image
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewImage(null)}
                        className="px-3 py-1.5 rounded-lg border border-[#ffdad6] bg-[#ffdad6]/40 text-xs font-semibold text-[#b3261e] hover:bg-[#ffdad6] cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#E7E2D8] hover:border-[#1e3a2f] rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-[#FAF8F5] hover:bg-[#eaf0eb]/50 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white border border-[#E7E2D8] flex items-center justify-center text-[#6d7974] group-hover:text-[#1e3a2f] transition-colors mb-3 shadow-2xs">
                      <ImageIcon className="w-6 h-6 stroke-[1.75]" />
                    </div>
                    <div className="text-xs font-bold text-[#191c1b]">
                      Upload product image
                    </div>
                    <div className="text-[11px] text-[#6d7974] mt-1">
                      PNG / JPG · Sample preview
                    </div>
                  </div>
                )}
              </div>

              {/* Product Preview Card */}
              <div className="space-y-3 pt-2">
                <h2 className="text-sm font-bold text-[#191c1b]">
                  Product Preview
                </h2>

                <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E7E2D8] space-y-3 shadow-2xs">
                  {previewImage ? (
                    <div className="h-32 w-full rounded-lg bg-white border border-[#E7E2D8] overflow-hidden flex items-center justify-center">
                      <img src={previewImage} alt="Preview" className="h-full object-contain" />
                    </div>
                  ) : (
                    <div className="h-28 w-full rounded-lg bg-white border border-[#E7E2D8] flex items-center justify-center text-4xl shadow-2xs">
                      {product?.thumbnail || '🥔'}
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#191c1b] truncate">
                        {name || "Lay's Classic 70g"}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isActive ? 'bg-[#caeada] text-[#1E3A2F]' : 'bg-[#e9e1df] text-[#6d7974]'
                        }`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="text-xs text-[#6d7974]">
                      {category || 'Snacks'}
                    </div>

                    <div className="pt-2 text-lg font-bold text-[#1e3a2f] font-mono">
                      {sellingPriceInput || '32,000'} VND
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Box Integrated Footer Bar */}
        <div className="px-6 sm:px-8 py-4.5 bg-[#FAF8F5] border-t border-[#E7E2D8] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-medium text-[#6d7974] flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#1e3a2f]" />
            <span>Product updates synchronize immediately across inventory and recommendation engines.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => onNavigate('store-inventory')}
              className="px-4 py-2 rounded-lg border border-[#E7E2D8] bg-white hover:bg-[#FAF8F5] text-xs sm:text-sm font-semibold text-[#191c1b] transition-colors cursor-pointer shadow-2xs"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-[#1e3a2f] hover:bg-[#162B23] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-2 disabled:opacity-70"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
