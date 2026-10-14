import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Tag, 
  Star, 
  Clock, 
  Receipt, 
  X,
  CreditCard,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { ProductItem } from '../../../types/storeInventory';
import { AuthUser } from '../../../services/authService';
import { AppLogo } from '../../../components/common/AppLogo';

interface CustomerStorefrontViewProps {
  products: ProductItem[];
  user?: AuthUser | null;
  onLogout: () => void;
}

interface CartItem {
  product: ProductItem;
  quantity: number;
}

export const CustomerStorefrontView: React.FC<CustomerStorefrontViewProps> = ({
  products,
  user,
  onLogout
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([
    {
      product: products[0] || {
        id: 'p-1',
        sku: 'P001',
        name: "Lay's Classic 70g",
        category: 'Snacks',
        priceVnd: 32000,
        stockQuantity: 120,
        status: 'In Stock',
        unit: 'Pack',
        thumbnail: '🥔'
      },
      quantity: 2
    }
  ]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [orderReceipt, setOrderReceipt] = useState<{
    orderId: string;
    items: CartItem[];
    subtotal: number;
    discount: number;
    total: number;
    pointsEarned: number;
    timestamp: string;
  } | null>(null);

  const categories = ['All', 'Snacks', 'Beverages', 'Instant Food', 'Dairy', 'Personal Care', 'Household'];

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchCat = selectedCategory === 'All' || prod.category === selectedCategory;
      const matchQuery = 
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  const addToCart = (product: ProductItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.priceVnd * item.quantity, 0);
  }, [cart]);

  // High-Utility bundle discount simulation (5% loyalty discount)
  const discount = Math.round(subtotal * 0.05);
  const total = Math.max(0, subtotal - discount);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleCheckout = () => {
    const receiptData = {
      orderId: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
      items: [...cart],
      subtotal,
      discount,
      total,
      pointsEarned: Math.round(total / 1000),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setOrderReceipt(receiptData);
    setIsCheckoutModalOpen(true);
    setCart([]);
    setIsCartOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#191c1b] antialiased flex flex-col">
      {/* Top Customer Header Bar */}
      <header className="bg-white border-b border-[#E7E2D8] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="shrink-0 flex items-center justify-center">
              <AppLogo className="w-10 h-10" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-[#191c1b] leading-tight">
                RetailSpace Kiosk
              </div>
              <div className="text-[11px] text-[#6d7974] leading-tight">
                Self-Checkout &amp; Personalized Storefront
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Customer Profile Pill */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#f4f7f5] border border-[#E7E2D8] text-xs">
              <div className="w-6 h-6 rounded-full bg-[#1e3a2f] text-white flex items-center justify-center font-bold text-[10px]">
                {user?.avatarText || 'CU'}
              </div>
              <div className="text-left">
                <span className="font-bold text-[#191c1b]">{user?.name || 'Customer'}</span>
                <span className="text-[#6d7974] ml-1.5">• 1,450 Points</span>
              </div>
            </div>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl bg-[#1e3a2f] text-white hover:bg-[#162B23] transition-all cursor-pointer shadow-xs flex items-center gap-2 text-xs font-bold"
            >
              <ShoppingBag className="w-4 h-4 text-[#caeada]" />
              <span className="hidden sm:inline">My Basket</span>
              {totalItemsCount > 0 && (
                <span className="bg-[#caeada] text-[#1E3A2F] text-[10px] font-extrabold px-1.5 py-0.2 rounded-full font-mono">
                  {totalItemsCount}
                </span>
              )}
            </button>

            {/* Logout / Switch Role */}
            <button
              onClick={onLogout}
              className="p-2 rounded-xl text-[#6d7974] hover:text-[#191c1b] hover:bg-[#eaf0eb] transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5"
              title="Sign Out / Switch Role"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Switch Role</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-[#1e3a2f] to-[#2d5746] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-sm">
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-[11px] font-semibold text-[#caeada]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Recommendation Engine Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Good morning, {user?.name || 'Customer'}!
            </h1>
            <p className="text-xs sm:text-sm text-white/80">
              Browse products below with live store pricing. Your basket automatically unlocks High-Utility promotional bundle discounts.
            </p>
          </div>
          <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-12 text-9xl">
            🛒
          </div>
        </div>

        {/* Featured Mined Bundles Carousel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#c26d38]" />
              <h2 className="text-base font-bold text-[#191c1b]">
                Frequently Bought Together (HUI-Miner Pairings)
              </h2>
            </div>
            <span className="text-xs text-[#6d7974]">Algorithm: EFIM High-Utility Itemset</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E7E2D8] rounded-xl p-4 flex items-center justify-between hover:border-[#1e3a2f] transition-all shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="text-3xl p-2 bg-[#FAF8F5] rounded-lg">🥔🥤</div>
                <div>
                  <div className="text-xs font-bold text-[#191c1b]">
                    Snack &amp; Refreshment Synergy
                  </div>
                  <div className="text-[11px] text-[#6d7974]">
                    Lay&apos;s Classic 70g + Pepsi Black Can 330ml
                  </div>
                  <div className="text-xs font-bold text-[#1e3a2f] mt-1 font-mono">
                    42,000 VND <span className="line-through text-[#89938f] text-[10px]">47,000 VND</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (products[0]) addToCart(products[0]);
                  if (products[1]) addToCart(products[1]);
                }}
                className="px-3 py-1.5 bg-[#1e3a2f] text-white rounded-lg text-xs font-bold hover:bg-[#162B23] cursor-pointer shadow-2xs"
              >
                + Add Both
              </button>
            </div>

            <div className="bg-white border border-[#E7E2D8] rounded-xl p-4 flex items-center justify-between hover:border-[#1e3a2f] transition-all shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="text-3xl p-2 bg-[#FAF8F5] rounded-lg">🍜☕</div>
                <div>
                  <div className="text-xs font-bold text-[#191c1b]">
                    Quick Lunch &amp; Energy Bundle
                  </div>
                  <div className="text-[11px] text-[#6d7974]">
                    Hao Hao Noodles + Highlands Coffee
                  </div>
                  <div className="text-xs font-bold text-[#1e3a2f] mt-1 font-mono">
                    23,000 VND <span className="line-through text-[#89938f] text-[10px]">26,000 VND</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (products[2]) addToCart(products[2]);
                  if (products[3]) addToCart(products[3]);
                }}
                className="px-3 py-1.5 bg-[#1e3a2f] text-white rounded-lg text-xs font-bold hover:bg-[#162B23] cursor-pointer shadow-2xs"
              >
                + Add Both
              </button>
            </div>
          </div>
        </div>

        {/* Search & Categories Filter */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#89938f] absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#E7E2D8] rounded-xl text-xs sm:text-sm text-[#191c1b] placeholder:text-[#89938f] focus:outline-none focus:border-[#1e3a2f]"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#1e3a2f] text-white shadow-2xs'
                      : 'bg-white border border-[#E7E2D8] text-[#6d7974] hover:bg-[#faf4f2]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Catalog Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const inCartItem = cart.find((c) => c.product.id === product.id);

              return (
                <div
                  key={product.id}
                  className="bg-white border border-[#E7E2D8] rounded-xl p-4 flex flex-col justify-between hover:border-[#1e3a2f] transition-all shadow-2xs group"
                >
                  <div>
                    {/* Thumbnail / Image container */}
                    <div className="h-32 w-full bg-[#FAF8F5] rounded-lg border border-[#E7E2D8]/60 flex items-center justify-center text-4xl mb-3 overflow-hidden">
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="h-full w-full object-contain p-2" 
                        />
                      ) : (
                        <span>{product.thumbnail || '📦'}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#6d7974] mb-1">
                      <span>{product.category}</span>
                      <span className="font-mono">{product.sku}</span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-[#191c1b] line-clamp-2 leading-tight">
                      {product.name}
                    </h3>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E7E2D8]/50 flex items-center justify-between">
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-[#1e3a2f] font-mono">
                        {product.priceVnd.toLocaleString('en-US')} VND
                      </div>
                      <div className="text-[10px] text-[#89938f]">
                        {product.stockQuantity} in stock
                      </div>
                    </div>

                    {inCartItem ? (
                      <div className="flex items-center gap-1.5 bg-[#eaf0eb] p-1 rounded-lg">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="w-6 h-6 rounded bg-white text-[#191c1b] flex items-center justify-center text-xs font-bold hover:bg-[#caeada] cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-[#1e3a2f] px-1 font-mono">
                          {inCartItem.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="w-6 h-6 rounded bg-white text-[#191c1b] flex items-center justify-center text-xs font-bold hover:bg-[#caeada] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="px-3 py-1.5 bg-[#1e3a2f] text-white rounded-lg text-xs font-bold hover:bg-[#162B23] cursor-pointer shadow-2xs flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Slide-over Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            onClick={() => setIsCartOpen(false)} 
            className="absolute inset-0 bg-black/40 backdrop-blur-2xs transition-opacity" 
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white border-l border-[#E7E2D8] flex flex-col shadow-2xl">
              <div className="p-5 border-b border-[#E7E2D8] flex items-center justify-between bg-[#FAF8F5]">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#1e3a2f]" />
                  <h2 className="text-base font-bold text-[#191c1b]">My Basket</h2>
                  <span className="text-xs text-[#6d7974]">({totalItemsCount} items)</span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 rounded-lg text-[#89938f] hover:text-[#191c1b] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cart List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center text-[#6d7974]">
                    <ShoppingBag className="w-12 h-12 stroke-[1.25] text-[#89938f] mb-2" />
                    <p className="text-sm font-semibold">Your basket is empty</p>
                    <p className="text-xs text-[#89938f] mt-1">Select items from the catalog above</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div 
                      key={item.product.id}
                      className="p-3 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] flex items-center justify-between gap-3"
                    >
                      <div className="w-12 h-12 rounded-lg bg-white border border-[#E7E2D8] flex items-center justify-center shrink-0 overflow-hidden p-1">
                        {item.product.image ? (
                          <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-2xl">{item.product.thumbnail || '📦'}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-[#191c1b] truncate">
                          {item.product.name}
                        </h4>
                        <div className="text-[11px] text-[#6d7974] font-mono mt-0.5">
                          {item.product.priceVnd.toLocaleString('en-US')} VND × {item.quantity}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-white border border-[#E7E2D8] rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="p-1 hover:bg-[#eaf0eb] rounded text-xs cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold font-mono px-1">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="p-1 hover:bg-[#eaf0eb] rounded text-xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1.5 text-[#89938f] hover:text-[#b3261e] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Footer / Checkout */}
              {cart.length > 0 && (
                <div className="p-5 border-t border-[#E7E2D8] bg-[#FAF8F5] space-y-3">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#6d7974]">
                      <span>Subtotal:</span>
                      <span className="font-mono">{subtotal.toLocaleString('en-US')} VND</span>
                    </div>
                    <div className="flex justify-between text-[#065f46]">
                      <span>Mined Bundle Discount (5%):</span>
                      <span className="font-mono">-{discount.toLocaleString('en-US')} VND</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-[#191c1b] pt-2 border-t border-[#E7E2D8]">
                      <span>Total Due:</span>
                      <span className="font-mono text-base text-[#1e3a2f]">
                        {total.toLocaleString('en-US')} VND
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="w-full py-3 px-4 rounded-xl bg-[#1e3a2f] hover:bg-[#162B23] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4 text-[#caeada]" />
                    <span>Pay at Kiosk ({total.toLocaleString('en-US')} VND)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Simulated Order Receipt Modal */}
      {isCheckoutModalOpen && orderReceipt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="text-center space-y-1 pb-3 border-b border-[#E7E2D8]">
              <div className="w-12 h-12 rounded-full bg-[#ecfdf5] text-[#065f46] flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#191c1b]">
                Payment Successful!
              </h3>
              <p className="text-xs text-[#6d7974]">
                Order {orderReceipt.orderId} • Completed at {orderReceipt.timestamp}
              </p>
            </div>

            <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E7E2D8] space-y-2 text-xs">
              <div className="font-bold text-[#191c1b] pb-1 border-b border-[#E7E2D8]/60">
                Receipt Summary
              </div>
              {orderReceipt.items.map((it) => (
                <div key={it.product.id} className="flex justify-between text-[#6d7974]">
                  <span>{it.product.name} × {it.quantity}</span>
                  <span className="font-mono">
                    {(it.product.priceVnd * it.quantity).toLocaleString('en-US')} VND
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-[#E7E2D8] flex justify-between font-bold text-[#191c1b]">
                <span>Total Paid:</span>
                <span className="font-mono text-[#1e3a2f]">
                  {orderReceipt.total.toLocaleString('en-US')} VND
                </span>
              </div>
              <div className="text-[11px] text-[#065f46] font-medium pt-1">
                🎉 Earned +{orderReceipt.pointsEarned} RetailPoints added to Quynh Le&apos;s account!
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#1e3a2f] text-white text-xs font-bold hover:bg-[#162B23] cursor-pointer"
              >
                Done Shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
