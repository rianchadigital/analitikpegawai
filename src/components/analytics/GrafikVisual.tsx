import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  Users, 
  Stethoscope, 
  Award, 
  Clock, 
  GraduationCap, 
  ShieldCheck, 
  Building2, 
  TrendingUp, 
  Download, 
  Filter, 
  RotateCcw,
  Sparkles,
  Layers,
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
import { Sheet } from '../../types/sheet';
import { printReportInNewTab } from '../../utils/pdfReportGenerator';

interface GrafikVisualProps {
  sheet: Sheet;
}

const PALETTE = {
  emerald: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
  blue: ['#0284c7', '#38bdf8', '#7dd3fc', '#bae6fd'],
  status: {
    PNS: '#0284c7',
    PPPK: '#059669',
    'NON PNS': '#f59e0b',
    PJLP: '#8b5cf6',
    CPNS: '#ec4899',
    Lainnya: '#94a3b8'
  },
  gender: {
    'Laki - Laki': '#0284c7',
    'Perempuan': '#ec4899'
  }
};

export const GrafikVisual: React.FC<GrafikVisualProps> = ({ sheet }) => {
  const [filterUnit, setFilterUnit] = useState('ALL');
  const [filterTenaga, setFilterTenaga] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [statusChartMode, setStatusChartMode] = useState<'bar' | 'pie'>('bar');
  const [unitChartMode, setUnitChartMode] = useState<'stacked' | 'grouped'>('stacked');

  // Filtered rows
  const activeRows = useMemo(() => {
    return sheet.rows.filter(r => {
      if (filterUnit !== 'ALL' && r.tempat_tugas !== filterUnit) return false;
      if (filterTenaga !== 'ALL' && r.jenis_tenaga !== filterTenaga) return false;
      if (filterStatus !== 'ALL' && r.status_kepegawaian !== filterStatus) return false;
      return true;
    });
  }, [sheet.rows, filterUnit, filterTenaga, filterStatus]);

  // Executive KPIs
  const kpis = useMemo(() => {
    const total = activeRows.length;
    let nakes = 0;
    let penunjang = 0;
    let asn = 0;
    let nonAsn = 0;
    let sumUsia = 0;
    let countUsia = 0;
    let sumMasa = 0;
    let countMasa = 0;
    let shift24 = 0;

    activeRows.forEach(r => {
      if (r.jenis_tenaga === 'Tenaga Kesehatan') nakes++;
      else penunjang++;

      const st = r.status_kepegawaian || '';
      if (st.includes('PNS') || st.includes('PPPK')) asn++;
      else nonAsn++;

      if (typeof r.usia_tahun === 'number' && r.usia_tahun > 0) {
        sumUsia += r.usia_tahun;
        countUsia++;
      }

      if (typeof r.masa_kerja_tahun === 'number' && r.masa_kerja_tahun >= 0) {
        sumMasa += r.masa_kerja_tahun;
        countMasa++;
      }

      if ((r.jam_kerja || '').includes('24')) shift24++;
    });

    return {
      total,
      nakes,
      penunjang,
      nakesPct: total ? ((nakes / total) * 100).toFixed(1) : '0',
      asn,
      nonAsn,
      asnPct: total ? ((asn / total) * 100).toFixed(1) : '0',
      avgUsia: countUsia ? (sumUsia / countUsia).toFixed(1) : '0',
      avgMasa: countMasa ? (sumMasa / countMasa).toFixed(1) : '0',
      shift24
    };
  }, [activeRows]);

  // 1. Status Kepegawaian Data (Bar & Donut)
  const statusBarData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeRows.forEach(r => {
      let s = (r.status_kepegawaian || 'Lainnya').trim();
      if (s === 'PPPK PW') s = 'PPPK';
      counts[s] = (counts[s] || 0) + 1;
    });

    const total = activeRows.length || 1;
    const order = ['PNS', 'PPPK', 'NON PNS', 'PJLP', 'CPNS', 'Lainnya'];

    return Object.entries(counts).map(([name, count]) => {
      const pct = ((count / total) * 100).toFixed(1);
      let color = PALETTE.status[name as keyof typeof PALETTE.status] || '#94a3b8';
      let category = 'Aparatur Sipil Negara (ASN)';
      if (name === 'NON PNS') category = 'Non-PNS / Kontrak';
      else if (name === 'PJLP') category = 'Penyedia Jasa Lainnya (PJLP)';
      else if (name === 'CPNS') category = 'Calon Pegawai Negeri';
      else if (name === 'Lainnya') category = 'Lainnya';

      return {
        name,
        count,
        value: count, // for PieChart
        pct: Number(pct),
        pctStr: `${pct}%`,
        color,
        category
      };
    }).sort((a, b) => {
      const idxA = order.indexOf(a.name);
      const idxB = order.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return b.count - a.count;
    });
  }, [activeRows]);

  // 2. Jenis Tenaga Pie Data
  const jenisTenagaPieData = useMemo(() => {
    return [
      { name: 'Tenaga Kesehatan', value: kpis.nakes, color: '#059669' },
      { name: 'Tenaga Penunjang', value: kpis.penunjang, color: '#64748b' }
    ];
  }, [kpis]);

  // 3. Kelompok Usia & Gender Data
  const usiaGenderData = useMemo(() => {
    const groups: Record<string, { group: string; pria: number; wanita: number }> = {
      '< 30 Thn': { group: '< 30 Thn', pria: 0, wanita: 0 },
      '30 - 39 Thn': { group: '30 - 39 Thn', pria: 0, wanita: 0 },
      '40 - 49 Thn': { group: '40 - 49 Thn', pria: 0, wanita: 0 },
      '50+ Thn': { group: '50+ Thn', pria: 0, wanita: 0 }
    };

    activeRows.forEach(r => {
      const u = typeof r.usia_tahun === 'number' ? r.usia_tahun : 0;
      const g = (r.jenis_kelamin || '').toLowerCase().includes('laki') ? 'pria' : 'wanita';

      let key = '30 - 39 Thn';
      if (u > 0 && u < 30) key = '< 30 Thn';
      else if (u >= 30 && u < 40) key = '30 - 39 Thn';
      else if (u >= 40 && u < 50) key = '40 - 49 Thn';
      else if (u >= 50) key = '50+ Thn';

      if (groups[key]) groups[key][g]++;
    });

    return Object.values(groups);
  }, [activeRows]);

  // 4. Sebaran Pegawai per Unit Tugas berdasarkan Status Kepegawaian
  const unitStatusData = useMemo(() => {
    const counts: Record<string, {
      name: string;
      shortName: string;
      PNS: number;
      PPPK: number;
      'NON PNS': number;
      PJLP: number;
      CPNS: number;
      Lainnya: number;
      total: number;
    }> = {};

    const standardUnits = [
      { id: 'Puskesmas Kepulauan Seribu Selatan', short: 'Puskesmas Induk' },
      { id: 'Puskesmas Pembantu Pulau Pari', short: 'Pustu P. Pari' },
      { id: 'Puskesmas Pembantu Pulau Lancang', short: 'Pustu P. Lancang' },
      { id: 'Puskesmas Pembantu Pulau Untung Jawa', short: 'Pustu P. Untung Jawa' }
    ];

    standardUnits.forEach(item => {
      counts[item.id] = {
        name: item.id,
        shortName: item.short,
        PNS: 0,
        PPPK: 0,
        'NON PNS': 0,
        PJLP: 0,
        CPNS: 0,
        Lainnya: 0,
        total: 0
      };
    });

    activeRows.forEach(r => {
      let u = (r.tempat_tugas || '').trim();
      let matchedKey = 'Puskesmas Kepulauan Seribu Selatan';

      if (u.includes('Pari')) matchedKey = 'Puskesmas Pembantu Pulau Pari';
      else if (u.includes('Lancang')) matchedKey = 'Puskesmas Pembantu Pulau Lancang';
      else if (u.includes('Untung Jawa')) matchedKey = 'Puskesmas Pembantu Pulau Untung Jawa';
      else if (u.includes('Seribu') || u.includes('Induk') || u.includes('Selatan')) matchedKey = 'Puskesmas Kepulauan Seribu Selatan';

      if (!counts[matchedKey]) {
        counts[matchedKey] = {
          name: matchedKey,
          shortName: matchedKey,
          PNS: 0,
          PPPK: 0,
          'NON PNS': 0,
          PJLP: 0,
          CPNS: 0,
          Lainnya: 0,
          total: 0
        };
      }

      let st = (r.status_kepegawaian || '').trim();
      if (st === 'PPPK PW') st = 'PPPK';

      if (st.includes('PNS') && !st.includes('NON') && !st.includes('CPNS')) {
        counts[matchedKey].PNS++;
      } else if (st.includes('PPPK')) {
        counts[matchedKey].PPPK++;
      } else if (st.includes('NON PNS') || st.includes('HONOR') || st.includes('KONTRAK')) {
        counts[matchedKey]['NON PNS']++;
      } else if (st.includes('PJLP')) {
        counts[matchedKey].PJLP++;
      } else if (st.includes('CPNS')) {
        counts[matchedKey].CPNS++;
      } else {
        counts[matchedKey].Lainnya++;
      }
      counts[matchedKey].total++;
    });

    return Object.values(counts);
  }, [activeRows]);

  // 5. Jenjang Pendidikan
  const pendidikanData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeRows.forEach(r => {
      const p = r.pendidikan || 'Lainnya';
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count
    })).sort((a, b) => b.count - a.count);
  }, [activeRows]);

  // 6. Top 8 Jabatan
  const topJabatanData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeRows.forEach(r => {
      const j = r.jabatan || 'Lainnya';
      counts[j] = (counts[j] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [activeRows]);

  // Export Dashboard Summary to CSV
  const handleExportSummary = () => {
    let csv = 'RINGKASAN GRAFIK ANALITIK SDMK PUSKESMAS KEPULAUAN SERIBU SELATAN\n\n';
    csv += `Total Pegawai Terpilih,${kpis.total}\n`;
    csv += `Tenaga Kesehatan,${kpis.nakes} (${kpis.nakesPct}%)\n`;
    csv += `Tenaga Penunjang,${kpis.penunjang}\n`;
    csv += `Status ASN (PNS/PPPK),${kpis.asn} (${kpis.asnPct}%)\n`;
    csv += `Non-ASN / PJLP,${kpis.nonAsn}\n`;
    csv += `Rata-rata Usia,${kpis.avgUsia} Tahun\n`;
    csv += `Rata-rata Masa Kerja,${kpis.avgMasa} Tahun\n`;
    csv += `Staf Layanan 24 Jam,${kpis.shift24}\n\n`;

    csv += 'KOMPOSISI STATUS KEPEGAWAIAN\n';
    statusBarData.forEach(d => {
      csv += `"${d.name}",${d.count} (${d.pctStr}),${d.category}\n`;
    });

    csv += '\nSEBARAN PEGAWAI PER UNIT TUGAS BERDASARKAN STATUS KEPEGAWAIAN\n';
    csv += 'Unit Tugas,PNS,PPPK,NON PNS,PJLP,CPNS,Total\n';
    unitStatusData.forEach(d => {
      csv += `"${d.name}",${d.PNS},${d.PPPK},${d['NON PNS']},${d.PJLP},${d.CPNS},${d.total}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ringkasan_Grafik_SDMK_Puskesmas.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handler Cetak PDF Tab Baru
  const handlePrintPdfNewTab = () => {
    // 1. Stats Cards
    const statsHtml = `
      <div class="stats-container">
        <div class="stat-card">
          <div class="label">Total SDMK Terdata</div>
          <div class="val">${kpis.total} <span style="font-size:9pt;font-weight:normal;">Orang</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Tenaga Kesehatan</div>
          <div class="val" style="color:#059669;">${kpis.nakes} <span style="font-size:9pt;font-weight:normal;">(${kpis.nakesPct}%)</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Tenaga Penunjang</div>
          <div class="val" style="color:#475569;">${kpis.penunjang} <span style="font-size:9pt;font-weight:normal;">Orang</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Aparatur Sipil Negara (ASN)</div>
          <div class="val" style="color:#1d4ed8;">${kpis.asn} <span style="font-size:9pt;font-weight:normal;">(${kpis.asnPct}%)</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Non-ASN & PJLP</div>
          <div class="val" style="color:#d97706;">${kpis.nonAsn} <span style="font-size:9pt;font-weight:normal;">Orang</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Rata-rata Usia / Masa Kerja</div>
          <div class="val" style="color:#7c3aed; font-size:12pt;">${kpis.avgUsia} th / ${kpis.avgMasa} th</div>
        </div>
      </div>
    `;

    // 2. Table: Komposisi Status Kepegawaian
    let statusRows = '';
    statusBarData.forEach((d, idx) => {
      statusRows += `
        <tr>
          <td style="text-align:center; font-weight:700;">${idx + 1}</td>
          <td style="font-weight:700;">${d.name}</td>
          <td><span class="badge ${d.name.includes('PNS') ? 'badge-pns' : d.name.includes('PPPK') ? 'badge-pppk' : 'badge-non'}">${d.category}</span></td>
          <td style="text-align:right; font-weight:800; font-size:10pt;">${d.count} Org</td>
          <td style="text-align:right; font-weight:700; color:#047857;">${d.pctStr}</td>
        </tr>
      `;
    });

    // 3. Table: Sebaran Unit Tugas
    let unitRows = '';
    unitStatusData.forEach((d, idx) => {
      unitRows += `
        <tr>
          <td style="text-align:center; font-weight:700;">${idx + 1}</td>
          <td style="font-weight:700;">${d.name}</td>
          <td style="text-align:center; font-weight:700; color:#1d4ed8;">${d.PNS}</td>
          <td style="text-align:center; font-weight:700; color:#059669;">${d.PPPK}</td>
          <td style="text-align:center; font-weight:700; color:#d97706;">${d['NON PNS']}</td>
          <td style="text-align:center; font-weight:700; color:#7c3aed;">${d.PJLP}</td>
          <td style="text-align:center; font-weight:700; color:#e11d48;">${d.CPNS}</td>
          <td style="text-align:center; font-weight:800; background:#f8fafc; font-size:10pt;">${d.total}</td>
        </tr>
      `;
    });

    const tableHtml = `
      <div style="margin-bottom: 24px;">
        <h3 style="font-size:11pt; font-weight:800; color:#0f172a; margin-bottom:8px; text-transform:uppercase;">
          1. Distribusi Status Kepegawaian SDMK
        </h3>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:40px; text-align:center;">No</th>
              <th>Status Kepegawaian</th>
              <th style="width:130px;">Kategori</th>
              <th style="width:120px; text-align:right;">Jumlah (Orang)</th>
              <th style="width:100px; text-align:right;">Persentase</th>
            </tr>
          </thead>
          <tbody>
            ${statusRows}
          </tbody>
        </table>
      </div>

      <div>
        <h3 style="font-size:11pt; font-weight:800; color:#0f172a; margin-bottom:8px; text-transform:uppercase;">
          2. Formasi SDMK per Satuan Kerja & Unit Tugas
        </h3>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:40px; text-align:center;">No</th>
              <th>Unit Tugas / Lokasi Faskes</th>
              <th style="width:70px; text-align:center;">PNS</th>
              <th style="width:70px; text-align:center;">PPPK</th>
              <th style="width:75px; text-align:center;">NON PNS</th>
              <th style="width:70px; text-align:center;">PJLP</th>
              <th style="width:70px; text-align:center;">CPNS</th>
              <th style="width:85px; text-align:center; background:#f1f5f9;">Total SDMK</th>
            </tr>
          </thead>
          <tbody>
            ${unitRows}
          </tbody>
        </table>
      </div>
    `;

    printReportInNewTab({
      title: 'LAPORAN EKSEKUTIF GRAFIK & DEMOGRAFI SDMK',
      subtitle: `Filter: Unit [${filterUnit}] • Tenaga [${filterTenaga}] • Status [${filterStatus}]`,
      orientation: 'landscape',
      tableHtml,
      statsHtml
    });
  };

  return (
    <div className="space-y-6">
      {/* Control & Filter Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Dashboard Grafik Ringkasan Data Sheet
              </h2>
              <p className="text-xs text-slate-500">
                Visualisasi komprehensif demografi, status kepegawaian, dan formasi SDMK
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Unit Tugas</option>
              <option value="Puskesmas Kepulauan Seribu Selatan">Puskesmas Kec. Seribu Selatan</option>
              <option value="Puskesmas Pembantu Pulau Pari">Pustu Pulau Pari</option>
              <option value="Puskesmas Pembantu Pulau Lancang">Pustu Pulau Lancang</option>
              <option value="Puskesmas Pembantu Pulau Untung Jawa">Pustu Pulau Untung Jawa</option>
            </select>

            <select
              value={filterTenaga}
              onChange={(e) => setFilterTenaga(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Jenis Tenaga</option>
              <option value="Tenaga Kesehatan">Tenaga Kesehatan</option>
              <option value="Tenaga Penunjang">Tenaga Penunjang</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Status</option>
              <option value="PNS">PNS</option>
              <option value="PPPK">PPPK</option>
              <option value="NON PNS">NON PNS</option>
              <option value="PJLP">PJLP</option>
            </select>

            <button
              onClick={handleExportSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors ml-auto md:ml-0"
              title="Ekspor ringkasan dalam format CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>

            <button
              id="btn-cetak-pdf-grafik"
              onClick={handlePrintPdfNewTab}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs"
              title="Buka dan Cetak Dokumen Ringkasan Grafik & Demografi SDMK di Tab Baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Cetak PDF (Tab Baru)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 Executive KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 mb-1">Total SDMK</div>
          <div className="text-xl font-bold text-slate-900">{kpis.total} Orang</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Pegawai aktif terdata</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 mb-1">Tenaga Kesehatan</div>
          <div className="text-xl font-bold text-emerald-700">{kpis.nakes}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">{kpis.nakesPct}% total pegawai</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 mb-1">Tenaga Penunjang</div>
          <div className="text-xl font-bold text-slate-700">{kpis.penunjang}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Administrasi & Teknis</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 mb-1">Aparatur Sipil (ASN)</div>
          <div className="text-xl font-bold text-blue-700">{kpis.asn}</div>
          <div className="text-[10px] text-blue-600 font-semibold mt-0.5">{kpis.asnPct}% PNS + PPPK</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 mb-1">Rata-rata Usia</div>
          <div className="text-xl font-bold text-indigo-700">{kpis.avgUsia} Thn</div>
          <div className="text-[10px] text-indigo-600 mt-0.5">Masa kerja {kpis.avgMasa} thn</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 mb-1">Layanan 24 Jam</div>
          <div className="text-xl font-bold text-amber-700">{kpis.shift24} Orang</div>
          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Shift UGD & Bersalin</div>
        </div>
      </div>

      {/* Row 1 Charts: Status Kepegawaian & Proporsi Nakes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Kepegawaian Bar Chart (with toggle to Donut) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Komposisi Status Kepegawaian
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                  Grafik Batang
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribusi PNS, PPPK, NON-PNS, PJLP, dan CPNS
              </p>
            </div>

            {/* Toggle Mode */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setStatusChartMode('bar')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                  statusChartMode === 'bar'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilkan Grafik Batang"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Batang</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusChartMode('pie')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                  statusChartMode === 'pie'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilkan Grafik Donut"
              >
                <PieIcon className="w-3.5 h-3.5" />
                <span>Donut</span>
              </button>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {statusChartMode === 'bar' ? (
                <BarChart data={statusBarData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-lg text-xs space-y-1">
                            <div className="flex items-center gap-2 font-bold text-slate-900">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                              <span>{data.name}</span>
                            </div>
                            <div className="text-slate-600">
                              Jumlah: <strong className="text-slate-900">{data.count} Orang</strong>
                            </div>
                            <div className="text-slate-600">
                              Persentase: <strong className="text-emerald-600">{data.pctStr}</strong>
                            </div>
                            <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-1 mt-1">
                              {data.category}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {statusBarData.map((entry, index) => (
                      <Cell key={`status-bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={statusBarData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {statusBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`${val} Orang (${((Number(val || 0) / kpis.total) * 100).toFixed(1)}%)`, 'Jumlah']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Mini status pills */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
            {statusBarData.map(st => (
              <div key={st.name} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200/80 rounded-md text-[11px]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color }} />
                <span className="font-semibold text-slate-800">{st.name}:</span>
                <span className="text-slate-600 font-bold">{st.count}</span>
                <span className="text-slate-600 text-[10px]">({st.pctStr})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Jenis Tenaga Proportion */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Proporsi Jenis Tenaga SDMK
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Perbandingan tenaga medis/kesehatan dengan tenaga pendukung teknis
            </p>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={jenisTenagaPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {jenisTenagaPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any) => [`${val} Orang (${((Number(val || 0) / kpis.total) * 100).toFixed(1)}%)`, 'Jumlah']}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2 Charts: Kelompok Usia & Sebaran Fasilitas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kelompok Usia & Gender */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Piramida Kelompok Usia & Gender
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Struktur usia produktif pegawai berdasarkan jenis kelamin
          </p>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usiaGenderData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="group" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip 
                  formatter={(val: any, name: any) => [`${val} Orang`, name === 'pria' ? 'Laki-Laki' : 'Perempuan']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend 
                  formatter={(value) => value === 'pria' ? 'Laki-Laki' : 'Perempuan'}
                  wrapperStyle={{ fontSize: '11px' }}
                />
                <Bar dataKey="pria" name="pria" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="wanita" name="wanita" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sebaran Unit Tugas Berdasarkan Status Kepegawaian */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Sebaran Pegawai per Unit Tugas
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  Status Kepegawaian
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sebaran PNS, PPPK, NON PNS, PJLP, dan CPNS per fasilitas
              </p>
            </div>

            {/* Toggle Stacked vs Grouped */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setUnitChartMode('stacked')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  unitChartMode === 'stacked'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilkan Batang Bertumpuk (Total Pegawai)"
              >
                Bertumpuk
              </button>
              <button
                type="button"
                onClick={() => setUnitChartMode('grouped')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  unitChartMode === 'grouped'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilkan Berdampingan"
              >
                Berdampingan
              </button>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unitStatusData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="shortName" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const totalUnit = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
                      return (
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-lg text-xs space-y-1.5 min-w-[190px]">
                          <div className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                            {label}
                            <span className="ml-1 text-[11px] text-slate-500 font-normal">
                              ({totalUnit} Pegawai)
                            </span>
                          </div>
                          {payload.map((entry) => (
                            <div key={entry.name} className="flex items-center justify-between gap-3 text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span>{entry.name}:</span>
                              </div>
                              <span className="font-bold">{entry.value} org</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} 
                  iconType="circle"
                />
                <Bar 
                  dataKey="PNS" 
                  name="PNS" 
                  fill="#0284c7" 
                  stackId={unitChartMode === 'stacked' ? 'st' : undefined} 
                />
                <Bar 
                  dataKey="PPPK" 
                  name="PPPK" 
                  fill="#059669" 
                  stackId={unitChartMode === 'stacked' ? 'st' : undefined} 
                />
                <Bar 
                  dataKey="NON PNS" 
                  name="NON PNS" 
                  fill="#f59e0b" 
                  stackId={unitChartMode === 'stacked' ? 'st' : undefined} 
                />
                <Bar 
                  dataKey="PJLP" 
                  name="PJLP" 
                  fill="#8b5cf6" 
                  stackId={unitChartMode === 'stacked' ? 'st' : undefined} 
                />
                <Bar 
                  dataKey="CPNS" 
                  name="CPNS" 
                  fill="#ec4899" 
                  stackId={unitChartMode === 'stacked' ? 'st' : undefined}
                  radius={unitChartMode === 'stacked' ? [4, 4, 0, 0] : undefined}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cross-tabulation mini matrix */}
          <div className="mt-3 pt-3 border-t border-slate-100 overflow-x-auto">
            <table className="w-full text-[11px] text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200/60">
                  <th className="pb-1 font-medium">Unit Fasilitas</th>
                  <th className="pb-1 text-center font-medium text-blue-700">PNS</th>
                  <th className="pb-1 text-center font-medium text-emerald-700">PPPK</th>
                  <th className="pb-1 text-center font-medium text-amber-700">NON PNS</th>
                  <th className="pb-1 text-center font-medium text-purple-700">PJLP</th>
                  <th className="pb-1 text-right font-medium text-slate-800">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {unitStatusData.map(u => (
                  <tr key={u.name} className="hover:bg-slate-50/80">
                    <td className="py-1 font-medium text-slate-800">{u.shortName}</td>
                    <td className="py-1 text-center text-blue-700 font-semibold">{u.PNS}</td>
                    <td className="py-1 text-center text-emerald-700 font-semibold">{u.PPPK}</td>
                    <td className="py-1 text-center text-amber-700 font-semibold">{u['NON PNS']}</td>
                    <td className="py-1 text-center text-purple-700 font-semibold">{u.PJLP}</td>
                    <td className="py-1 text-right font-bold text-slate-900">{u.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 3 Charts: Tingkat Pendidikan & Top Formasi Jabatan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pendidikan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Tingkat Pendidikan Pegawai
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Kualifikasi akademik formal staf Puskesmas
          </p>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pendidikanData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip 
                  formatter={(val: any) => [`${val} Orang`, 'Jumlah']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Jabatan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Top Formasi Jabatan Terbanyak
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Jabatan fungsional dan pelaksana dengan populasi tertinggi
          </p>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topJabatanData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10, fill: '#475569' }} />
                <Tooltip 
                  formatter={(val: any) => [`${val} Orang`, 'Jumlah']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="count" fill="#0284c7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
