import React, { useState } from 'react';
import { 
  Shield, 
  Server, 
  Database, 
  Radio, 
  Globe, 
  User, 
  LogOut, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Lock 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

export const SettingsPage = () => {
  const { user, logout } = useAuth();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1/superadmin';

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Mohon isi semua bidang password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password baru minimal harus 6 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password baru tidak cocok');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const response = await apiClient.patch('/profile/password', {
        current_password: currentPassword,
        new_password: newPassword
      });

      if (response.data?.success) {
        toast.success('Password SuperAdmin berhasil diubah!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal mengubah password SuperAdmin';
      toast.error(msg);
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pengaturan & Keamanan Sistem</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Informasi profil SuperAdmin, ubah password akun, dan konfigurasi platform TripEx.
        </p>
      </div>

      {/* Profil SuperAdmin */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          <span>Profil SuperAdmin Aktif</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[11px]">Nama Lengkap</span>
            <span className="font-bold text-slate-800 text-sm">{user?.name || 'Master SuperAdmin'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[11px]">Email Akun</span>
            <span className="font-bold text-slate-800 text-sm">{user?.email || 'superadmin@tripex.id'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[11px]">Hak Akses / Role</span>
            <span className="font-bold text-primary text-sm uppercase">SUPER_ADMIN (Platform Master)</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[11px]">Status Akun</span>
            <span className="font-bold text-emerald-600 text-sm">Aktif & Terverifikasi</span>
          </div>
        </div>
      </div>

      {/* Ubah Password SuperAdmin Form */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <span>Ubah Password Akun SuperAdmin</span>
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          Perbarui kata sandi akun master SuperAdmin Anda secara berkala demi keamanan platform.
        </p>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg text-xs">
          {/* Current Password */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Password Saat Ini
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Masukkan kata sandi lama..."
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Password Baru (Min. 6 Karakter)
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan kata sandi baru..."
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang kata sandi baru..."
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmittingPassword}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-600 text-white font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{isSubmittingPassword ? 'Memproses...' : 'Simpan Password Baru'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Konfigurasi Server & Koneksi */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Server className="w-4 h-4 text-primary" />
          <span>Konfigurasi API Backend Server</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[11px]">Base API Endpoint SuperAdmin</span>
              <span className="font-mono font-bold text-slate-800">{apiBaseUrl}</span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
              Connected
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[11px]">Realtime Socket.IO Gateway</span>
              <span className="font-mono font-bold text-slate-800">http://localhost:5000 (Port 5000)</span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
              Active
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[11px]">Database Multi-tenant</span>
              <span className="font-mono font-bold text-slate-800">MySQL 8.0 (Sequelize ORM)</span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
              Healthy
            </span>
          </div>
        </div>
      </div>

      {/* Logout Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h4 className="font-bold text-slate-900 text-sm">Keluar dari Sesi SuperAdmin</h4>
          <p className="text-xs text-slate-500">Hapus token otorisasi dari perangkat ini.</p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar Sesi</span>
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
