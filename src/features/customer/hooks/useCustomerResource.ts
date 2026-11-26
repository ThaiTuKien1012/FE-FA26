import { useEffect, useState } from 'react';
import { CustomerApiError } from '../customer.api';

type Result<T> = { data?: T; error?: CustomerApiError };

export function useCustomerResource<T>(request: (signal: AbortSignal) => Promise<T>) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    request: typeof request; version: number; value: Result<T>;
  }>();
  useEffect(() => {
    const abort = new AbortController();
    void request(abort.signal).then(data => {
      if (!abort.signal.aborted) setResult({ request, version, value: { data } });
    }, error => {
      if (!abort.signal.aborted) setResult({ request, version, value: {
        error: error instanceof CustomerApiError ? error : new CustomerApiError(null),
      } });
    });
    return () => abort.abort();
  }, [request, version]);
  const current = result?.request === request ? result : undefined;
  const loading = current?.version !== version;
  return { data: current?.value.data, error: loading ? undefined : current?.value.error, loading, reload: () => setVersion(previous => previous + 1) };
}
