import React, { useState } from 'react';
import { ApiConnection, HttpMethod, AuthType, initialConnections } from '../../../types/integrations';
import { X, CheckCircle2, RotateCw } from 'lucide-react';

export const ApiConnectionsView: React.FC = () => {
  const [connections, setConnections] = useState<ApiConnection[]>(initialConnections);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('conn-1');

  // Form edit states
  const selectedConnection = connections.find((c) => c.id === selectedConnectionId) || connections[0];
  const [connName, setConnName] = useState(selectedConnection.name);
  const [method, setMethod] = useState<HttpMethod>(selectedConnection.method);
  const [endpointUrl, setEndpointUrl] = useState(selectedConnection.endpointUrl);
  const [credentialsRef, setCredentialsRef] = useState(selectedConnection.credentialsReference);
  const [authType, setAuthType] = useState<AuthType>(selectedConnection.authType);

  // Testing & Save states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'Not run' | 'Testing' | 'Passed (200 OK)';
    verificationStatus: 'Not verified' | 'Verified Safe Handshake';
    timestamp?: string;
  }>({
    status: 'Not run',
    verificationStatus: 'Not verified'
  });

  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);

  // New connection form states
  const [newConnName, setNewConnName] = useState('');
  const [newConnUrl, setNewConnUrl] = useState('');
  const [newConnMethod, setNewConnMethod] = useState<HttpMethod>('GET');

  const handleSelect = (conn: ApiConnection) => {
    setSelectedConnectionId(conn.id);
    setConnName(conn.name);
    setMethod(conn.method);
    setEndpointUrl(conn.endpointUrl);
    setCredentialsRef(conn.credentialsReference);
    setAuthType(conn.authType);
  };

  const handleTestConnection = () => {
    setIsTesting(true);
    setTestResult({
      status: 'Testing',
      verificationStatus: 'Not verified'
    });

    setTimeout(() => {
      setIsTesting(false);
      setTestResult({
        status: 'Passed (200 OK)',
        verificationStatus: 'Verified Safe Handshake',
        timestamp: new Date().toLocaleTimeString()
      });
    }, 900);
  };

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setConnections(
      connections.map((c) =>
        c.id === selectedConnectionId
          ? {
              ...c,
              name: connName,
              method,
              endpointUrl,
              credentialsReference: credentialsRef,
              authType,
              status: 'Configured',
              lastTest: testResult.status === 'Passed (200 OK)' ? 'Tested just now' : c.lastTest
            }
          : c
      )
    );
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2500);
  };

  const handleCreateNewConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConnName.trim() || !newConnUrl.trim()) return;

    const newConn: ApiConnection = {
      id: `conn-${Date.now()}`,
      name: newConnName.trim(),
      status: 'Not configured',
      lastTest: 'Never tested',
      method: newConnMethod,
      endpointUrl: newConnUrl.trim(),
      credentialsReference: 'auth_key_' + Math.random().toString(36).substring(7),
      authType: 'Bearer token'
    };

    setConnections([...connections, newConn]);
    setSelectedConnectionId(newConn.id);
    setConnName(newConn.name);
    setMethod(newConn.method);
    setEndpointUrl(newConn.endpointUrl);
    setCredentialsRef(newConn.credentialsReference);
    setAuthType(newConn.authType);
    setIsAddModalOpen(false);
    setNewConnName('');
    setNewConnUrl('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2" data-purpose="page-title-banner">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#191c1b]">
            API Connections &amp; Import Settings
          </h1>
          <p className="text-sm text-[#6d7974] mt-1">
            Configure transaction sources, field mapping and safe connection tests.
          </p>
          <div className="mt-2.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#f6ece9] text-[#6d7974]">
              DEMO DATA
            </span>
          </div>
        </div>
        <div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-[#1e3a2f] hover:bg-[#294d3f] text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
            type="button"
          >
            + Add Connection
          </button>
        </div>
      </div>

      {saveSuccessNotice && (
        <div className="p-3 bg-[#e7ede9] border border-[#1e3a2f]/20 rounded-lg text-xs text-[#1e3a2f] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#1e3a2f]" />
          <span>Configuration saved successfully. Sensitive credentials remain masked.</span>
        </div>
      )}

      {/* 4 Connection Stat KPI Cards with Sleek Small Accent Bars (Small accent bar) & Distinct Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Endpoints (Forest Pine) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1e3a2f]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7974]">Endpoints</span>
              </div>
              {/* Sleek Small Accent Bar (Small accent bar) */}
              <span className="w-8 h-1 rounded-full bg-[#1e3a2f] shrink-0" />
            </div>
            <div className="text-3xl font-bold text-[#191c1b] font-mono tabular-nums mt-3">
              {connections.length}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#f6ece9]">
            <span className="text-xs text-[#89938f]">Active POS / ERP</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#e7ede9] text-[#1e3a2f]">
              Connected
            </span>
          </div>
        </div>

        {/* Card 2: Ingestion Health (Cognac Amber) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#c26d38]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7974]">Data Health</span>
              </div>
              {/* Sleek Small Accent Bar (Small accent bar) */}
              <span className="w-8 h-1 rounded-full bg-[#c26d38] shrink-0" />
            </div>
            <div className="text-3xl font-bold text-[#191c1b] font-mono tabular-nums mt-3">
              100%
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#f6ece9]">
            <span className="text-xs text-[#89938f]">No sync dropouts</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#fdf4ed] text-[#c26d38]">
              Optimal
            </span>
          </div>
        </div>

        {/* Card 3: Auth Security (Ocean Azure) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7974]">Security Model</span>
              </div>
              {/* Sleek Small Accent Bar (Small accent bar) */}
              <span className="w-8 h-1 rounded-full bg-[#0284c7] shrink-0" />
            </div>
            <div className="text-xl font-bold text-[#191c1b] mt-3">
              Bearer Token
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#f6ece9]">
            <span className="text-xs text-[#89938f]">TLS 1.3 encrypted</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#e0f2fe] text-[#0284c7]">
              Masked
            </span>
          </div>
        </div>

        {/* Card 4: Last Test (Plum Rose) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8b263e]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7974]">Test Response</span>
              </div>
              {/* Sleek Small Accent Bar (Small accent bar) */}
              <span className="w-8 h-1 rounded-full bg-[#8b263e] shrink-0" />
            </div>
            <div className="text-xl font-bold text-[#191c1b] mt-3">
              200 OK
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#f6ece9]">
            <span className="text-xs text-[#89938f] font-mono">Ping: 34ms</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#fdf2f4] text-[#8b263e]">
              Passed
            </span>
          </div>
        </div>
      </div>

      {/* Cards Grid: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Left Card: Connection List */}
        <div className="bg-white rounded-xl border border-[#E7E2D8] p-6 shadow-xs flex flex-col justify-between" data-purpose="connection-list-card">
          <div>
            <div className="mb-5">
              <h2 className="text-base font-semibold text-[#191c1b]">Connection List</h2>
              <p className="text-xs text-[#6d7974] mt-0.5">Configured sources (sample only)</p>
            </div>

            {/* List of items */}
            <div className="space-y-4">
              {connections.map((conn) => {
                const isSelected = conn.id === selectedConnectionId;
                return (
                  <div
                    key={conn.id}
                    onClick={() => handleSelect(conn)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#1e3a2f] ring-1 ring-[#1e3a2f] bg-[#e7ede9]/30'
                        : 'border-[#E7E2D8] bg-white hover:border-[#89938f]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-[#191c1b]">{conn.name}</h3>
                        <p className="text-xs text-[#89938f] mt-1">Last test: {conn.lastTest}</p>
                      </div>
                      {conn.status === 'Configured' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#e7ede9] text-[#1e3a2f] border border-[#1e3a2f]/20">
                          Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#fcedea] text-[#b3261e] border border-[#b3261e]/20">
                          Not configured
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-right">
                      <span className="text-xs text-[#1e3a2f] font-semibold hover:underline inline-flex items-center cursor-pointer">
                        Details ›
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alert Box at card bottom */}
          <div className="mt-6 p-4 rounded-lg bg-[#e7ede9]/40 border border-[#1e3a2f]/15">
            <p className="text-xs font-semibold text-[#1e3a2f]">No active production API connection</p>
            <p className="text-xs text-[#6d7974] mt-0.5">Configure and test a source before enabling automated POS imports.</p>
          </div>
        </div>

        {/* Top Right Card: Connection Details Form */}
        <div className="bg-white rounded-xl border border-[#E7E2D8] p-6 shadow-xs" data-purpose="connection-details-card">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-[#191c1b]">Connection Details</h2>
            <p className="text-xs text-[#6d7974] mt-0.5">Sample configuration — sensitive credentials are masked</p>
          </div>

          <form className="space-y-4" onSubmit={handleSaveSettings}>
            {/* Row 1: Connection Name & Method */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-[#6d7974] uppercase tracking-wider mb-1" htmlFor="connection-name">
                  CONNECTION NAME
                </label>
                <input
                  className="w-full text-xs text-[#191c1b] px-3 py-2 rounded-lg border border-[#E7E2D8] bg-white focus:border-[#1e3a2f] outline-none transition-colors"
                  id="connection-name"
                  type="text"
                  value={connName}
                  onChange={(e) => setConnName(e.target.value)}
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-semibold text-[#6d7974] uppercase tracking-wider mb-1" htmlFor="method-select">
                  METHOD
                </label>
                <select
                  className="w-full text-xs text-[#191c1b] px-3 py-2 rounded-lg border border-[#E7E2D8] bg-white focus:border-[#1e3a2f] outline-none transition-colors cursor-pointer"
                  id="method-select"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as HttpMethod)}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>
            </div>

            {/* Row 2: Endpoint URL */}
            <div>
              <label className="block text-[11px] font-semibold text-[#6d7974] uppercase tracking-wider mb-1" htmlFor="endpoint-url">
                ENDPOINT URL
              </label>
              <input
                className="w-full text-xs text-[#191c1b] px-3 py-2 rounded-lg border border-[#E7E2D8] bg-white focus:border-[#1e3a2f] outline-none transition-colors font-mono"
                id="endpoint-url"
                type="text"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
              />
            </div>

            {/* Row 3: Credentials Reference & Auth Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#6d7974] uppercase tracking-wider mb-1" htmlFor="credentials-ref">
                  CREDENTIALS REFERENCE
                </label>
                <input
                  className="w-full text-xs text-[#191c1b] px-3 py-2 rounded-lg border border-[#E7E2D8] bg-white focus:border-[#1e3a2f] outline-none transition-colors font-mono"
                  id="credentials-ref"
                  type="password"
                  value={credentialsRef}
                  onChange={(e) => setCredentialsRef(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6d7974] uppercase tracking-wider mb-1" htmlFor="auth-type">
                  AUTH TYPE
                </label>
                <select
                  className="w-full text-xs text-[#191c1b] px-3 py-2 rounded-lg border border-[#E7E2D8] bg-white focus:border-[#1e3a2f] outline-none transition-colors cursor-pointer"
                  id="auth-type"
                  value={authType}
                  onChange={(e) => setAuthType(e.target.value as AuthType)}
                >
                  <option value="Bearer token">Bearer token</option>
                  <option value="Basic Auth">Basic Auth</option>
                  <option value="API Key Header">API Key Header</option>
                  <option value="OAuth 2.0">OAuth 2.0</option>
                </select>
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#191c1b] bg-white border border-[#E7E2D8] rounded-lg hover:bg-[#fbf2f0] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                type="button"
              >
                {isTesting && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isTesting ? 'Testing Handshake...' : 'Test Connection'}</span>
              </button>
              <button
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1e3a2f] hover:bg-[#294d3f] rounded-lg shadow-xs transition-colors cursor-pointer"
                type="submit"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>

        {/* Bottom Left Card: CSV / Excel Import Mapping */}
        <div className="bg-white rounded-xl border border-[#E7E2D8] p-6 shadow-xs flex flex-col justify-between" data-purpose="mapping-settings-card">
          <div>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-[#191c1b]">CSV / Excel Import Mapping</h2>
              <p className="text-xs text-[#6d7974] mt-0.5">Map transaction ID, item SKU, quantity, and gross profit fields.</p>
            </div>
            <div className="p-3.5 rounded-lg border border-[#E7E2D8] bg-[#fbf2f0] flex items-center justify-between">
              <span className="text-xs text-[#6d7974] font-mono">
                Last mapping: sample_transaction_mapping_v1
              </span>
              <button
                onClick={() => setIsMappingModalOpen(true)}
                className="text-xs text-[#1e3a2f] font-semibold hover:underline inline-flex items-center ml-2 shrink-0 cursor-pointer"
                type="button"
              >
                Edit Mapping ›
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Right Card: Integration Logs */}
        <div className="bg-white rounded-xl border border-[#E7E2D8] p-6 shadow-xs" data-purpose="integration-logs-card">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-[#191c1b]">Integration Logs</h2>
            <p className="text-xs text-[#6d7974] mt-0.5">
              {testResult.status === 'Not run'
                ? 'No test events in this demo session.'
                : `Test executed at ${testResult.timestamp || 'just now'}`}
            </p>
          </div>
          <div className="pt-2 space-y-1.5 text-xs text-[#6d7974]">
            <p>
              <span className="text-[#89938f]">Connection Test:</span>{' '}
              <span className={testResult.status === 'Passed (200 OK)' ? 'text-[#1e3a2f] font-semibold' : 'text-[#6d7974]'}>
                {testResult.status}
              </span>
            </p>
            <p>
              <span className="text-[#89938f]">Status:</span>{' '}
              <span className={testResult.verificationStatus === 'Verified Safe Handshake' ? 'text-[#1e3a2f] font-semibold' : 'text-[#6d7974]'}>
                {testResult.verificationStatus}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <footer className="pt-6 pb-2 text-xs text-[#89938f]" data-purpose="page-footer-note">
        DEMO DATA • No real external API connection is established • Credentials must remain masked.
      </footer>

      {/* Add Connection Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#191c1b]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E7E2D8] shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E2D8]">
              <h3 className="text-sm font-bold text-[#191c1b]">Add Connection Source</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#89938f] hover:text-[#191c1b] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateNewConnection} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#191c1b] block mb-1">Source Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. POS Realtime Webhook"
                  value={newConnName}
                  onChange={(e) => setNewConnName(e.target.value)}
                  className="w-full p-2 border border-[#E7E2D8] rounded-lg text-[#191c1b] outline-none focus:border-[#1e3a2f]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="font-semibold text-[#191c1b] block mb-1">Base Endpoint URL</label>
                  <input
                    type="text"
                    required
                    placeholder="https://pos.retailspace.local/api"
                    value={newConnUrl}
                    onChange={(e) => setNewConnUrl(e.target.value)}
                    className="w-full p-2 border border-[#E7E2D8] rounded-lg text-[#191c1b] font-mono outline-none focus:border-[#1e3a2f]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#191c1b] block mb-1">Method</label>
                  <select
                    value={newConnMethod}
                    onChange={(e) => setNewConnMethod(e.target.value as HttpMethod)}
                    className="w-full p-2 border border-[#E7E2D8] rounded-lg text-[#191c1b] outline-none focus:border-[#1e3a2f]"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E7E2D8] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 border border-[#E7E2D8] rounded-lg text-xs text-[#6d7974] hover:bg-[#fbf2f0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1e3a2f] text-white rounded-lg text-xs font-semibold hover:bg-[#294d3f] cursor-pointer"
                >
                  Add Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Field Mapping Modal */}
      {isMappingModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#191c1b]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E7E2D8] shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E2D8]">
              <h3 className="text-sm font-bold text-[#191c1b]">
                Edit Field Mapping — sample_transaction_mapping_v1
              </h3>
              <button onClick={() => setIsMappingModalOpen(false)} className="text-[#89938f] hover:text-[#191c1b] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 font-semibold text-[#89938f] pb-1 border-b border-[#E7E2D8]">
                <span>INCOMING COLUMN</span>
                <span>SYSTEM TARGET FIELD</span>
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <span className="font-mono text-[#191c1b]">Order_Number</span>
                <span className="bg-[#e7ede9] text-[#1e3a2f] p-1.5 rounded-md font-mono">transaction_id</span>
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <span className="font-mono text-[#191c1b]">Product_Barcode_SKU</span>
                <span className="bg-[#e7ede9] text-[#1e3a2f] p-1.5 rounded-md font-mono">sku</span>
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <span className="font-mono text-[#191c1b]">Basket_Item_Qty</span>
                <span className="bg-[#e7ede9] text-[#1e3a2f] p-1.5 rounded-md font-mono">quantity</span>
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <span className="font-mono text-[#191c1b]">Item_Unit_Margin</span>
                <span className="bg-[#e7ede9] text-[#1e3a2f] p-1.5 rounded-md font-mono">unit_profit (utility)</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E7E2D8] flex justify-end">
              <button
                onClick={() => setIsMappingModalOpen(false)}
                className="px-4 py-1.5 bg-[#1e3a2f] text-white text-xs font-semibold rounded-lg hover:bg-[#294d3f] cursor-pointer"
              >
                Save Mapping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
