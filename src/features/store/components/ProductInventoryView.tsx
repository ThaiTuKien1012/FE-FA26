import React, { useState, useMemo } from 'react';
import { 
  Package, 
  ShoppingCart, 
  AlertTriangle, 
  Ban, 
  Search, 
  RotateCcw, 
  Plus, 
  Pencil, 
  MoreHorizontal, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  Check,
  X,
  FileSpreadsheet,
  Trash2,
  TrendingUp,
  Tag
} from 'lucide-react';
import { ProductItem, ProductCategory, ProductStatus } from '../../../types/storeInventory';
import { initialProducts, initialInventoryStats } from '../../../mocks/storeInventoryData';
import { ActiveNavScreen } from '../../../types/mining';

interface ProductInventoryViewProps {
  onNavigate?: (screen: ActiveNavScreen) => void;
  products?: ProductItem[];
  setProducts?: React.Dispatch<React.SetStateAction<ProductItem[]>>;
  onEditProduct?: (product: ProductItem) => void;
}

const PRODUCT_IMAGE_MAP: Record<string, string> = {
  'P001': '/images/products/lays.jpg',
  'P002': '/images/products/aquafina.jpg',
  'P003': '/images/products/haohao.jpg',
  'P004': '/images/products/cocacola.jpg',
  'P005': '/images/products/vinamilk.jpg',
  'P006': '/images/products/dove.png',
  'P007': '/images/products/pulppy.jpg',
  'P008': '/images/products/kitkat.jpg',
  'P009': '/images/products/chocopie.png',
  'P010': '/images/products/thtruemilk.png',
  'P011': '/images/products/maggi.jpg',
  'P012': '/images/products/lifebuoy.jpg'
};

export const ProductInventoryView: React.FC<ProductInventoryViewProps> = ({
  onNavigate,
  products: externalProducts,
  setProducts: externalSetProducts,
  onEditProduct
}) => {
  const [internalProducts, setInternalProducts] = useState<ProductItem[]>(initialProducts);
  const products = externalProducts || internalProducts;
  const setProducts = externalSetProducts || setInternalProducts;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [selectedStatus, setSelectedStatus] = useState<string>('All Statuses');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(8);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<ProductItem>>({
    sku: `P00${products.length + 1}`,
    name: '',
    category: 'Snacks',
    priceVnd: 10000,
    stockQuantity: 100,
    status: 'In Stock',
    unit: 'Pack',
    thumbnail: '📦'
  });

  // Action menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesSearch = 
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = 
        selectedCategory === 'All Categories' || prod.category === selectedCategory;
      
      const matchesStatus = 
        selectedStatus === 'All Statuses' || prod.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, selectedStatus]);

  // Paginated products
  const totalItems = 1248; // Total store inventory representation as shown in screenshot
  const displayedFiltered = filteredProducts.slice(
    (currentPage - 1) * rowsPerPage, 
    currentPage * rowsPerPage
  );

  const startIdx = (currentPage - 1) * rowsPerPage + 1;
  const endIdx = Math.min(startIdx + displayedFiltered.length - 1, totalItems);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(displayedFiltered.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All Categories');
    setSelectedStatus('All Statuses');
    setCurrentPage(1);
  };

  // Add product handler
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.sku) return;

    const item: ProductItem = {
      id: `prod-${Date.now()}`,
      sku: newProduct.sku || `P00${products.length + 1}`,
      name: newProduct.name || '',
      category: (newProduct.category as ProductCategory) || 'Snacks',
      priceVnd: Number(newProduct.priceVnd) || 10000,
      stockQuantity: Number(newProduct.stockQuantity) || 0,
      status: Number(newProduct.stockQuantity) === 0 
        ? 'Out of Stock' 
        : Number(newProduct.stockQuantity) < 40 
          ? 'Low Stock' 
          : 'In Stock',
      thumbnail: newProduct.thumbnail || '📦',
      unit: newProduct.unit || 'Pack',
      updatedAt: 'Just now'
    };

    setProducts([item, ...products]);
    setIsAddModalOpen(false);
    setNewProduct({
      sku: `P00${products.length + 2}`,
      name: '',
      category: 'Snacks',
      priceVnd: 10000,
      stockQuantity: 100,
      status: 'In Stock',
      unit: 'Pack',
      thumbnail: '📦'
    });
  };

  // Save edit handler
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setProducts(products.map(p => {
      if (p.id === editingProduct.id) {
        const stock = Number(editingProduct.stockQuantity);
        const autoStatus: ProductStatus = stock === 0 
          ? 'Out of Stock' 
          : stock < 40 
            ? 'Low Stock' 
            : 'In Stock';
        return {
          ...editingProduct,
          priceVnd: Number(editingProduct.priceVnd),
          stockQuantity: stock,
          status: editingProduct.status || autoStatus
        };
      }
      return p;
    }));
    setEditingProduct(null);
  };

  // Helper for Category color styling & distinct bullet dot
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'Snacks':
        return {
          bg: 'bg-[#fffbeb]',
          text: 'text-[#b45309]',
          border: 'border-[#fde68a]',
          dot: 'bg-[#f59e0b]'
        };
      case 'Beverages':
        return {
          bg: 'bg-[#f0f9ff]',
          text: 'text-[#0369a1]',
          border: 'border-[#bae6fd]',
          dot: 'bg-[#0284c7]'
        };
      case 'Instant Food':
        return {
          bg: 'bg-[#fff7ed]',
          text: 'text-[#c2410c]',
          border: 'border-[#fed7aa]',
          dot: 'bg-[#ea580c]'
        };
      case 'Dairy':
        return {
          bg: 'bg-[#eef2ff]',
          text: 'text-[#4338ca]',
          border: 'border-[#c7d2fe]',
          dot: 'bg-[#6366f1]'
        };
      case 'Personal Care':
        return {
          bg: 'bg-[#faf5ff]',
          text: 'text-[#7e22ce]',
          border: 'border-[#e9d5ff]',
          dot: 'bg-[#a855f7]'
        };
      case 'Household':
        return {
          bg: 'bg-[#f0fdfa]',
          text: 'text-[#0f766e]',
          border: 'border-[#99f6e4]',
          dot: 'bg-[#14b8a6]'
        };
      default:
        return {
          bg: 'bg-[#f8fafc]',
          text: 'text-[#475569]',
          border: 'border-[#e2e8f0]',
          dot: 'bg-[#64748b]'
        };
    }
  };

  // Helper for Status color styling & distinct bullet dot
  const getStatusBadge = (status: ProductStatus) => {
    switch (status) {
      case 'In Stock':
        return {
          bg: 'bg-[#ecfdf5]',
          text: 'text-[#065f46]',
          border: 'border-[#a7f3d0]',
          dot: 'bg-[#10b981]'
        };
      case 'Low Stock':
        return {
          bg: 'bg-[#fffbeb]',
          text: 'text-[#92400e]',
          border: 'border-[#fde68a]',
          dot: 'bg-[#f59e0b]'
        };
      case 'Out of Stock':
        return {
          bg: 'bg-[#fef2f2]',
          text: 'text-[#991b1b]',
          border: 'border-[#fecaca]',
          dot: 'bg-[#ef4444]'
        };
    }
  };

  // Helper for Stock Quantity color styling
  const getStockQuantityBadge = (quantity: number) => {
    if (quantity === 0) {
      return {
        text: 'text-[#dc2626]',
        bg: 'bg-[#fef2f2]',
        border: 'border-[#fecaca]',
        dot: 'bg-[#ef4444]',
        label: 'Out of Stock'
      };
    }
    if (quantity <= 15) {
      return {
        text: 'text-[#d97706]',
        bg: 'bg-[#fffbeb]',
        border: 'border-[#fde68a]',
        dot: 'bg-[#f59e0b]',
        label: 'Low Stock'
      };
    }
    return {
      text: 'text-[#191c1b]',
      bg: 'bg-transparent',
      border: 'border-transparent',
      dot: 'bg-[#10b981]',
      label: 'In Stock'
    };
  };

  // Delete product handler
  const handleDeleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
    setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    setActiveMenuId(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#191c1b]">
            Products &amp; Inventory
          </h1>
          <p className="text-sm text-[#6d7974] mt-1">
            Monitor catalog items, stock levels, and store availability.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (onEditProduct && products.length > 0) {
                onEditProduct(products[0]);
              } else if (onNavigate) {
                onNavigate('store-edit-product');
              }
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#1e3a2f]/30 bg-white hover:bg-[#f6ece9] text-[#1e3a2f] text-sm font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
            <span>Edit Product Page</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1e3a2f] hover:bg-[#294d3f] text-white text-sm font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {toastNotice && (
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#059669] shrink-0" />
            <span className="font-semibold">{toastNotice}</span>
          </div>
          <button 
            onClick={() => setToastNotice(null)}
            className="text-xs font-bold text-[#047857] hover:underline ml-4"
          >
            Close
          </button>
        </div>
      )}

      {/* KPI Stat Cards (4 Cards - Sleek Small Accent Bars (Small accent bar) for Clean Clarity) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Products */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs hover:border-[#1e3a2f]/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#eaf0eb] text-[#1e3a2f] flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#eaf0eb] text-[#1e3a2f]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a2f]" />
              Store Base
            </span>
          </div>
          <div className="mt-3.5">
            <div className="text-xs font-semibold text-[#707973] uppercase tracking-wider">Total Products</div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191c1b] mt-1 tabular-nums font-mono">
              {initialInventoryStats.totalProducts.toLocaleString()}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5ECE8] flex items-center justify-between text-xs">
            <span className="text-[#707973]">Current Catalog</span>
            <span className="font-semibold text-[#1e3a2f] flex items-center gap-1">
              <span>↑</span>
              <span>{initialInventoryStats.totalProductsDelta}</span>
            </span>
          </div>
        </div>

        {/* Card 2: Active Products */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs hover:border-[#0284c7]/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            {/* Progress Circular Badge */}
            <div className="relative w-9 h-9 flex items-center justify-center">
              <svg className="w-9 h-9 transform -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  stroke="#E7E2D8"
                  strokeWidth="2.5"
                  fill="transparent"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  stroke="#0284c7"
                  strokeWidth="3"
                  strokeDasharray={`${88 * 0.88} 100`}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <span className="absolute text-[10px] font-bold text-[#0284c7]">
                {initialInventoryStats.activeProductsPercentage}%
              </span>
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-xs font-semibold text-[#707973] uppercase tracking-wider">Active Products</div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191c1b] mt-1 tabular-nums font-mono">
              {initialInventoryStats.activeProducts.toLocaleString()}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5ECE8] flex items-center justify-between text-xs">
            <span className="text-[#707973]">Shelf Status</span>
            <span className="font-semibold text-[#0284c7] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
              <span>Available on shelves</span>
            </span>
          </div>
        </div>

        {/* Card 3: Low Stock */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs hover:border-[#d97706]/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#fef3c7] text-[#d97706] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#fffbeb] text-[#b45309] border border-[#fde68a]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
              Warning
            </span>
          </div>
          <div className="mt-3.5">
            <div className="text-xs font-semibold text-[#707973] uppercase tracking-wider">Low Stock</div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#b45309] mt-1 tabular-nums font-mono">
              {initialInventoryStats.lowStock}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5ECE8] flex items-center justify-between text-xs">
            <span className="text-[#707973]">Reorder Threshold</span>
            <span className="font-semibold text-[#d97706] flex items-center gap-1">
              <span>▲</span>
              <span>{initialInventoryStats.lowStockDelta}</span>
            </span>
          </div>
        </div>

        {/* Card 4: Out of Stock */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs hover:border-[#dc2626]/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#fee2e2] text-[#dc2626] flex items-center justify-center shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
              Action Needed
            </span>
          </div>
          <div className="mt-3.5">
            <div className="text-xs font-semibold text-[#707973] uppercase tracking-wider">Out of Stock</div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#dc2626] mt-1 tabular-nums font-mono">
              {initialInventoryStats.outOfStock}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5ECE8] flex items-center justify-between text-xs">
            <span className="text-[#707973]">Inventory Deficit</span>
            <span className="font-semibold text-[#dc2626] flex items-center gap-1">
              <span>▲</span>
              <span>{initialInventoryStats.outOfStockDelta}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#E7E2D8] rounded-xl p-3.5 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#89938f] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by product name, SKU or category..."
            className="w-full pl-10 pr-4 py-2 bg-[#FAF8F5] border border-[#E7E2D8] rounded-lg text-sm text-[#191c1b] placeholder-[#89938f] focus:outline-none focus:border-[#1e3a2f] transition-colors"
          />
        </div>

        {/* Categories Dropdown */}
        <div className="relative min-w-[170px]">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by category"
            className="w-full appearance-none pl-3.5 pr-8 py-2 bg-[#FAF8F5] border border-[#E7E2D8] rounded-lg text-sm text-[#191c1b] font-medium focus:outline-none focus:border-[#1e3a2f] cursor-pointer"
          >
            <option value="All Categories">All Categories</option>
            <option value="Snacks">Snacks</option>
            <option value="Beverages">Beverages</option>
            <option value="Instant Food">Instant Food</option>
            <option value="Dairy">Dairy</option>
            <option value="Personal Care">Personal Care</option>
            <option value="Household">Household</option>
          </select>
          <ChevronDown className="w-4 h-4 text-[#89938f] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Status Dropdown */}
        <div className="relative min-w-[160px]">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by status"
            className="w-full appearance-none pl-3.5 pr-8 py-2 bg-[#FAF8F5] border border-[#E7E2D8] rounded-lg text-sm text-[#191c1b] font-medium focus:outline-none focus:border-[#1e3a2f] cursor-pointer"
          >
            <option value="All Statuses">All Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
          <ChevronDown className="w-4 h-4 text-[#89938f] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Reset Button */}
        <button
          onClick={handleResetFilters}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-[#E7E2D8] rounded-lg bg-white hover:bg-[#f6ece9] text-sm font-medium text-[#6d7974] hover:text-[#191c1b] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Selected Action Bar (when rows checked) */}
      {selectedIds.length > 0 && (
        <div className="bg-[#eaf0eb] border border-[#1e3a2f]/20 rounded-xl px-4 py-3 flex items-center justify-between text-sm animate-fadeIn">
          <div className="flex items-center gap-2 text-[#1e3a2f] font-medium">
            <Check className="w-4 h-4" />
            <span>{selectedIds.length} products selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setToastNotice(`Exporting ${selectedIds.length} selected products to CSV format...`);
                setTimeout(() => setToastNotice(null), 3500);
              }}
              className="px-3 py-1.5 bg-white text-[#1e3a2f] border border-[#1e3a2f]/30 rounded-lg text-xs font-semibold hover:bg-[#FAF8F5] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs text-[#6d7974] hover:text-[#191c1b] font-medium cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Products Table Card */}
      <div className="bg-white border border-[#E7E2D8] rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E7E2D8] bg-[#FAF8F5] text-[#89938f] text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 pl-4 pr-2 w-10">
                  <input
                    type="checkbox"
                    checked={displayedFiltered.length > 0 && selectedIds.length === displayedFiltered.length}
                    onChange={handleSelectAll}
                    aria-label="Select all products on page"
                    className="rounded border-[#c1c8c3] text-[#1e3a2f] focus:ring-[#1e3a2f] w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-3">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-[#191c1b]">
                    <span>SKU</span>
                  </div>
                </th>
                <th className="py-3.5 px-3 min-w-[220px]">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-[#191c1b]">
                    <span>PRODUCT NAME</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-3">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-[#191c1b]">
                    <span>CATEGORY</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-3">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-[#191c1b]">
                    <span>PRICE (VND)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-3">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-[#191c1b]">
                    <span>STOCK QUANTITY</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-3">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-[#191c1b]">
                    <span>STATUS</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">
                  <span>ACTIONS</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E2D8]/60">
              {displayedFiltered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6d7974]">
                    <Package className="w-10 h-10 mx-auto text-[#89938f] mb-2 opacity-50" />
                    <p className="font-medium text-[#191c1b]">No products found</p>
                    <p className="text-xs text-[#89938f] mt-1">Try adjusting your search terms or filter criteria.</p>
                  </td>
                </tr>
              ) : (
                displayedFiltered.map((product) => {
                  const isSelected = selectedIds.includes(product.id);
                  const isLowOrZero = product.stockQuantity === 0 || product.stockQuantity <= 15;

                  return (
                    <tr 
                      key={product.id}
                      className={`hover:bg-[#FAF8F5] transition-colors ${
                        isSelected ? 'bg-[#eaf0eb]/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 pl-4 pr-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(product.id)}
                          aria-label={`Select ${product.name}`}
                          className="rounded border-[#c1c8c3] text-[#1e3a2f] focus:ring-[#1e3a2f] w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {/* SKU */}
                      <td className="py-3.5 px-3 font-medium text-[#6d7974] text-xs font-mono">
                        {product.sku}
                      </td>

                      {/* Product Name with Thumbnail */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-lg border border-[#E7E2D8] flex items-center justify-center shrink-0 shadow-2xs overflow-hidden bg-white p-1">
                            {(PRODUCT_IMAGE_MAP[product.sku] || product.image) ? (
                              <img 
                                src={PRODUCT_IMAGE_MAP[product.sku] || product.image} 
                                alt={product.name} 
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="text-lg">{product.thumbnail || '📦'}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-[#191c1b]">
                              {product.name}
                            </div>
                            {product.barcode && (
                              <div className="text-[11px] text-[#89938f] font-mono">
                                {product.barcode}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category - Distinct Color Pill with Bullet Dot */}
                      <td className="py-3.5 px-3">
                        {(() => {
                          const catBadge = getCategoryBadge(product.category);
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${catBadge.bg} ${catBadge.text} border ${catBadge.border} shadow-2xs`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${catBadge.dot}`} />
                              <span>{product.category}</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* Price (VND) */}
                      <td className="py-3.5 px-3 font-semibold text-[#191c1b] tabular-nums">
                        {product.priceVnd.toLocaleString()}
                      </td>

                      {/* Stock Quantity - With Colored Indicator */}
                      <td className="py-3.5 px-3">
                        {(() => {
                          const stockBadge = getStockQuantityBadge(product.stockQuantity);
                          return (
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${stockBadge.dot} ${product.stockQuantity <= 15 ? 'animate-pulse' : ''}`} />
                              <span className={`font-semibold tabular-nums text-sm ${stockBadge.text}`}>
                                {product.stockQuantity}
                              </span>
                              <span className="text-[11px] text-[#89938f]">
                                {product.unit || 'unit'}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Status - Vivid High Contrast Badge with Bullet Point */}
                      <td className="py-3.5 px-3">
                        {(() => {
                          const stBadge = getStatusBadge(product.status);
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${stBadge.bg} ${stBadge.text} border ${stBadge.border} shadow-2xs`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${stBadge.dot} ${product.status === 'Low Stock' ? 'animate-pulse' : ''}`} />
                              <span>{product.status}</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="relative inline-flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              if (onEditProduct) {
                                onEditProduct(product);
                              } else if (onNavigate) {
                                onNavigate('store-edit-product');
                              } else {
                                setEditingProduct({ ...product });
                              }
                            }}
                            title="Edit Product"
                            className="p-1.5 rounded-md hover:bg-[#e7ede9] text-[#6d7974] hover:text-[#1e3a2f] transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === product.id ? null : product.id)}
                            title="More Actions"
                            className="p-1.5 rounded-md hover:bg-[#e7ede9] text-[#6d7974] hover:text-[#1e3a2f] transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {/* Action Dropdown Menu */}
                          {activeMenuId === product.id && (
                            <div className="absolute right-0 top-8 z-30 w-48 bg-white border border-[#E7E2D8] rounded-lg shadow-lg py-1 text-left text-xs animate-fadeIn">
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  if (onEditProduct) {
                                    onEditProduct(product);
                                  } else if (onNavigate) {
                                    onNavigate('store-edit-product');
                                  } else {
                                    setEditingProduct({ ...product });
                                  }
                                }}
                                className="w-full px-3 py-2 text-[#191c1b] hover:bg-[#FAF8F5] flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <Pencil className="w-3.5 h-3.5 text-[#1e3a2f]" />
                                <span>Edit Product Details</span>
                              </button>
                              <button
                                onClick={() => {
                                  const added = prompt(`Adjust stock quantity for ${product.name}:`, String(product.stockQuantity));
                                  if (added !== null) {
                                    const num = parseInt(added, 10);
                                    if (!isNaN(num)) {
                                      setProducts(products.map(p => p.id === product.id ? { ...p, stockQuantity: num } : p));
                                    }
                                  }
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-[#191c1b] hover:bg-[#FAF8F5] flex items-center gap-2 cursor-pointer"
                              >
                                <Tag className="w-3.5 h-3.5 text-[#6d7974]" />
                                <span>Adjust stock</span>
                              </button>
                              <div className="border-t border-[#E7E2D8] my-1"></div>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="w-full px-3 py-2 text-[#ba1a1a] hover:bg-[#fcedea] flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete product</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Table Footer */}
        <div className="px-4 py-3.5 border-t border-[#E7E2D8] bg-[#FAF8F5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6d7974]">
          <div>
            Showing <span className="font-semibold text-[#191c1b]">{startIdx}-{endIdx}</span> of{' '}
            <span className="font-semibold text-[#191c1b]">{totalItems.toLocaleString()}</span> products
          </div>

          <div className="flex items-center gap-2">
            {/* Pagination Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="w-8 h-8 rounded border border-[#E7E2D8] bg-white flex items-center justify-center hover:bg-[#f6ece9] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-[#191c1b]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage(1)}
                className={`w-8 h-8 rounded text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors ${
                  currentPage === 1 
                    ? 'bg-[#1e3a2f] text-white shadow-2xs' 
                    : 'border border-[#E7E2D8] bg-white text-[#191c1b] hover:bg-[#f6ece9]'
                }`}
              >
                1
              </button>
              <button
                onClick={() => setCurrentPage(2)}
                className={`w-8 h-8 rounded text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors ${
                  currentPage === 2 
                    ? 'bg-[#1e3a2f] text-white shadow-2xs' 
                    : 'border border-[#E7E2D8] bg-white text-[#191c1b] hover:bg-[#f6ece9]'
                }`}
              >
                2
              </button>
              <button
                onClick={() => setCurrentPage(3)}
                className={`w-8 h-8 rounded text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors ${
                  currentPage === 3 
                    ? 'bg-[#1e3a2f] text-white shadow-2xs' 
                    : 'border border-[#E7E2D8] bg-white text-[#191c1b] hover:bg-[#f6ece9]'
                }`}
              >
                3
              </button>
              <button
                onClick={() => setCurrentPage(4)}
                className="hidden sm:flex w-8 h-8 rounded text-xs font-semibold border border-[#E7E2D8] bg-white text-[#191c1b] items-center justify-center hover:bg-[#f6ece9] cursor-pointer"
              >
                4
              </button>
              <button
                onClick={() => setCurrentPage(5)}
                className="hidden sm:flex w-8 h-8 rounded text-xs font-semibold border border-[#E7E2D8] bg-white text-[#191c1b] items-center justify-center hover:bg-[#f6ece9] cursor-pointer"
              >
                5
              </button>
              <span className="px-1 text-[#89938f]">...</span>
              <button
                onClick={() => setCurrentPage(156)}
                className="w-8 h-8 rounded text-xs font-semibold border border-[#E7E2D8] bg-white text-[#191c1b] flex items-center justify-center hover:bg-[#f6ece9] cursor-pointer"
              >
                156
              </button>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, 156))}
                disabled={currentPage === 156}
                aria-label="Next page"
                className="w-8 h-8 rounded border border-[#E7E2D8] bg-white flex items-center justify-center hover:bg-[#f6ece9] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-[#191c1b]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Rows Per Page Selector */}
            <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-[#E7E2D8]">
              <span className="text-[#89938f]">Rows per page</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                aria-label="Rows per page"
                className="bg-white border border-[#E7E2D8] rounded px-2 py-1 text-xs font-medium text-[#191c1b] cursor-pointer focus:outline-none focus:border-[#1e3a2f]"
              >
                <option value={8}>8</option>
                <option value={16}>16</option>
                <option value={32}>32</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white border border-[#E7E2D8] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 border-b border-[#E7E2D8] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#eaf0eb] text-[#1e3a2f] flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-[#191c1b]">Add New Product</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#89938f] hover:text-[#191c1b] p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#191c1b] uppercase tracking-wider mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E2D8] rounded-lg text-sm text-[#191c1b] font-mono focus:border-[#1e3a2f]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#191c1b] uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value as ProductCategory })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E2D8] rounded-lg text-sm text-[#191c1b] focus:border-[#1e3a2f]"
                  >
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Instant Food">Instant Food</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Personal Care">Personal Care</option>
                    <option value="Household">Household</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#191c1b] uppercase tracking-wider mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Green Tea Zero 455ml"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E2D8] rounded-lg text-sm text-[#191c1b] focus:border-[#1e3a2f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#191c1b] uppercase tracking-wider mb-1">
                    Price (VND) *
                  </label>
                  <input
                    type="number"
                    required
                    min={500}
                    step={500}
                    value={newProduct.priceVnd}
                    onChange={(e) => setNewProduct({ ...newProduct, priceVnd: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E2D8] rounded-lg text-sm text-[#191c1b] tabular-nums focus:border-[#1e3a2f]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#191c1b] uppercase tracking-wider mb-1">
                    Initial Stock *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newProduct.stockQuantity}
                    onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E2D8] rounded-lg text-sm text-[#191c1b] tabular-nums focus:border-[#1e3a2f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#191c1b] uppercase tracking-wider mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    placeholder="Pack, Bottle, Can..."
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E2D8] rounded-lg text-sm text-[#191c1b] focus:border-[#1e3a2f]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#191c1b] uppercase tracking-wider mb-1">
                    Visual Icon / Emoji
                  </label>
                  <input
                    type="text"
                    value={newProduct.thumbnail}
                    onChange={(e) => setNewProduct({ ...newProduct, thumbnail: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E2D8] rounded-lg text-sm text-[#191c1b] focus:border-[#1e3a2f]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E7E2D8] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-[#E7E2D8] rounded-lg text-sm font-medium text-[#6d7974] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1e3a2f] hover:bg-[#294d3f] text-white text-sm font-semibold cursor-pointer shadow-xs"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white border border-[#E7E2D8] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 border-b border-[#E7E2D8] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#eaf0eb] text-[#1e3a2f] flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-[#191c1b]">
                  Edit Product: {editingProduct.sku}
                </h3>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-[#89938f] hover:text-[#191c1b] p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#191c1b] uppercase tracking-wider mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E2D8] rounded-lg text-sm text-[#191c1b] focus:border-[#1e3a2f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#191c1b] uppercase tracking-wider mb-1">
                    Price (VND)
                  </label>
                  <input
                    type="number"
                    required
                    min={500}
                    step={500}
                    value={editingProduct.priceVnd}
                    onChange={(e) => setEditingProduct({ ...editingProduct, priceVnd: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E2D8] rounded-lg text-sm text-[#191c1b] tabular-nums focus:border-[#1e3a2f]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#191c1b] uppercase tracking-wider mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingProduct.stockQuantity}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stockQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E2D8] rounded-lg text-sm text-[#191c1b] tabular-nums focus:border-[#1e3a2f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#191c1b] uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as ProductCategory })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E2D8] rounded-lg text-sm text-[#191c1b] focus:border-[#1e3a2f]"
                  >
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Instant Food">Instant Food</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Personal Care">Personal Care</option>
                    <option value="Household">Household</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#191c1b] uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={editingProduct.status}
                    onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value as ProductStatus })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E2D8] rounded-lg text-sm text-[#191c1b] focus:border-[#1e3a2f]"
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E7E2D8] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-[#E7E2D8] rounded-lg text-sm font-medium text-[#6d7974] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1e3a2f] hover:bg-[#294d3f] text-white text-sm font-semibold cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
