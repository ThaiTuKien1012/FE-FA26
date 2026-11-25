import type { CustomerStore } from '../data/customerStores';

export function CustomerStoreLogo({ store, className = '' }: {
  store: Pick<CustomerStore, 'logo' | 'englishName'>;
  className?: string;
}) {
  return <img className={`shrink-0 select-none object-contain ${className}`} src={store.logo} alt={`${store.englishName} logo`} draggable={false} />;
}
