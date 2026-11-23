import { authService } from '../services/authService';

export const isStoreAdmin = () => authService.getCurrentUser()?.role === 'Store Admin';
/** Presentation only: other roles keep their existing wording. */
export const storeAdminCopy = (original: string, storeAdmin: string) => isStoreAdmin() ? storeAdmin : original;

/** Keep actionable error information without displaying exception dumps or raw JSON. */
export function storeAdminMessage(message: string): string {
  if (!isStoreAdmin()) return message;
  if (/number that this client cannot preserve safely/i.test(message)) return 'Some numbers could not be read accurately, so this response was not displayed. Refresh or contact your administrator.';
  if (/^[\s]*[\[{]/.test(message)) {
    try {
      const value: unknown = JSON.parse(message);
      const entries = Array.isArray(value) ? value : [value];
      const messages = entries.flatMap(entry => {
        if (!entry || typeof entry !== 'object') return [];
        const row = entry as Record<string, unknown>;
        const text = typeof row.message === 'string' ? row.message : typeof row.error === 'string' ? row.error : null;
        if (!text) return [];
        return [typeof row.field === 'string' ? `${row.field}: ${text}` : text];
      });
      if (messages.length) return messages.map(storeAdminMessage).join('\n');
    } catch { /* Unreadable service details must not be shown as raw data. */ }
    return 'The service returned unreadable error details. Refresh the details or contact your administrator.';
  }
  if (/\b(?:SQLException|JdbcTemplate|Hibernate|NullPointerException|JsonMappingException|stack trace)\b|\bat [\w.$]+\([^)]*\.java:\d+\)/i.test(message)) {
    return 'A service error prevented this action from being confirmed. Refresh the details before trying again, or contact your administrator.';
  }
  return message.replace(/\bf03Eligible\b/g, 'Analysis eligibility').replace(/\bsource_order_id\b/g, 'Order ID').replace(/\boccurred_at\b/g, 'Sale date and time').replace(/\bunit_price\b/g, 'Unit price').replace(/\bunit_cost\b/g, 'Unit cost').replace(/^sku:/, 'SKU:');
}
