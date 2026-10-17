/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import { ActiveNavScreen, MiningJob, MiningAlgorithm, ExecutionMode } from './types/mining';
import { getScreenFromPathname, syncBrowserUrl } from './utils/navigationRouter';
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
import { RegisterView } from './features/auth/components/RegisterView';
import { ActivateView } from './features/auth/components/ActivateView';
import { ProfileView } from './features/auth/components/ProfileView';
import { CustomerStorefrontView } from './features/customer/components/CustomerStorefrontView';
import { MerchandiserRecommendationsView } from './features/merchandiser/components/MerchandiserRecommendationsView';
import { ReviewApproveGroupView } from './features/merchandiser/components/ReviewApproveGroupView';
import { PublishedCampaignStatusView } from './features/merchandiser/components/PublishedCampaignStatusView';
import { CampaignDraftPublishView } from './features/merchandiser/components/CampaignDraftPublishView';
import { UtilityProfileView } from './features/merchandiser/components/UtilityProfileView';
import { RefineCriteriaView } from './features/merchandiser/components/RefineCriteriaView';
import { ABSimulationSetupView } from './features/merchandiser/components/ABSimulationSetupView';
import { CompareABSimulationView } from './features/merchandiser/components/CompareABSimulationView';
import { KeepLayoutAReviewView } from './features/merchandiser/components/KeepLayoutAReviewView';
import { AccessRestrictedView } from './features/auth/components/AccessRestrictedView';
import { authService, AuthUser } from './services/authService';
import { initialProducts } from './mocks/storeInventoryData';
import { ProductItem } from './types/storeInventory';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const [currentScreen, setCurrentScreen] = useState<ActiveNavScreen>(() => {
    const screenFromUrl = typeof window !== 'undefined' ? getScreenFromPathname(window.location.pathname) : null;
    if (screenFromUrl) {
      return screenFromUrl;
    }
    const user = authService.getCurrentUser();
    // Default to login page if unauthenticated
    return user ? user.defaultScreen : 'login';
  });

  const [activeRunId, setActiveRunId] = useState<string>('#0024');
  const [jobs, setJobs] = useState<MiningJob[]>(initialMiningJobs);
  const [storeProducts, setStoreProducts] = useState<ProductItem[]>(initialProducts);
  const [editingProductId, setEditingProductId] = useState<string>('prod-001');

  // Synchronize browser URL bar on load and handle back/forward browser buttons
  useEffect(() => {
    syncBrowserUrl(currentScreen, true);

    const handlePopState = () => {
      const screenFromUrl = getScreenFromPathname(window.location.pathname);
      if (screenFromUrl) {
        setCurrentScreen(screenFromUrl);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const selectedJob = jobs.find((j) => j.runId === activeRunId) || jobs[0];

  const handleNavigate = (screen: ActiveNavScreen, runId?: string) => {
    if (runId) {
      setActiveRunId(runId);
    }
    syncBrowserUrl(screen);
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditProduct = (prod: ProductItem) => {
    setEditingProductId(prod.id);
    syncBrowserUrl('store-edit-product');
    setCurrentScreen('store-edit-product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (user: AuthUser, destinationScreen: ActiveNavScreen) => {
    setCurrentUser(user);
    syncBrowserUrl(destinationScreen);
    setCurrentScreen(destinationScreen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    syncBrowserUrl('login');
    setCurrentScreen('login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSwitchRole = (roleKey: 'store-admin' | 'system-admin' | 'merchandiser' | 'customer') => {
    const roleScreens: Record<string, ActiveNavScreen> = {
      'store-admin': 'store-inventory',
      'system-admin': 'overview',
      'merchandiser': 'merchandiser-recommendations',
      'customer': 'customer-storefront'
    };
    const dest = roleScreens[roleKey] || 'overview';
    syncBrowserUrl(dest);
    setCurrentScreen(dest);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    syncBrowserUrl('results');
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
    syncBrowserUrl('results');
    setCurrentScreen('results');
  };

  // Determine breadcrumbs according to current screen & active user role
  const getBreadcrumbs = () => {
    switch (currentScreen) {
      case 'login':
        return ['Authentication', 'Sign In'];
      case 'customer-storefront':
        return ['Storefront Kiosk', 'Catalog & Basket'];

      // Merchandiser screen (Recommendations Dashboard - Single Page)
      case 'merchandiser-recommendations':
        return ['Merchandiser', 'Operations'];
      case 'merchandiser-approve':
        return ['Merchandiser', 'Operations', 'Product Group Review'];
      case 'merchandiser-campaign-draft':
        return ['Merchandiser', 'Operations', 'Campaign Draft & Publish'];
      case 'merchandiser-campaign-status':
        return ['Merchandiser', 'Operations', 'Published / Waiting Campaign Status'];
      case 'merchandiser-utility-profile':
        return ['Merchandiser', 'Operations', 'Utility Profile & Priority Weights'];
      case 'merchandiser-refine-criteria':
        return ['Merchandiser', 'Operations', 'Rework / Refine Criteria'];
      case 'merchandiser-ab-simulation':
        return ['Merchandiser', 'Campaign Draft', 'A/B Simulation'];
      case 'merchandiser-compare-simulation':
        return ['Merchandiser', 'Campaign Draft', 'Compare A/B Simulation'];
      case 'merchandiser-keep-layout-a':
        return ['Merchandiser', 'Campaign Draft', 'Keep Layout A – Review'];

      // Store Operations views (Store Admin)
      case 'store-inventory':
        return [];
      case 'store-edit-product':
        return ['Products & Inventory', 'Edit Product'];
      case 'store-transactions':
        return [];
      case 'store-validation-issues':
        return ['Transaction Data Center', 'Validation Issues'];
      case 'store-campaigns':
        return [];
      case 'store-reports':
        return [];
      case 'store-ab-report':
        return ['Retail Performance Reports', 'A/B Test Report (O07)'];

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
      case 'profile':
        return ['Tài khoản', 'Hồ sơ & Cài đặt bảo mật'];
      default:
        return ['Platform', 'Workspace'];
    }
  };

  // 1. If currently on Login screen, render LoginView standalone full-screen
  if (currentScreen === 'login') {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        onNavigateRegister={() => {
          syncBrowserUrl('register');
          setCurrentScreen('register');
        }}
        onNavigateActivate={() => {
          syncBrowserUrl('activate');
          setCurrentScreen('activate');
        }}
      />
    );
  }

  // 1b. If currently on Register screen, render RegisterView standalone full-screen
  if (currentScreen === 'register') {
    return (
      <RegisterView
        onRegisterSuccess={handleLoginSuccess}
        onNavigateLogin={() => {
          syncBrowserUrl('login');
          setCurrentScreen('login');
        }}
      />
    );
  }

  // 1c. If currently on Activate screen, render ActivateView standalone full-screen
  if (currentScreen === 'activate') {
    return (
      <ActivateView
        onNavigateLogin={() => {
          syncBrowserUrl('login');
          setCurrentScreen('login');
        }}
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
      {currentUser && !authService.isScreenAllowed(currentUser, currentScreen) ? (
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

          {/* Merchandiser: Review & Approve Product Group */}
          {currentScreen === 'merchandiser-approve' && (
            <ReviewApproveGroupView onNavigate={handleNavigate} />
          )}

          {/* Merchandiser: Campaign Draft & Publish */}
          {currentScreen === 'merchandiser-campaign-draft' && (
            <CampaignDraftPublishView onNavigate={handleNavigate} />
          )}

          {/* Merchandiser: Published / Waiting Campaign Status */}
          {currentScreen === 'merchandiser-campaign-status' && (
            <PublishedCampaignStatusView onNavigate={handleNavigate} />
          )}

          {/* Merchandiser: Utility Profile & Priority Weights */}
          {currentScreen === 'merchandiser-utility-profile' && (
            <UtilityProfileView onNavigate={handleNavigate} />
          )}

          {/* Merchandiser: Rework / Refine Criteria */}
          {currentScreen === 'merchandiser-refine-criteria' && (
            <RefineCriteriaView onNavigate={handleNavigate} />
          )}

          {/* Merchandiser: A/B Simulation Setup */}
          {currentScreen === 'merchandiser-ab-simulation' && (
            <ABSimulationSetupView onNavigate={handleNavigate} />
          )}

          {/* Merchandiser: Compare A/B Simulation */}
          {currentScreen === 'merchandiser-compare-simulation' && (
            <CompareABSimulationView onNavigate={handleNavigate} />
          )}

          {/* Merchandiser: Keep Layout A Review */}
          {currentScreen === 'merchandiser-keep-layout-a' && (
            <KeepLayoutAReviewView onNavigate={handleNavigate} />
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

          {/* Account Profile & Security Settings */}
          {currentScreen === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              onNavigateBack={() => handleNavigate(currentUser?.defaultScreen || 'overview')}
              onLogout={handleLogout}
            />
          )}
        </>
      )}
    </AppLayout>
  );
}
