import React, { useEffect, useState } from 'react';
import { 
  Receipt, 
  Search, 
  Download, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import apiClient from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import LoadingView from '../components/common/LoadingView';
import toast from 'react-hot-toast';

export const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ totalPaidVolume: 0, paidCount: 0, pendingCount: 0, failedCount: 0 });
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modal Raw Gateway Log
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [syncingId, setSyncingId] = useState(null);

  const handleSyncPayment = async (orderId) => {
    if (!orderId) return;
    setSyncingId(orderId);
    try {
      const response = await apiClient.post(`/payments/${orderId}/sync`);
      if (response.data?.success) {
        toast.success(response.data.message || 'Status berhasil disinkronkan!');
        fetchPayments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyinkronkan status dengan Midtrans');
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAllPending = async () => {
    const pendingList = payments.filter(p => p.status === 'PENDING');
    if (pendingList.length === 0) {
      toast('Tidak ada transaksi berstatus PENDING', { icon: 'ℹ️' });
      return;
    }
    toast.loading('Menyinkronkan semua transaksi pending...', { id: 'sync-all' });
    try {
      for (const p of pendingList) {
        if (p.gateway_order_id) {
          await apiClient.post(`/payments/${p.gateway_order_id}/sync`);
        }
      }
      toast.success('Semua transaksi pending selesai disinkronkan!', { id: 'sync-all' });
      fetchPayments();
    } catch (e) {
      toast.error('Gagal menyelesaikan sinkronisasi seluruh transaksi', { id: 'sync-all' });
    }
  };

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const response = await apiClient.get('/payments', { params });
      if (response.data?.success) {
        setPayments(response.data.data.payments || []);
        setSummary(response.data.data.summary || {});
        setMeta(response.data.meta);
      }
    } catch (error) {
      toast.error('Gagal mengambil riwayat transaksi pembayaran');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const openRawModal = (pay) => {
    setSelectedPayment(pay);
    setIsDetailModalOpen(true);
  };

  const handleExportCSV = () => {
    if (payments.length === 0) {
      toast.error('Tidak ada data transaksi untuk diexport');
      return;
    }

    const headers = ['ID Transaksi', 'Perusahaan', 'Email', 'Gateway', 'Order ID', 'Nominal (IDR)', 'Status', 'Metode Bayar', 'Tanggal'];
    const rows = payments.map(p => [
      p.id,
      `"${p.company?.name || ''}"`,
      `"${p.company?.email || ''}"`,
      p.payment_gateway,
      p.gateway_order_id || '-',
      p.amount,
      p.status,
      p.payment_method || '-',
      `"${p.paid_at || p.createdAt || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TripEx_Laporan_Transaksi_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Laporan transaksi berhasil di-export ke CSV!');
  };

  const formatIDR = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Laporan Transaksi & Pembayaran</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Audit penerimaan tagihan paket langganan SaaS dan status transaksi Midtrans.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {summary.pendingCount > 0 && (
            <button
              onClick={handleSyncAllPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Periksa & Sinkronkan Semua Transaksi Pending ke Midtrans"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span>Sync Midtrans ({summary.pendingCount})</span>
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchPayments}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-xs cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Volume Terbayar</span>
          <span className="text-xl font-black text-emerald-600 mt-1 block">
            {formatIDR(summary.totalPaidVolume)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{summary.paidCount || 0} invoice lunas</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Transaksi Sukses</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {summary.paidCount || 0}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">Status Lunas (Settlement)</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Menunggu Pembayaran</span>
          <span className="text-xl font-black text-blue-600 mt-1 block">
            {summary.pendingCount || 0}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Pending Midtrans VA/QRIS</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Gagal / Kadaluarsa</span>
          <span className="text-xl font-black text-rose-600 mt-1 block">
            {summary.failedCount || 0}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Expired atau Dibatalkan</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { label: 'Semua Status', value: '' },
            { label: 'Terbayar (Paid)', value: 'PAID' },
            { label: 'Pending', value: 'PENDING' },
            { label: 'Expired/Gagal', value: 'EXPIRED' }
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

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <LoadingView message="Memuat log transaksi keuangan..." />
        ) : payments.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Receipt className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-semibold text-sm">Tidak ada transaksi pembayaran yang ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Perusahaan</th>
                  <th className="py-3.5 px-4">Order ID & Gateway</th>
                  <th className="py-3.5 px-4">Nominal</th>
                  <th className="py-3.5 px-4">Metode Bayar</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Waktu Transaksi</th>
                  <th className="py-3.5 px-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{p.company?.name || 'Tenant'}</div>
                      <div className="text-slate-400 text-[11px]">{p.company?.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-slate-800 font-medium">{p.gateway_order_id || p.id.slice(0, 8)}</div>
                      <div className="text-slate-400 text-[10px] uppercase font-bold">{p.payment_gateway}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {formatIDR(p.amount)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {p.payment_method || 'Midtrans Snap'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {p.paid_at || p.createdAt ? new Date(p.paid_at || p.createdAt).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {p.status === 'PENDING' && (
                          <button
                            onClick={() => handleSyncPayment(p.gateway_order_id)}
                            disabled={syncingId === p.gateway_order_id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                            title="Cek & Sinkronkan Status Midtrans"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingId === p.gateway_order_id ? 'animate-spin text-blue-600' : 'text-blue-600'}`} />
                            <span>{syncingId === p.gateway_order_id ? 'Syncing...' : 'Sync Midtrans'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => openRawModal(p)}
                          className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Lihat Response Gateway"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs">
            <span className="text-slate-500">
              Halaman <span className="font-bold">{meta.page}</span> dari {meta.totalPages} (Total {meta.total} Transaksi)
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

      {/* Modal Detail Transaksi */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detail Audit Transaksi"
        subtitle={`Order ID: ${selectedPayment?.gateway_order_id || selectedPayment?.id}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
            <div className="flex justify-between">
              <span className="text-slate-400">ID Transaksi Database:</span>
              <span className="font-mono font-bold text-slate-700">{selectedPayment?.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Gateway Transaction ID:</span>
              <span className="font-mono text-slate-700">{selectedPayment?.gateway_transaction_id || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Nominal Tagihan:</span>
              <span className="font-bold text-emerald-600">{formatIDR(selectedPayment?.amount)}</span>
            </div>
          </div>

          <div>
            <span className="font-bold text-slate-800 block mb-1.5">Raw Midtrans / Gateway Payload:</span>
            <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56">
              {JSON.stringify(selectedPayment?.raw_response || selectedPayment, null, 2)}
            </pre>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PaymentsPage;
