import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Users, 
  FileSpreadsheet, 
  User, 
  MapPin, 
  Briefcase, 
  BadgeCheck, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { RowData } from '../../types/sheet';
import { EmployeeDetailModal } from './EmployeeDetailModal';

export interface StaffListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badgeText?: string;
  staffList: RowData[];
}

export const StaffListModal: React.FC<StaffListModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badgeText,
  staffList
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<RowData | null>(null);

  // Filtered staff list by search query - MUST be called before any early return!
  const filteredStaff = useMemo(() => {
    if (!staffList || staffList.length === 0) return [];
    if (!searchQuery.trim()) return staffList;
    const q = searchQuery.toLowerCase();
    return staffList.filter(s => {
      const name = (s.nama_gelar || s.nama || '').toLowerCase();
      const nip = (s.nip || '').toLowerCase();
      const nrk = (s.nrk || '').toLowerCase();
      const jab = (s.jabatan || '').toLowerCase();
      const unit = (s.tempat_tugas || '').toLowerCase();
      const stat = (s.status_kepegawaian || '').toLowerCase();
      return name.includes(q) || nip.includes(q) || nrk.includes(q) || jab.includes(q) || unit.includes(q) || stat.includes(q);
    });
  }, [staffList, searchQuery]);

  // Early return only AFTER all hooks are called
  if (!isOpen) return null;

  // Export filtered staff to CSV
  const handleExportCsv = () => {
    if (filteredStaff.length === 0) return;
    const headers = [
      'No',
      'Nama & Gelar',
      'NIP',
      'NRK',
      'Jabatan',
      'Status Kepegawaian',
      'Jenis Tenaga',
      'Tempat Tugas',
      'Pendidikan',
      'Nomor HP'
    ];

    const rows = filteredStaff.map((s, idx) => [
      idx + 1,
      `"${(s.nama_gelar || s.nama || '').replace(/"/g, '""')}"`,
      `"${(s.nip || '').replace(/"/g, '""')}"`,
      `"${(s.nrk || '').replace(/"/g, '""')}"`,
      `"${(s.jabatan || '').replace(/"/g, '""')}"`,
      `"${(s.status_kepegawaian || '').replace(/"/g, '""')}"`,
      `"${(s.jenis_tenaga || '').replace(/"/g, '""')}"`,
      `"${(s.tempat_tugas || '').replace(/"/g, '""')}"`,
      `"${(s.pendidikan || '').replace(/"/g, '""')}"`,
      `"${(s.nomor_hp || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Daftar_Pegawai_${title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-3 md:p-6 animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-white shrink-0">
                <Users className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                    {title}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-400/25 text-emerald-100 border border-emerald-300/30">
                    {badgeText || `${staffList.length} Orang Pegawai`}
                  </span>
                </div>
                {subtitle && (
                  <p className="text-xs text-emerald-100/90 mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
              title="Tutup (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Action Bar */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama pegawai, NIP, atau jabatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCsv}
                disabled={filteredStaff.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-600 rounded-lg shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download data pegawai ini ke file CSV/Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Export List ({filteredStaff.length})</span>
              </button>
            </div>
          </div>

          {/* Employee Table Body */}
          <div className="p-6 overflow-y-auto flex-1">
            {filteredStaff.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Users className="w-10 h-10 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Tidak ada pegawai ditemukan</p>
                <p className="text-xs text-slate-400">
                  {searchQuery ? `Tidak ada data yang cocok dengan pencarian "${searchQuery}"` : 'Data pada kategori/sel ini belum memiliki data staf'}
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3">Nama Pegawai & Gelar</th>
                      <th className="py-2.5 px-3">NIP / NRK</th>
                      <th className="py-2.5 px-3">Jabatan</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Unit Tugas</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStaff.map((staff, idx) => {
                      const isPns = staff.status_kepegawaian?.toUpperCase() === 'PNS';
                      const isPppk = staff.status_kepegawaian?.toUpperCase() === 'PPPK';

                      return (
                        <tr 
                          key={staff.id || idx}
                          onClick={() => setSelectedEmployee(staff)}
                          className="hover:bg-emerald-50/50 cursor-pointer transition-colors group"
                        >
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 group-hover:bg-emerald-200 transition-colors">
                                {staff.nama ? staff.nama.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 group-hover:text-emerald-800 transition-colors block">
                                  {staff.nama_gelar || staff.nama || 'Tanpa Nama'}
                                </span>
                                {staff.jenis_tenaga && (
                                  <span className="text-[10px] text-slate-400">
                                    {staff.jenis_tenaga}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            <div>{staff.nip || '-'}</div>
                            {staff.nrk && staff.nrk !== '-' && (
                              <div className="text-[10px] text-slate-400">NRK: {staff.nrk}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium">
                            {staff.jabatan || '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              isPns 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : isPppk 
                                ? 'bg-sky-100 text-sky-800' 
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {staff.status_kepegawaian || 'Aktif'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[140px]">{staff.tempat_tugas || '-'}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployee(staff);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 text-[11px] font-semibold transition-colors"
                              title="Lihat profil detail lengkap pegawai"
                            >
                              <span>Detail</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Menampilkan <strong>{filteredStaff.length}</strong> dari {staffList.length} pegawai
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Nested detail employee profile modal */}
      {selectedEmployee && (
        <EmployeeDetailModal
          isOpen={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          employee={selectedEmployee}
        />
      )}
    </>
  );
};
