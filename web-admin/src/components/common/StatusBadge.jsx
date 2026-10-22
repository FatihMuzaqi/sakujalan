import React from 'react';

const statusConfig = {
  // Company & Subscription Statuses
  TRIAL: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    label: 'Masa Trial'
  },
  ACTIVE: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Berlangganan Aktif'
  },
  PAST_DUE: {
    bg: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
    label: 'Tenggat Waktu'
  },
  EXPIRED: {
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    label: 'Kadaluarsa / Habis'
  },
  CANCELLED: {
    bg: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
    label: 'Dibatalkan'
  },
  SUSPENDED: {
    bg: 'bg-red-100 text-red-800 border-red-300',
    dot: 'bg-red-600',
    label: 'Ditangguhkan (Suspended)'
  },
  // Payment Statuses
  PAID: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Terbayar (Paid)'
  },
  SETTLEMENT: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Settlement'
  },
  PENDING: {
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    label: 'Menunggu Pembayaran'
  },
  FAILED: {
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    label: 'Gagal'
  }
};

export const StatusBadge = ({ status, customLabel, size = 'md' }) => {
  const normalizedStatus = (status || '').toUpperCase();
  const config = statusConfig[normalizedStatus] || {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    label: status || 'UNKNOWN'
  };

  const sizeClass = size === 'sm' 
    ? 'text-xs px-2 py-0.5' 
    : 'text-xs px-2.5 py-1 font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${sizeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {customLabel || config.label}
    </span>
  );
};

export default StatusBadge;
