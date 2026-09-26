import React, { useState } from 'react';
import { ToastProvider } from './components/common/Toast';
import { AppLayout } from './components/layout/AppLayout';
import { ActivePage } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { DeliveriesPage } from './pages/DeliveriesPage';
import { TransfersPage } from './pages/TransfersPage';
import { AdjustmentsPage } from './pages/AdjustmentsPage';
import { MoveHistoryPage } from './pages/MoveHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';

export const App: React.FC = () => {
  // Default to Products or Dashboard
  const [activePage, setActivePage] = useState<ActivePage>('products');

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActivePage} />;
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
    <ToastProvider>
      <AppLayout activePage={activePage} onNavigate={setActivePage}>
        {renderContent()}
      </AppLayout>
    </ToastProvider>
  );
};

export default App;
