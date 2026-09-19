import React, { useState, useMemo } from 'react';
import { 
  UserMinus, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Download, 
  Search, 
  Filter, 
  ArrowUpRight,
  TrendingDown,
  Award,
  Users,
  ExternalLink,
  Printer
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Sheet, RowData } from '../../types/sheet';
import { printReportInNewTab } from '../../utils/pdfReportGenerator';

interface ProyeksiPensiunProps {
  sheet: Sheet;
}

export const ProyeksiPensiun: React.FC<ProyeksiPensiunProps> = ({ sheet }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSisa, setFilterSisa] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterUnit, setFilterUnit] = useState<string>('ALL');

  // Stats calculation
  const stats = useMemo(() => {
    let under1Year = 0;
    let oneToThreeYears = 0;
    let threeToFiveYears = 0;
    let aboveFiveYears = 0;
    let totalSisa = 0;
    let validCount = 0;

    const yearCounts: Record<string, { year: string; pns: number; nonPns: number; total: number }> = {};

    sheet.rows.forEach(r => {
      const sisa = r.sisa_pensiun_tahun;
      const isPns = (r.status_kepegawaian || '').includes('PNS') || (r.status_kepegawaian || '').includes('PPPK');

      if (typeof sisa === 'number' && sisa >= 0) {
        totalSisa += sisa;
        validCount++;

        if (sisa <= 1) under1Year++;
        else if (sisa <= 3) oneToThreeYears++;
        else if (sisa <= 5) threeToFiveYears++;
        else aboveFiveYears++;
      }

      // Year extraction from tanggal_pensiun (e.g. "01/05/2026" or "2026")
      const tglPensiun = r.tanggal_pensiun || '';
      let matchYear = tglPensiun.match(/\b(20\d{2})\b/);
      if (matchYear) {
        const y = matchYear[1];
        if (!yearCounts[y]) {
          yearCounts[y] = { year: y, pns: 0, nonPns: 0, total: 0 };
        }
        if (isPns) yearCounts[y].pns++;
        else yearCounts[y].nonPns++;
        yearCounts[y].total++;
      }
    });

    const avgSisa = validCount > 0 ? (totalSisa / validCount).toFixed(1) : '0';

    // Sort timeline
    const timelineData = Object.values(yearCounts)
      .sort((a, b) => parseInt(a.year, 10) - parseInt(b.year, 10))
      .slice(0, 10); // next 10 years

    return {
      totalStaff: sheet.rows.length,
      under1Year,
      oneToThreeYears,
      threeToFiveYears,
      aboveFiveYears,
      mendekatiPensiun: under1Year + oneToThreeYears + threeToFiveYears,
      avgSisa,
      timelineData
    };
  }, [sheet.rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return sheet.rows.filter(r => {
      const sisa = r.sisa_pensiun_tahun;

      if (filterStatus !== 'ALL' && r.status_kepegawaian !== filterStatus) return false;
      if (filterUnit !== 'ALL' && r.tempat_tugas !== filterUnit) return false;

      if (filterSisa === 'UNDER_1') {
        if (typeof sisa !== 'number' || sisa > 1) return false;
      } else if (filterSisa === '1_TO_3') {
        if (typeof sisa !== 'number' || sisa <= 1 || sisa > 3) return false;
      } else if (filterSisa === '3_TO_5') {
        if (typeof sisa !== 'number' || sisa <= 3 || sisa > 5) return false;
      } else if (filterSisa === 'ABOVE_5') {
        if (typeof sisa !== 'number' || sisa <= 5) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = (r.nama || '').toLowerCase().includes(q) || (r.nama_gelar || '').toLowerCase().includes(q);
        const matchNip = (r.nip || '').toLowerCase().includes(q);
        const matchJab = (r.jabatan || '').toLowerCase().includes(q);
        return matchName || matchNip || matchJab;
      }

      return true;
    }).sort((a, b) => {
      // Sort nearest retirement first
      const sa = typeof a.sisa_pensiun_tahun === 'number' ? a.sisa_pensiun_tahun : 999;
      const sb = typeof b.sisa_pensiun_tahun === 'number' ? b.sisa_pensiun_tahun : 999;
      return sa - sb;
    });
  }, [sheet.rows, filterStatus, filterUnit, filterSisa, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['No', 'Nama Pegawai', 'NIP', 'Status Kepegawaian', 'Jabatan', 'Unit Tugas', 'Usia (Tahun)', 'Tanggal Pensiun', 'Sisa Masa Kerja', 'Sisa (Tahun)'];
    const rows = filteredRows.map((r, i) => [
      i + 1,
      `"${r.nama_gelar || r.nama || ''}"`,
      `"${r.nip || ''}"`,
      `"${r.status_kepegawaian || ''}"`,
      `"${r.jabatan || ''}"`,
      `"${r.tempat_tugas || ''}"`,
      r.usia_tahun || '',
      `"${r.tanggal_pensiun || ''}"`,
      `"${r.sisa_pensiun || ''}"`,
      r.sisa_pensiun_tahun ?? ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nominatif_Proyeksi_Pensiun_SDMK.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handler Cetak PDF Tab Baru
  const handlePrintPdfNewTab = () => {
    const statsHtml = `
      <div class="stats-container">
        <div class="stat-card">
          <div class="label">Mendekati Pensiun (&lt; 5 Thn)</div>
          <div class="val" style="color:#d97706;">${stats.mendekatiPensiun} <span style="font-size:9pt;font-weight:normal;">Orang</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Pensiun Kritis (&lt; 1 Tahun)</div>
          <div class="val" style="color:#e11d48;">${stats.under1Year} <span style="font-size:9pt;font-weight:normal;">Orang</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Pensiun 1 - 3 Tahun</div>
          <div class="val" style="color:#0284c7;">${stats.oneToThreeYears} <span style="font-size:9pt;font-weight:normal;">Orang</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Rata-rata Sisa Masa Kerja</div>
          <div class="val" style="color:#059669;">${stats.avgSisa} <span style="font-size:9pt;font-weight:normal;">Tahun</span></div>
        </div>
      </div>
    `;

    let rowsHtml = '';
    filteredRows.forEach((r, idx) => {
      const sisaThn = typeof r.sisa_pensiun_tahun === 'number' ? r.sisa_pensiun_tahun : 99;
      let badgeCls = 'badge-pppk';
      let statusSuksesi = 'Aman (> 5 thn)';
      if (sisaThn <= 1) {
        badgeCls = 'badge-danger';
        statusSuksesi = 'Sangat Kritis (< 1 thn)';
      } else if (sisaThn <= 3) {
        badgeCls = 'badge-warning';
        statusSuksesi = 'Prioritas Suksesi (1-3 thn)';
      } else if (sisaThn <= 5) {
        badgeCls = 'badge-pns';
        statusSuksesi = 'Perlu Kaderisasi (3-5 thn)';
      }

      rowsHtml += `
        <tr>
          <td style="text-align:center; font-weight:700;">${idx + 1}</td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${r.nama_gelar || r.nama || '-'}</div>
            <div style="font-size:7.5pt; color:#64748b; font-family:monospace;">${r.nip ? 'NIP ' + r.nip : 'NIK ' + (r.nik || '-')}</div>
          </td>
          <td>
            <div style="font-weight:700;">${r.status_kepegawaian || '-'}</div>
            <div style="font-size:7.5pt; color:#64748b;">${r.pangkat_golongan || '-'}</div>
          </td>
          <td>
            <div style="font-weight:600; color:#1e293b;">${r.jabatan || '-'}</div>
            <div style="font-size:7.5pt; color:#64748b;">${r.tempat_tugas || '-'}</div>
          </td>
          <td style="text-align:right; font-weight:700; font-size:9.5pt;">
            ${r.usia_tahun ? r.usia_tahun + ' th' : '-'}
          </td>
          <td style="text-align:center; font-weight:600; color:#0f172a;">
            ${r.tanggal_pensiun || '-'}
          </td>
          <td style="text-align:center; font-weight:700; color:#1d4ed8;">
            ${r.sisa_pensiun || (sisaThn < 90 ? sisaThn + ' Tahun' : '-')}
          </td>
          <td style="text-align:center;">
            <span class="badge ${badgeCls}">${statusSuksesi}</span>
          </td>
        </tr>
      `;
    });

    const tableHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:35px; text-align:center;">No</th>
            <th style="width:200px;">Nama Pegawai & NIP</th>
            <th style="width:110px;">Status / Gol</th>
            <th style="width:180px;">Jabatan & Unit Kerja</th>
            <th style="width:70px; text-align:right;">Usia</th>
            <th style="width:120px; text-align:center;">Tgl Pensiun (BUP)</th>
            <th style="width:120px; text-align:center;">Sisa Masa Kerja</th>
            <th style="width:130px; text-align:center;">Status Suksesi</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="8" style="text-align:center; padding:20px;">Tidak ada data proyeksi pensiun</td></tr>'}
        </tbody>
      </table>
    `;

    printReportInNewTab({
      title: 'DAFTAR NOMINATIF PROYEKSI PENSIUN & RENCANA SUKSESI SDMK',
      subtitle: `Filter: Status [${filterStatus}] • Unit [${filterUnit}] • Sisa [${filterSisa}] • Total [${filteredRows.length} Pegawai]`,
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
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <UserMinus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Mendekati Pensiun (&lt; 5 Thn)</div>
            <div className="text-xl font-bold text-amber-700">{stats.mendekatiPensiun} Orang</div>
            <div className="text-[11px] text-amber-600 font-medium">Perlu perencanaan kaderisasi</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Kritis (&lt; 1 Tahun)</div>
            <div className="text-xl font-bold text-rose-700">{stats.under1Year} Orang</div>
            <div className="text-[11px] text-rose-600 font-medium">Pensiun tahun ini / segera</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Pensiun 1 - 3 Tahun</div>
            <div className="text-xl font-bold text-blue-700">{stats.oneToThreeYears} Orang</div>
            <div className="text-[11px] text-blue-600 font-medium">Jangka pendek (2027-2029)</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Rata-rata Sisa Masa Kerja</div>
            <div className="text-xl font-bold text-emerald-700">{stats.avgSisa} Tahun</div>
            <div className="text-[11px] text-emerald-600 font-medium">Rentang produktivitas SDMK</div>
          </div>
        </div>
      </div>

      {/* Chart Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Proyeksi Pensiun Pegawai Tahunan (Timeline Suksesi)
            </h3>
            <p className="text-xs text-slate-500">
              Estimasi pelepasan masa tugas pegawai per tahun untuk antisipasi formasi pengganti
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded-lg">
            10 Tahun Ke Depan
          </span>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip 
                formatter={(val: any, name: any) => [
                  `${val} Pegawai`, 
                  name === 'pns' ? 'PNS / PPPK' : name === 'nonPns' ? 'Non-PNS' : 'Total'
                ]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="pns" name="PNS / PPPK" stackId="a" fill="#0284c7" radius={[0, 0, 0, 0]} />
              <Bar dataKey="nonPns" name="Non-PNS" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
              placeholder="Cari nama, NIP, jabatan..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={filterSisa}
              onChange={(e) => setFilterSisa(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Sisa Masa Kerja</option>
              <option value="UNDER_1">Kritis (&lt; 1 Tahun)</option>
              <option value="1_TO_3">1 - 3 Tahun</option>
              <option value="3_TO_5">3 - 5 Tahun</option>
              <option value="ABOVE_5">&gt; 5 Tahun</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Status Kepegawaian</option>
              <option value="PNS">PNS</option>
              <option value="PPPK">PPPK</option>
              <option value="NON PNS">NON PNS</option>
              <option value="PJLP">PJLP</option>
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
              title="Unduh nominatif proyeksi pensiun format CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Nominatif</span>
            </button>

            <button
              id="btn-cetak-pdf-pensiun"
              onClick={handlePrintPdfNewTab}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs"
              title="Buka dan Cetak Dokumen Proyeksi Pensiun di Tab Baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Cetak PDF (Tab Baru)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Nominative Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 min-w-[210px]">Nama Pegawai & NIP</th>
                <th className="py-3 px-3 min-w-[130px]">Status / Gol</th>
                <th className="py-3 px-3 min-w-[180px]">Jabatan</th>
                <th className="py-3 px-3 min-w-[180px]">Tempat Tugas</th>
                <th className="py-3 px-3 min-w-[100px] text-right">Usia</th>
                <th className="py-3 px-3 min-w-[130px]">Tgl Pensiun</th>
                <th className="py-3 px-3 min-w-[140px]">Sisa Masa Kerja</th>
                <th className="py-3 px-3 min-w-[130px]">Status Suksesi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((staff, idx) => {
                const sisa = staff.sisa_pensiun_tahun;
                const isUnder1 = typeof sisa === 'number' && sisa <= 1;
                const is1to3 = typeof sisa === 'number' && sisa > 1 && sisa <= 3;
                const is3to5 = typeof sisa === 'number' && sisa > 3 && sisa <= 5;

                return (
                  <tr key={staff._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{staff.nama_gelar || staff.nama}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{staff.nip && staff.nip !== '-' ? staff.nip : 'NON-PNS'}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800">{staff.status_kepegawaian}</span>
                      {staff.gol && staff.gol !== '-' && (
                        <span className="ml-1.5 text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          {staff.gol}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {staff.jabatan}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {staff.tempat_tugas}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                      {staff.usia_tahun ? `${staff.usia_tahun} th` : '-'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 font-medium">
                      {staff.tanggal_pensiun || '-'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-mono text-slate-800 font-semibold">{staff.sisa_pensiun || '-'}</div>
                      {typeof sisa === 'number' && (
                        <div className="text-[11px] text-slate-400">({sisa.toFixed(1)} th tersisa)</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        isUnder1
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                          : is1to3
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : is3to5
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}>
                        {isUnder1 ? 'Segera Pensiun' : is1to3 ? 'Persiapan 1-3 Th' : is3to5 ? 'Jangka 3-5 Th' : 'Reguler (>5 Th)'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
