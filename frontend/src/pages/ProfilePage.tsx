import React from 'react';
import { ShieldCheck, KeyRound, Info } from 'lucide-react';
import { Badge } from '../components/common/Badge';

export const ProfilePage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base border border-purple-200">
              AM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Alex Morgan</h2>
                <Badge variant="purple" size="sm">Local Manager</Badge>
              </div>
              <p className="text-xs text-slate-500">manager@stocksense.local</p>
            </div>
          </div>
          <Badge variant="neutral" size="md">Local Mode</Badge>
        </div>

        <div className="py-6 space-y-6">
          <div className="flex items-start gap-3 p-4 bg-purple-50/70 border border-purple-200/70 rounded-xl text-xs text-purple-900">
            <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-purple-950 mb-1">
                Authentication & Role-Based Access Control Notice
              </p>
              <p className="text-purple-800 leading-relaxed">
                StockSense Stage 1 is running in dedicated local development mode. User authentication, JWT sessions, OTP password reset, and multi-tenant user switches will be integrated in subsequent stages.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                System Role & Permissions
              </span>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-1">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Inventory Manager (Full Warehouse Operations)</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Planned Auth Features (Stage 2)
              </span>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-1">
                <KeyRound className="w-4 h-4 text-purple-600" />
                <span>OTP Password Reset & Sign-in</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
