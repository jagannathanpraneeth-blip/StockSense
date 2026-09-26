import React, { useEffect, useState } from 'react';
import { Menu, Activity, Server, Database } from 'lucide-react';
import { getHealth } from '../../api/client';
import { Badge } from '../common/Badge';

interface HeaderProps {
  onToggleMobile: () => void;
  pageTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobile, pageTitle }) => {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      try {
        await getHealth();
        if (mounted) setBackendOnline(true);
      } catch {
        if (mounted) setBackendOnline(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Backend & DB status indicators */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-600">
            <Database className="w-3.5 h-3.5 text-purple-600" />
            <span>SQLite Local</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100/80 border border-slate-200 text-xs font-medium">
            <Server className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600">API:</span>
            {backendOnline === true && (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
            )}
            {backendOnline === false && (
              <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Offline
              </span>
            )}
            {backendOnline === null && (
              <span className="text-slate-400">Connecting...</span>
            )}
          </div>
        </div>

        <Badge variant="purple" size="md">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-purple-600" />
            Stage 2 Verified
          </span>
        </Badge>
      </div>
    </header>
  );
};
