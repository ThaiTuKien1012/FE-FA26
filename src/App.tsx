/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { ActiveNavScreen, MiningJob, MiningAlgorithm, ExecutionMode } from './types/mining';
import { initialMiningJobs } from './mocks/miningData';
import { AppLayout } from './components/layout/AppLayout';
import { MiningOverviewView } from './features/mining/components/overview/MiningOverviewView';
import { MiningSetupView } from './features/mining/components/setup/MiningSetupView';
import { MiningResultsView } from './features/mining/components/results/MiningResultsView';
import { MiningFailureView } from './features/mining/components/failure/MiningFailureView';
import { MiningBenchmarkView } from './features/mining/components/benchmark/MiningBenchmarkView';
import { UsersRolesView } from './features/users/components/UsersRolesView';
import { ApiConnectionsView } from './features/integrations/components/ApiConnectionsView';
import { ProductInventoryView } from './features/store/components/ProductInventoryView';
import { EditProductView } from './features/store/components/EditProductView';
import { StoreTransactionsView } from './features/store/components/StoreTransactionsView';
import { StoreValidationIssuesView } from './features/store/components/StoreValidationIssuesView';
import { StoreCampaignsView } from './features/store/components/StoreCampaignsView';
import { StoreReportsView } from './features/store/components/StoreReportsView';
import { StoreABReportView } from './features/store/components/StoreABReportView';
import { LoginView } from './features/auth/components/LoginView';
import { CustomerStorefrontView } from './features/customer/components/CustomerStorefrontView';
import { MerchandiserRecommendationsView } from './features/merchandiser/components/MerchandiserRecommendationsView';
import { AccessRestrictedView } from './features/auth/components/AccessRestrictedView';
import { authService, AuthUser } from './services/authService';
import { initialProducts } from './mocks/storeInventoryData';
import { ProductItem } from './types/storeInventory';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const [currentScreen, setCurrentScreen] = useState<ActiveNavScreen>(() => {
    const user = authService.getCurrentUser();
    // Default to login page so the user can immediately test the 4-role mock API login
    return user ? user.defaultScreen : 'login';
  });

  const [activeRunId, setActiveRunId] = useState<string>('#0024');
  const [jobs, setJobs] = useState<MiningJob[]>(initialMiningJobs);
  const [storeProducts, setStoreProducts] = useState<ProductItem[]>(initialProducts);
  const [editingProductId, setEditingProductId] = useState<string>('prod-001');

  const selectedJob = jobs.find((j) => j.runId === activeRunId) || jobs[0];

  const handleNavigate = (screen: ActiveNavScreen, runId?: string) => {
    if (runId) {
      setActiveRunId(runId);
    }
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditProduct = (prod: ProductItem) => {
    setEditingProductId(prod.id);
    setCurrentScreen('store-edit-product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (user: AuthUser, destinationScreen: ActiveNavScreen) => {
    setCurrentUser(user);
    setCurrentScreen(destinationScreen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setCurrentScreen('login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSwitchRole = async (roleKey: 'store-admin' | 'system-admin' | 'merchandiser' | 'customer') => {
    const res = await authService.quickLogin(roleKey);
    if (res.success && res.user && res.redirectScreen) {
      setCurrentUser(res.user);
      setCurrentScreen(res.redirectScreen);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleRunMining = (config: {
    algorithm: MiningAlgorithm;
    dataset: string;
    minUtil: number;
    mode: ExecutionMode;
  }) => {
    const nextRunNum = jobs.length + 22;
    const newRunId = `#00${nextRunNum}`;
    const newJob: MiningJob = {
      id: `run-${nextRunNum}`,
      runId: newRunId,
      algorithm: config.algorithm,
      dataset: config.dataset,
      utilityMatrixVersion: 'v1',
      minUtil: config.minUtil,
      executionMode: config.mode,
      startedAt: 'Just now',
      duration: '7.9s',
      peakMemoryMB: config.algorithm === 'EFIM' ? 124 : 260,
      itemsetCount: config.algorithm === 'EFIM' ? 142 : 128,
      status: 'Completed'
    };

    setJobs([newJob, ...jobs]);
    setActiveRunId(newRunId);
    setCurrentScreen('results');
  };

  const handleRetryFailedJob = () => {
    const nextRunNum = jobs.length + 22;
    const newRunId = `#00${nextRunNum}`;
    const retriedJob: MiningJob = {
      id: `run-${nextRunNum}`,
      runId: newRunId,
      algorithm: 'EFIM',
      dataset: 'retail_transactions_2024.parquet',
      utilityMatrixVersion: 'v1.4',
      minUtil: 0.05,
      executionMode: 'manual',
      startedAt: 'Just now',
      duration: '4.2s',
      peakMemoryMB: 182,
      itemsetCount: 112,
      status: 'Completed'
    };

    setJobs([retriedJob, ...jobs]);
    setActiveRunId(newRunId);
    setCurrentScreen('results');
  };

  // Determine breadcrumbs according to current screen & active user role
  const getBreadcrumbs = () => {
    switch (currentScreen) {
      case 'login':
        return ['Authentication', 'Multi-Role Mock API Sign In'];
      case 'customer-storefront':
        return ['Storefront Kiosk', 'Catalog & Basket'];

      // Merchandiser screen (Recommendations Dashboard - Single Page)
      case 'merchandiser-recommendations':
        return ['Merchandiser', 'Operations'];

      // Store Operations views (Store Admin)
      case 'store-inventory':
        return ['Store Operations', 'Product Management', 'Products & Inventory'];
      case 'store-edit-product':
        return ['Store Operations', 'Product Management', 'Edit Product'];
      case 'store-transactions':
        return ['Store Operations', 'Transactions', 'Transaction Data Center'];
      case 'store-validation-issues':
        return ['Store Operations', 'Transaction Data Center', 'Validation Issues'];
      case 'store-campaigns':
        return ['Store Operations', 'Campaigns', 'Campaign Activation Review'];
      case 'store-reports':
        return ['Store Operations', 'Reports', 'Retail Performance Reports'];
      case 'store-ab-report':
        return ['Store Operations', 'Reports', 'A/B Test Report (O07)'];

      // F01 System Admin screens
      case 'overview':
        return ['System Administration', 'Mining Service Overview'];
      case 'setup':
        return ['System Administration', 'Mining Setup', 'Algorithm Configuration'];
      case 'results':
        return ['System Administration', 'Mining Setup', 'Run Results'];
      case 'failure':
        return ['System Administration', 'Mining Service Overview', 'Run Failure Diagnostic'];
      case 'benchmark':
        return ['System Administration', 'Benchmark', 'HUI-Miner vs EFIM'];
      case 'users':
        return ['System Administration', 'Accounts & Roles (RBAC)'];
      case 'api-connections':
        return ['System Administration', 'External Integrations & API Connections'];
      default:
        return ['Platform', 'Workspace'];
    }
  };

  // 1. If currently on Login screen, render LoginView standalone full-screen
  if (currentScreen === 'login') {
    return (
      <LoginView 
        onLoginSuccess={handleLoginSuccess}
        initialRoleKey={
          currentUser?.role === 'System Admin' 
            ? 'system-admin' 
            : currentUser?.role === 'Merchandiser' 
              ? 'merchandiser' 
              : currentUser?.role === 'End-Customer' 
                ? 'customer' 
                : 'store-admin'
        }
      />
    );
  }

  // 2. If Customer role on customer-storefront, render full-screen Kiosk
  if (currentScreen === 'customer-storefront') {
    return (
      <CustomerStorefrontView 
        products={storeProducts}
        user={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  // 3. For administrative roles (Store Admin, System Admin, Merchandiser), render within AppLayout
  return (
    <AppLayout
      currentScreen={currentScreen}
      onNavigate={handleNavigate}
      breadcrumbs={getBreadcrumbs()}
      activeRunId={activeRunId}
      currentUser={currentUser}
      onLogout={handleLogout}
      onSwitchRole={handleSwitchRole}
    >
      {/* RBAC Access Guard: If current screen is not allowed for user role */}
      {currentUser && !currentUser.allowedScreens.includes(currentScreen) ? (
        <AccessRestrictedView
          attemptedScreen={currentScreen}
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onSwitchRole={handleSwitchRole}
        />
      ) : (
        <>
          {/* Merchandiser: Single Recommendations Dashboard Screen */}
          {currentScreen === 'merchandiser-recommendations' && (
            <MerchandiserRecommendationsView 
              currentScreen={currentScreen}
              onNavigate={handleNavigate}
            />
          )}

          {/* F02: Store Admin - Product & Inventory */}
          {currentScreen === 'store-inventory' && (
        <ProductInventoryView 
          onNavigate={handleNavigate}
          products={storeProducts}
          setProducts={setStoreProducts}
          onEditProduct={handleEditProduct}
        />
      )}

      {/* F02: Store Admin - Edit Product Page */}
      {currentScreen === 'store-edit-product' && (
        <EditProductView 
          productId={editingProductId}
          onNavigate={handleNavigate}
          products={storeProducts}
          onProductUpdated={(updatedProd) => {
            setStoreProducts((prev) => prev.map((p) => p.id === updatedProd.id ? updatedProd : p));
          }}
          onProductDeleted={(prodId) => {
            setStoreProducts((prev) => prev.filter((p) => p.id !== prodId));
          }}
        />
      )}

      {/* F02: Store Admin - Transactions (Transaction Data Center) */}
      {currentScreen === 'store-transactions' && (
        <StoreTransactionsView onNavigate={handleNavigate} />
      )}

      {/* F02: Store Admin - Validation Issues */}
      {currentScreen === 'store-validation-issues' && (
        <StoreValidationIssuesView onNavigate={handleNavigate} />
      )}

      {/* F02 / Merchandiser: Campaigns (Activation Review) */}
      {currentScreen === 'store-campaigns' && (
        <StoreCampaignsView onNavigate={handleNavigate} />
      )}

      {/* F02 / Merchandiser: Reports */}
      {currentScreen === 'store-reports' && (
        <StoreReportsView onNavigate={handleNavigate} />
      )}

      {/* F02 / Merchandiser: O07 A/B Test Report */}
      {currentScreen === 'store-ab-report' && (
        <StoreABReportView onNavigate={handleNavigate} />
      )}

      {/* F01: Mining Overview */}
      {currentScreen === 'overview' && (
        <MiningOverviewView
          jobs={jobs}
          onNavigate={handleNavigate}
          onQuickRun={() => handleNavigate('setup')}
        />
      )}

      {/* F01: Mining Setup */}
      {currentScreen === 'setup' && (
        <MiningSetupView
          onNavigate={handleNavigate}
          onRunMining={handleRunMining}
        />
      )}

      {/* F01: Mining Results */}
      {currentScreen === 'results' && (
        <MiningResultsView
          job={selectedJob.status === 'Completed' ? selectedJob : (jobs.find(j => j.status === 'Completed') || jobs[1])}
          onNavigate={handleNavigate}
          onRerun={(j) => {
            setActiveRunId(j.runId);
            handleNavigate('setup');
          }}
        />
      )}

      {/* F01: Mining Failure */}
      {currentScreen === 'failure' && (
        <MiningFailureView
          job={selectedJob.status === 'Failed' ? selectedJob : (jobs.find(j => j.status === 'Failed') || jobs[0])}
          onNavigate={handleNavigate}
          onRetry={handleRetryFailedJob}
        />
      )}

      {/* F01: Benchmark */}
      {currentScreen === 'benchmark' && (
        <MiningBenchmarkView onNavigate={handleNavigate} />
      )}

      {/* System Admin: Users & Roles */}
      {currentScreen === 'users' && (
        <UsersRolesView />
      )}

      {/* System Admin: API Connections */}
      {currentScreen === 'api-connections' && (
        <ApiConnectionsView />
      )}
        </>
      )}
    </AppLayout>
  );
}
