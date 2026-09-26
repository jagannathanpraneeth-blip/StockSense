import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider } from './components/common/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ActivePage } from './components/layout/Sidebar';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { DeliveriesPage } from './pages/DeliveriesPage';
import { TransfersPage } from './pages/TransfersPage';
import { AdjustmentsPage } from './pages/AdjustmentsPage';
import { MoveHistoryPage } from './pages/MoveHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { Boxes, RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const validPages = ['dashboard','products','receipts','deliveries','transfers','adjustments','history','settings','profile'];
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const navigate = useCallback((page: ActivePage) => {
    setActivePage(page);
    window.location.hash = page;
  }, []);
  useEffect(() => {
    const sync = () => {
      const page = window.location.hash.slice(1);
      setActivePage(validPages.includes(page) ? page as ActivePage : 'dashboard');
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4 animate-bounce">
          <Boxes className="w-7 h-7 text-white" />
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
          <span>Verifying StockSense secure session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage onNavigate={navigate} />;
      case 'products':
        return <ProductsPage />;
      case 'receipts':
        return <ReceiptsPage />;
      case 'deliveries':
        return <DeliveriesPage />;
      case 'transfers':
        return <TransfersPage />;
      case 'adjustments':
        return <AdjustmentsPage />;
      case 'history':
        return <MoveHistoryPage />;
      case 'settings':
        return <SettingsPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <ProductsPage />;
    }
  };

  return (
    <AppLayout activePage={activePage} onNavigate={navigate}>
      {renderContent()}
    </AppLayout>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
