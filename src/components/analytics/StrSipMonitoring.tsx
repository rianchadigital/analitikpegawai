import React, { useState, useMemo } from 'react';
import { 
  BadgeCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Download, 
  Edit3, 
  X, 
  Stethoscope,
  ShieldAlert,
  FileCheck,
  UserCheck,
  ExternalLink,
  Printer
} from 'lucide-react';
import { Sheet, RowData } from '../../types/sheet';
import { printReportInNewTab } from '../../utils/pdfReportGenerator';

interface StrSipMonitoringProps {
  sheet: Sheet;
  onUpdateRow?: (rowId: string, updatedFields: Partial<RowData>) => void;
}

export const StrSipMonitoring: React.FC<StrSipMonitoringProps> = ({ sheet, onUpdateRow }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'STR_EXP' | 'SIP_EXP' | 'SIP_ACTIVE' | 'STR_ACTIVE'>('ALL');
  const [filterProfesi, setFilterProfesi] = useState<string>('ALL');
  const [filterUnit, setFilterUnit] = useState<string>('ALL');
  const [editingStaff, setEditingStaff] = useState<RowData | null>(null);

  // Edit form state
  const [formNoStr, setFormNoStr] = useState('');
  const [formMasaStr, setFormMasaStr] = useState('');
  const [formStatusStr, setFormStatusStr] = useState('');
  const [formNoSip, setFormNoSip] = useState('');
  const [formMasaSip, setFormMasaSip] = useState('');
  const [formStatusSip, setFormStatusSip] = useState('');

  // Tenaga Kesehatan only
  const nakesRows = useMemo(() => {
    return sheet.rows.filter(r => r.jenis_tenaga === 'Tenaga Kesehatan');
  }, [sheet.rows]);

  // Aggregate stats
  const stats = useMemo(() => {
    let strAktif = 0;
    let strExpiring = 0;
    let strExpired = 0;
    let sipAktif = 0;
    let sipExpiring = 0;
    let sipExpired = 0;

    nakesRows.forEach(r => {
      const sStr = r.status_str || '';
      if (sStr.includes('Aktif') || sStr.includes('Seumur Hidup')) strAktif++;
      else if (sStr.includes('Segera')) strExpiring++;
      else if (sStr.includes('Kadaluarsa')) strExpired++;

      const sSip = r.status_sip || '';
      if (sSip === 'Aktif') sipAktif++;
      else if (sSip.includes('Segera')) sipExpiring++;
      else if (sSip.includes('Kadaluarsa')) sipExpired++;
    });

    return {
      totalNakes: nakesRows.length,
      strAktif,
      strPerluPerhatian: strExpiring + strExpired,
      strExpiring,
      strExpired,
      sipAktif,
      sipExpiring,
      sipExpired,
      sipPerluPerpanjangan: sipExpiring + sipExpired
    };
  }, [nakesRows]);

  // Available unique professions
  const professions = useMemo(() => {
    const set = new Set<string>();
    nakesRows.forEach(r => {
      const j = r.jabatan || '';
      if (j.toLowerCase().includes('dokter')) set.add('Dokter');
      else if (j.toLowerCase().includes('bidan')) set.add('Bidan');
      else if (j.toLowerCase().includes('perawat')) set.add('Perawat');
      else if (j.toLowerCase().includes('sanitarian') || j.toLowerCase().includes('sanitasi')) set.add('Sanitarian / Kesling');
      else if (j.toLowerCase().includes('nutrisionis') || j.toLowerCase().includes('gizi')) set.add('Nutrisionis / Gizi');
      else if (j.toLowerCase().includes('farmasi') || j.toLowerCase().includes('apoteker')) set.add('Farmasi / Apoteker');
      else if (j.toLowerCase().includes('laboratorium') || j.toLowerCase().includes('pranata')) set.add('Laboratorium / ATLM');
      else set.add('Nakes Lainnya');
    });
    return Array.from(set);
  }, [nakesRows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return nakesRows.filter(r => {
      if (filterUnit !== 'ALL' && r.tempat_tugas !== filterUnit) return false;

      // Profesi filter
      if (filterProfesi !== 'ALL') {
        const j = (r.jabatan || '').toLowerCase();
        if (filterProfesi === 'Dokter' && !j.includes('dokter')) return false;
        if (filterProfesi === 'Bidan' && !j.includes('bidan')) return false;
        if (filterProfesi === 'Perawat' && !j.includes('perawat')) return false;
        if (filterProfesi === 'Sanitarian / Kesling' && !(j.includes('sanitarian') || j.includes('sanitasi'))) return false;
        if (filterProfesi === 'Nutrisionis / Gizi' && !(j.includes('nutrisionis') || j.includes('gizi'))) return false;
        if (filterProfesi === 'Farmasi / Apoteker' && !(j.includes('farmasi') || j.includes('apoteker'))) return false;
        if (filterProfesi === 'Laboratorium / ATLM' && !(j.includes('laboratorium') || j.includes('pranata'))) return false;
      }

      // Quick tab filter
      if (filterTab === 'STR_ACTIVE' && !((r.status_str || '').includes('Aktif') || (r.status_str || '').includes('Seumur'))) return false;
      if (filterTab === 'STR_EXP' && !((r.status_str || '').includes('Segera') || (r.status_str || '').includes('Kadaluarsa'))) return false;
      if (filterTab === 'SIP_ACTIVE' && r.status_sip !== 'Aktif') return false;
      if (filterTab === 'SIP_EXP' && !((r.status_sip || '').includes('Segera') || (r.status_sip || '').includes('Kadaluarsa'))) return false;

      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = (r.nama || '').toLowerCase().includes(q) || (r.nama_gelar || '').toLowerCase().includes(q);
        const matchJab = (r.jabatan || '').toLowerCase().includes(q);
        const matchStr = (r.no_str || '').toLowerCase().includes(q);
        const matchSip = (r.no_sip || '').toLowerCase().includes(q);
        return matchName || matchJab || matchStr || matchSip;
      }

      return true;
    });
  }, [nakesRows, filterUnit, filterProfesi, filterTab, searchTerm]);

  // Open edit modal
  const handleStartEdit = (staff: RowData) => {
    setEditingStaff(staff);
    setFormNoStr(staff.no_str || '');
    setFormMasaStr(staff.masa_berlaku_str || 'Seumur Hidup');
    setFormStatusStr(staff.status_str || 'Aktif / Seumur Hidup');
    setFormNoSip(staff.no_sip || '');
    setFormMasaSip(staff.masa_berlaku_sip || '');
    setFormStatusSip(staff.status_sip || 'Aktif');
  };

  // Save edit
  const handleSaveEdit = () => {
    if (!editingStaff || !onUpdateRow) return;
    onUpdateRow(editingStaff._id, {
      no_str: formNoStr,
      masa_berlaku_str: formMasaStr,
      status_str: formStatusStr,
      no_sip: formNoSip,
      masa_berlaku_sip: formMasaSip,
      status_sip: formStatusSip
    });
    setEditingStaff(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['No', 'Nama & Gelar', 'Jabatan', 'Unit Tugas', 'No. STR', 'Masa Berlaku STR', 'Status STR', 'No. SIP', 'Masa Berlaku SIP', 'Status SIP'];
    const rows = filteredRows.map((r, i) => [
      i + 1,
      `"${r.nama_gelar || r.nama || ''}"`,
      `"${r.jabatan || ''}"`,
      `"${r.tempat_tugas || ''}"`,
      `"${r.no_str || ''}"`,
      `"${r.masa_berlaku_str || ''}"`,
      `"${r.status_str || ''}"`,
      `"${r.no_sip || ''}"`,
      `"${r.masa_berlaku_sip || ''}"`,
      `"${r.status_sip || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Monitoring_STR_SIP_SDMK_Puskesmas.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handler Cetak PDF Tab Baru
  const handlePrintPdfNewTab = () => {
    const statsHtml = `
      <div class="stats-container">
        <div class="stat-card">
          <div class="label">Total Tenaga Kesehatan</div>
          <div class="val">${stats.totalNakes} <span style="font-size:9pt;font-weight:normal;">Orang</span></div>
        </div>
        <div class="stat-card">
          <div class="label">STR Aktif / Seumur Hidup</div>
          <div class="val" style="color:#059669;">${stats.strAktif} <span style="font-size:9pt;font-weight:normal;">(${((stats.strAktif / (stats.totalNakes || 1)) * 100).toFixed(1)}%)</span></div>
        </div>
        <div class="stat-card">
          <div class="label">SIP Aktif Berlaku</div>
          <div class="val" style="color:#0284c7;">${stats.sipAktif} <span style="font-size:9pt;font-weight:normal;">Orang</span></div>
        </div>
        <div class="stat-card">
          <div class="label">SIP Perlu Perpanjangan / Expired</div>
          <div class="val" style="color:#e11d48;">${stats.sipPerluPerpanjangan} <span style="font-size:9pt;font-weight:normal;">Orang</span></div>
        </div>
      </div>
    `;

    let rowsHtml = '';
    filteredRows.forEach((r, idx) => {
      const isStrOk = (r.status_str || '').toLowerCase().includes('aktif') || (r.status_str || '').toLowerCase().includes('seumur');
      const isSipOk = (r.status_sip || '').toLowerCase().includes('aktif');
      const isSipWarning = (r.status_sip || '').toLowerCase().includes('segera') || (r.status_sip || '').toLowerCase().includes('perpanjang');

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
            <div style="font-family:monospace; font-size:7.5pt; font-weight:700; color:#0f172a;">${r.no_str || '-'}</div>
            <div style="font-size:7.5pt; color:#475569;">s/d: ${r.masa_berlaku_str || 'Seumur Hidup'}</div>
          </td>
          <td style="text-align:center;">
            <span class="badge ${isStrOk ? 'badge-pppk' : 'badge-danger'}">
              ${r.status_str || 'Aktif'}
            </span>
          </td>
          <td>
            <div style="font-family:monospace; font-size:7.5pt; font-weight:700; color:#0f172a;">${r.no_sip || '-'}</div>
            <div style="font-size:7.5pt; color:#475569;">s/d: ${r.masa_berlaku_sip || '-'}</div>
          </td>
          <td style="text-align:center;">
            <span class="badge ${isSipOk ? 'badge-pns' : isSipWarning ? 'badge-warning' : 'badge-danger'}">
              ${r.status_sip || 'Aktif'}
            </span>
          </td>
        </tr>
      `;
    });

    const tableHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:35px; text-align:center;">No</th>
            <th style="width:190px;">Nama Tenaga Medis / Nakes</th>
            <th style="width:170px;">Jabatan & Satuan Kerja</th>
            <th style="width:160px;">Nomor & Masa STR</th>
            <th style="width:95px; text-align:center;">Status STR</th>
            <th style="width:160px;">Nomor & Masa SIP</th>
            <th style="width:105px; text-align:center;">Status SIP</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="7" style="text-align:center; padding:20px;">Tidak ada data tenaga kesehatan</td></tr>'}
        </tbody>
      </table>
    `;

    printReportInNewTab({
      title: 'LAPORAN MONITORING & KEPATUHAN STR - SIP TENAGA KESEHATAN',
      subtitle: `Berdasarkan Regulasi UU Kesehatan No. 17 Tahun 2023 • Tab: [${filterTab}] • Profesi: [${filterProfesi}] • Unit: [${filterUnit}]`,
      orientation: 'landscape',
      tableHtml,
      statsHtml
    });
  };

  return (
    <div className="space-y-6">
      {/* Executive KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Total Tenaga Kesehatan</div>
            <div className="text-xl font-bold text-slate-900">{stats.totalNakes} Orang</div>
            <div className="text-[11px] text-slate-500">Dokter, Perawat, Bidan, Nakes Lain</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BadgeCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">STR Aktif / Seumur Hidup</div>
            <div className="text-xl font-bold text-emerald-700">{stats.strAktif} Orang</div>
            <div className="text-[11px] text-emerald-600 font-medium">
              {((stats.strAktif / (stats.totalNakes || 1)) * 100).toFixed(1)}% Kepatuhan STR
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">SIP Aktif Berlaku</div>
            <div className="text-xl font-bold text-sky-700">{stats.sipAktif} Orang</div>
            <div className="text-[11px] text-sky-600 font-medium">Izin praktik operasional</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">SIP Perlu Perpanjangan</div>
            <div className="text-xl font-bold text-rose-700">{stats.sipPerluPerpanjangan} Orang</div>
            <div className="text-[11px] text-rose-600 font-medium">{stats.sipExpiring} segera habis, {stats.sipExpired} expired</div>
          </div>
        </div>
      </div>

      {/* Regulation Banner */}
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-xs">
        <BadgeCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="text-slate-700 space-y-1">
          <p className="font-bold text-blue-950">
            Pembaruan Regulasi UU Kesehatan No. 17 Tahun 2023
          </p>
          <p>
            Surat Tanda Registrasi (STR) kini berlaku <strong>Seumur Hidup</strong> setelah proses integrasi SatuSehat SDMK. 
            Sedangkan Surat Izin Praktik (SIP) tetap memiliki masa berlaku <strong>5 tahun</strong> dan wajib diperpanjang melalui PTSP dengan kecukupan SKP.
          </p>
        </div>
      </div>

      {/* Control Bar: Filters & Quick Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Nakes ({stats.totalNakes})
          </button>

          <button
            onClick={() => setFilterTab('SIP_EXP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterTab === 'SIP_EXP'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>SIP Perlu Perpanjangan ({stats.sipPerluPerpanjangan})</span>
          </button>

          <button
            onClick={() => setFilterTab('SIP_ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterTab === 'SIP_ACTIVE'
                ? 'bg-sky-700 text-white shadow-xs'
                : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
            }`}
          >
            SIP Aktif ({stats.sipAktif})
          </button>

          <button
            onClick={() => setFilterTab('STR_EXP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterTab === 'STR_EXP'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>STR Perlu Perhatian ({stats.strPerluPerhatian})</span>
          </button>

          <button
            onClick={() => setFilterTab('STR_ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterTab === 'STR_ACTIVE'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            STR Aktif / Seumur Hidup ({stats.strAktif})
          </button>
        </div>

        {/* Search & Select Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama, jabatan, no. STR, SIP..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={filterProfesi}
              onChange={(e) => setFilterProfesi(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Rumpun Profesi</option>
              {professions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Unit Kerja</option>
              <option value="Puskesmas Kepulauan Seribu Selatan">Puskesmas Kec. Seribu Selatan</option>
              <option value="Puskesmas Pembantu Pulau Pari">Pustu Pulau Pari</option>
              <option value="Puskesmas Pembantu Pulau Lancang">Pustu Pulau Lancang</option>
              <option value="Puskesmas Pembantu Pulau Untung Jawa">Pustu Pulau Untung Jawa</option>
            </select>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors ml-auto md:ml-0"
              title="Unduh laporan kepatuhan format CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>

            <button
              id="btn-cetak-pdf-str-sip"
              onClick={handlePrintPdfNewTab}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs"
              title="Buka dan Cetak Dokumen Monitoring STR - SIP di Tab Baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Cetak PDF (Tab Baru)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monitoring Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 min-w-[210px]">Nama Tenaga Kesehatan</th>
                <th className="py-3 px-3 min-w-[180px]">Jabatan / Profesi</th>
                <th className="py-3 px-3 min-w-[180px]">Tempat Tugas</th>
                <th className="py-3 px-3 min-w-[160px]">Nomor STR</th>
                <th className="py-3 px-3 min-w-[130px]">Status STR</th>
                <th className="py-3 px-3 min-w-[180px]">Nomor SIP</th>
                <th className="py-3 px-3 min-w-[120px]">Masa Berlaku SIP</th>
                <th className="py-3 px-3 min-w-[130px]">Status SIP</th>
                <th className="py-3 px-3 w-16 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((staff, idx) => {
                const isStrOk = (staff.status_str || '').includes('Aktif') || (staff.status_str || '').includes('Seumur');
                const isStrExp = (staff.status_str || '').includes('Segera');
                const isSipOk = staff.status_sip === 'Aktif';
                const isSipExp = (staff.status_sip || '').includes('Segera');

                return (
                  <tr key={staff._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{staff.nama_gelar || staff.nama}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{staff.nip && staff.nip !== '-' ? staff.nip : 'NON-PNS'}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {staff.jabatan}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {staff.tempat_tugas}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {staff.no_str || '-'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 w-fit ${
                        isStrOk
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isStrExp
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {isStrOk && <CheckCircle2 className="w-3 h-3" />}
                        {isStrExp && <AlertTriangle className="w-3 h-3" />}
                        <span>{staff.status_str || 'Aktif'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 text-[11px]">
                      {staff.no_sip || '-'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {staff.masa_berlaku_sip || '-'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 w-fit ${
                        isSipOk
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : isSipExp
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {isSipOk && <CheckCircle2 className="w-3 h-3" />}
                        {isSipExp && <AlertTriangle className="w-3 h-3" />}
                        <span>{staff.status_sip || 'Aktif'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleStartEdit(staff)}
                        title="Edit STR / SIP Pegawai"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
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

      {/* Edit STR / SIP Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">
                  Perbarui Legalitas Nakes
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

              {/* STR Section */}
              <div className="p-3 border border-slate-200 rounded-xl space-y-2.5">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Surat Tanda Registrasi (STR)</span>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Nomor STR</label>
                  <input
                    type="text"
                    value={formNoStr}
                    onChange={(e) => setFormNoStr(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-1">Masa Berlaku</label>
                    <input
                      type="text"
                      value={formMasaStr}
                      onChange={(e) => setFormMasaStr(e.target.value)}
                      placeholder="Seumur Hidup / Tgl"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Status STR</label>
                    <select
                      value={formStatusStr}
                      onChange={(e) => setFormStatusStr(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
                    >
                      <option value="Aktif / Seumur Hidup">Aktif / Seumur Hidup</option>
                      <option value="Aktif">Aktif</option>
                      <option value="Segera Habis">Segera Habis</option>
                      <option value="Kadaluarsa">Kadaluarsa</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SIP Section */}
              <div className="p-3 border border-slate-200 rounded-xl space-y-2.5">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Surat Izin Praktik (SIP)</span>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Nomor SIP</label>
                  <input
                    type="text"
                    value={formNoSip}
                    onChange={(e) => setFormNoSip(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-1">Masa Berlaku</label>
                    <input
                      type="text"
                      value={formMasaSip}
                      onChange={(e) => setFormMasaSip(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Status SIP</label>
                    <select
                      value={formStatusSip}
                      onChange={(e) => setFormStatusSip(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Segera Berakhir">Segera Berakhir</option>
                      <option value="Kadaluarsa">Kadaluarsa</option>
                    </select>
                  </div>
                </div>
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
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors shadow-xs"
              >
                Simpan Legalitas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
