import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, Mail, ShieldAlert, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('superadmin@eventflow.ai');
  const [password, setPassword] = useState('EventFlow@2026!');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email.trim(), password);
      const user = authService.getStoredUser();
      if (user?.role === 'ATTENDEE') {
        navigate('/user/home');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid administrator credentials. Access restricted.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('EventFlow@2026!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background soft ambient blue accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div
        id="login-card"
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 relative z-10"
      >
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-3 shadow-md">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
            EventFlow <span className="text-blue-600 font-mono text-xs px-1.5 py-0.5 bg-blue-50 rounded-md border border-blue-200 font-bold">AI</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Enterprise Crowd Telemetry & Command Center</p>
        </div>

        {/* Error banner */}
        {error && (
          <div
            id="login-error-alert"
            className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Administrator Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="input-login-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@eventflow.ai"
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-mono transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="input-login-password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-mono transition-all"
              />
            </div>
          </div>

          <button
            id="btn-submit-login"
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
          >
            <span>{isLoading ? 'Verifying Credentials...' : 'Authenticate & Enter Command Center'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Login Credentials Picker */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-blue-600" />
            <span>Pre-Configured System Accounts</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              id="btn-quickfill-superadmin"
              onClick={() => handleQuickFill('superadmin@eventflow.ai')}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 text-left transition-all cursor-pointer group shadow-xs"
            >
              <div className="text-[11px] font-bold text-blue-600 group-hover:text-blue-700">SUPER_ADMIN</div>
              <div className="text-[10px] text-slate-600 font-mono truncate">superadmin@eventflow.ai</div>
              <div className="text-[10px] text-slate-400 font-medium">Global Portal</div>
            </button>

            <button
              type="button"
              id="btn-quickfill-eventadmin"
              onClick={() => handleQuickFill('eventadmin@eventflow.ai')}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 text-left transition-all cursor-pointer group shadow-xs"
            >
              <div className="text-[11px] font-bold text-indigo-600 group-hover:text-indigo-700">EVENT_HEAD</div>
              <div className="text-[10px] text-slate-600 font-mono truncate">eventadmin@eventflow.ai</div>
              <div className="text-[10px] text-slate-400 font-medium">Live Ops Console</div>
            </button>

            <button
              type="button"
              id="btn-quickfill-attendee"
              onClick={() => handleQuickFill('attendee@eventflow.ai')}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 text-left transition-all cursor-pointer group shadow-xs"
            >
              <div className="text-[11px] font-bold text-emerald-600 group-hover:text-emerald-700">ATTENDEE</div>
              <div className="text-[10px] text-slate-600 font-mono truncate">attendee@eventflow.ai</div>
              <div className="text-[10px] text-slate-400 font-medium">Mobile App</div>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-3 font-medium">
            Password: <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-mono font-medium">EventFlow@2026!</code>
          </p>
        </div>
      </div>

      {/* Security notice footer */}
      <div className="mt-6 text-center text-xs text-slate-400 max-w-md">
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
          <span>Strict Role Enforcement. No public registration allowed.</span>
        </p>
      </div>
    </div>
  );
};
