import React, { useState, useMemo } from 'react';
import { 
  Home, 
  MapPin, 
  Building, 
  Search, 
  Filter, 
  Download, 
  Edit3, 
  Check, 
  X, 
  Navigation, 
  Users,
  Compass,
  ExternalLink,
  Printer
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { Sheet, RowData } from '../../types/sheet';
import { printReportInNewTab } from '../../utils/pdfReportGenerator';

interface DomisiliManagerProps {
  sheet: Sheet;
  onUpdateRow?: (rowId: string, updatedFields: Partial<RowData>) => void;
}

const COLORS = ['#059669', '#0284c7', '#d97706', '#7c3aed', '#e11d48', '#0d9488'];

export const DomisiliManager: React.FC<DomisiliManagerProps> = ({ sheet, onUpdateRow }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWilayah, setFilterWilayah] = useState('ALL');
  const [filterUnit, setFilterUnit] = useState('ALL');
  const [filterKabKota, setFilterKabKota] = useState('ALL');
  const [editingStaff, setEditingStaff] = useState<RowData | null>(null);

  // Edit form state
  const [formProvinsi, setFormProvinsi] = useState('');
  const [formKabKota, setFormKabKota] = useState('');
  const [formKecamatan, setFormKecamatan] = useState('');
  const [formKelurahan, setFormKelurahan] = useState('');
  const [formAlamat, setFormAlamat] = useState('');
  const [formWilayah, setFormWilayah] = useState('');

  // Open edit modal
  const handleStartEdit = (staff: RowData) => {
    setEditingStaff(staff);
    setFormProvinsi(staff.provinsi || 'DKI Jakarta');
    setFormKabKota(staff.kab_kota || 'Kab. Kepulauan Seribu');
    setFormKecamatan(staff.kecamatan || '');
    setFormKelurahan(staff.kelurahan || '');
    setFormAlamat(staff.alamat || '');
    setFormWilayah(staff.domisili_wilayah || 'Lokal Kepulauan Seribu');
  };

  // Save edit
  const handleSaveEdit = () => {
    if (!editingStaff || !onUpdateRow) return;
    onUpdateRow(editingStaff._id, {
      provinsi: formProvinsi,
      kab_kota: formKabKota,
      kecamatan: formKecamatan,
      kelurahan: formKelurahan,
      alamat: formAlamat,
      domisili_wilayah: formWilayah
    });
    setEditingStaff(null);
  };

  // Aggregate stats
  const stats = useMemo(() => {
    let lokalPulau = 0;
    let daratanDki = 0;
    let luarDki = 0;
    const kabCount: Record<string, number> = {};

    sheet.rows.forEach(r => {
      const wil = r.domisili_wilayah || '';
      if (wil.includes('Lokal') || wil.includes('Kepulauan Seribu')) {
        lokalPulau++;
      } else if (wil.includes('Daratan')) {
        daratanDki++;
      } else {
        luarDki++;
      }

      const kab = r.kab_kota || 'Lainnya';
      kabCount[kab] = (kabCount[kab] || 0) + 1;
    });

    const kabChartData = Object.entries(kabCount).map(([name, count]) => ({
      name,
      count
    })).sort((a, b) => b.count - a.count);

    const pieData = [
      { name: 'Lokal Kep. Seribu', value: lokalPulau, color: '#059669' },
      { name: 'Daratan DKI Jakarta', value: daratanDki, color: '#0284c7' },
      { name: 'Luar DKI (Banten/Jabar)', value: luarDki, color: '#d97706' }
    ];

    return {
      total: sheet.rows.length,
      lokalPulau,
      daratanDki,
      luarDki,
      lokalPct: ((lokalPulau / (sheet.rows.length || 1)) * 100).toFixed(1),
      daratanPct: ((daratanDki / (sheet.rows.length || 1)) * 100).toFixed(1),
      luarPct: ((luarDki / (sheet.rows.length || 1)) * 100).toFixed(1),
      kabChartData,
      pieData
    };
  }, [sheet.rows]);

  // Unique list of Kab/Kota for filter
  const kabKotaList = useMemo(() => {
    const set = new Set<string>();
    sheet.rows.forEach(r => {
      if (r.kab_kota) set.add(r.kab_kota);
    });
    return Array.from(set);
  }, [sheet.rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return sheet.rows.filter(r => {
      if (filterWilayah !== 'ALL' && r.domisili_wilayah !== filterWilayah) return false;
      if (filterUnit !== 'ALL' && r.tempat_tugas !== filterUnit) return false;
      if (filterKabKota !== 'ALL' && r.kab_kota !== filterKabKota) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = (r.nama || '').toLowerCase().includes(q) || (r.nama_gelar || '').toLowerCase().includes(q);
        const matchNip = (r.nip || '').toLowerCase().includes(q);
        const matchAlamat = (r.alamat || '').toLowerCase().includes(q);
        const matchKel = (r.kelurahan || '').toLowerCase().includes(q);
        const matchKec = (r.kecamatan || '').toLowerCase().includes(q);
        return matchName || matchNip || matchAlamat || matchKel || matchKec;
      }

      return true;
    });
  }, [sheet.rows, filterWilayah, filterUnit, filterKabKota, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['No', 'Nama Pegawai', 'Jabatan', 'Unit Tugas', 'Wilayah Domisili', 'Provinsi', 'Kab/Kota', 'Kecamatan', 'Kelurahan', 'Alamat Lengkap', 'No. HP'];
    const rows = filteredRows.map((r, i) => [
      i + 1,
      `"${r.nama_gelar || r.nama || ''}"`,
      `"${r.jabatan || ''}"`,
      `"${r.tempat_tugas || ''}"`,
      `"${r.domisili_wilayah || ''}"`,
      `"${r.provinsi || ''}"`,
      `"${r.kab_kota || ''}"`,
      `"${r.kecamatan || ''}"`,
      `"${r.kelurahan || ''}"`,
      `"${(r.alamat || '').replace(/"/g, '""')}"`,
      `"${r.nomor_hp || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_Domisili_SDMK_Puskesmas.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handler Cetak PDF Tab Baru
  const handlePrintPdfNewTab = () => {
    const statsHtml = `
      <div class="stats-container">
        <div class="stat-card">
          <div class="label">Total SDMK Terdata</div>
          <div class="val">${stats.total} <span style="font-size:9pt;font-weight:normal;">Orang</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Lokal Kep. Seribu (Pulau)</div>
          <div class="val" style="color:#059669;">${stats.lokalPulau} <span style="font-size:9pt;font-weight:normal;">(${stats.lokalPct}%)</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Daratan DKI Jakarta</div>
          <div class="val" style="color:#0284c7;">${stats.daratanDki} <span style="font-size:9pt;font-weight:normal;">(${stats.daratanPct}%)</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Luar DKI (Banten / Jabar)</div>
          <div class="val" style="color:#d97706;">${stats.luarDki} <span style="font-size:9pt;font-weight:normal;">(${stats.luarPct}%)</span></div>
        </div>
      </div>
    `;

    let rowsHtml = '';
    filteredRows.forEach((r, idx) => {
      const wil = r.domisili_wilayah || 'Daratan DKI Jakarta';
      const badgeCls = wil.includes('Lokal') ? 'badge-pppk' : wil.includes('Daratan') ? 'badge-pns' : 'badge-non';

      rowsHtml += `
        <tr>
          <td style="text-align:center; font-weight:700;">${idx + 1}</td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${r.nama_gelar || r.nama || '-'}</div>
            <div style="font-size:7.5pt; color:#64748b; font-family:monospace;">${r.nip ? 'NIP ' + r.nip : 'NIK ' + (r.nik || '-')}</div>
          </td>
          <td>
            <div style="font-weight:600; color:#1e293b;">${r.jabatan || '-'}</div>
            <div style="font-size:7.5pt; color:#64748b;">${r.tempat_tugas || '-'}</div>
          </td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${r.kelurahan || '-'}</div>
            <div style="font-size:7.5pt; color:#475569;">Kec. ${r.kecamatan || '-'}</div>
          </td>
          <td>
            <div style="font-weight:600;">${r.kab_kota || '-'}</div>
            <div style="font-size:7pt; color:#64748b;">${r.provinsi || 'DKI Jakarta'}</div>
          </td>
          <td>
            <span class="badge ${badgeCls}">${wil}</span>
          </td>
          <td style="font-size:7.5pt; color:#475569; max-width:200px;">
            ${r.alamat || '-'}
          </td>
        </tr>
      `;
    });

    const tableHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:40px; text-align:center;">No</th>
            <th style="width:190px;">Nama Pegawai & NIP</th>
            <th style="width:170px;">Jabatan & Unit Tugas</th>
            <th style="width:140px;">Kelurahan & Kec.</th>
            <th style="width:140px;">Kabupaten / Kota</th>
            <th style="width:120px;">Wilayah Domisili</th>
            <th>Alamat Tempat Tinggal</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="7" style="text-align:center; padding:20px;">Tidak ada data domisili</td></tr>'}
        </tbody>
      </table>
    `;

    printReportInNewTab({
      title: 'LAPORAN SEBARAN DOMISILI & TEMPAT TINGGAL SDMK',
      subtitle: `Filter: Kategori [${filterWilayah}] • Unit [${filterUnit}] • Total [${filteredRows.length} Pegawai]`,
      orientation: 'landscape',
      tableHtml,
      statsHtml
    });
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Total SDMK Terdata</div>
            <div className="text-xl font-bold text-slate-900">{stats.total} Orang</div>
            <div className="text-[11px] text-slate-400">100% data terpetakan</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Lokal Kep. Seribu (Pulau)</div>
            <div className="text-xl font-bold text-emerald-700">{stats.lokalPulau} Orang</div>
            <div className="text-[11px] text-emerald-600 font-semibold">{stats.lokalPct}% tinggal di pulau</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Daratan DKI Jakarta</div>
            <div className="text-xl font-bold text-sky-700">{stats.daratanDki} Orang</div>
            <div className="text-[11px] text-sky-600 font-semibold">{stats.daratanPct}% (komuter kapal)</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Luar DKI (Banten/Jabar)</div>
            <div className="text-xl font-bold text-amber-700">{stats.luarDki} Orang</div>
            <div className="text-[11px] text-amber-600 font-semibold">{stats.luarPct}% Tangerang/Bekasi</div>
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Proporsi Domisili Tempat Tinggal
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Perbandingan pegawai tinggal di pulau vs daratan
            </p>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any) => [`${val} Pegawai (${((Number(val || 0) / stats.total) * 100).toFixed(1)}%)`, 'Jumlah']}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart by Kab/Kota */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Sebaran Wilayah Kabupaten / Kota Tempat Tinggal
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Distribusi domisili staf di Kepulauan Seribu, Jakarta Utara, Tangerang, dan sekitarnya
          </p>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.kabChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  angle={-15} 
                  textAnchor="end" 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip 
                  formatter={(val: any) => [`${val} Pegawai`, 'Jumlah']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama, NIP, alamat, kelurahan..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={filterWilayah}
              onChange={(e) => setFilterWilayah(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Kategori Wilayah</option>
              <option value="Lokal Kepulauan Seribu">Lokal Kep. Seribu</option>
              <option value="Daratan DKI Jakarta">Daratan DKI Jakarta</option>
              <option value="Luar DKI (Banten/Jabar)">Luar DKI</option>
            </select>

            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Unit Tugas</option>
              <option value="Puskesmas Kepulauan Seribu Selatan">Puskesmas Kec. Seribu Selatan</option>
              <option value="Puskesmas Pembantu Pulau Pari">Pustu Pulau Pari</option>
              <option value="Puskesmas Pembantu Pulau Lancang">Pustu Pulau Lancang</option>
              <option value="Puskesmas Pembantu Pulau Untung Jawa">Pustu Pulau Untung Jawa</option>
            </select>

            <select
              value={filterKabKota}
              onChange={(e) => setFilterKabKota(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Kab / Kota</option>
              {kabKotaList.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors ml-auto md:ml-0"
              title="Unduh data domisili format CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>

            <button
              id="btn-cetak-pdf-domisili"
              onClick={handlePrintPdfNewTab}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs"
              title="Buka dan Cetak Dokumen Domisili Staf di Tab Baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Cetak PDF (Tab Baru)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Domicile Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800">
            Daftar Alamat & Domisili Staf ({filteredRows.length} dari {sheet.rows.length} Pegawai)
          </div>
          <span className="text-[11px] text-slate-500">
            Klik tombol pensil pada baris untuk mengubah alamat tinggal
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 min-w-[200px]">Nama Lengkap & NIP</th>
                <th className="py-3 px-3 min-w-[170px]">Tempat Tugas</th>
                <th className="py-3 px-3 min-w-[140px]">Kategori Wilayah</th>
                <th className="py-3 px-3 min-w-[150px]">Kab / Kota</th>
                <th className="py-3 px-3 min-w-[130px]">Kecamatan</th>
                <th className="py-3 px-3 min-w-[130px]">Kelurahan</th>
                <th className="py-3 px-3 min-w-[260px]">Alamat Tempat Tinggal</th>
                <th className="py-3 px-3 min-w-[120px]">Kontak HP</th>
                <th className="py-3 px-3 w-16 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((staff, idx) => {
                const isIsland = (staff.domisili_wilayah || '').includes('Lokal');
                const isDaratan = (staff.domisili_wilayah || '').includes('Daratan');

                return (
                  <tr key={staff._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{staff.nama_gelar || staff.nama}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{staff.nip && staff.nip !== '-' ? staff.nip : staff.nik || '-'}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {staff.tempat_tugas}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        isIsland
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isDaratan
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {staff.domisili_wilayah || 'Lokal Kep. Seribu'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {staff.kab_kota || '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {staff.kecamatan || '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {staff.kelurahan || '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-700 text-[11px] max-w-xs truncate" title={staff.alamat}>
                      {staff.alamat || '-'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {staff.nomor_hp || '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleStartEdit(staff)}
                        title="Edit Alamat Domisili"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Domicile Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900">
                  Perbarui Alamat Domisili
                </h3>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="font-semibold text-slate-900">{editingStaff.nama_gelar || editingStaff.nama}</div>
                <div className="text-slate-500">{editingStaff.jabatan} — {editingStaff.tempat_tugas}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kategori Wilayah
                </label>
                <select
                  value={formWilayah}
                  onChange={(e) => setFormWilayah(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                >
                  <option value="Lokal Kepulauan Seribu">Lokal Kepulauan Seribu (Tinggal di Pulau)</option>
                  <option value="Daratan DKI Jakarta">Daratan DKI Jakarta (Komuter Kapal)</option>
                  <option value="Luar DKI (Banten/Jabar)">Luar DKI (Banten / Jawa Barat)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kabupaten / Kota
                </label>
                <input
                  type="text"
                  value={formKabKota}
                  onChange={(e) => setFormKabKota(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kecamatan
                  </label>
                  <input
                    type="text"
                    value={formKecamatan}
                    onChange={(e) => setFormKecamatan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kelurahan / Pulau
                  </label>
                  <input
                    type="text"
                    value={formKelurahan}
                    onChange={(e) => setFormKelurahan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alamat Lengkap (Jalan, RT/RW, No. Rumah)
                </label>
                <textarea
                  rows={2}
                  value={formAlamat}
                  onChange={(e) => setFormAlamat(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingStaff(null)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
