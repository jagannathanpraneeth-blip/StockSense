import React, { useState } from 'react';
import {
  Boxes,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';
import { useToast } from '../components/common/Toast';

export const AuthPage: React.FC = () => {
  const { login, signup } = useAuth();
  const { showSuccess } = useToast();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const demoAccounts = [
    {
      role: 'Manager',
      name: 'Alex Morgan',
      email: 'manager@stocksense.local',
      pass: 'Manager123!',
      color: 'border-purple-200 bg-purple-50/70 hover:bg-purple-100/70 text-purple-950',
      badge: 'bg-purple-600 text-white',
    },
    {
      role: 'Admin',
      name: 'System Admin',
      email: 'admin@stocksense.local',
      pass: 'Admin123!',
      color: 'border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-950',
      badge: 'bg-indigo-600 text-white',
    },
    {
      role: 'Staff',
      name: 'Jordan Lee',
      email: 'staff@stocksense.local',
      pass: 'Staff123!',
      color: 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-950',
      badge: 'bg-emerald-600 text-white',
    },
  ];

  const fillDemoAccount = (acc: typeof demoAccounts[0]) => {
    setMode('login');
    setEmail(acc.email);
    setPassword(acc.pass);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login({ email: email.trim(), password });
        showSuccess('Welcome back to StockSense!');
      } else {
        if (!name.trim()) {
          setError('Please enter your full name');
          setLoading(false);
          return;
        }
        await signup({ name: name.trim(), email: email.trim(), password });
        showSuccess('Account registered and logged in successfully!');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 items-center">
        {/* Left Branding & Demo Accounts */}
        <div className="lg:col-span-6 space-y-6 text-white p-2 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Boxes className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-2xl tracking-tight text-white">StockSense</span>
                <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 rounded border border-purple-500/40">
                  Stage 2
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Modular Inventory Management System • Odoo</p>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Precision Real-Time Inventory Control
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Enterprise-grade stock management featuring 4-decimal precision arithmetic, incoming receipts validation, immutable stock ledger, and session security.
            </p>
          </div>

          {/* Demo Logins Box */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4.5 space-y-3 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Quick Demo Accounts
              </span>
              <span className="text-[11px] text-slate-400">Click to autofill</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemoAccount(acc)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-left group ${acc.color}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${acc.badge}`}>
                      {acc.role}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{acc.name}</p>
                      <p className="text-[11px] text-slate-500">{acc.email}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-purple-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    Fill &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Auth Card */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              {mode === 'login' ? 'Sign in to StockSense' : 'Register New User'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {mode === 'login'
                ? 'Enter your credentials to access the inventory workspace.'
                : 'Create an operator account. Privileged roles require admin assignment.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sam Fisher"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-900"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to Workspace' : 'Create Operator Account'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={email}
        onSuccessLogin={(resetEmail) => {
          setEmail(resetEmail);
          setMode('login');
        }}
      />
    </div>
  );
};
