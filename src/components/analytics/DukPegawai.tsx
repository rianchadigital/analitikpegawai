import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  Download, 
  Search, 
  Filter, 
  MapPin, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Award, 
  Users, 
  ShieldCheck, 
  UserCheck, 
  ChevronRight,
  Eye,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { Sheet, RowData } from '../../types/sheet';
import { LogoDkiJakarta, LogoPuskesmas } from '../common/Logos';
import { printReportInNewTab } from '../../utils/pdfReportGenerator';

interface DukPegawaiProps {
  sheet: Sheet;
}

// Evaluasi Skor Pangkat / Golongan ASN (BKN Hierarki)
function getPangkatScore(golStr: string, status: string, pendidikan?: string): number {
  const g = (golStr || '').toUpperCase().trim();
  
  // Golongan IV (Pembina)
  if (g.includes('IV/E')) return 1900;
  if (g.includes('IV/D')) return 1800;
  if (g.includes('IV/C')) return 1700;
  if (g.includes('IV/B')) return 1600;
  if (g.includes('IV/A')) return 1500;

  // Golongan III (Penata)
  if (g.includes('III/D')) return 1400;
  if (g.includes('III/C')) return 1300;
  if (g.includes('III/B')) return 1200;
  if (g.includes('III/A')) return 1100;

  // PPPK Golongan (Perpres 98/2020)
  if (g.includes('X (') || g.includes('GOLONGAN X') || g === 'X') return 1150; // Setara Dokter/Profesi S-1
  if (g.includes('IX (') || g.includes('GOLONGAN IX') || g === 'IX') return 1100; // Setara S-1 / Ners (III/a)
  if (g.includes('VII (') || g.includes('GOLONGAN VII') || g === 'VII') return 900; // Setara D-III (II/c)

  // Golongan II (Pengatur)
  if (g.includes('II/D')) return 1000;
  if (g.includes('II/C')) return 900;
  if (g.includes('II/B')) return 800;
  if (g.includes('II/A')) return 700;

  // Golongan I (Juru)
  if (g.includes('I/D')) return 600;
  if (g.includes('I/C')) return 500;
  if (g.includes('I/B')) return 400;
  if (g.includes('I/A')) return 300;

  // PPPK PW / PPPK umum berdasarkan pendidikan
  const s = (status || '').toUpperCase();
  if (s.includes('PPPK')) {
    const p = (pendidikan || '').toUpperCase();
    if (p.includes('PROFESI') || p.includes('S-2')) return 1150;
    if (p.includes('S-1') || p.includes('D-4')) return 1100;
    if (p.includes('D-3')) return 900;
    return 800;
  }

  return 500;
}

// Parsing tanggal ke epoch time (semakin lama TMT / tanggal awal, semakin diprioritaskan)
function parseDateEpoch(dateStr: string | undefined): number {
  if (!dateStr) return 4102444800000; // Tahun 2100 sebagai default terakhir
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) return parsed;
  return 4102444800000;
}

// Bobot jenjang jabatan
function getJabatanWeight(jabatanStr: string): number {
  const j = (jabatanStr || '').toLowerCase();
  if (j.includes('kepala puskesmas')) return 100;
  if (j.includes('subbagian') || j.includes('tata usaha') || j.includes('kasubag')) return 95;
  if (j.includes('madya')) return 90;
  if (j.includes('muda')) return 80;
  if (j.includes('pertama')) return 70;
  if (j.includes('penyelia')) return 65;
  if (j.includes('mahir')) return 55;
  if (j.includes('terampil')) return 45;
  if (j.includes('pelaksana')) return 40;
  return 30;
}

export const DukPegawai: React.FC<DukPegawaiProps> = ({ sheet }) => {
  const [filterScope, setFilterScope] = useState<'ASN_ALL' | 'PNS' | 'PPPK' | 'CPNS' | 'ALL'>('ASN_ALL');
  const [filterUnit, setFilterUnit] = useState<string>('ALL');
  const [filterTenaga, setFilterTenaga] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewPaperMode, setPreviewPaperMode] = useState<boolean>(false);

  // Tanggal cetak dinamis Indonesia
  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  // Filter & Urutkan DUK secara ketat berdasarkan aturan kepegawaian BKN
  const rankedDukList = useMemo(() => {
    const rawRows = sheet.rows || [];

    // Filter lingkup kepegawaian
    const filtered = rawRows.filter(r => {
      const status = (r.status_kepegawaian || '').trim().toUpperCase();
      const isPns = status.includes('PNS') && !status.includes('NON') && !status.includes('CPNS');
      const isPppk = status.includes('PPPK');
      const isCpns = status.includes('CPNS');
      const isAsn = isPns || isPppk || isCpns;

      if (filterScope === 'ASN_ALL' && !isAsn) return false;
      if (filterScope === 'PNS' && !isPns) return false;
      if (filterScope === 'PPPK' && !isPppk) return false;
      if (filterScope === 'CPNS' && !isCpns) return false;

      // Filter Unit
      if (filterUnit !== 'ALL') {
        const u = (r.tempat_tugas || '').toLowerCase();
        if (filterUnit === 'induk' && !u.includes('seribu') && !u.includes('induk')) return false;
        if (filterUnit === 'pari' && !u.includes('pari')) return false;
        if (filterUnit === 'lancang' && !u.includes('lancang')) return false;
        if (filterUnit === 'untung_jawa' && !u.includes('untung')) return false;
      }

      // Filter Jenis Tenaga
      if (filterTenaga !== 'ALL') {
        if (r.jenis_tenaga !== filterTenaga) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nama = (r.nama || '').toLowerCase();
        const namaGelar = (r.nama_gelar || '').toLowerCase();
        const nip = (r.nip || '').toLowerCase();
        const jab = (r.jabatan || '').toLowerCase();
        const gol = (r.gol || '').toLowerCase();
        if (!nama.includes(q) && !namaGelar.includes(q) && !nip.includes(q) && !jab.includes(q) && !gol.includes(q)) {
          return false;
        }
      }

      return true;
    });

    // Urutkan: Pangkat Tertinggi -> TMT Pangkat Lebih Awal -> Jenjang Jabatan -> Masa Kerja -> Usia
    return filtered.sort((a, b) => {
      // 1. Pangkat / Golongan Tertinggi
      const scoreA = getPangkatScore(a.gol, a.status_kepegawaian, a.pendidikan);
      const scoreB = getPangkatScore(b.gol, b.status_kepegawaian, b.pendidikan);
      if (scoreB !== scoreA) return scoreB - scoreA;

      // 2. TMT Pangkat / TMT Mulai Lebih Awal (timestamp lebih kecil)
      const tmtA = parseDateEpoch(a.tmt_mulai);
      const tmtB = parseDateEpoch(b.tmt_mulai);
      if (tmtA !== tmtB) return tmtA - tmtB;

      // 3. Bobot Jabatan (Struktural / Ahli Madya / Ahli Muda)
      const jabA = getJabatanWeight(a.jabatan);
      const jabB = getJabatanWeight(b.jabatan);
      if (jabB !== jabA) return jabB - jabA;

      // 4. Masa Kerja Golongan / Total (lebih lama)
      const mkA = Number(a.masa_kerja_tahun) || 0;
      const mkB = Number(b.masa_kerja_tahun) || 0;
      if (mkB !== mkA) return mkB - mkA;

      // 5. Usia (lebih tua)
      const uA = Number(a.usia_tahun) || 0;
      const uB = Number(b.usia_tahun) || 0;
      if (uB !== uA) return uB - uA;

      return (a.nama || '').localeCompare(b.nama || '');
    });
  }, [sheet.rows, filterScope, filterUnit, filterTenaga, searchQuery]);

  // Statistik Ringkasan DUK
  const dukStats = useMemo(() => {
    let gol4 = 0;
    let gol3 = 0;
    let gol2 = 0;
    let pppk = 0;
    let pns = 0;
    let cpns = 0;

    rankedDukList.forEach(r => {
      const g = (r.gol || '').toUpperCase();
      const s = (r.status_kepegawaian || '').toUpperCase();
      if (s.includes('PNS') && !s.includes('NON') && !s.includes('CPNS')) pns++;
      else if (s.includes('PPPK')) pppk++;
      else if (s.includes('CPNS')) cpns++;

      if (g.includes('IV/')) gol4++;
      else if (g.includes('III/')) gol3++;
      else if (g.includes('II/')) gol2++;
    });

    return { total: rankedDukList.length, pns, pppk, cpns, gol4, gol3, gol2 };
  }, [rankedDukList]);

  // Handler Cetak Dokumen Resmi PDF di Tab Baru (Universal New Tab PDF Generator)
  const handlePrintPdfNewTab = () => {
    let tableRowsHtml = '';
    rankedDukList.forEach((pegawai, index) => {
      const noDuk = index + 1;
      const cleanName = getCleanName(pegawai);
      const status = (pegawai.status_kepegawaian || '').trim().toUpperCase();
      const isPns = status.includes('PNS') && !status.includes('NON') && !status.includes('CPNS');
      const isPppk = status.includes('PPPK');
      const isCpns = status.includes('CPNS');
      const badgeCls = isPns ? 'badge-pns' : isPppk ? 'badge-pppk' : isCpns ? 'badge-cpns' : 'badge-non';
      const badgeText = isPns ? 'PNS' : isPppk ? 'PPPK' : isCpns ? 'CPNS' : (pegawai.status_kepegawaian || 'Non-PNS');
      const unitTugas = pegawai.tempat_tugas || 'Puskesmas Kepulauan Seribu Selatan';

      tableRowsHtml += `
        <tr>
          <td style="text-align:center; font-weight:800; font-size:10.5pt; color:#1d4ed8;">${noDuk}</td>
          <td>
            <div style="font-weight:700; color:#0f172a;">Sudin Kesehatan Kep. Seribu</div>
            <div style="font-size:7.5pt; color:#475569; margin-top:2px;">${unitTugas}</div>
          </td>
          <td>
            <div style="font-weight:800; color:#0f172a; text-transform:uppercase;">${cleanName}</div>
            <div style="font-size:7.5pt; color:#64748b; font-style:italic;">(Gelar: ${pegawai.nama_gelar || pegawai.nama || '-'})</div>
          </td>
          <td>
            <div style="font-weight:700; font-family:monospace; font-size:8.5pt;">${pegawai.nip || pegawai.nik || '-'}</div>
            <div style="font-size:7pt; color:#64748b;">${pegawai.nip ? (isPppk ? 'NIP PPPK' : 'NIP Resmi') : 'NIK'}</div>
          </td>
          <td>
            <div style="font-weight:800; color:#0f172a;">${pegawai.gol || '-'}</div>
            <div style="margin-top:2px;"><span class="badge ${badgeCls}">${badgeText}</span></div>
            <div style="font-size:7pt; color:#64748b; margin-top:2px;">TMT: ${formatTmtDisplay(pegawai.tmt_mulai)}</div>
          </td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${pegawai.jabatan || 'Pelaksana Teknis'}</div>
            <div style="font-size:7pt; color:#64748b; margin-top:2px;">TMT: ${formatTmtDisplay(pegawai.tmt_mulai)}</div>
          </td>
          <td>
            <div style="color:#047857; font-weight:700; font-size:7.5pt;">✔ Diakui: ${pegawai.pendidikan || 'Terdaftar'}</div>
            <div style="font-size:7.5pt; color:#334155; margin-top:2px;">${pegawai.sekolah_pt || pegawai.pendidikan || '-'}</div>
            <div style="font-size:7pt; color:#64748b;">${pegawai.tahun_lulus && pegawai.tahun_lulus !== '6823' ? 'Thn ' + pegawai.tahun_lulus : ''}</div>
          </td>
        </tr>
      `;
    });

    const tableHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:45px; text-align:center;">No DUK</th>
            <th style="width:160px;">Wilayah & UKPD</th>
            <th style="width:200px;">Nama Pegawai (Tanpa Gelar)</th>
            <th style="width:130px;">NIP / NIK</th>
            <th style="width:120px;">Pangkat / Gol. (Terakhir)</th>
            <th style="width:180px;">Riwayat Jabatan (Terbaru)</th>
            <th>Pendidikan SIASN & Almamater</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml || '<tr><td colspan="7" style="text-align:center; padding:20px;">Tidak ada data pegawai untuk kriteria ini</td></tr>'}
        </tbody>
      </table>
    `;

    const statsHtml = `
      <div class="stats-container">
        <div class="stat-card">
          <div class="label">Total ASN Terdaftar</div>
          <div class="val">${dukStats.total} <span style="font-size:9pt;font-weight:normal;">Org</span></div>
        </div>
        <div class="stat-card">
          <div class="label">PNS Tetap</div>
          <div class="val" style="color:#1d4ed8;">${dukStats.pns} <span style="font-size:9pt;font-weight:normal;">Org</span></div>
        </div>
        <div class="stat-card">
          <div class="label">PPPK</div>
          <div class="val" style="color:#166534;">${dukStats.pppk} <span style="font-size:9pt;font-weight:normal;">Org</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Golongan IV (Pembina)</div>
          <div class="val" style="color:#7c3aed;">${dukStats.gol4} <span style="font-size:9pt;font-weight:normal;">Org</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Golongan III (Penata)</div>
          <div class="val" style="color:#d97706;">${dukStats.gol3} <span style="font-size:9pt;font-weight:normal;">Org</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Golongan II (Pengatur)</div>
          <div class="val" style="color:#0f766e;">${dukStats.gol2} <span style="font-size:9pt;font-weight:normal;">Org</span></div>
        </div>
      </div>
    `;

    printReportInNewTab({
      title: 'DAFTAR URUT KEPANGKATAN (DUK) PEGAWAI',
      subtitle: 'Hierarki Urutan Kepangkatan ASN (PNS, CPNS & PPPK) • Sesuai Standar BKN Republik Indonesia',
      orientation: 'landscape',
      tableHtml,
      statsHtml
    });
  };

  // Handler Cetak Langsung via Browser
  const handlePrint = () => {
    window.print();
  };

  // Handler Ekspor CSV Data DUK
  const handleExportCsv = () => {
    let csv = 'NO DUK,WILAYAH,UKPD,NAMA LENGKAP TANPA GELAR,NAMA DAN GELAR,NIP,STATUS PEGAWAI,PANGKAT / GOLONGAN,TMT PANGKAT/MULAI,JABATAN TERBARU,TEMPAT TUGAS,PENDIDIKAN DIAKUI SIASN,ASAL KAMPUS/PT\n';
    rankedDukList.forEach((r, idx) => {
      const nama = `"${(r.nama || '').replace(/"/g, '""')}"`;
      const namaGelar = `"${(r.nama_gelar || '').replace(/"/g, '""')}"`;
      const nip = `"'${r.nip || r.nik || ''}"`;
      const status = `"${r.status_kepegawaian || ''}"`;
      const gol = `"${r.gol || ''}"`;
      const tmt = `"${r.tmt_mulai || ''}"`;
      const jab = `"${(r.jabatan || '').replace(/"/g, '""')}"`;
      const unit = `"${(r.tempat_tugas || '').replace(/"/g, '""')}"`;
      const pend = `"${r.pendidikan || ''}"`;
      const pt = `"${(r.sekolah_pt || '').replace(/"/g, '""')}"`;

      csv += `${idx + 1},"Sudin Kesehatan Kepulauan Seribu",${unit},${nama},${namaGelar},${nip},${status},${gol},${tmt},${jab},${unit},${pend},${pt}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DUK_Pegawai_Puskesmas_Kepulauan_Seribu_Selatan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper formatting nama tanpa gelar & inisial
  const getCleanName = (r: RowData) => {
    if (r.nama && String(r.nama).trim().length > 0) {
      return String(r.nama).toUpperCase();
    }
    // Fallback jika hanya nama_gelar yang ada
    const ng = String(r.nama_gelar || '');
    return ng.replace(/dr\.|drg\.|Ns\.|S\.Kep|SKM|A\.Md\.Keb|A\.Md\.Kep|A\.Md|S\.Tr\.Keb|S\.Farm|Apt|M\.Kes/gi, '').trim().toUpperCase();
  };

  const getInitials = (cleanName: string) => {
    const parts = cleanName.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  };

  // Palet warna inisial avatar
  const getAvatarBg = (index: number) => {
    const colors = [
      'bg-blue-600 text-white',
      'bg-indigo-600 text-white',
      'bg-emerald-600 text-white',
      'bg-cyan-600 text-white',
      'bg-amber-600 text-white',
      'bg-purple-600 text-white',
      'bg-rose-600 text-white',
      'bg-teal-600 text-white'
    ];
    return colors[index % colors.length];
  };

  // Normalisasi TMT date format YYYY-MM-DD
  const formatTmtDisplay = (tmtStr?: string) => {
    if (!tmtStr) return '-';
    try {
      const d = new Date(tmtStr);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    } catch {}
    return tmtStr;
  };

  return (
    <div className="space-y-6">
      {/* Print Stylesheet khusus agar cetak PDF / Printer presisi */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 8mm 10mm 8mm;
          }
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Sembunyikan elemen non-cetak */
          header, nav, footer, .duk-no-print, [id^="btn-"], button {
            display: none !important;
          }
          /* Kontainer lembar dokumen */
          .duk-printable-doc {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          /* Tabel jangan terpotong di tengah baris */
          table {
            page-break-inside: auto !important;
            width: 100% !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          th, td {
            border-color: #cbd5e1 !important;
          }
        }
      `}</style>

      {/* Kontrol & Bilah Tindakan (duk-no-print) */}
      <div className="duk-no-print bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
                <Award className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Daftar Urut Kepangkatan (DUK) Pegawai
                  <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                    Khusus ASN (PNS, CPNS & PPPK)
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Peringkat resmi kepegawaian berurutan dari pangkat tertinggi hingga terendah sesuai standar BKN
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-toggle-paper-mode"
              onClick={() => setPreviewPaperMode(!previewPaperMode)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                previewPaperMode
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Pratinjau format lembar cetak dokumen resmi"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{previewPaperMode ? 'Tutup Format Cetak' : 'Format Dokumen PDF'}</span>
            </button>

            <button
              type="button"
              id="btn-export-csv-duk"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-all shadow-2xs"
              title="Unduh data tabel DUK dalam format file CSV / Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Ekspor Excel/CSV</span>
            </button>

            <button
              type="button"
              id="btn-cetak-direct-duk"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-all shadow-2xs"
              title="Cetak langsung ke printer via browser dialog"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Cetak (Printer)</span>
            </button>

            <button
              type="button"
              id="btn-cetak-pdf-duk"
              onClick={handlePrintPdfNewTab}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm ring-2 ring-blue-500/20"
              title="Buka dan Cetak Dokumen DUK Resmi di Tab Baru Lengkap dengan Logo DKI & Puskesmas"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Cetak PDF (Tab Baru)</span>
            </button>
          </div>
        </div>

        {/* Ringkasan Indikator DUK */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500">Total ASN di DUK</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">{dukStats.total} <span className="text-xs font-normal text-slate-500">org</span></div>
          </div>
          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/70">
            <div className="text-[11px] font-medium text-blue-700">PNS Tetap</div>
            <div className="text-lg font-extrabold text-blue-900 mt-0.5">{dukStats.pns} <span className="text-xs font-normal text-blue-600">org</span></div>
          </div>
          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/70">
            <div className="text-[11px] font-medium text-emerald-700">PPPK</div>
            <div className="text-lg font-extrabold text-emerald-900 mt-0.5">{dukStats.pppk} <span className="text-xs font-normal text-emerald-600">org</span></div>
          </div>
          <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200/70">
            <div className="text-[11px] font-medium text-purple-700">Golongan IV (Pembina)</div>
            <div className="text-lg font-extrabold text-purple-900 mt-0.5">{dukStats.gol4} <span className="text-xs font-normal text-purple-600">org</span></div>
          </div>
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/70">
            <div className="text-[11px] font-medium text-amber-700">Golongan III (Penata)</div>
            <div className="text-lg font-extrabold text-amber-900 mt-0.5">{dukStats.gol3} <span className="text-xs font-normal text-amber-600">org</span></div>
          </div>
          <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200/70">
            <div className="text-[11px] font-medium text-teal-700">Golongan II (Pengatur)</div>
            <div className="text-lg font-extrabold text-teal-900 mt-0.5">{dukStats.gol2} <span className="text-xs font-normal text-teal-600">org</span></div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-2 border-t border-slate-100">
          {/* Pencarian */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama pegawai, NIP, jabatan, golongan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
            />
          </div>

          {/* Filter Status Pegawai */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">Status:</span>
            <select
              value={filterScope}
              onChange={(e) => setFilterScope(e.target.value as any)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ASN_ALL">Semua ASN (PNS, PPPK & CPNS)</option>
              <option value="PNS">Khusus PNS</option>
              <option value="PPPK">Khusus PPPK</option>
              <option value="CPNS">Khusus CPNS</option>
              <option value="ALL">Semua Pegawai (Termasuk Non-ASN)</option>
            </select>
          </div>

          {/* Filter Unit Tugas */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">Unit:</span>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Semua Unit Puskesmas</option>
              <option value="induk">Puskesmas Induk</option>
              <option value="pari">Pustu Pulau Pari</option>
              <option value="lancang">Pustu Pulau Lancang</option>
              <option value="untung_jawa">Pustu Untung Jawa</option>
            </select>
          </div>

          {/* Filter Jenis Tenaga */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">Tenaga:</span>
            <select
              value={filterTenaga}
              onChange={(e) => setFilterTenaga(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Semua Jenis Tenaga</option>
              <option value="Tenaga Kesehatan">Tenaga Kesehatan</option>
              <option value="Tenaga Penunjang">Tenaga Penunjang</option>
            </select>
          </div>
        </div>
      </div>

      {/* DOKUMEN CETAK DUK RESMI (Kop Surat + Tabel) */}
      <div className={`duk-printable-doc bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs ${previewPaperMode ? 'max-w-6xl mx-auto ring-8 ring-slate-100' : ''}`}>
        
        {/* KOP SURAT RESMI PEMPROV DKI JAKARTA */}
        <div className="border-b-[3px] border-black pb-2 mb-0.5">
          <div className="flex items-center justify-between gap-4">
            {/* Logo Jaya Raya Kiri */}
            <div className="w-20 md:w-24 flex-shrink-0 flex items-center justify-center">
              <LogoDkiJakarta className="w-16 h-20 md:w-20 md:h-24" />
            </div>

            {/* Teks Kop Tengah */}
            <div className="flex-1 text-center font-serif text-slate-950 leading-tight">
              <h2 className="text-xs md:text-sm font-bold tracking-wider uppercase">
                PEMERINTAH PROVINSI DKI JAKARTA
              </h2>
              <h3 className="text-xs md:text-sm font-bold tracking-wider uppercase">
                DINAS KESEHATAN
              </h3>
              <h4 className="text-[11px] md:text-xs font-bold tracking-wider uppercase">
                SUKU DINAS KESEHATAN KABUPATEN ADMINISTRASI KEPULAUAN SERIBU
              </h4>
              <h1 className="text-sm md:text-base font-extrabold tracking-wide uppercase mt-0.5">
                PUSKESMAS KEPULAUAN SERIBU SELATAN
              </h1>
              <p className="text-[9px] md:text-[10px] text-slate-800 font-sans mt-1">
                Jl. Pulau Tidung RT 01/RW 01, Kel. Pulau Tidung, Kec. Kepulauan Seribu Selatan, Kab. Adm. Kepulauan Seribu, Kode Pos 14520
              </p>
              <p className="text-[9px] md:text-[10px] text-slate-800 font-sans">
                Email: <span className="text-blue-700 font-medium">pkmkepseributara@jakarta.go.id</span> • JAKARTA
              </p>
            </div>

            {/* Logo Puskesmas Kanan */}
            <div className="w-20 md:w-24 flex-shrink-0 flex items-center justify-center">
              <LogoPuskesmas className="w-16 h-20 md:w-20 md:h-24" />
            </div>
          </div>
        </div>
        {/* Garis Ganda Tipis Bawah Kop Surat */}
        <div className="border-b border-black mb-5"></div>

        {/* JUDUL DOKUMEN RESMI DUK */}
        <div className="text-center mb-6">
          <h2 className="text-sm md:text-base font-extrabold tracking-wide uppercase text-slate-950 underline underline-offset-4 decoration-slate-400">
            DAFTAR URUT KEPANGKATAN (DUK) PEGAWAI
          </h2>
          <p className="text-[11px] text-slate-600 mt-1 font-medium">
            Sistem Informasi Manajemen Kepegawaian (SIMPEG Digital) • Tanggal Cetak: {currentDateFormatted}
          </p>
        </div>

        {/* TABEL DUK (Sesuai Persis dengan Gambar Referensi Pengguna) */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-800 border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-16 border-r border-slate-200 font-extrabold">
                  No<br />DUK
                </th>
                <th className="py-3 px-3 min-w-[190px] border-r border-slate-200">
                  Wilayah & UKPD
                </th>
                <th className="py-3 px-3 min-w-[240px] border-r border-slate-200">
                  Nama Pegawai (Tanpa Gelar)
                </th>
                <th className="py-3 px-3 min-w-[170px] border-r border-slate-200">
                  NIP / NIK
                </th>
                <th className="py-3 px-3 min-w-[170px] border-r border-slate-200">
                  Pangkat / Gol.<br />(Terakhir)
                </th>
                <th className="py-3 px-3 min-w-[240px] border-r border-slate-200">
                  Riwayat Jabatan (Urut Terbaru)
                </th>
                <th className="py-3 px-3 min-w-[220px]">
                  Pendidikan SIASN & Riwayat Pendidikan (Urut Terbaru)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {rankedDukList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Tidak ada pegawai yang memenuhi kriteria filter DUK saat ini.
                  </td>
                </tr>
              ) : (
                rankedDukList.map((pegawai, index) => {
                  const noDuk = index + 1;
                  const cleanName = getCleanName(pegawai);
                  const initials = getInitials(cleanName);
                  const status = (pegawai.status_kepegawaian || '').trim().toUpperCase();
                  const isPns = status.includes('PNS') && !status.includes('NON') && !status.includes('CPNS');
                  const isPppk = status.includes('PPPK');
                  const isCpns = status.includes('CPNS');

                  // Tentukan Badge Status & Tipe
                  let statusBadgeText = 'PNS';
                  let statusBadgeColor = 'bg-blue-600 text-white';
                  let subBadgeText = 'Tetap';
                  let subBadgeColor = 'bg-blue-100 text-blue-800';

                  if (isPppk) {
                    statusBadgeText = 'PPPK';
                    statusBadgeColor = 'bg-emerald-600 text-white';
                    subBadgeText = 'Perjanjian Kerja';
                    subBadgeColor = 'bg-emerald-100 text-emerald-800';
                  } else if (isCpns) {
                    statusBadgeText = 'CPNS';
                    statusBadgeColor = 'bg-amber-600 text-white';
                    subBadgeText = 'Calon Pegawai';
                    subBadgeColor = 'bg-amber-100 text-amber-800';
                  } else if (!isPns) {
                    statusBadgeText = pegawai.status_kepegawaian || 'Non-PNS';
                    statusBadgeColor = 'bg-slate-600 text-white';
                    subBadgeText = 'Kontrak';
                    subBadgeColor = 'bg-slate-100 text-slate-800';
                  }

                  // Tempat Tugas
                  const unitTugas = pegawai.tempat_tugas || 'Puskesmas Kepulauan Seribu Selatan';

                  return (
                    <tr 
                      key={pegawai._id || `duk-${index}`}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        index % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                      }`}
                    >
                      {/* 1. No DUK */}
                      <td className="py-3 px-3 text-center align-middle border-r border-slate-200">
                        <span className="text-base font-extrabold text-blue-700">
                          {noDuk}
                        </span>
                      </td>

                      {/* 2. Wilayah & UKPD */}
                      <td className="py-3 px-3 align-top border-r border-slate-200">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-900 font-bold leading-tight">
                            <MapPin className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                            <span>Sudin Kesehatan Kepulauan Seribu</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-600 pl-5 leading-tight">
                            <Building2 className="w-3 h-3 text-blue-600 flex-shrink-0" />
                            <span className="font-medium">{unitTugas}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Nama Pegawai (Tanpa Gelar) */}
                      <td className="py-3 px-3 align-top border-r border-slate-200">
                        <div className="flex items-start gap-2.5">
                          {/* Avatar Inisial */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs ${getAvatarBg(index)}`}>
                            {initials}
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-slate-900 leading-tight">
                              {cleanName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-normal italic">
                              (Gelar: {pegawai.nama_gelar || pegawai.nama || '-'})
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 4. NIP / NIK */}
                      <td className="py-3 px-3 align-top border-r border-slate-200">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 font-mono tracking-tight">
                            {pegawai.nip || pegawai.nik || '-'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {pegawai.nip ? (isPppk ? 'NIP PPPK Resmi' : 'NIP Resmi') : 'NIK Pegawai'}
                          </div>
                        </div>
                      </td>

                      {/* 5. Pangkat / Gol. (Terakhir) */}
                      <td className="py-3 px-3 align-top border-r border-slate-200">
                        <div className="space-y-1.5">
                          <div className="font-bold text-slate-900 leading-tight">
                            {pegawai.gol || '-'}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 text-[10px]">
                            <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${statusBadgeColor}`}>
                              {statusBadgeText}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded font-semibold ${subBadgeColor}`}>
                              {subBadgeText}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>TMT: {formatTmtDisplay(pegawai.tmt_mulai)}</span>
                          </div>
                        </div>
                      </td>

                      {/* 6. Riwayat Jabatan (Urut Terbaru) */}
                      <td className="py-3 px-3 align-top border-r border-slate-200">
                        <div className="space-y-1">
                          <div className="flex items-center flex-wrap gap-1.5 font-bold text-slate-900 leading-tight">
                            <span>1. {pegawai.jabatan || 'Pegawai Pelaksana Teknis'}</span>
                            <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9px] font-semibold">
                              Terbaru
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 leading-tight">
                            <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>TMT: {formatTmtDisplay(pegawai.tmt_mulai)} | {unitTugas}</span>
                          </div>
                        </div>
                      </td>

                      {/* 7. Pendidikan SIASN & Riwayat Pendidikan (Urut Terbaru) */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-1.5">
                          {/* Pill Diakui SIASN */}
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                            <span>Diakui SIASN: {pegawai.pendidikan || 'Pendidikan Terdaftar'}</span>
                          </div>
                          {/* Nama Almamater / Asal Sekolah */}
                          <div className="text-[11px] text-slate-700 leading-tight">
                            <span>1. {pegawai.sekolah_pt || pegawai.pendidikan || '-'}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            - ({pegawai.tahun_lulus && pegawai.tahun_lulus !== '6823' ? `Tahun ${pegawai.tahun_lulus}` : '-'})
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* LEMBAR PENGESAHAN / TANDA TANGAN RESMI (Tampil di Cetakan Dokumen) */}
        <div className="mt-10 pt-4 flex justify-between items-start text-xs text-slate-900">
          <div className="space-y-1 max-w-xs text-slate-600 text-[11px]">
            <p className="font-semibold text-slate-800">Catatan Resmi:</p>
            <p>1. Daftar Urut Kepangkatan (DUK) ini disusun secara digital berdasarkan data resmi SIMPEG & Google Sheet Master SDMK.</p>
            <p>2. Urutan disusun berdasarkan ketentuan BKN Republik Indonesia dari pangkat/golongan tertinggi.</p>
          </div>

          <div className="text-center font-medium min-w-[240px]">
            <p>Kepulauan Seribu, {currentDateFormatted}</p>
            <p className="font-bold text-slate-900 mt-1">Kepala Puskesmas Kepulauan Seribu Selatan</p>
            <div className="h-16 flex items-center justify-center text-slate-300 italic text-[11px]">
              (Tanda Tangan & Cap Resmi)
            </div>
            <p className="font-bold text-slate-900 underline underline-offset-2">
              dr. Ignatius Dendy Purnama
            </p>
            <p className="text-[11px] text-slate-600 font-mono">
              NIP. 198607192014031004
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
