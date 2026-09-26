import React, { useState } from 'react';
import { Sidebar, ActivePage } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  children: React.ReactNode;
}

const PAGE_TITLES: Record<ActivePage, string> = {
  dashboard: 'Inventory Dashboard',
  products: 'Product Management & Stock Levels',
  receipts: 'Incoming Stock Receipts',
  deliveries: 'Outgoing Delivery Orders',
  transfers: 'Internal Stock Transfers',
  adjustments: 'Physical Stock Adjustments',
  history: 'Stock Ledger & Move History',
  settings: 'Warehouse & Location Settings',
  profile: 'User Profile & System Access',
};

export const AppLayout: React.FC<AppLayoutProps> = ({
  activePage,
  onNavigate,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Workspace */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Header
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
          pageTitle={PAGE_TITLES[activePage] || 'StockSense'}
        />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
