import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  Wallet, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  ArrowUpRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import apiClient from '../api/client';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import LoadingView from '../components/common/LoadingView';
import toast from 'react-hot-toast';

export const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/analytics/summary');
      if (response.data?.success) {
        setData(response.data.data);
      }
    } catch (error) {
      toast.error('Gagal mengambil ringkasan analitik');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return <LoadingView message="Menghitung statistik platform TripEx..." fullHeight />;
  }

  const kpi = data?.kpi || {};
  const companies = kpi.companies || {};
  const users = kpi.users || {};
  const financial = kpi.financial || {};

  // Chart Data: Status Distribution
  const statusPieData = [
    { name: 'Masa Trial', value: companies.trial || 0, color: '#f59e0b' },
    { name: 'Aktif Berbayar', value: companies.active || 0, color: '#10b981' },
    { name: 'Kadaluarsa', value: companies.expired || 0, color: '#ef4444' },
    { name: 'Suspended', value: companies.suspended || 0, color: '#64748b' },
  ].filter(item => item.value > 0);

  // Fallback if empty
  if (statusPieData.length === 0) {
    statusPieData.push({ name: 'Belum Ada Data', value: 1, color: '#cbd5e1' });
  }

  // User Role Breakdown Chart Data
  const userBarData = [
    { role: 'Owner', count: users.owners || 0 },
    { role: 'Manager', count: users.managers || 0 },
    { role: 'Officer', count: users.officers || 0 },
  ];

  const formatIDR = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive SaaS Overview</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitoring kesehatan operasional, pertumbuhan tenant, dan pendapatan TripEx secara realtime.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* 4 Core KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Perusahaan / Tenant"
          value={companies.total || 0}
          subtitle={`${companies.trial || 0} dalam masa trial, ${companies.active || 0} berbayar`}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Total Pengguna Platform"
          value={users.total || 0}
          subtitle={`${users.owners || 0} Owner, ${users.officers || 0} Petugas lapangan`}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Total Pendapatan Terbayar"
          value={formatIDR(financial.totalRevenue)}
          subtitle={`${financial.totalPaidTransactions || 0} transaksi berhasil`}
          icon={Wallet}
          color="emerald"
        />
        <StatCard
          title="Estimasi MRR (Bulanan)"
          value={formatIDR(financial.estimatedMRR)}
          subtitle="Berdasarkan tenant berlangganan aktif"
          icon={TrendingUp}
          color="amber"
        />
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Pie Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Distribusi Status Tenant</h3>
          <p className="text-xs text-slate-500 mt-0.5">Komposisi trial, berlangganan, dan expired</p>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val, name) => [`${val} Perusahaan`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs mt-2">
            {statusPieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 font-medium">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* User Role Distribution Bar Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900">Struktur Pengguna Berdasarkan Role</h3>
          <p className="text-xs text-slate-500 mt-0.5">Jumlah akun Owner, Manager, dan Officer di seluruh tenant</p>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userBarData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="role" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  formatter={(val) => [`${val} Pengguna`, 'Jumlah']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 px-2">
            <span>Total Pengguna: {users.total || 0} akun</span>
            <Link to="/companies" className="text-primary hover:underline font-semibold flex items-center gap-1">
              <span>Kelola di Menu Perusahaan</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2 Quick Summary Tables: Recent Companies & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Companies */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Perusahaan Baru Terdaftar</h3>
              <p className="text-xs text-slate-500">Tenant terbaru yang mendaftar ke TripEx</p>
            </div>
            <Link to="/companies" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              <span>Lihat Semua</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Nama Perusahaan</th>
                  <th className="py-2.5 px-3">Email Kontak</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.recentCompanies || []).map((comp) => (
                  <tr key={comp.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-semibold text-slate-900">{comp.name}</td>
                    <td className="py-3 px-3 text-slate-500">{comp.email}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={comp.status} size="sm" />
                    </td>
                  </tr>
                ))}
                {(!data?.recentCompanies || data.recentCompanies.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">Belum ada data perusahaan</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Transaksi Masuk Terkini</h3>
              <p className="text-xs text-slate-500">Riwayat pembayaran paket langganan</p>
            </div>
            <Link to="/payments" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              <span>Lihat Semua</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Perusahaan</th>
                  <th className="py-2.5 px-3">Nominal</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.recentPayments || []).map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-semibold text-slate-900">{pay.company?.name || 'Tenant'}</td>
                    <td className="py-3 px-3 font-bold text-emerald-600">{formatIDR(pay.amount)}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={pay.status} size="sm" />
                    </td>
                  </tr>
                ))}
                {(!data?.recentPayments || data.recentPayments.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">Belum ada transaksi pembayaran</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
