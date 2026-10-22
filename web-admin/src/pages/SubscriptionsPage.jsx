import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Settings2, 
  Calendar, 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Tag,
  Sliders,
  RotateCcw,
  Ban
} from 'lucide-react';
import apiClient from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import LoadingView from '../components/common/LoadingView';
import toast from 'react-hot-toast';

export const SubscriptionsPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Plan Edit Modal
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    price: 50000,
    trial_days: 30,
    max_users: 50,
    is_active: true
  });
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

  // Tenant Subscription Manage Modal
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [subAction, setSubAction] = useState('ACTIVATE'); // ACTIVATE, EXTEND, SET_DATE, EXPIRE, CHANGE_PLAN
  const [subPlanId, setSubPlanId] = useState('');
  const [subDays, setSubDays] = useState(30);
  const [subCustomDate, setSubCustomDate] = useState('');
  const [subReason, setSubReason] = useState('');
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  const fetchPlans = async () => {
    setIsLoadingPlans(true);
    try {
      const response = await apiClient.get('/plans');
      if (response.data?.success) {
        setPlans(response.data.data);
      }
    } catch (error) {
      console.error('Gagal mengambil daftar paket SaaS:', error);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const response = await apiClient.get('/subscriptions', { params });
      if (response.data?.success) {
        setSubscriptions(response.data.data);
        setMeta(response.data.meta);
      }
    } catch (error) {
      toast.error('Gagal mengambil daftar langganan tenant');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchSubscriptions();
  };

  const formatIDR = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Open Plan Price Editor Modal
  const handleOpenEditPlan = (plan) => {
    setSelectedPlan(plan);
    setPlanForm({
      name: plan.name || 'TripEx Pro Monthly',
      price: plan.price || 50000,
      trial_days: plan.trial_days || 30,
      max_users: plan.max_users || 50,
      is_active: plan.is_active !== false
    });
    setIsPlanModalOpen(true);
  };

  // Save Plan Price Changes
  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;

    setIsSubmittingPlan(true);
    try {
      const response = await apiClient.patch(`/plans/${selectedPlan.id}`, {
        name: planForm.name,
        price: parseFloat(planForm.price),
        trial_days: parseInt(planForm.trial_days, 10),
        max_users: parseInt(planForm.max_users, 10),
        is_active: planForm.is_active
      });

      if (response.data?.success) {
        toast.success(`Tarif paket ${planForm.name} berhasil diperbarui menjadi ${formatIDR(planForm.price)} / bulan!`);
        setIsPlanModalOpen(false);
        fetchPlans();
        fetchSubscriptions();
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal memperbarui tarif paket';
      toast.error(msg);
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  // Open Tenant Subscription Action Modal
  const handleOpenManageSub = (sub) => {
    setSelectedSub(sub);
    setSubAction('EXTEND');
    setSubPlanId(sub.plan_id || (plans[0]?.id || ''));
    setSubDays(30);
    setSubCustomDate('');
    setSubReason('');
    setIsSubModalOpen(true);
  };

  // Save Tenant Subscription Changes
  const handleSaveSub = async (e) => {
    e.preventDefault();
    if (!selectedSub?.company?.id) return;

    setIsSubmittingSub(true);
    try {
      const payload = {
        action: subAction,
        plan_id: subPlanId || undefined,
        days: subDays,
        customEndDate: subCustomDate || undefined,
        reason: subReason || 'Penyesuaian paket langganan oleh SuperAdmin'
      };

      const response = await apiClient.patch(`/companies/${selectedSub.company.id}/subscription`, payload);
      if (response.data?.success) {
        toast.success(`Status langganan ${selectedSub.company.name} berhasil diperbarui!`);
        setIsSubModalOpen(false);
        fetchSubscriptions();
        fetchPlans();
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal mengubah paket langganan mitra';
      toast.error(msg);
    } finally {
      setIsSubmittingSub(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pengaturan & Monitoring Paket Langganan</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Atur harga tarif bulanan SaaS, kelola kuota paket, dan perpanjang masa aktif tenant mitra.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchPlans();
              fetchSubscriptions();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SAAS PLAN PRICING MANAGEMENT CARDS                        */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden flex flex-col justify-between group hover:border-primary/50 transition-all"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider">
                  {plan.code}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  plan.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {plan.is_active ? 'Aktif Dijual' : 'Non-aktif'}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-base">{plan.name}</h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Masa uji coba default: <span className="font-semibold text-slate-700">{plan.trial_days || 30} Hari</span>
              </p>

              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Tarif Langganan Bulanan</span>
                  <div className="text-xl font-black text-slate-900">
                    {formatIDR(plan.price)}
                    <span className="text-xs font-normal text-slate-500 ml-1">/ bulan</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">Mitra Aktif</span>
                  <span className="font-bold text-primary text-sm">{plan.activeSubscribers || 0} Tenant</span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                <span>Maks: <strong className="text-slate-700">{plan.max_users || 'Unlimited'} User</strong></span>
                <span>•</span>
                <span>Interval: <strong className="text-slate-700 uppercase">{plan.billing_interval || 'MONTHLY'}</strong></span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => handleOpenEditPlan(plan)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Atur Tarif & Harga Paket</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { label: 'Semua Paket', value: '' },
            { label: 'Trial', value: 'TRIAL' },
            { label: 'Aktif Berlangganan', value: 'ACTIVE' },
            { label: 'Expired', value: 'EXPIRED' }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === tab.value
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama perusahaan..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50/50"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <LoadingView message="Memuat data paket langganan tenant..." />
        ) : subscriptions.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <CreditCard className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-semibold text-sm">Tidak ada data langganan yang cocok</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Nama Perusahaan</th>
                  <th className="py-3.5 px-4">Paket Langganan</th>
                  <th className="py-3.5 px-4">Tarif</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Periode / Berakhir</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => {
                  const plan = sub.plan || {};
                  const company = sub.company || {};
                  const isTrial = sub.status === 'TRIAL';
                  const endDate = isTrial ? sub.trial_ends_at : sub.current_period_end;

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{company.name || 'Tenant'}</div>
                        <div className="text-slate-400 text-[11px]">{company.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{plan.name || 'TripEx PRO Monthly'}</div>
                        <div className="text-slate-400 text-[11px]">Batas {plan.max_users || 50} Pengguna</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatIDR(plan.price || 50000)} / bln
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-700">
                          {endDate ? new Date(endDate).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          {isTrial ? 'Masa Uji Coba Berakhir' : 'Jadwal Renewal Tagihan'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenManageSub(sub)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          <span>Atur Langganan</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs">
            <span className="text-slate-500">
              Halaman <span className="font-bold">{meta.page}</span> dari {meta.totalPages} (Total {meta.total} Langganan)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: ATUR HARGA PAKET SAAS (HARGA PER BULAN)          */}
      {/* ========================================================= */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title="Pengaturan Tarif Paket SaaS"
        subtitle={`Ubah harga bulanan dan ketentuan paket ${selectedPlan?.name}`}
      >
        <form onSubmit={handleSavePlan} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Paket Langganan
            </label>
            <input
              type="text"
              required
              value={planForm.name}
              onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Tarif / Harga Per Bulan (IDR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={planForm.price}
                onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                className="w-full pl-10 pr-3 py-2 text-sm font-bold text-slate-900 rounded-xl border border-slate-200 focus:border-primary"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Harga ini akan digunakan sebagai nominal tagihan checkout Midtrans setiap 30 hari.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Masa Trial Default (Hari)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                required
                value={planForm.trial_days}
                onChange={(e) => setPlanForm({ ...planForm, trial_days: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batas Pengguna / Staf
              </label>
              <input
                type="number"
                min="1"
                value={planForm.max_users}
                onChange={(e) => setPlanForm({ ...planForm, max_users: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="plan_is_active"
              checked={planForm.is_active}
              onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
              className="rounded text-primary focus:ring-primary h-4 w-4"
            />
            <label htmlFor="plan_is_active" className="text-xs font-medium text-slate-700 cursor-pointer">
              Paket Aktif & Tersedia untuk Registrasi Baru
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPlanModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingPlan}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmittingPlan ? 'Menyimpan...' : 'Simpan Perubahan Tarif'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: ATUR LANGGANAN TENANT MITRA                      */}
      {/* ========================================================= */}
      <Modal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        title="Pengaturan Langganan Tenant"
        subtitle={`Ubah paket & masa aktif langganan untuk ${selectedSub?.company?.name}`}
      >
        <form onSubmit={handleSaveSub} className="space-y-4">
          {/* Action Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Aksi Langganan
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSubAction('ACTIVATE')}
                className={`p-3 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                  subAction === 'ACTIVATE'
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-800'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Aktivasi Langganan</span>
                </div>
                <p className="text-[11px] font-normal text-slate-500">Langsung aktifkan status ACTIVE</p>
              </button>

              <button
                type="button"
                onClick={() => setSubAction('EXTEND')}
                className={`p-3 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                  subAction === 'EXTEND'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 font-bold">
                  <Plus className="w-4 h-4" />
                  <span>Perpanjang (+Hari)</span>
                </div>
                <p className="text-[11px] font-normal text-slate-500">Tambah durasi masa aktif</p>
              </button>

              <button
                type="button"
                onClick={() => setSubAction('SET_DATE')}
                className={`p-3 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                  subAction === 'SET_DATE'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 font-bold">
                  <Calendar className="w-4 h-4" />
                  <span>Tetapkan Tanggal</span>
                </div>
                <p className="text-[11px] font-normal text-slate-500">Pilih tanggal akhir kustom</p>
              </button>

              <button
                type="button"
                onClick={() => setSubAction('EXPIRE')}
                className={`p-3 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                  subAction === 'EXPIRE'
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 font-bold">
                  <Ban className="w-4 h-4 text-rose-600" />
                  <span>Hentikan / Expire</span>
                </div>
                <p className="text-[11px] font-normal text-slate-500">Ubah status menjadi EXPIRED</p>
              </button>
            </div>
          </div>

          {/* Plan Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pilih Paket Langganan
            </label>
            <select
              value={subPlanId}
              onChange={(e) => setSubPlanId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatIDR(p.price)} / bln
                </option>
              ))}
            </select>
          </div>

          {/* Conditional Duration Inputs */}
          {(subAction === 'ACTIVATE' || subAction === 'EXTEND') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Durasi Tambahan Hari
              </label>
              <div className="flex items-center gap-2">
                {[30, 60, 90, 365].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSubDays(d)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      subDays === d
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    +{d} Hari
                  </button>
                ))}
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={subDays}
                  onChange={(e) => setSubDays(parseInt(e.target.value, 10) || 1)}
                  className="w-20 px-3 py-1.5 text-xs rounded-xl border border-slate-200 text-center font-bold"
                />
              </div>
            </div>
          )}

          {subAction === 'SET_DATE' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Tanggal Berakhir Baru
              </label>
              <input
                type="date"
                required
                value={subCustomDate}
                onChange={(e) => setSubCustomDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Alasan / Catatan (Opsional)
            </label>
            <input
              type="text"
              value={subReason}
              onChange={(e) => setSubReason(e.target.value)}
              placeholder="Contoh: Paket promo mitra VIP atau sponsorship"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSubModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingSub}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmittingSub ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SubscriptionsPage;
