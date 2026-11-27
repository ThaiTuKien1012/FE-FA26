import { Store } from 'lucide-react';
import type { StoreSummary } from '../customer.types';
import { StoreImage } from './CustomerStorefrontView';

/** The Store's own icon; a Store icon placeholder when it has none or the image does not load. */
export function CustomerStoreLogo({ store, className = '' }: { store: Pick<StoreSummary, 'iconUrl' | 'name'>; className?: string }) {
  return <StoreImage key={store.iconUrl} src={store.iconUrl} alt={`Biểu tượng ${store.name}`}
    className={`shrink-0 select-none object-contain ${className}`}
    fallback={<span className={`grid shrink-0 place-items-center rounded-lg bg-[#edf7f1] text-[#088178] ${className}`}><Store className="size-1/2" aria-hidden="true" /></span>} />;
}
