import { CustomerStorefrontView, type CustomerStorefrontViewProps } from './CustomerStorefrontView';

export function CustomerHomeView(props: Omit<CustomerStorefrontViewProps, 'onHome'> & { onRegister?: () => void }) {
  return <CustomerStorefrontView {...props} onHome={() => window.scrollTo({ top: 0 })} landing />;
}
