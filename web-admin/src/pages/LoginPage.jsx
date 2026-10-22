import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const [email, setEmail] = useState('superadmin@tripex.id');
  const [password, setPassword] = useState('superadmin123');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    const success = await login(email, password);
    if (success) {
      navigate('/');
    }
  };

  const fillDefaultCredentials = () => {
    setEmail('superadmin@tripex.id');
    setPassword('superadmin123');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 flex items-center justify-center p-4 selection:bg-primary selection:text-white">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-100">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-slate-50 border border-slate-100 shadow-md mb-4">
            <img src="/logo.png" alt="TripEx Logo" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            TripEx <span className="text-primary font-bold">SuperAdmin</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Platform Master Management & Monitoring Portal
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email SuperAdmin
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@tripex.id"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50 hover:bg-white focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50 hover:bg-white focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-3.5 px-4 bg-primary hover:bg-primary-600 active:bg-primary-700 text-white font-bold rounded-xl text-sm shadow-md shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi Akun...</span>
              </>
            ) : (
              <>
                <span>Masuk ke SuperAdmin</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Fill Box */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={fillDefaultCredentials}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary font-medium transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Gunakan Akun Default (superadmin@tripex.id)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
