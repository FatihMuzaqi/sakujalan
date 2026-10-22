import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  Receipt, 
  Settings, 
  ShieldCheck,
  Sparkles,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Perusahaan & Tenant', href: '/companies', icon: Building2 },
  { name: 'Paket Langganan', href: '/subscriptions', icon: CreditCard },
  { name: 'Transaksi Keuangan', href: '/payments', icon: Receipt },
  { name: 'Pengaturan', href: '/settings', icon: Settings },
];

export const Sidebar = ({ isOpen, onClose }) => {
  const { logout, user } = useAuth();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 border-r border-slate-800
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 h-20 border-b border-slate-800/80 bg-slate-950/40">
          <div className="w-10 h-10 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center">
            <img src="/logo.png" alt="TripEx Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-white tracking-tight">TripEx</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary text-white rounded-md uppercase tracking-wider">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">SaaS Management Portal</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
            Platform Menu
          </div>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                  ${isActive 
                    ? 'bg-primary text-white shadow-sm shadow-primary/30 font-semibold' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Trial Feature Highlight Box */}
        <div className="p-4 mx-4 mb-4 rounded-xl bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700/60 text-xs">
          <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Masa Uji Coba 30 Hari</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Anda dapat menambah, mereset, atau memperpanjang masa trial tenant di menu Perusahaan.
          </p>
        </div>

        {/* SuperAdmin User Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 text-primary-300 flex items-center justify-center font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-primary-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'SuperAdmin'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email || 'admin@tripex.id'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Keluar"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
