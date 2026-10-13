export type HttpMethod = 'GET' | 'POST' | 'PUT';

export type AuthType = 'Bearer token' | 'Basic Auth' | 'API Key Header' | 'OAuth 2.0';

export interface ApiConnection {
  id: string;
  name: string;
  status: 'Configured' | 'Not configured';
  lastTest: string;
  method: HttpMethod;
  endpointUrl: string;
  credentialsReference: string;
  authType: AuthType;
}

export interface CsvMappingField {
  sourceColumn: string;
  targetField: 'transaction_id' | 'sku' | 'quantity' | 'unit_profit' | 'timestamp';
}

export const initialConnections: ApiConnection[] = [
  {
    id: 'conn-1',
    name: 'Transaction Import API',
    status: 'Not configured',
    lastTest: 'Never tested',
    method: 'GET',
    endpointUrl: 'https://example.invalid/api/transactions',
    credentialsReference: 'supersecrettokenma',
    authType: 'Bearer token'
  },
  {
    id: 'conn-2',
    name: 'Sample CSV / Excel Mapping',
    status: 'Configured',
    lastTest: 'Local mapping only',
    method: 'POST',
    endpointUrl: 'https://internal.retailspace.local/import/csv-batch',
    credentialsReference: 'internal_batch_key_v2',
    authType: 'API Key Header'
  }
];
