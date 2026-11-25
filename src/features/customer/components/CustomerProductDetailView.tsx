import { useCallback, useEffect } from 'react';
import { ArrowLeft, Store } from 'lucide-react';
import { customerApi } from '../customer.api';
import { getCustomerStoreId, rememberCustomerStore } from '../data/customerStores';
import { usePublicRead } from '../hooks/useCustomerStorefront';
import { unitLabel } from '../data/customerLocale';
import { CustomerHeader, type CustomerHeaderProps } from './CustomerHeader';
import { containerClass, CustomerFooter, customerButton, formatCustomerPrice, ProductImage, PublicState } from './CustomerCommerce';

interface Props extends CustomerHeaderProps {
  productId: string | null;
  onBack: () => void;
  onStore: () => void;
  onProduct?: (id: string) => void;
}
export function CustomerProductDetailView({ productId, onBack, onStore, ...header }: Props) {
  const slug = getCustomerStoreId();
  const loadProduct = useCallback((signal: AbortSignal) => customerApi.product(slug, productId || '', signal), [slug, productId]);
  const product = usePublicRead(slug && productId ? JSON.stringify([slug, productId]) : '', loadProduct);
  const stores = usePublicRead('stores', customerApi.stores);
  const store = stores.data?.find(item => item.storeSlug === slug);
  useEffect(() => { if (slug) rememberCustomerStore(slug); }, [slug]);
  const item = product.data;
  return <div className="min-h-screen bg-white text-[#212529] [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-[#088178]" lang="vi">
    <CustomerHeader {...header} />
    <main className={`${containerClass} py-8`}><button onClick={onBack} className="mb-7 flex items-center gap-2 text-sm text-[#088178]"><ArrowLeft size={16} />Về cửa hàng</button>
      {!slug || !productId ? <PublicState empty="Hãy chọn cửa hàng và sản phẩm để xem chi tiết." /> : product.loading || product.error ? <PublicState loading={product.loading} error={product.error} onRetry={product.retry} /> : item && <div className="grid grid-cols-2 items-start gap-10 max-[650px]:grid-cols-1 max-[650px]:gap-6">
        <div className="flex h-110 items-center justify-center rounded-3xl bg-[#f3f7f3] p-10 max-[650px]:h-72"><ProductImage product={item} className="size-full" /></div>
        <div className="py-4"><p className="text-sm text-[#6f897a]">{item.category?.name || 'Chưa phân loại'}</p><h1 className="mt-3 text-3xl font-semibold leading-tight">{item.name}</h1><p className="mt-5 text-2xl font-semibold text-[#088178]">{formatCustomerPrice(item.sellingPrice)}<span className="ml-1 text-sm font-normal text-[#748c7e]">/ {unitLabel(item.unit)}</span></p><p className={`mt-3 text-sm ${item.availability === 'AVAILABLE' ? 'text-[#088178]' : 'text-[#96664d]'}`}>{item.availability === 'AVAILABLE' ? 'Có hàng' : 'Tạm hết hàng'}</p><div className="mt-7 border-t border-[#e2eae5] pt-6"><h2 className="text-base font-semibold">Mô tả sản phẩm</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#68816f]">{item.description || 'Cửa hàng chưa cung cấp mô tả.'}</p></div><button onClick={onStore} className={`${customerButton} mt-7`}><Store size={17} />{store?.name || 'Xem cửa hàng'}</button></div>
      </div>}
    </main><CustomerFooter />
  </div>;
}
