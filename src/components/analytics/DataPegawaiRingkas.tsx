import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  RotateCcw, 
  Download, 
  FileText, 
  Printer, 
  BadgeCheck, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink,
  UserCheck,
  User,
  ShieldCheck,
  Building2,
  Sparkles
} from 'lucide-react';
import { Sheet, RowData } from '../../types/sheet';
import { ProfilPegawaiModal } from '../Modals/ProfilPegawaiModal';

interface DataPegawaiRingkasProps {
  sheet: Sheet;
  onUpdateRow?: (rowId: string, updatedFields: Partial<RowData>) => void;
}

export const DataPegawaiRingkas: React.FC<DataPegawaiRingkasProps> = ({
  sheet,
  onUpdateRow
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedJenisTenaga, setSelectedJenisTenaga] = useState('ALL');
  const [selectedGender, setSelectedGender] = useState('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Selected Employee for Pop Up Modal
  const [selectedEmployee, setSelectedEmployee] = useState<RowData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Extract available filter options dynamically from rows
  const unitOptions = useMemo(() => {
    const units = new Set<string>();
    sheet.rows.forEach(r => {
      if (r.tempat_tugas) units.add(r.tempat_tugas);
    });
    return Array.from(units).sort();
  }, [sheet.rows]);

  const statusOptions = useMemo(() => {
    const statuses = new Set<string>();
    sheet.rows.forEach(r => {
      if (r.status_kepegawaian) statuses.add(r.status_kepegawaian);
    });
    return Array.from(statuses).sort();
  }, [sheet.rows]);

  // Filtered rows based on search and selected filters
  const filteredRows = useMemo(() => {
    return sheet.rows.filter(row => {
      // Search query across important fields
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nama = (row.nama_gelar || row.nama || '').toLowerCase();
        const nip = (row.nip || '').toLowerCase();
        const nik = (row.nik || '').toLowerCase();
        const jabatan = (row.jabatan || '').toLowerCase();
        const unit = (row.tempat_tugas || '').toLowerCase();
        const pendidikan = (row.pendidikan || '').toLowerCase();
        const hp = (row.nomor_hp || '').toLowerCase();
        const email = (row.email || '').toLowerCase();

        const match = nama.includes(q) || nip.includes(q) || nik.includes(q) || 
                      jabatan.includes(q) || unit.includes(q) || pendidikan.includes(q) ||
                      hp.includes(q) || email.includes(q);
        if (!match) return false;
      }

      // Unit filter
      if (selectedUnit !== 'ALL' && row.tempat_tugas !== selectedUnit) {
        return false;
      }

      // Status kepegawaian filter
      if (selectedStatus !== 'ALL' && row.status_kepegawaian !== selectedStatus) {
        return false;
      }

      // Jenis tenaga filter
      if (selectedJenisTenaga !== 'ALL' && row.jenis_tenaga !== selectedJenisTenaga) {
        return false;
      }

      // Gender filter
      if (selectedGender !== 'ALL') {
        const gender = (row.jenis_kelamin || '').toLowerCase();
        if (selectedGender === 'L' && !gender.includes('laki')) return false;
        if (selectedGender === 'P' && !gender.includes('perempuan')) return false;
      }

      return true;
    });
  }, [sheet.rows, searchQuery, selectedUnit, selectedStatus, selectedJenisTenaga, selectedGender]);

  // Statistics
  const totalCount = sheet.rows.length;
  const nakesCount = useMemo(() => sheet.rows.filter(r => r.jenis_tenaga === 'Tenaga Kesehatan').length, [sheet.rows]);
  const penunjangCount = useMemo(() => sheet.rows.filter(r => r.jenis_tenaga === 'Tenaga Penunjang').length, [sheet.rows]);
  const pnsCount = useMemo(() => sheet.rows.filter(r => r.status_kepegawaian === 'PNS').length, [sheet.rows]);
  const pppkCount = useMemo(() => sheet.rows.filter(r => (r.status_kepegawaian || '').includes('PPPK')).length, [sheet.rows]);
  const nonPnsCount = useMemo(() => sheet.rows.filter(r => r.status_kepegawaian === 'PJLP' || r.status_kepegawaian === 'NON PNS').length, [sheet.rows]);

  // Pagination calculation
  const totalPages = pageSize === -1 ? 1 : Math.ceil(filteredRows.length / pageSize);
  const paginatedRows = useMemo(() => {
    if (pageSize === -1) return filteredRows;
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedUnit('ALL');
    setSelectedStatus('ALL');
    setSelectedJenisTenaga('ALL');
    setSelectedGender('ALL');
    setCurrentPage(1);
  };

  // Open Employee Modal
  const handleOpenEmployee = (row: RowData) => {
    setSelectedEmployee(row);
    setIsModalOpen(true);
  };

  // Export Filtered Table to CSV
  const handleExportCsv = () => {
    if (filteredRows.length === 0) return;

    const headers = [
      'No',
      'Nama & Gelar',
      'NIP',
      'NIK',
      'Status Pegawai',
      'Jabatan',
      'Unit Tugas',
      'Jenis Tenaga',
      'Pendidikan',
      'Jenis Kelamin',
      'Nomor HP',
      'Email',
      'Status STR',
      'Status SIP'
    ];

    const rows = filteredRows.map((r, idx) => [
      idx + 1,
      `"${(r.nama_gelar || r.nama || '').replace(/"/g, '""')}"`,
      `"${(r.nip || '').replace(/"/g, '""')}"`,
      `"${(r.nik || '').replace(/"/g, '""')}"`,
      `"${(r.status_kepegawaian || '').replace(/"/g, '""')}"`,
      `"${(r.jabatan || '').replace(/"/g, '""')}"`,
      `"${(r.tempat_tugas || '').replace(/"/g, '""')}"`,
      `"${(r.jenis_tenaga || '').replace(/"/g, '""')}"`,
      `"${(r.pendidikan || '').replace(/"/g, '""')}"`,
      `"${(r.jenis_kelamin || '').replace(/"/g, '""')}"`,
      `"${(r.nomor_hp || '').replace(/"/g, '""')}"`,
      `"${(r.email || '').replace(/"/g, '""')}"`,
      `"${(r.status_str || '').replace(/"/g, '""')}"`,
      `"${(r.status_sip || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Data_Pegawai_Ringkas_Puskesmas_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Helper for Status Badge Styling
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PNS':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'PPPK':
      case 'PPPK PW':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'PJLP':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'NON PNS':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'CPNS':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner & Quick Counters */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Data Pegawai (Tabel Ringkas)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {filteredRows.length} dari {totalCount} Pegawai
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Klik pada <strong className="text-emerald-700">Nama Pegawai</strong> untuk membuka pop up rincian profil resmi & mencetak dokumen PDF format A4 Puskesmas.
              </p>
            </div>
          </div>

          {/* Export Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-200"
              title="Unduh ringkasan data tabel ke file CSV / Excel"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-5 pt-4 border-t border-slate-100">
          <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/80 text-center">
            <span className="text-[11px] font-medium text-slate-500 block">Total Pegawai</span>
            <span className="text-base font-bold text-slate-900 block mt-0.5">{totalCount}</span>
          </div>
          <div className="bg-emerald-50/70 rounded-xl p-2.5 border border-emerald-200/60 text-center">
            <span className="text-[11px] font-medium text-emerald-700 block">Tenaga Kesehatan</span>
            <span className="text-base font-bold text-emerald-800 block mt-0.5">{nakesCount}</span>
          </div>
          <div className="bg-sky-50/70 rounded-xl p-2.5 border border-sky-200/60 text-center">
            <span className="text-[11px] font-medium text-sky-700 block">Tenaga Penunjang</span>
            <span className="text-base font-bold text-sky-800 block mt-0.5">{penunjangCount}</span>
          </div>
          <div className="bg-emerald-50/60 rounded-xl p-2.5 border border-emerald-200/60 text-center">
            <span className="text-[11px] font-medium text-emerald-700 block">PNS / ASN</span>
            <span className="text-base font-bold text-emerald-800 block mt-0.5">{pnsCount}</span>
          </div>
          <div className="bg-blue-50/70 rounded-xl p-2.5 border border-blue-200/60 text-center">
            <span className="text-[11px] font-medium text-blue-700 block">PPPK / PPPK PW</span>
            <span className="text-base font-bold text-blue-800 block mt-0.5">{pppkCount}</span>
          </div>
          <div className="bg-amber-50/70 rounded-xl p-2.5 border border-amber-200/60 text-center">
            <span className="text-[11px] font-medium text-amber-700 block">PJLP / Non PNS</span>
            <span className="text-base font-bold text-amber-800 block mt-0.5">{nonPnsCount}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama pegawai, NIP, NIK, jabatan, unit tugas, nomor HP..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Unit Filter */}
          <div className="w-full md:w-56 shrink-0">
            <select
              value={selectedUnit}
              onChange={(e) => {
                setSelectedUnit(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Unit Tugas</option>
              {unitOptions.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Status Pegawai Filter */}
          <div className="w-full md:w-44 shrink-0">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Status</option>
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Jenis Tenaga Filter */}
          <div className="w-full md:w-44 shrink-0">
            <select
              value={selectedJenisTenaga}
              onChange={(e) => {
                setSelectedJenisTenaga(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Jenis Tenaga</option>
              <option value="Tenaga Kesehatan">Tenaga Kesehatan</option>
              <option value="Tenaga Penunjang">Tenaga Penunjang</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(searchQuery || selectedUnit !== 'ALL' || selectedStatus !== 'ALL' || selectedJenisTenaga !== 'ALL' || selectedGender !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-1 shrink-0 transition-colors"
              title="Reset seluruh filter pencarian"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Summarized Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-3.5 w-12 text-center">No</th>
                <th className="py-3 px-4 min-w-[240px]">Nama Pegawai & Gelar</th>
                <th className="py-3 px-3.5 min-w-[170px]">NIP / NIK</th>
                <th className="py-3 px-3.5 min-w-[180px]">Jabatan</th>
                <th className="py-3 px-3.5 w-28 text-center">Status</th>
                <th className="py-3 px-3.5 min-w-[200px]">Tempat / Unit Tugas</th>
                <th className="py-3 px-3.5 w-28">Pendidikan</th>
                <th className="py-3 px-3.5 min-w-[140px]">Status STR / SIP</th>
                <th className="py-3 px-3.5 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">Tidak ada pegawai yang cocok dengan filter pencarian</p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-2 text-xs text-emerald-600 hover:underline font-bold"
                    >
                      Reset Semua Filter
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, index) => {
                  const globalIdx = pageSize === -1 ? index + 1 : (currentPage - 1) * pageSize + index + 1;
                  const isNakes = row.jenis_tenaga === 'Tenaga Kesehatan';
                  const namaLengkap = row.nama_gelar || row.nama || 'Nama Pegawai';
                  const nip = row.nip || '-';
                  const nik = row.nik || '-';
                  const status = row.status_kepegawaian || '-';
                  const unit = row.tempat_tugas || '-';
                  const jabatan = row.jabatan || '-';
                  const pendidikan = row.pendidikan || '-';
                  const str = row.status_str || (isNakes ? 'Belum Ada' : 'Bukan Nakes');

                  return (
                    <tr 
                      key={row._id || index}
                      className="hover:bg-emerald-50/40 transition-colors group cursor-pointer"
                      onClick={() => handleOpenEmployee(row)}
                      title="Klik untuk melihat rincian profil & cetak PDF"
                    >
                      {/* 1. No */}
                      <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {globalIdx}
                      </td>

                      {/* 2. Nama Pegawai (Interactive Link) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar Circle with Red Background like official photo */}
                          <div className="w-9 h-9 rounded-full bg-red-600 text-white font-bold flex items-center justify-center shrink-0 border border-red-700 shadow-2xs text-xs overflow-hidden">
                            {row.foto_url ? (
                              <img src={row.foto_url} alt={namaLengkap} className="w-full h-full object-cover" />
                            ) : (
                              <span>{namaLengkap.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                              <span>{namaLengkap}</span>
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-emerald-600 transition-opacity" />
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {row.jenis_tenaga || 'Tenaga Kerja'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. NIP / NIK */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600">
                        <span className="font-bold text-slate-800 block">{nip}</span>
                        <span className="text-slate-400 text-[10px] block">{nik !== '-' ? `NIK: ${nik}` : ''}</span>
                      </td>

                      {/* 4. Jabatan */}
                      <td className="py-3 px-3.5 text-slate-800 font-medium">
                        {jabatan}
                      </td>

                      {/* 5. Status Kepegawaian */}
                      <td className="py-3 px-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(status)}`}>
                          {status}
                        </span>
                      </td>

                      {/* 6. Tempat / Unit Tugas */}
                      <td className="py-3 px-3.5 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]" title={unit}>{unit}</span>
                        </div>
                      </td>

                      {/* 7. Pendidikan */}
                      <td className="py-3 px-3.5 text-slate-700 font-medium">
                        {pendidikan}
                      </td>

                      {/* 8. Status STR */}
                      <td className="py-3 px-3.5">
                        <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                          str.includes('Aktif') || str.includes('Seumur Hidup') 
                            ? 'text-emerald-700' 
                            : str === 'Bukan Nakes' 
                            ? 'text-slate-400' 
                            : 'text-amber-700'
                        }`}>
                          <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>{str}</span>
                        </span>
                      </td>

                      {/* 9. Aksi */}
                      <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenEmployee(row)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 mx-auto border border-emerald-200 hover:border-emerald-600 shadow-2xs"
                          title="Buka rincian profil & cetak dokumen PDF resmi"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Profil & PDF</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Tampilkan</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-white border border-slate-300 rounded-md text-xs text-slate-700"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={-1}>Semua ({filteredRows.length})</option>
            </select>
            <span>baris per halaman</span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              Halaman <strong>{currentPage}</strong> dari <strong>{totalPages || 1}</strong> ({filteredRows.length} total pegawai)
            </span>

            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 rounded bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pop Up Modal Rincian Pegawai & Cetak PDF */}
      <ProfilPegawaiModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
        onUpdateEmployee={onUpdateRow}
      />
    </div>
  );
};
