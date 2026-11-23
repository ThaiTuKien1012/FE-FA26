import type { F02Product } from '../../store/store.api';
import { MerchantProductScores } from './MerchantProductScores';

export function ProductScores({ readOnly, remember, active = true }: { readOnly: boolean; remember: (products: F02Product[]) => void; active?: boolean }) {
  return <MerchantProductScores readOnly={readOnly} remember={remember} active={active} />;
}
export { StoreExpiryTable } from './UtilityPushTable';
