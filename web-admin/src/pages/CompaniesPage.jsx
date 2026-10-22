import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  Clock, 
  Sparkles, 
  Calendar, 
  ShieldAlert, 
  Eye, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Plus,
  RotateCcw,
  Ban,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  KeyRound,
  Copy,
  Check,
  EyeOff,
  CreditCard,
  Settings2
} from 'lucide-react';
import apiClient from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import LoadingView from '../components/common/LoadingView';
import toast from 'react-hot-toast';

export const CompaniesPage = () => {
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Selected company for Modals
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Trial Action State in Modal
  const [trialAction, setTrialAction] = useState('EXTEND'); // EXTEND, SET_DATE, RESET, EXPIRE
  const [trialDays, setTrialDays] = useState(14);
  const [customDate, setCustomDate] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [isSubmittingTrial, setIsSubmittingTrial] = useState(false);

  // Reset Password Modal State
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Subscription Action Modal State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subAction, setSubAction] = useState('ACTIVATE');
  const [subPlanId, setSubPlanId] = useState('');
  const [subDays, setSubDays] = useState(30);
  const [subCustomDate, setSubCustomDate] = useState('');
  const [subReason, setSubReason] = useState('');
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  // Status Action State (Suspend/Activate)
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);

  const fetchPlans = async () => {
    try {
      const response = await apiClient.get('/plans');
      if (response.data?.success) {
        setPlans(response.data.data);
      }
    } catch (e) {
      console.error('Failed to load plans:', e);
    }
  };

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const response = await apiClient.get('/companies', { params });
      if (response.data?.success) {
        setCompanies(response.data.data);
        setMeta(response.data.meta);
      }
    } catch (error) {
      toast.error('Gagal mengambil daftar perusahaan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCompanies();
  };

  const openTrialModal = (company) => {
    setSelectedCompany(company);
    setTrialAction('EXTEND');
    setTrialDays(14);
    setCustomDate('');
    setReasonNote('');
    setIsTrialModalOpen(true);
  };

  const openSubscriptionModal = (company) => {
    setSelectedCompany(company);
    setSubAction('ACTIVATE');
    setSubPlanId(company.subscriptionInfo?.planId || company.activeSubscription?.plan_id || (plans[0]?.id || ''));
    setSubDays(30);
    setSubCustomDate('');
    setSubReason('');
    setIsSubModalOpen(true);
  };

  const openDetailModal = async (company) => {
    setSelectedCompany(company);
    setIsDetailModalOpen(true);
    setIsLoadingDetails(true);
    try {
      const response = await apiClient.get(`/companies/${company.id}`);
      if (response.data?.success) {
        setCompanyDetails(response.data.data);
      }
    } catch (error) {
      toast.error('Gagal memuat detail perusahaan');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Open Reset Password Modal
  const openResetPasswordModal = (user, companyName = '') => {
    setResetTargetUser({
      ...user,
      companyName: companyName || selectedCompany?.name || 'Perusahaan Mitra'
    });
    setNewPassword('');
    setShowPassword(false);
    setCopied(false);
    setIsResetPasswordModalOpen(true);
  };

  // Generate strong random password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let generated = 'Saku';
    for (let i = 0; i < 6; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    generated += '26!';
    setNewPassword(generated);
    setShowPassword(true);
  };

  // Copy password to clipboard
  const handleCopyPassword = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    toast.success('Password disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Submit Password Reset
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetTargetUser || !newPassword) return;

    if (newPassword.trim().length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    setIsResettingPassword(true);
    try {
      let response;
      if (resetTargetUser.id) {
        response = await apiClient.post(`/users/${resetTargetUser.id}/reset-password`, {
          new_password: newPassword.trim()
        });
      } else if (resetTargetUser.companyId) {
        response = await apiClient.post(`/companies/${resetTargetUser.companyId}/reset-owner-password`, {
          new_password: newPassword.trim()
        });
      }

      if (response?.data?.success) {
        toast.success(`Password untuk ${resetTargetUser.name || resetTargetUser.email} berhasil direset!`);
        setIsResetPasswordModalOpen(false);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal mereset password akun';
      toast.error(msg);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleUpdateTrial = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;

    setIsSubmittingTrial(true);
    try {
      const payload = {
        action: trialAction,
        days: trialDays,
        customEndDate: customDate || undefined,
        reason: reasonNote || 'Perubahan masa trial oleh SuperAdmin'
      };

      const response = await apiClient.patch(`/companies/${selectedCompany.id}/trial`, payload);
      if (response.data?.success) {
        toast.success(`Masa trial untuk ${selectedCompany.name} berhasil diperbarui!`);
        setIsTrialModalOpen(false);
        fetchCompanies();
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal memperbarui masa trial';
      toast.error(msg);
    } finally {
      setIsSubmittingTrial(false);
    }
  };

  const handleSaveSubscription = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;

    setIsSubmittingSub(true);
    try {
      const payload = {
        action: subAction,
        plan_id: subPlanId || undefined,
        days: subDays,
        customEndDate: subCustomDate || undefined,
        reason: subReason || 'Pengaturan langganan oleh SuperAdmin'
      };

      const response = await apiClient.patch(`/companies/${selectedCompany.id}/subscription`, payload);
      if (response.data?.success) {
        toast.success(`Langganan ${selectedCompany.name} berhasil diatur!`);
        setIsSubModalOpen(false);
        fetchCompanies();
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal mengubah langganan mitra';
      toast.error(msg);
    } finally {
      setIsSubmittingSub(false);
    }
  };

  const handleToggleStatus = async (company, newStatus) => {
    const actionLabel = newStatus === 'SUSPENDED' ? 'menangguhkan (suspend)' : 'mengaktifkan kembali';
    if (!window.confirm(`Apakah Anda yakin ingin ${actionLabel} perusahaan ${company.name}?`)) {
      return;
    }

    setIsStatusSubmitting(true);
    try {
      const response = await apiClient.patch(`/companies/${company.id}/status`, {
        status: newStatus,
        reason: `Status diubah menjadi ${newStatus} oleh SuperAdmin`
      });
      if (response.data?.success) {
        toast.success(`Status ${company.name} berhasil diubah menjadi ${newStatus}`);
        fetchCompanies();
      }
    } catch (error) {
      toast.error('Gagal mengubah status perusahaan');
    } finally {
      setIsStatusSubmitting(false);
    }
  };

  const formatIDR = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const statusFilters = [
    { label: 'Semua Status', value: '' },
    { label: 'Masa Trial', value: 'TRIAL' },
    { label: 'Aktif Berbayar', value: 'ACTIVE' },
    { label: 'Kadaluarsa', value: 'EXPIRED' },
    { label: 'Suspended', value: 'SUSPENDED' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Perusahaan & Tenant</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola data tenant, atur perpanjangan langganan/trial, dan kelola reset password staf mitra.
          </p>
        </div>
        <button
          onClick={fetchCompanies}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {statusFilters.map((tab) => (
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

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, telp..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50/50"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <LoadingView message="Memuat daftar tenant perusahaan..." />
        ) : companies.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Building2 className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-semibold text-sm">Tidak ada perusahaan yang ditemukan</p>
            <p className="text-xs">Coba sesuaikan kata kunci pencarian atau filter status Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Nama Perusahaan</th>
                  <th className="py-3.5 px-4">Owner / Kontak</th>
                  <th className="py-3.5 px-4">Status Akun</th>
                  <th className="py-3.5 px-4">Masa Aktif / Trial</th>
                  <th className="py-3.5 px-4 text-center">Anggota</th>
                  <th className="py-3.5 px-4 text-right">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((comp) => {
                  const subInfo = comp.subscriptionInfo || {};
                  const status = subInfo.status || comp.status || 'TRIAL';
                  const isTrial = status === 'TRIAL';
                  const isActive = status === 'ACTIVE';
                  const isExpired = status === 'EXPIRED';
                  const daysRemaining = subInfo.daysRemaining !== undefined ? subInfo.daysRemaining : (comp.trialInfo?.daysRemaining || 0);
                  const endsAt = subInfo.endsAt || comp.trialInfo?.endsAt;

                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Company Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{comp.name}</div>
                        <div className="text-slate-400 text-[11px]">{comp.email}</div>
                      </td>

                      {/* Owner Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <span>{comp.owner?.name || 'Belum Terdaftar'}</span>
                          {comp.owner && (
                            <button
                              onClick={() => openResetPasswordModal(comp.owner, comp.name)}
                              title="Reset Password Owner"
                              className="text-amber-600 hover:text-amber-700 p-0.5 hover:bg-amber-50 rounded cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px]">{comp.owner?.email || '-'}</div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={status} />
                      </td>

                      {/* Masa Aktif / Trial Days Remaining */}
                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-bold text-xs w-fit ${
                              daysRemaining > 7 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : daysRemaining > 0 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Berlangganan: {daysRemaining > 0 ? `${daysRemaining} Hari Lagi` : 'Habis (0 Hari)'}</span>
                            </span>
                            {endsAt && (
                              <span className="text-[10px] text-slate-400">
                                s.d. {new Date(endsAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        ) : isTrial ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-bold text-xs w-fit ${
                              daysRemaining > 7 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : daysRemaining > 0 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>Trial: {daysRemaining > 0 ? `${daysRemaining} Hari Lagi` : 'Habis (0 Hari)'}</span>
                            </span>
                            {endsAt && (
                              <span className="text-[10px] text-slate-400">
                                s.d. {new Date(endsAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        ) : isExpired ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs w-fit">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Kadaluarsa (0 Hari)</span>
                            </span>
                            {endsAt && (
                              <span className="text-[10px] text-slate-400">
                                Berakhir: {new Date(endsAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">{status}</span>
                        )}
                      </td>

                      {/* Member Count */}
                      <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                        {comp.memberCount || 0} staf
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Atur Langganan Button */}
                          <button
                            onClick={() => openSubscriptionModal(comp)}
                            title="Atur / Perpanjang Langganan SaaS"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Atur Langganan</span>
                          </button>

                          {/* Atur Masa Trial Button */}
                          <button
                            onClick={() => openTrialModal(comp)}
                            title="Atur / Perpanjang Masa Trial"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Trial</span>
                          </button>

                          {/* Reset Password Shortcut for Owner */}
                          {comp.owner && (
                            <button
                              onClick={() => openResetPasswordModal(comp.owner, comp.name)}
                              title="Reset Password Akun Owner"
                              className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <KeyRound className="w-4 h-4 text-amber-600" />
                            </button>
                          )}

                          {/* View Detail Button */}
                          <button
                            onClick={() => openDetailModal(comp)}
                            title="Lihat Detail Lengkap"
                            className="p-1.5 text-slate-600 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Suspend / Activate Toggle */}
                          {comp.status === 'SUSPENDED' ? (
                            <button
                              onClick={() => handleToggleStatus(comp, 'ACTIVE')}
                              title="Aktifkan Kembali Perusahaan"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(comp, 'SUSPENDED')}
                              title="Tangguhkan (Suspend) Perusahaan"
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs">
            <span className="text-slate-500">
              Menampilkan Halaman <span className="font-bold text-slate-800">{meta.page}</span> dari {meta.totalPages} (Total {meta.total} Perusahaan)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: RESET PASSWORD AKUN MITRA / PENGGUNA             */}
      {/* ========================================================= */}
      <Modal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        title="Reset Password Akun Mitra"
        subtitle={`Atur password baru untuk ${resetTargetUser?.name || 'User'} (${resetTargetUser?.email || ''})`}
      >
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
          {/* Target User Info Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-slate-900 text-sm">{resetTargetUser?.name || 'Pengguna Mitra'}</p>
              <p className="text-slate-500 text-[11px]">{resetTargetUser?.email}</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Perusahaan: <strong>{resetTargetUser?.companyName}</strong></p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold text-[11px] uppercase">
              {resetTargetUser?.role || 'USER'}
            </span>
          </div>

          {/* New Password Input with Generator */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Password Baru
              </label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-700 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Buat Password Acak</span>
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ketik password baru (min. 6 karakter)..."
                className="w-full pl-3 pr-20 py-2.5 text-xs rounded-xl border border-slate-200 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <div className="absolute right-2 top-2 flex items-center gap-1">
                {newPassword && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    title="Salin Password"
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Setelah disimpan, berikan password baru ini kepada mitra untuk login ke aplikasi.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsResetPasswordModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isResettingPassword || !newPassword}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isResettingPassword ? 'Menyimpan...' : 'Terapkan Password Baru'}</span>
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
        title="Pengaturan Langganan Mitra"
        subtitle={`Atur status & masa aktif langganan ${selectedCompany?.name}`}
      >
        <form onSubmit={handleSaveSubscription} className="space-y-4">
          {/* Current Subscription Status Banner */}
          <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center gap-3 text-xs text-blue-900">
            <CreditCard className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-bold flex items-center gap-2">
                <span>Status: {selectedCompany?.subscriptionInfo?.status || selectedCompany?.status}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-200/60 font-semibold text-blue-800">
                  {selectedCompany?.subscriptionInfo?.planName || 'Paket Bulanan'}
                </span>
              </p>
              <p className="text-[11px] text-blue-800 mt-0.5">
                Masa Aktif:{' '}
                <span className="font-bold">
                  {selectedCompany?.subscriptionInfo?.daysRemaining !== undefined 
                    ? `${selectedCompany.subscriptionInfo.daysRemaining} Hari Lagi`
                    : `${selectedCompany?.trialInfo?.daysRemaining || 0} Hari`}
                </span>{' '}
                {selectedCompany?.subscriptionInfo?.endsAt && (
                  <span>
                    (Hingga {new Date(selectedCompany.subscriptionInfo.endsAt).toLocaleDateString('id-ID', { dateStyle: 'long' })})
                  </span>
                )}
              </p>
            </div>
          </div>

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
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Aktivasi Langganan</span>
                </div>
                <p className="text-[11px] font-normal text-slate-500">Status ACTIVE langsung</p>
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
                  <span>Tambah Hari (+N)</span>
                </div>
                <p className="text-[11px] font-normal text-slate-500">Perpanjang masa aktif</p>
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
                  <span>Paksa Expired</span>
                </div>
                <p className="text-[11px] font-normal text-slate-500">Nonaktifkan akses tulis</p>
              </button>
            </div>
          </div>

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

          {(subAction === 'ACTIVATE' || subAction === 'EXTEND') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jumlah Hari Tambahan
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
              Alasan / Catatan
            </label>
            <input
              type="text"
              value={subReason}
              onChange={(e) => setSubReason(e.target.value)}
              placeholder="Contoh: Paket kemitraan khusus atau sponsorship"
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

      {/* ========================================================= */}
      {/* MODAL 3: PENGATURAN MASA TRIAL 30 HARI                   */}
      {/* ========================================================= */}
      <Modal
        isOpen={isTrialModalOpen}
        onClose={() => setIsTrialModalOpen(false)}
        title="Pengaturan Masa Uji Coba (Trial)"
        subtitle={`Atur atau perpanjang masa trial untuk ${selectedCompany?.name}`}
      >
        <form onSubmit={handleUpdateTrial} className="space-y-5">
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center gap-3 text-xs text-amber-900">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-semibold">
                Status Saat Ini:{' '}
                <span className="font-bold">{selectedCompany?.subscriptionInfo?.status || selectedCompany?.status}</span>
              </p>
              <p className="text-[11px] text-amber-800">
                Sisa Masa Trial:{' '}
                <span className="font-bold">
                  {selectedCompany?.subscriptionInfo?.isTrial
                    ? `${selectedCompany.subscriptionInfo.daysRemaining} Hari`
                    : selectedCompany?.trialInfo?.daysRemaining !== undefined
                      ? `${selectedCompany.trialInfo.daysRemaining} Hari`
                      : '0 Hari'}
                </span>{' '}
                {selectedCompany?.trialInfo?.endsAt || selectedCompany?.subscriptionInfo?.endsAt ? (
                  <span>
                    (Hingga {new Date(selectedCompany.trialInfo?.endsAt || selectedCompany.subscriptionInfo?.endsAt).toLocaleDateString('id-ID', { dateStyle: 'long' })})
                  </span>
                ) : (
                  '(Belum diatur)'
                )}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Aksi Modifikasi
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTrialAction('EXTEND')}
                className={`p-3 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                  trialAction === 'EXTEND'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 font-bold">
                  <Plus className="w-4 h-4" />
                  <span>Tambah Hari (+N)</span>
                </div>
                <p className="text-[11px] font-normal text-slate-500">Perpanjang masa aktif trial</p>
              </button>

              <button
                type="button"
                onClick={() => setTrialAction('SET_DATE')}
                className={`p-3 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                  trialAction === 'SET_DATE'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 font-bold">
                  <Calendar className="w-4 h-4" />
                  <span>Tetapkan Tanggal</span>
                </div>
                <p className="text-[11px] font-normal text-slate-500">Pilih tanggal akhir spesifik</p>
              </button>

              <button
                type="button"
                onClick={() => setTrialAction('RESET')}
                className={`p-3 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                  trialAction === 'RESET'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 font-bold">
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset 30 Hari</span>
                </div>
                <p className="text-[11px] font-normal text-slate-500">Mulai ulang 30 hari dari hari ini</p>
              </button>

              <button
                type="button"
                onClick={() => setTrialAction('EXPIRE')}
                className={`p-3 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                  trialAction === 'EXPIRE'
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 font-bold">
                  <Ban className="w-4 h-4 text-rose-600" />
                  <span>Paksa Kadaluarsa</span>
                </div>
                <p className="text-[11px] font-normal text-slate-500">Akhiri masa uji coba sekarang</p>
              </button>
            </div>
          </div>

          {trialAction === 'EXTEND' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jumlah Hari Tambahan
              </label>
              <div className="flex items-center gap-2">
                {[7, 14, 30, 60].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTrialDays(d)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      trialDays === d
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
                  max="365"
                  value={trialDays}
                  onChange={(e) => setTrialDays(parseInt(e.target.value, 10) || 1)}
                  className="w-20 px-3 py-1.5 text-xs rounded-xl border border-slate-200 text-center font-bold"
                />
              </div>
            </div>
          )}

          {trialAction === 'SET_DATE' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Tanggal Berakhir Baru
              </label>
              <input
                type="date"
                required
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Alasan / Catatan Modifikasi (Opsional)
            </label>
            <input
              type="text"
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              placeholder="Contoh: Promo perpanjangan uji coba awal..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTrialModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingTrial}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-600 active:bg-primary-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmittingTrial ? 'Menyimpan...' : 'Simpan Perubahan Trial'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 4: DETAIL LENGKAP TENANT PERUSAHAAN                 */}
      {/* ========================================================= */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedCompany?.name || 'Detail Perusahaan'}
        subtitle="Informasi lengkap akun, anggota staf, dan riwayat transaksi"
        maxWidth="max-w-2xl"
      >
        {isLoadingDetails ? (
          <LoadingView message="Memuat detail profil perusahaan..." />
        ) : (
          <div className="space-y-5 text-xs">
            {/* Header Profil */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[11px]">Email Perusahaan</span>
                <span className="font-bold text-slate-800">{companyDetails?.company?.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">No. Telepon</span>
                <span className="font-bold text-slate-800">{companyDetails?.company?.phone || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Status Akun</span>
                <StatusBadge status={companyDetails?.subscriptionInfo?.status || companyDetails?.company?.status} size="sm" />
              </div>
            </div>

            {/* Subscription & Active Duration Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-blue-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span>Informasi Langganan & Masa Aktif</span>
                </span>
                <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-primary/10 text-primary">
                  {companyDetails?.subscriptionInfo?.planName || 'Paket Bulanan'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400 block text-[10px]">Masa Berlaku</span>
                  <span className="font-bold text-slate-800">
                    {companyDetails?.subscriptionInfo?.daysRemaining !== undefined 
                      ? `${companyDetails.subscriptionInfo.daysRemaining} Hari Lagi`
                      : '0 Hari'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tanggal Mulai</span>
                  <span className="font-semibold text-slate-700">
                    {companyDetails?.subscriptionInfo?.startedAt 
                      ? new Date(companyDetails.subscriptionInfo.startedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tanggal Berakhir</span>
                  <span className="font-semibold text-slate-700">
                    {companyDetails?.subscriptionInfo?.endsAt 
                      ? new Date(companyDetails.subscriptionInfo.endsAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })
                      : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Statistik Pemakaian */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100">
                <span className="text-blue-600 font-bold text-lg block">{companyDetails?.stats?.memberCount || 0}</span>
                <span className="text-slate-500 text-[11px]">Total Anggota</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-emerald-600 font-bold text-lg block">{companyDetails?.stats?.totalTrips || 0}</span>
                <span className="text-slate-500 text-[11px]">Total Perjalanan Dinas</span>
              </div>
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100">
                <span className="text-purple-600 font-bold text-lg block">{companyDetails?.stats?.totalExpenses || 0}</span>
                <span className="text-slate-500 text-[11px]">Total Transaksi Klaim</span>
              </div>
            </div>

            {/* Daftar Anggota dengan Tombol Reset Password */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-sm">
                <Users className="w-4 h-4 text-primary" />
                <span>Daftar Anggota & Staf ({companyDetails?.members?.length || 0})</span>
              </h4>
              <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100">
                {(companyDetails?.members || []).map((m) => (
                  <div key={m.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="font-bold text-slate-800 flex items-center gap-2">
                        <span>{m.user?.name || 'User'}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-[10px] text-slate-700">
                          {m.role}
                        </span>
                      </p>
                      <p className="text-slate-400 text-[11px]">{m.user?.email}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (m.user) {
                            openResetPasswordModal(m.user, selectedCompany?.name);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        <span>Reset Password</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Riwayat Pembayaran (Jika ada) */}
            {companyDetails?.payments && companyDetails.payments.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-sm">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span>Riwayat Transaksi Langganan ({companyDetails.payments.length})</span>
                </h4>
                <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100">
                  {companyDetails.payments.map((pay) => (
                    <div key={pay.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-[11px]">
                      <div>
                        <p className="font-bold text-slate-800">
                          {formatIDR(pay.amount)} &bull; <span className="font-normal text-slate-500">{pay.payment_method || 'Midtrans Gateway'}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(pay.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                      <StatusBadge status={pay.status} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CompaniesPage;
