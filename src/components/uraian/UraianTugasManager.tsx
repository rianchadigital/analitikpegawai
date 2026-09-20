import React, { useState, useMemo } from 'react';
import { Sheet, RowData } from '../../types/sheet';
import { KartuUraianTugas } from './KartuUraianTugas';
import { BatchPrintKartu } from './BatchPrintKartu';
import { EditUraianModal } from './EditUraianModal';
import { savePhotoToServer } from '../../utils/googleDriveHelper';
import { 
  FileText, 
  Printer, 
  RotateCw, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  UserCheck, 
  Briefcase, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Download,
  Eye,
  Layers,
  Sparkles,
  Users
} from 'lucide-react';

interface UraianTugasManagerProps {
  sheet: Sheet;
  onUpdateSheet: (updatedSheet: Sheet) => void;
  onSyncGoogleSheet?: () => Promise<void>;
  isSyncing?: boolean;
}

export const UraianTugasManager: React.FC<UraianTugasManagerProps> = ({
  sheet,
  onUpdateSheet,
  onSyncGoogleSheet,
  isSyncing = false
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(sheet.rows[0]?._id || '');
  const [editingStaff, setEditingStaff] = useState<RowData | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCompleteness, setFilterCompleteness] = useState<string>('all');

  // Metrics
  const totalStaff = sheet.rows.length;

  const countFilledPokok = (r: RowData) => {
    return [1,2,3,4,5,6,7,8,9,10].filter(i => r[`tugas_pokok_${i}`]?.toString().trim()).length;
  };

  const countFilledTambahan = (r: RowData) => {
    return [1,2,3,4,5].filter(i => r[`tugas_tambahan_${i}`]?.toString().trim()).length;
  };

  const staffWithFullTasks = useMemo(() => {
    return sheet.rows.filter(r => countFilledPokok(r) >= 3).length;
  }, [sheet.rows]);

  const staffWithPhotos = useMemo(() => {
    return sheet.rows.filter(r => Boolean(r.foto && String(r.foto).trim())).length;
  }, [sheet.rows]);

  const staffWithAdditionalTasks = useMemo(() => {
    return sheet.rows.filter(r => countFilledTambahan(r) > 0).length;
  }, [sheet.rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return sheet.rows.filter(r => {
      const q = searchTerm.toLowerCase();
      const nama = String(r.nama || '').toLowerCase();
      const nip = String(r.nip || '').toLowerCase();
      const jab = String(r.jabatan || '').toLowerCase();
      const matchesSearch = nama.includes(q) || nip.includes(q) || jab.includes(q);

      if (!matchesSearch) return false;

      if (filterUnit !== 'all' && !String(r.tempat_tugas || '').includes(filterUnit)) {
        return false;
      }

      if (filterStatus !== 'all' && r.status !== filterStatus) {
        return false;
      }

      const pokokCount = countFilledPokok(r);
      if (filterCompleteness === 'complete' && pokokCount < 4) return false;
      if (filterCompleteness === 'incomplete' && pokokCount >= 4) return false;

      return true;
    });
  }, [sheet.rows, searchTerm, filterUnit, filterStatus, filterCompleteness]);

  // Handle Save (Add or Update)
  const handleSaveStaff = (staffData: RowData) => {
    let updatedRows: RowData[];
    const exists = sheet.rows.some(r => r._id === staffData._id);

    if (exists) {
      updatedRows = sheet.rows.map(r => r._id === staffData._id ? staffData : r);
    } else {
      const newNo = sheet.rows.length + 1;
      updatedRows = [{ ...staffData, no: newNo }, ...sheet.rows];
    }

    onUpdateSheet({
      ...sheet,
      rows: updatedRows,
      updatedAt: new Date().toISOString()
    });

    setEditingStaff(null);
    setIsAddingNew(false);
    setSelectedStaffId(staffData._id);
  };

  const handleUpdateStaffPhoto = (staffId: string, photoUrl: string) => {
    const targetStaff = sheet.rows.find(r => r._id === staffId);
    if (targetStaff) {
      savePhotoToServer(staffId, photoUrl, String(targetStaff.nip || ''), String(targetStaff.nama || ''));
    }
    const updatedRows = sheet.rows.map(r => {
      if (r._id === staffId) {
        return { ...r, foto: photoUrl };
      }
      return r;
    });
    onUpdateSheet({
      ...sheet,
      rows: updatedRows,
      updatedAt: new Date().toISOString()
    });
  };

  // Handle Delete
  const handleDeleteStaff = (id: string, name: string) => {
    if (!window.confirm(`Yakin ingin menghapus data uraian tugas pegawai "${name}"?`)) {
      return;
    }
    const updatedRows = sheet.rows.filter(r => r._id !== id).map((r, i) => ({ ...r, no: i + 1 }));
    onUpdateSheet({
      ...sheet,
      rows: updatedRows,
      updatedAt: new Date().toISOString()
    });
    if (selectedStaffId === id && updatedRows.length > 0) {
      setSelectedStaffId(updatedRows[0]._id);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'No', 'Nama', 'NIP', 'Status', 'Jabatan', 'Tempat Tugas', 'Ikhtisar Jabatan',
      'Tugas Pokok 1', 'Tugas Pokok 2', 'Tugas Pokok 3', 'Tugas Pokok 4', 'Tugas Pokok 5',
      'Tugas Tambahan 1', 'Tugas Tambahan 2'
    ];

    const escapeCsv = (str: any) => `"${String(str || '').replace(/"/g, '""')}"`;

    const csvContent = [
      headers.join(','),
      ...filteredRows.map(r => [
        r.no,
        escapeCsv(r.nama),
        escapeCsv(r.nip),
        escapeCsv(r.status),
        escapeCsv(r.jabatan),
        escapeCsv(r.tempat_tugas),
        escapeCsv(r.ikhtisar_jabatan),
        escapeCsv(r.tugas_pokok_1),
        escapeCsv(r.tugas_pokok_2),
        escapeCsv(r.tugas_pokok_3),
        escapeCsv(r.tugas_pokok_4),
        escapeCsv(r.tugas_pokok_5),
        escapeCsv(r.tugas_tambahan_1),
        escapeCsv(r.tugas_tambahan_2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Uraian_Tugas_Pegawai_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If in Card view mode, render KartuUraianTugas
  if (viewMode === 'card') {
    return (
      <div className="space-y-4">
        <KartuUraianTugas
          rows={sheet.rows}
          selectedRowId={selectedStaffId}
          onSelectRowId={(id) => setSelectedStaffId(id)}
          onBackToTable={() => setViewMode('table')}
          onEditRow={(row) => setEditingStaff(row)}
          onOpenBatchPrint={() => setIsBatchPrinting(true)}
          onUpdateStaffPhoto={handleUpdateStaffPhoto}
        />

        {editingStaff && (
          <EditUraianModal
            initialData={editingStaff}
            onSave={handleSaveStaff}
            onClose={() => setEditingStaff(null)}
          />
        )}

        {isBatchPrinting && (
          <BatchPrintKartu
            rows={sheet.rows}
            onClose={() => setIsBatchPrinting(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Pengelolaan Data Uraian Tugas Pegawai
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  Google Sheet Terhubung
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Puskesmas Kepulauan Seribu Selatan • Tersinkronisasi dengan Google Spreadsheet Uraian Tugas
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            {onSyncGoogleSheet && (
              <button
                id="btn-sync-uraian-sheet"
                onClick={() => onSyncGoogleSheet()}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors disabled:opacity-50"
                title="Tarik data terbaru langsung dari Google Spreadsheet Uraian Tugas"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Google Sheets'}</span>
              </button>
            )}

            <button
              id="btn-open-batch-print"
              onClick={() => setIsBatchPrinting(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
              title="Cetak Semua Kartu Uraian Tugas Pegawai Sekaligus"
            >
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>Cetak Massal (Batch)</span>
            </button>

            <button
              id="btn-export-uraian-csv"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
              title="Unduh Data CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Ekspor CSV</span>
            </button>

            <button
              id="btn-add-staff-uraian"
              onClick={() => setIsAddingNew(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Pegawai</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Total Pegawai</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-slate-900">{totalStaff}</span>
              <span className="text-[11px] text-slate-500">Staf Terdata</span>
            </div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800">Tugas Pokok Lengkap</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-emerald-900">{staffWithFullTasks}</span>
              <span className="text-[11px] text-emerald-700">
                ({Math.round((staffWithFullTasks / (totalStaff || 1)) * 100)}%)
              </span>
            </div>
          </div>

          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-800">Tugas Tambahan / Tim</span>
              <Briefcase className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-blue-900">{staffWithAdditionalTasks}</span>
              <span className="text-[11px] text-blue-700">
                ({Math.round((staffWithAdditionalTasks / (totalStaff || 1)) * 100)}%)
              </span>
            </div>
          </div>

          <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-800">Pasfoto Siap Cetak</span>
              <UserCheck className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-purple-900">{staffWithPhotos}</span>
              <span className="text-[11px] text-purple-700">
                ({Math.round((staffWithPhotos / (totalStaff || 1)) * 100)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama pegawai, NIP, atau jabatan..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Unit Filter */}
          <select
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
          >
            <option value="all">Semua Unit Tugas</option>
            <option value="Puskesmas Kepulauan Seribu Selatan">Puskesmas Kecamatan</option>
            <option value="Pari">Pustu Pulau Pari</option>
            <option value="Lancang">Pustu Pulau Lancang</option>
            <option value="Untung Jawa">Pustu Pulau Untung Jawa</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
          >
            <option value="all">Semua Status</option>
            <option value="PNS">PNS</option>
            <option value="PPPK">PPPK</option>
            <option value="PPPK PW">PPPK PW</option>
            <option value="NON PNS">NON PNS</option>
            <option value="PJLP">PJLP</option>
          </select>

          {/* Completeness Filter */}
          <select
            value={filterCompleteness}
            onChange={(e) => setFilterCompleteness(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
          >
            <option value="all">Semua Kelengkapan</option>
            <option value="complete">Tugas Terisi Lengkap</option>
            <option value="incomplete">Tugas Belum Lengkap</option>
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Menampilkan <span className="text-slate-900 font-bold">{filteredRows.length}</span> dari {totalStaff} pegawai
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 w-12 text-center">Foto</th>
                <th className="py-3 px-4 min-w-[220px]">Nama Lengkap & NIP</th>
                <th className="py-3 px-4 min-w-[180px]">Jabatan</th>
                <th className="py-3 px-4 min-w-[180px]">Tempat Tugas</th>
                <th className="py-3 px-3 text-center min-w-[110px]">Tugas Pokok</th>
                <th className="py-3 px-3 text-center min-w-[110px]">Tugas Tambahan</th>
                <th className="py-3 px-4 text-center min-w-[140px]">Aksi & Kartu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((staff, idx) => {
                const pokokCount = countFilledPokok(staff);
                const tambahanCount = countFilledTambahan(staff);

                return (
                  <tr 
                    key={staff._id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Number */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-semibold">
                      {idx + 1}
                    </td>

                    {/* Photo / Avatar */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="w-8 h-10 mx-auto border border-slate-300 rounded overflow-hidden bg-red-600 flex items-center justify-center">
                        {staff.foto ? (
                          <img src={staff.foto} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[8px] text-white font-bold">3x4</span>
                        )}
                      </div>
                    </td>

                    {/* Name & NIP */}
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {staff.nama}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        NIP: {staff.nip || '-'}
                      </div>
                      <div className="inline-block mt-0.5 px-1.5 py-0.2 text-[9px] font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                        {staff.status || 'PNS'}
                      </div>
                    </td>

                    {/* Position */}
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-800">
                        {staff.jabatan || '-'}
                      </div>
                      {staff.ikhtisar_jabatan && (
                        <p className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5" title={staff.ikhtisar_jabatan}>
                          {staff.ikhtisar_jabatan}
                        </p>
                      )}
                    </td>

                    {/* Workplace */}
                    <td className="py-2.5 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[170px]">{staff.tempat_tugas || '-'}</span>
                      </div>
                    </td>

                    {/* Tugas Pokok Count */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        pokokCount >= 5 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : pokokCount > 0 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {pokokCount}/10 Butir
                      </span>
                    </td>

                    {/* Tugas Tambahan Count */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tambahanCount > 0 
                          ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {tambahanCount}/5 Butir
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Open Card Button */}
                        <button
                          onClick={() => {
                            setSelectedStaffId(staff._id);
                            setViewMode('card');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
                          title="Buka Kartu Uraian Tugas Resmi"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Kartu</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => setEditingStaff(staff)}
                          className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit Uraian Tugas"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteStaff(staff._id, staff.nama)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Hapus Data Pegawai"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada pegawai yang cocok dengan filter atau kata kunci pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {(editingStaff || isAddingNew) && (
        <EditUraianModal
          initialData={editingStaff}
          onSave={handleSaveStaff}
          onClose={() => {
            setEditingStaff(null);
            setIsAddingNew(false);
          }}
        />
      )}

      {/* Batch Print Modal */}
      {isBatchPrinting && (
        <BatchPrintKartu
          rows={sheet.rows}
          onClose={() => setIsBatchPrinting(false)}
        />
      )}
    </div>
  );
};
