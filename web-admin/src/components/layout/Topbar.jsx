import React from 'react';
import { Menu, Bell, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Topbar = ({ onMenuClick }) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-20 px-6 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      {/* Left section: Hamburger for mobile & page context */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">SuperAdmin Management Portal</h2>
          <p className="text-xs text-slate-500 hidden sm:block">Kelola seluruh tenant, masa trial, dan transaksi platform SaaS</p>
        </div>
      </div>

      {/* Right section: System Status & User Profile */}
      <div className="flex items-center gap-3">
        {/* System Online Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>TripEx Backend API Online</span>
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-xs">
            SA
          </div>
          <div className="hidden md:block text-left">
            <span className="block text-xs font-bold text-slate-800">{user?.name || 'Master SuperAdmin'}</span>
            <span className="block text-[10px] font-semibold text-primary uppercase">Super Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
