import React, { useState } from 'react';
import {
  Mail,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [showForgotModal, setShowForgotModal] = useState(false);

  if (!user) return null;

  const roleColors: Record<string, { badge: string; desc: string }> = {
    ADMIN: {
      badge: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      desc: 'Manage products, warehouses, and stock operations, including validation and physical counts.',
    },
    INVENTORY_MANAGER: {
      badge: 'bg-purple-100 text-purple-700 border-purple-200',
      desc: 'Full operational control over products, incoming stock receipts, internal movements, and adjustments.',
    },
    WAREHOUSE_STAFF: {
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      desc: 'Prepare stock documents, enter quantities, and perform picking and packing. A manager validates changes to stock.',
    },
  };

  const currentRoleInfo = roleColors[user.role] || roleColors['WAREHOUSE_STAFF'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Profile & Security</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your account identity, security credentials, and system permission levels.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-purple-500/20">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${currentRoleInfo.badge}`}
                >
                  {user.role.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {user.email}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account ID</span>
            <p className="font-mono text-xs font-bold text-slate-800 break-all">{user.id}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Status</span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Active</span>
            </div>
          </div>
        </div>

        {/* Role Privileges Box */}
        <div className="p-5 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <h4 className="text-sm font-bold text-purple-950">Role Permissions: {user.role.replace(/_/g, ' ')}</h4>
          </div>
          <p className="text-xs text-purple-900 leading-relaxed">{currentRoleInfo.desc}</p>
        </div>

        {/* Password & Security Section */}
        <div className="pt-2">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Account Password</p>
                <p className="text-xs text-slate-500">Reset your password via 6-digit OTP verification</p>
              </div>
            </div>
            <button
              onClick={() => setShowForgotModal(true)}
              className="py-2 px-3.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              Reset Password
            </button>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={user.email}
      />
    </div>
  );
};
