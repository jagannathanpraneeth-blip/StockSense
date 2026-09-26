import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  Settings,
  LogOut,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type ActivePage =
  | 'dashboard'
  | 'products'
  | 'receipts'
  | 'deliveries'
  | 'transfers'
  | 'adjustments'
  | 'history'
  | 'settings'
  | 'profile';

interface SidebarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  mobileOpen,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, stage: 'Stage 3' },
    { id: 'products', label: 'Products & Stock', icon: Boxes, isWorking: true },
    { id: 'receipts', label: 'Incoming Receipts', icon: ArrowDownToLine, isWorking: true },
    { id: 'deliveries', label: 'Delivery Orders', icon: ArrowUpFromLine, stage: 'Stage 3' },
    { id: 'transfers', label: 'Internal Transfers', icon: ArrowLeftRight, stage: 'Stage 3' },
    { id: 'adjustments', label: 'Adjustments', icon: SlidersHorizontal, stage: 'Stage 3' },
    { id: 'history', label: 'Move History', icon: History, isWorking: true },
    { id: 'settings', label: 'Warehouse Settings', icon: Settings, isWorking: true },
  ];

  const handleNavClick = (id: ActivePage) => {
    onNavigate(id);
    onCloseMobile();
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-slate-900">StockSense</span>
                <span className="px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 rounded border border-purple-200">
                  Stage 2
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Modular IMS • Odoo</p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Inventory Operations
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id as ActivePage)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-purple-50 text-purple-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-purple-600' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.isWorking ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Active" />
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-400">
                    {item.stage}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Profile Area */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
          <div
            onClick={() => handleNavClick('profile')}
            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
              activePage === 'profile' ? 'bg-purple-100/70 text-purple-900' : 'hover:bg-slate-100'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-xs border border-purple-200 shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.name || 'User'}</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <ShieldCheck className="w-3 h-3 text-purple-600 shrink-0" />
                <span className="truncate">{user?.role?.replace('_', ' ') || 'Authenticated'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
            title="Sign out of StockSense"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
