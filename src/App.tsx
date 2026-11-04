/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Layers } from 'lucide-react';
import { ActiveNavScreen } from './types/mining';
import { getScreenFromPathname, syncBrowserUrl } from './utils/navigationRouter';
import { AppLayout } from './components/layout/AppLayout';
import { UsersRolesView } from './features/users/components/UsersRolesView';
import { ApiConnectionsView } from './features/integrations/components/ApiConnectionsView';
import { ProductInventoryView } from './features/store/components/ProductInventoryView';
import { EditProductView } from './features/store/components/EditProductView';
import { StoreCategoriesView } from './features/store/components/StoreCategoriesView';
import { StoreBatchesView } from './features/store/components/StoreBatchesView';
import { LoginView } from './features/auth/components/LoginView';
import { ForgotPasswordView } from './features/auth/components/ForgotPasswordView';
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
import { F03WorkspaceView } from './features/f03/components/F03WorkspaceView';
import { ImportTransactionsView } from './features/f04/components/ImportTransactionsView';
import { ImportHistoryView } from './features/f04/components/ImportHistoryView';
import { SalesTransactionsView } from './features/f04/components/SalesTransactionsView';
import { isSystemMiningScreen, resolveSystemScreen, systemMiningView, systemScreenUrl } from './features/f05/f05.navigation';
import { F05WorkspaceView } from './features/f05/components/F05WorkspaceView';
import { authService, AuthUser } from './services/authService';
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

  const [storeProducts, setStoreProducts] = useState<ProductItem[]>([]);
  const [editingProductId, setEditingProductId] = useState<string>('prod-001');
  const isMiningScreen = isSystemMiningScreen(currentScreen);
  const needsAdminSession=isMiningScreen||['users','lambda-policy','api-connections'].includes(currentScreen);
  const scrollPositions = useRef<Partial<Record<ActiveNavScreen, number>>>({});

  useEffect(() => {
    const handleAvatarUpdated = (event: Event) => {
      const avatarUrl = (event as CustomEvent<string>).detail;
      setCurrentUser(previous => previous ? { ...previous, avatarUrl } : previous);
    };
    window.addEventListener('paspm-avatar-updated', handleAvatarUpdated);
    return () => window.removeEventListener('paspm-avatar-updated', handleAvatarUpdated);
  }, []);

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


  // Cover direct URLs, navigation and history after logout without rendering F05 for guests.
  useEffect(() => {
    if (needsAdminSession && !currentUser) {
      syncBrowserUrl('login', true);
      setCurrentScreen('login');
    }
  }, [currentScreen, currentUser, needsAdminSession]);

  useEffect(() => {
    if (currentUser?.role!=='System Admin') return;
    const target=resolveSystemScreen(currentScreen,window.location.search);
    const managed=isSystemMiningScreen(currentScreen)||['api-connections','f03-configuration','lambda-policy','users'].includes(currentScreen);
    if (!managed) return;
    const url=systemScreenUrl(target,window.location.search);
    if (window.location.pathname+window.location.search!==url) {
      window.history.replaceState({screen:target},'',url);
      setCurrentScreen(target);
      window.dispatchEvent(new Event('popstate'));
    }
  },[currentUser?.role,currentScreen]);

  const handleNavigate = (screen: ActiveNavScreen) => {
    scrollPositions.current[currentScreen] = window.scrollY;
    if (currentUser?.role==='System Admin') {
      const target=resolveSystemScreen(screen);
      window.history.pushState({screen:target},'',systemScreenUrl(target,window.location.search));
      setCurrentScreen(target);
      window.dispatchEvent(new Event('popstate'));
    } else {
      syncBrowserUrl(screen);
      setCurrentScreen(screen);
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollPositions.current[screen] ?? 0, behavior: 'auto' });
    });
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
      case 'f03-utility':
        return ['F03', 'Utility & Retail Planner'];
      case 'f03-expiry-window': return ['F03', 'Expiry Window'];
      case 'f03-configuration': return ['F03', 'Utility Configuration'];
      case 'f03-product-scores': return ['F03', 'Product Priority Scores'];
      case 'f03-preview': return ['F03', 'Utility Preview'];
      case 'f03-snapshot-detail': return ['F03', 'Snapshot Detail'];
      case 'f03-snapshot-matrix': return ['F03', 'Snapshot Matrix'];
      case 'f05-mining': return ['Product Analytics', 'High Utility Mining'];

      // Store Operations views (Store Admin)
      case 'store-inventory':
        return [];
      case 'store-edit-product':
        return ['Product Management', 'Edit Product'];
      case 'store-categories':
        return ['Store Admin', 'Category Management'];
      case 'store-batches':
        return ['Store Admin', 'Inventory Batches'];
      case 'f04-import-transactions':
        return ['Store Admin', 'Import Transactions'];
      case 'f04-import-history':
        return [currentUser?.role === 'Merchandiser' ? 'Merchandiser' : 'Store Admin', 'Import History'];
      case 'f04-transactions':
        return [currentUser?.role === 'Merchandiser' ? 'Merchandiser' : 'Store Admin', 'Sales Transactions'];

      // F01 System Admin screens
      case 'admin-run-mining': return ['Mining Engine Management', 'Run Mining'];
      case 'admin-mining-history': return ['Mining Engine Management', 'Mining History'];
      case 'lambda-policy': return ['System Management', 'Lambda Policy'];
      case 'overview':
        return ['Overview', 'Dashboard'];
      case 'setup':
        return ['Mining Engine Management', 'Algorithm Configuration'];
      case 'results':
        return ['System Administration', 'Mining Setup', 'Run Results'];
      case 'failure':
        return ['System Administration', 'Mining Service Overview', 'Run Failure Diagnostic'];
      case 'benchmark':
        return ['Mining Engine Management', 'Algorithm Benchmark'];
      case 'users':
        return ['System Administration', 'Accounts & Roles (RBAC)'];
      case 'api-connections':
        return ['Overview', 'Dashboard'];
      case 'profile':
        return ['Tài khoản', 'Hồ sơ & Cài đặt bảo mật'];
      default:
        return ['Platform', 'Workspace'];
    }
  };

  // 1. If currently on Login screen, render LoginView standalone full-screen
  if (currentScreen === 'login' || (!currentUser && (currentScreen === 'f04-transactions' || needsAdminSession))) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        onNavigateRegister={() => {
          syncBrowserUrl('register');
          setCurrentScreen('register');
        }}
        onNavigateForgotPassword={() => { syncBrowserUrl('forgot-password'); setCurrentScreen('forgot-password'); }}
        onNavigateActivate={() => {
          syncBrowserUrl('activate');
          setCurrentScreen('activate');
        }}
      />
    );
  }

  if (currentScreen === 'forgot-password') {
    return <ForgotPasswordView onNavigateLogin={() => { syncBrowserUrl('login'); setCurrentScreen('login'); }} />;
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
        onProfile={() => handleNavigate('profile')}
      />
    );
  }

  // 3. For administrative roles (Store Admin, System Admin, Merchandiser), render within AppLayout
  return (
    <AppLayout
      currentScreen={currentScreen}
      onNavigate={handleNavigate}
      breadcrumbs={getBreadcrumbs()}
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

          {currentScreen.startsWith('f03-') && <F03WorkspaceView currentUser={currentUser} section={currentScreen} />}

          {isMiningScreen && currentUser && <F05WorkspaceView key={currentUser.id} currentUser={currentUser} initialView={systemMiningView(currentScreen)} />}
          {currentScreen==='lambda-policy' && currentUser?.role==='System Admin' && <F03WorkspaceView currentUser={currentUser} section="f03-configuration" />}

          {/* F02: Store Admin - Product & Inventory */}
          {currentScreen === 'store-inventory' && (
            <ProductInventoryView
              onNavigate={handleNavigate}
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

          {/* F02: Store Admin - Categories */}
          {currentScreen === 'store-categories' && <StoreCategoriesView onNavigate={handleNavigate} />}

          {/* F02: Store Admin - Inventory Batches */}
          {currentScreen === 'store-batches' && <StoreBatchesView onNavigate={handleNavigate} />}

          {currentScreen === 'f04-import-transactions' && currentUser?.role === 'Store Admin' && (
            <ImportTransactionsView />
          )}
          {currentScreen === 'f04-import-history' && (currentUser?.role === 'Store Admin' || currentUser?.role === 'Merchandiser') && (
            <ImportHistoryView />
          )}
          {currentScreen === 'f04-transactions' && (currentUser?.role === 'Store Admin' || currentUser?.role === 'Merchandiser') && (
            <SalesTransactionsView />
          )}

          {/* System Admin: Users & Roles */}
          {currentScreen === 'users' && (
            <UsersRolesView />
          )}

          {/* System Admin: API Connections */}
          {currentScreen === 'api-connections' && currentUser?.role!=='System Admin' && (
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
