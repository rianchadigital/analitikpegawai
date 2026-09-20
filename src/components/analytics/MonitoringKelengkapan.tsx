import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  Printer, 
  Building2, 
  UserCheck, 
  UserX, 
  Eye, 
  RotateCcw, 
  FileText,
  BadgeAlert,
  HelpCircle,
  X
} from 'lucide-react';
import { Sheet, RowData } from '../../types/sheet';
import { printReportInNewTab } from '../../utils/pdfReportGenerator';

interface MonitoringKelengkapanProps {
  sheet: Sheet;
}

// Definisi kolom yang dipantau keterisiannya
export interface MonitoredField {
  id: string;
  label: string;
  category: 'Identitas & Status' | 'Kontak & Domisili' | 'Pendidikan' | 'Legalitas STR/SIP' | 'Penugasan';
  aliases: string[];
  isApplicable?: (row: RowData) => boolean;
  checkFilled: (row: RowData) => boolean;
}

export const MonitoringKelengkapan: React.FC<MonitoringKelengkapanProps> = ({ sheet }) => {
  // 1. Daftar kolom yang dipantau secara komprehensif
  const monitoredFields: MonitoredField[] = useMemo(() => [
    // Identitas & Status
    {
      id: 'nama_gelar',
      label: 'Nama & Gelar',
      category: 'Identitas & Status',
      aliases: ['nama_gelar', 'nama', 'NAMA DENGAN GELAR', 'NAMA'],
      checkFilled: (r) => Boolean(r.nama_gelar || r.nama || r['NAMA DENGAN GELAR'] || r['NAMA'])
    },
    {
      id: 'nip',
      label: 'NIP / ID Pegawai',
      category: 'Identitas & Status',
      aliases: ['nip', 'NIP', 'NIP / ID PEGAWAI', 'id_pegawai'],
      checkFilled: (r) => {
        const val = String(r.nip || r['NIP'] || r['NIP / ID PEGAWAI'] || '').trim();
        return val !== '' && val !== '-' && val.toLowerCase() !== '(kosong)';
      }
    },
    {
      id: 'nrk',
      label: 'NRK',
      category: 'Identitas & Status',
      aliases: ['nrk', 'NRK'],
      // NRK wajib untuk PNS
      isApplicable: (r) => String(r.status_kepegawaian || '').toUpperCase() === 'PNS',
      checkFilled: (r) => {
        const val = String(r.nrk || r['NRK'] || '').trim();
        return val !== '' && val !== '-' && val.toLowerCase() !== '(kosong)';
      }
    },
    {
      id: 'nik',
      label: 'NIK KTP',
      category: 'Identitas & Status',
      aliases: ['nik', 'NIK'],
      checkFilled: (r) => {
        const val = String(r.nik || r['NIK'] || '').trim();
        return val.length >= 10;
      }
    },
    {
      id: 'tempat_tugas',
      label: 'Tempat Tugas',
      category: 'Penugasan',
      aliases: ['tempat_tugas', 'TEMPAT TUGAS'],
      checkFilled: (r) => Boolean(r.tempat_tugas || r['TEMPAT TUGAS'])
    },
    {
      id: 'jabatan',
      label: 'Jabatan',
      category: 'Penugasan',
      aliases: ['jabatan', 'jabatan_pergub', 'JABATAN', 'JABATAN PERGUB 1 Tahun 2017'],
      checkFilled: (r) => Boolean(r.jabatan || r.jabatan_pergub || r['JABATAN'])
    },
    {
      id: 'status_kepegawaian',
      label: 'Status Pegawai',
      category: 'Identitas & Status',
      aliases: ['status_kepegawaian', 'STATUS KEPEGAWAIAN'],
      checkFilled: (r) => Boolean(r.status_kepegawaian || r['STATUS KEPEGAWAIAN'])
    },
    {
      id: 'jenis_tenaga',
      label: 'Jenis Tenaga',
      category: 'Penugasan',
      aliases: ['jenis_tenaga', 'JENIS TENAGA'],
      checkFilled: (r) => Boolean(r.jenis_tenaga || r['JENIS TENAGA'])
    },
    {
      id: 'gol',
      label: 'Golongan / Pangkat',
      category: 'Identitas & Status',
      aliases: ['gol', 'GOL', 'golongan'],
      // Wajib untuk PNS & PPPK
      isApplicable: (r) => {
        const st = String(r.status_kepegawaian || '').toUpperCase();
        return st.includes('PNS') || st.includes('PPPK');
      },
      checkFilled: (r) => {
        const val = String(r.gol || r['GOL'] || '').trim();
        return val !== '' && val !== '-';
      }
    },
    {
      id: 'jenis_kelamin',
      label: 'Jenis Kelamin',
      category: 'Identitas & Status',
      aliases: ['jenis_kelamin', 'JENIS KELAMIN', 'gender'],
      checkFilled: (r) => Boolean(r.jenis_kelamin || r['JENIS KELAMIN'] || r.gender)
    },
    {
      id: 'agama',
      label: 'Agama',
      category: 'Identitas & Status',
      aliases: ['agama', 'AGAMA'],
      checkFilled: (r) => Boolean(r.agama || r['AGAMA'])
    },
    {
      id: 'tempat_lahir',
      label: 'Tempat Lahir',
      category: 'Identitas & Status',
      aliases: ['tempat_lahir', 'TEMPAT LAHIR'],
      checkFilled: (r) => Boolean(r.tempat_lahir || r['TEMPAT LAHIR'])
    },
    {
      id: 'tanggal_lahir',
      label: 'Tanggal Lahir',
      category: 'Identitas & Status',
      aliases: ['tanggal_lahir', 'TANGGAL LAHIR'],
      checkFilled: (r) => Boolean(r.tanggal_lahir || r['TANGGAL LAHIR'])
    },
    {
      id: 'tmt_mulai',
      label: 'TMT Mulai Bekerja',
      category: 'Penugasan',
      aliases: ['tmt_mulai', 'TMT MULAI BEKERJA'],
      checkFilled: (r) => Boolean(r.tmt_mulai || r['TMT MULAI BEKERJA'])
    },

    // Kontak & Domisili
    {
      id: 'nomor_hp',
      label: 'Nomor HP / WhatsApp',
      category: 'Kontak & Domisili',
      aliases: ['nomor_hp', 'NOMOR HP', 'no_hp', 'telepon'],
      checkFilled: (r) => {
        const val = String(r.nomor_hp || r['NOMOR HP'] || r.no_hp || '').trim();
        return val.length >= 8;
      }
    },
    {
      id: 'email',
      label: 'Email',
      category: 'Kontak & Domisili',
      aliases: ['email', 'EMAIL'],
      checkFilled: (r) => {
        const val = String(r.email || r['EMAIL'] || '').trim();
        return val.includes('@');
      }
    },
    {
      id: 'alamat',
      label: 'Alamat Lengkap',
      category: 'Kontak & Domisili',
      aliases: ['alamat', 'ALAMAT', 'alamat_lengkap'],
      checkFilled: (r) => {
        const val = String(r.alamat || r['ALAMAT'] || '').trim();
        return val.length >= 5 && val !== '-';
      }
    },
    {
      id: 'kelurahan',
      label: 'Kelurahan Domisili',
      category: 'Kontak & Domisili',
      aliases: ['kelurahan', 'KELURAHAN'],
      checkFilled: (r) => Boolean(r.kelurahan || r['KELURAHAN'])
    },
    {
      id: 'kecamatan',
      label: 'Kecamatan Domisili',
      category: 'Kontak & Domisili',
      aliases: ['kecamatan', 'KECAMATAN'],
      checkFilled: (r) => Boolean(r.kecamatan || r['KECAMATAN'])
    },
    {
      id: 'kab_kota',
      label: 'Kab / Kota Domisili',
      category: 'Kontak & Domisili',
      aliases: ['kab_kota', 'KAB', 'kabupaten', 'kota'],
      checkFilled: (r) => Boolean(r.kab_kota || r['KAB'] || r['KAB/KOTA'])
    },
    {
      id: 'provinsi',
      label: 'Provinsi Domisili',
      category: 'Kontak & Domisili',
      aliases: ['provinsi', 'PROVINSI'],
      checkFilled: (r) => Boolean(r.provinsi || r['PROVINSI'])
    },
    {
      id: 'domisili_wilayah',
      label: 'Wilayah Domisili',
      category: 'Kontak & Domisili',
      aliases: ['domisili_wilayah', 'WILAYAH DOMISILI'],
      checkFilled: (r) => Boolean(r.domisili_wilayah || r['WILAYAH DOMISILI'])
    },

    // Pendidikan & Ijazah
    {
      id: 'pendidikan',
      label: 'Jenjang Pendidikan',
      category: 'Pendidikan',
      aliases: ['pendidikan', 'PENDIDIKAN'],
      checkFilled: (r) => Boolean(r.pendidikan || r['PENDIDIKAN'])
    },
    {
      id: 'sekolah_pt',
      label: 'Nama Sekolah / PT',
      category: 'Pendidikan',
      aliases: ['sekolah_pt', 'NAMA SEKOLAH / PT', 'NAMA SEKOLAH'],
      checkFilled: (r) => {
        const val = String(r.sekolah_pt || r['NAMA SEKOLAH / PT'] || '').trim();
        return val.length >= 3 && val !== '-';
      }
    },
    {
      id: 'nomor_ijazah',
      label: 'Nomor Ijazah',
      category: 'Pendidikan',
      aliases: ['nomor_ijazah', 'NOMOR IAJZAH', 'NOMOR IJAZAH'],
      checkFilled: (r) => {
        const val = String(r.nomor_ijazah || r['NOMOR IAJZAH'] || r['NOMOR IJAZAH'] || '').trim();
        return val !== '' && val !== '-' && val.toLowerCase() !== '(belum input)';
      }
    },
    {
      id: 'tahun_lulus',
      label: 'Tahun Lulus',
      category: 'Pendidikan',
      aliases: ['tahun_lulus', 'TAHUN LULUS'],
      checkFilled: (r) => {
        const val = String(r.tahun_lulus || r['TAHUN LULUS'] || '').trim();
        return val !== '' && val !== '-';
      }
    },

    // Legalitas STR & SIP (Khusus Nakes)
    {
      id: 'no_str',
      label: 'Nomor STR',
      category: 'Legalitas STR/SIP',
      aliases: ['no_str', 'NO. STR', 'NOMOR STR'],
      isApplicable: (r) => {
        const jt = String(r.jenis_tenaga || '').toLowerCase();
        return jt.includes('kesehatan') || jt.includes('nakes');
      },
      checkFilled: (r) => {
        const val = String(r.no_str || r['NO. STR'] || r['NOMOR STR'] || '').trim();
        return val !== '' && val !== '-' && val.toLowerCase() !== 'bukan nakes';
      }
    },
    {
      id: 'status_str',
      label: 'Status STR',
      category: 'Legalitas STR/SIP',
      aliases: ['status_str', 'STATUS STR'],
      isApplicable: (r) => {
        const jt = String(r.jenis_tenaga || '').toLowerCase();
        return jt.includes('kesehatan') || jt.includes('nakes');
      },
      checkFilled: (r) => {
        const val = String(r.status_str || r['STATUS STR'] || '').trim();
        return val !== '' && val !== '-' && val.toLowerCase() !== 'bukan nakes';
      }
    },
    {
      id: 'no_sip',
      label: 'Nomor SIP',
      category: 'Legalitas STR/SIP',
      aliases: ['no_sip', 'NO. SIP', 'SIP'],
      isApplicable: (r) => {
        const jt = String(r.jenis_tenaga || '').toLowerCase();
        return jt.includes('kesehatan') || jt.includes('nakes');
      },
      checkFilled: (r) => {
        const val = String(r.no_sip || r['NO. SIP'] || r['SIP'] || '').trim();
        return val !== '' && val !== '-' && val.toLowerCase() !== 'bukan nakes';
      }
    },
    {
      id: 'status_sip',
      label: 'Status SIP',
      category: 'Legalitas STR/SIP',
      aliases: ['status_sip', 'STATUS SIP'],
      isApplicable: (r) => {
        const jt = String(r.jenis_tenaga || '').toLowerCase();
        return jt.includes('kesehatan') || jt.includes('nakes');
      },
      checkFilled: (r) => {
        const val = String(r.status_sip || r['STATUS SIP'] || '').trim();
        return val !== '' && val !== '-' && val.toLowerCase() !== 'bukan nakes';
      }
    }
  ], []);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('ALL');
  const [filterStatusPegawai, setFilterStatusPegawai] = useState('ALL');
  const [filterCompleteness, setFilterCompleteness] = useState<'ALL' | 'INCOMPLETE' | 'CRITICAL' | 'COMPLETE'>('INCOMPLETE');
  const [selectedColumnFilter, setSelectedColumnFilter] = useState<string>('ALL');
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<RowData | null>(null);

  // Analisis keterisian setiap baris pegawai
  const evaluatedRows = useMemo(() => {
    return sheet.rows.map(row => {
      const applicableFields = monitoredFields.filter(f => !f.isApplicable || f.isApplicable(row));
      const missingFields: MonitoredField[] = [];
      const filledFields: MonitoredField[] = [];

      applicableFields.forEach(f => {
        if (f.checkFilled(row)) {
          filledFields.push(f);
        } else {
          missingFields.push(f);
        }
      });

      const totalApplicable = applicableFields.length;
      const totalFilled = filledFields.length;
      const percentage = totalApplicable > 0 ? Math.round((totalFilled / totalApplicable) * 100) : 100;
      const isComplete = missingFields.length === 0;

      return {
        row,
        totalApplicable,
        totalFilled,
        missingFields,
        filledFields,
        percentage,
        isComplete
      };
    });
  }, [sheet.rows, monitoredFields]);

  // Statistik Keseluruhan
  const stats = useMemo(() => {
    const totalStaff = evaluatedRows.length;
    if (totalStaff === 0) {
      return {
        totalStaff: 0,
        completeStaff: 0,
        incompleteStaff: 0,
        criticalStaff: 0,
        overallPercentage: 100,
        columnStats: []
      };
    }

    const completeStaff = evaluatedRows.filter(r => r.isComplete).length;
    const incompleteStaff = totalStaff - completeStaff;
    const criticalStaff = evaluatedRows.filter(r => r.percentage < 80).length;

    const totalPossiblePoints = evaluatedRows.reduce((acc, r) => acc + r.totalApplicable, 0);
    const totalFilledPoints = evaluatedRows.reduce((acc, r) => acc + r.totalFilled, 0);
    const overallPercentage = totalPossiblePoints > 0 ? ((totalFilledPoints / totalPossiblePoints) * 100).toFixed(1) : '100';

    // Statistik per Kolom
    const columnStats = monitoredFields.map(f => {
      let applicableCount = 0;
      let filledCount = 0;

      sheet.rows.forEach(r => {
        if (!f.isApplicable || f.isApplicable(r)) {
          applicableCount++;
          if (f.checkFilled(r)) {
            filledCount++;
          }
        }
      });

      const missingCount = applicableCount - filledCount;
      const pct = applicableCount > 0 ? Math.round((filledCount / applicableCount) * 100) : 100;

      return {
        field: f,
        applicableCount,
        filledCount,
        missingCount,
        percentage: pct
      };
    }).sort((a, b) => a.percentage - b.percentage); // Kolom paling banyak kosong di urutan awal

    return {
      totalStaff,
      completeStaff,
      incompleteStaff,
      criticalStaff,
      overallPercentage,
      columnStats
    };
  }, [evaluatedRows, monitoredFields, sheet.rows]);

  // Filtered rows for the list table
  const filteredEvaluatedRows = useMemo(() => {
    return evaluatedRows.filter(item => {
      const r = item.row;
      const name = String(r.nama_gelar || r.nama || '').toLowerCase();
      const nip = String(r.nip || '').toLowerCase();
      const jabatan = String(r.jabatan || r.jabatan_pergub || '').toLowerCase();
      const unit = String(r.tempat_tugas || '');
      const statusPeg = String(r.status_kepegawaian || '');

      // Search keyword
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        if (!name.includes(q) && !nip.includes(q) && !jabatan.includes(q)) {
          return false;
        }
      }

      // Unit filter
      if (filterUnit !== 'ALL' && unit !== filterUnit) {
        return false;
      }

      // Status kepegawaian filter
      if (filterStatusPegawai !== 'ALL' && statusPeg !== filterStatusPegawai) {
        return false;
      }

      // Completeness status filter
      if (filterCompleteness === 'INCOMPLETE' && item.isComplete) {
        return false;
      }
      if (filterCompleteness === 'CRITICAL' && item.percentage >= 80) {
        return false;
      }
      if (filterCompleteness === 'COMPLETE' && !item.isComplete) {
        return false;
      }

      // Specific Column Filter
      if (selectedColumnFilter !== 'ALL') {
        const isMissingThisColumn = item.missingFields.some(m => m.id === selectedColumnFilter);
        if (!isMissingThisColumn) return false;
      }

      return true;
    });
  }, [evaluatedRows, searchTerm, filterUnit, filterStatusPegawai, filterCompleteness, selectedColumnFilter]);

  // Unit Options for select
  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    sheet.rows.forEach(r => {
      if (r.tempat_tugas) set.add(String(r.tempat_tugas).trim());
    });
    return Array.from(set).sort();
  }, [sheet.rows]);

  // Status Pegawai Options
  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    sheet.rows.forEach(r => {
      if (r.status_kepegawaian) set.add(String(r.status_kepegawaian).trim());
    });
    return Array.from(set).sort();
  }, [sheet.rows]);

  // Cetak Laporan PDF Tab Baru
  const handlePrintPdf = () => {
    const rowsToPrint = filteredEvaluatedRows;
    const filterDesc = [
      filterUnit !== 'ALL' ? `Unit: ${filterUnit}` : 'Semua Unit Tugas',
      filterStatusPegawai !== 'ALL' ? `Status: ${filterStatusPegawai}` : 'Semua Status Pegawai',
      selectedColumnFilter !== 'ALL' 
        ? `Fokus Kolom Kosong: ${monitoredFields.find(m => m.id === selectedColumnFilter)?.label || selectedColumnFilter}`
        : filterCompleteness === 'INCOMPLETE' ? 'Kategori: Data Belum Lengkap' : 'Semua Kategori'
    ].join(' | ');

    // Table HTML for PDF
    const tableRowsHtml = rowsToPrint.map((item, idx) => {
      const r = item.row;
      const missingListHtml = item.missingFields.length > 0 
        ? item.missingFields.map(m => `<span style="display:inline-block;background:#fee2e2;color:#b91c1c;padding:2px 6px;margin:1.5px;border-radius:3px;font-size:7.5pt;font-weight:600;border:1px solid #fca5a5;">${m.label}</span>`).join(' ')
        : '<span style="color:#16a34a;font-weight:bold;font-size:8pt;">LENGKAP 100%</span>';

      const pctBadgeColor = item.percentage === 100 ? '#16a34a' : item.percentage >= 80 ? '#d97706' : '#dc2626';

      return `
        <tr>
          <td style="text-align:center;font-weight:bold;padding:6px 4px;">${idx + 1}</td>
          <td style="padding:6px 8px;">
            <div style="font-weight:bold;font-size:9.5pt;color:#0f172a;">${r.nama_gelar || r.nama || '-'}</div>
            <div style="font-size:8pt;color:#475569;margin-top:2px;">NIP: ${r.nip || '-'} ${r.nrk ? `• NRK: ${r.nrk}` : ''}</div>
          </td>
          <td style="padding:6px 8px;font-size:8.5pt;">${r.tempat_tugas || '-'}</td>
          <td style="padding:6px 8px;font-size:8.5pt;">
            <div style="font-weight:600;">${r.jabatan || r.jabatan_pergub || '-'}</div>
            <div style="font-size:8pt;color:#64748b;">${r.status_kepegawaian || '-'} ${r.gol ? `(${r.gol})` : ''}</div>
          </td>
          <td style="text-align:center;padding:6px 6px;font-weight:bold;color:${pctBadgeColor};font-size:9.5pt;">
            ${item.percentage}%
            <div style="font-size:7.5pt;color:#64748b;font-weight:normal;">${item.missingFields.length > 0 ? `${item.missingFields.length} Kosong` : 'Lengkap'}</div>
          </td>
          <td style="padding:6px 8px;line-height:1.4;">
            ${missingListHtml}
          </td>
        </tr>
      `;
    }).join('');

    const statsHtml = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px;">
        <div style="background:#f8fafc;border:1px solid #cbd5e1;padding:8px 12px;border-radius:6px;text-align:center;">
          <div style="font-size:8pt;color:#64748b;text-transform:uppercase;font-weight:600;">Total SDMK Terdata</div>
          <div style="font-size:14pt;font-weight:900;color:#0f172a;">${stats.totalStaff} <span style="font-size:9pt;font-weight:normal;">orang</span></div>
        </div>
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;padding:8px 12px;border-radius:6px;text-align:center;">
          <div style="font-size:8pt;color:#047857;text-transform:uppercase;font-weight:600;">Data Lengkap (100%)</div>
          <div style="font-size:14pt;font-weight:900;color:#065f46;">${stats.completeStaff} <span style="font-size:9pt;font-weight:normal;">orang</span></div>
        </div>
        <div style="background:#fef2f2;border:1px solid #fecaca;padding:8px 12px;border-radius:6px;text-align:center;">
          <div style="font-size:8pt;color:#b91c1c;text-transform:uppercase;font-weight:600;">Data Belum Lengkap</div>
          <div style="font-size:14pt;font-weight:900;color:#991b1b;">${stats.incompleteStaff} <span style="font-size:9pt;font-weight:normal;">orang</span></div>
        </div>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:8px 12px;border-radius:6px;text-align:center;">
          <div style="font-size:8pt;color:#1d4ed8;text-transform:uppercase;font-weight:600;">Rata-rata Keterisian</div>
          <div style="font-size:14pt;font-weight:900;color:#1e40af;">${stats.overallPercentage}%</div>
        </div>
      </div>
    `;

    const tableHtml = `
      <table style="width:100%;border-collapse:collapse;margin-top:8px;" class="report-table">
        <thead>
          <tr style="background:#f1f5f9;color:#0f172a;font-size:8.5pt;text-transform:uppercase;">
            <th style="width:35px;text-align:center;padding:8px 4px;border:1px solid #cbd5e1;">NO</th>
            <th style="width:210px;text-align:left;padding:8px 8px;border:1px solid #cbd5e1;">NAMA PEGAWAI & NIP</th>
            <th style="width:150px;text-align:left;padding:8px 8px;border:1px solid #cbd5e1;">TEMPAT TUGAS</th>
            <th style="width:150px;text-align:left;padding:8px 8px;border:1px solid #cbd5e1;">JABATAN & STATUS</th>
            <th style="width:80px;text-align:center;padding:8px 4px;border:1px solid #cbd5e1;">SKOR</th>
            <th style="text-align:left;padding:8px 8px;border:1px solid #cbd5e1;">KOLOM / TABEL YANG BELUM LENGKAP</th>
          </tr>
        </thead>
        <tbody style="font-size:8.5pt;">
          ${tableRowsHtml}
        </tbody>
      </table>
    `;

    printReportInNewTab({
      title: 'LAPORAN MONITORING KELENGKAPAN & KETERISIAN DATA PEGAWAI (SDMK)',
      subtitle: 'Puskesmas Kepulauan Seribu Selatan - Sudin Kesehatan Kab. Adm. Kepulauan Seribu',
      metaInfo: `Filter Audit: ${filterDesc} • Dicetak sebanyak ${rowsToPrint.length} pegawai`,
      categoryBadge: 'AUDIT KETERISIAN DATA',
      orientation: 'landscape',
      statsHtml,
      tableHtml,
      customNotes: 'Catatan Resmi: Pegawai yang tercantum dengan kolom/tabel yang belum terisi diwajibkan untuk segera melengkapi data pendukung ke Subbagian Tata Usaha / Kepegawaian Puskesmas Kepulauan Seribu Selatan.'
    });
  };

  // Ekspor CSV Data Belum Lengkap
  const handleExportCsv = () => {
    let csv = 'NO,NAMA LENGKAP & GELAR,NIP,NRK,TEMPAT TUGAS,JABATAN,STATUS PEGAWAI,PERSENTASE KETERISIAN,JUMLAH KOLOM KOSONG,DAFTAR KOLOM YANG BELUM LENGKAP\n';
    filteredEvaluatedRows.forEach((item, idx) => {
      const r = item.row;
      const missingLabels = item.missingFields.map(m => m.label).join('; ');
      csv += `"${idx + 1}",` +
        `"${(r.nama_gelar || r.nama || '').replace(/"/g, '""')}",` +
        `"'${(r.nip || '').replace(/"/g, '""')}",` +
        `"'${(r.nrk || '').replace(/"/g, '""')}",` +
        `"${(r.tempat_tugas || '').replace(/"/g, '""')}",` +
        `"${(r.jabatan || r.jabatan_pergub || '').replace(/"/g, '""')}",` +
        `"${(r.status_kepegawaian || '').replace(/"/g, '""')}",` +
        `"${item.percentage}%",` +
        `"${item.missingFields.length}",` +
        `"${missingLabels.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Monitoring_Kelengkapan_Data_SDMK_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card with Title & Print PDF Action */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 flex-shrink-0">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Monitoring Keterisian & Kelengkapan Data Pegawai
                </h2>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  Audit SDMK
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Identifikasi pegawai dengan kolom data yang belum lengkap, pantau statistik keterisian tabel, dan cetak laporan resmi PDF
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-2xs"
              title="Unduh daftar audit kelengkapan pegawai dalam format CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Ekspor CSV</span>
            </button>

            <button
              id="btn-cetak-pdf-monitoring"
              onClick={handlePrintPdf}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all shadow-sm ring-2 ring-blue-500/20"
              title="Cetak Laporan Monitoring Lengkap dengan Kop Surat Pemprov DKI Jakarta di Tab Baru"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Cetak Laporan PDF (Tab Baru)</span>
            </button>
          </div>
        </div>

        {/* 2. Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-5 pt-5 border-t border-slate-100">
          {/* Total Staff */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Total Pegawai Terdata</span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {stats.totalStaff} <span className="text-xs font-normal text-slate-500">orang</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {monitoredFields.length} kolom indikator dipantau
            </div>
          </div>

          {/* Rata-rata Keterisian */}
          <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/70">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-700">Tingkat Keterisian</span>
              <span className="text-xs font-bold text-blue-700">{stats.overallPercentage}%</span>
            </div>
            <div className="text-2xl font-extrabold text-blue-900 mt-1">
              {stats.overallPercentage}%
            </div>
            <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, Number(stats.overallPercentage)))}%` }}
              />
            </div>
          </div>

          {/* Pegawai Belum Lengkap */}
          <div 
            onClick={() => setFilterCompleteness('INCOMPLETE')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              filterCompleteness === 'INCOMPLETE' 
                ? 'bg-rose-100/80 border-rose-300 ring-2 ring-rose-400/30' 
                : 'bg-rose-50/70 border-rose-200/70 hover:bg-rose-100/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-rose-700">Belum Lengkap</span>
              <UserX className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-extrabold text-rose-900 mt-1">
              {stats.incompleteStaff} <span className="text-xs font-normal text-rose-600">orang</span>
            </div>
            <div className="text-[10px] text-rose-600 mt-1 font-medium">
              {stats.criticalStaff > 0 ? `${stats.criticalStaff} orang kritis (<80%)` : 'Perlu dilengkapi'}
            </div>
          </div>

          {/* Pegawai Lengkap */}
          <div 
            onClick={() => setFilterCompleteness('COMPLETE')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              filterCompleteness === 'COMPLETE' 
                ? 'bg-emerald-100/80 border-emerald-300 ring-2 ring-emerald-400/30' 
                : 'bg-emerald-50/70 border-emerald-200/70 hover:bg-emerald-100/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700">Lengkap (100%)</span>
              <UserCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-900 mt-1">
              {stats.completeStaff} <span className="text-xs font-normal text-emerald-600">orang</span>
            </div>
            <div className="text-[10px] text-emerald-600 mt-1 font-medium">
              Seluruh kolom terisi valid
            </div>
          </div>
        </div>
      </div>

      {/* 3. Column Completeness Bar / Quick Focus Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Status Keterisian Tiap Kolom
            </h3>
            <span className="text-[10px] text-slate-500">
              (Klik kolom untuk filter pegawai yang kolomnya kosong)
            </span>
          </div>

          {selectedColumnFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedColumnFilter('ALL')}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 self-start"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Tampilkan Semua Kolom</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {stats.columnStats.map(col => {
            const isSelected = selectedColumnFilter === col.field.id;
            const hasMissing = col.missingCount > 0;

            return (
              <button
                key={col.field.id}
                onClick={() => {
                  if (isSelected) {
                    setSelectedColumnFilter('ALL');
                  } else {
                    setSelectedColumnFilter(col.field.id);
                  }
                }}
                className={`p-2.5 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 shadow-2xs'
                    : hasMissing
                    ? 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                    : 'bg-emerald-50/40 hover:bg-emerald-50 border-emerald-200/60'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 truncate">
                  <span className="truncate" title={col.field.label}>{col.field.label}</span>
                  <span className={`text-[10px] ml-1 font-extrabold ${hasMissing ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {col.percentage}%
                  </span>
                </div>
                
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                  <div 
                    className={`h-1.5 rounded-full ${
                      col.percentage === 100 
                        ? 'bg-emerald-500' 
                        : col.percentage >= 80 
                        ? 'bg-amber-500' 
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${col.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>{col.filledCount} terisi</span>
                  {hasMissing ? (
                    <span className="text-rose-600 font-semibold">{col.missingCount} kosong</span>
                  ) : (
                    <span className="text-emerald-600 font-medium">Lengkap</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Controls: Search, Unit Filter, Status Filter & Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari Nama Pegawai, NIP, atau Jabatan..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Status Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
              <button
                onClick={() => setFilterCompleteness('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterCompleteness === 'ALL'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Semua ({evaluatedRows.length})
              </button>

              <button
                onClick={() => setFilterCompleteness('INCOMPLETE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
                  filterCompleteness === 'INCOMPLETE'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <AlertCircle className="w-3 h-3" />
                <span>Belum Lengkap ({stats.incompleteStaff})</span>
              </button>

              <button
                onClick={() => setFilterCompleteness('CRITICAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterCompleteness === 'CRITICAL'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                Kritis &lt;80% ({stats.criticalStaff})
              </button>

              <button
                onClick={() => setFilterCompleteness('COMPLETE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
                  filterCompleteness === 'COMPLETE'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Lengkap ({stats.completeStaff})</span>
              </button>
            </div>
          </div>

          {/* Secondary Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/60">
            {/* Tempat Tugas */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Tempat Tugas:</span>
              <select
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="ALL">Semua Unit ({sheet.rows.length})</option>
                {unitOptions.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Status Pegawai */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Status Pegawai:</span>
              <select
                value={filterStatusPegawai}
                onChange={(e) => setFilterStatusPegawai(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="ALL">Semua Status</option>
                {statusOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Filter Kolom Kosong Spesifik */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Filter Kolom Kosong:</span>
              <select
                value={selectedColumnFilter}
                onChange={(e) => setSelectedColumnFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="ALL">Semua Kolom</option>
                {monitoredFields.map(f => (
                  <option key={f.id} value={f.id}>Kolom: {f.label}</option>
                ))}
              </select>
            </div>

            {(filterUnit !== 'ALL' || filterStatusPegawai !== 'ALL' || selectedColumnFilter !== 'ALL' || searchTerm !== '' || filterCompleteness !== 'INCOMPLETE') && (
              <button
                onClick={() => {
                  setFilterUnit('ALL');
                  setFilterStatusPegawai('ALL');
                  setSelectedColumnFilter('ALL');
                  setSearchTerm('');
                  setFilterCompleteness('INCOMPLETE');
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 ml-auto"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabel Pegawai Monitoring */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 min-w-[220px]">Nama Pegawai & NIP</th>
                <th className="py-3 px-3 min-w-[170px]">Tempat Tugas</th>
                <th className="py-3 px-3 min-w-[160px]">Jabatan & Status</th>
                <th className="py-3 px-3 w-32 text-center">Tingkat Keterisian</th>
                <th className="py-3 px-3 min-w-[280px]">Kolom / Tabel Yang Belum Lengkap</th>
                <th className="py-3 px-3 w-20 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {filteredEvaluatedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <div className="text-sm font-bold text-slate-800">
                      Tidak ada data pegawai yang sesuai dengan filter
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Semua pegawai pada kriteria ini telah memiliki data yang lengkap.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEvaluatedRows.map((item, idx) => {
                  const r = item.row;
                  const pctColor = item.percentage === 100 
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                    : item.percentage >= 80 
                    ? 'text-amber-700 bg-amber-50 border-amber-200' 
                    : 'text-rose-700 bg-rose-50 border-rose-200';

                  const barBg = item.percentage === 100 
                    ? 'bg-emerald-500' 
                    : item.percentage >= 80 
                    ? 'bg-amber-500' 
                    : 'bg-rose-500';

                  return (
                    <tr key={r._id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 text-xs sm:text-[13px]">
                          {r.nama_gelar || r.nama || '(Nama Kosong)'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span>NIP: <span className="font-semibold text-slate-700">{r.nip || '-'}</span></span>
                          {r.nrk && (
                            <span>• NRK: <span className="font-semibold text-slate-700">{r.nrk}</span></span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 text-xs">
                        <div className="font-medium">{r.tempat_tugas || '-'}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        <div className="font-semibold text-xs text-slate-800">{r.jabatan || r.jabatan_pergub || '-'}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {r.status_kepegawaian || '-'} {r.gol ? `• ${r.gol}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold border ${pctColor}`}>
                            {item.percentage}%
                          </span>
                          <div className="w-20 bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div className={`h-1.5 rounded-full ${barBg}`} style={{ width: `${item.percentage}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-500 mt-0.5">
                            {item.missingFields.length > 0 ? `${item.missingFields.length} kolom kosong` : '100% Lengkap'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {item.missingFields.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Data Lengkap</span>
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {item.missingFields.map(m => (
                              <span 
                                key={m.id}
                                className="inline-block px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-semibold"
                                title={`Kategori: ${m.category}`}
                              >
                                {m.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setSelectedStaffDetail(r)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1"
                          title="Lihat rincian lengkap isian kolom pegawai ini"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Menampilkan <span className="font-bold text-slate-700">{filteredEvaluatedRows.length}</span> dari total <span className="font-bold text-slate-700">{sheet.rows.length}</span> pegawai.
          </div>
          <div className="text-[11px] text-slate-400">
            Audit mencakup kelengkapan data Identitas, Kontak, Domisili, Pendidikan, dan Legalitas STR/SIP
          </div>
        </div>
      </div>

      {/* 5. Modal Rincian Keterisian Staf */}
      {selectedStaffDetail && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {selectedStaffDetail.nama_gelar || selectedStaffDetail.nama || 'Rincian Pegawai'}
                  </h3>
                  <div className="text-xs text-slate-500">
                    NIP: {selectedStaffDetail.nip || '-'} • {selectedStaffDetail.tempat_tugas || '-'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaffDetail(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Status Checklist */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Ringkasan status */}
              {(() => {
                const evalItem = evaluatedRows.find(e => e.row._id === selectedStaffDetail._id);
                if (!evalItem) return null;

                return (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 font-medium">Skor Kelengkapan Pegawai</div>
                      <div className="text-base font-extrabold text-slate-900">
                        {evalItem.percentage}% ({evalItem.totalFilled} dari {evalItem.totalApplicable} kolom terisi)
                      </div>
                    </div>
                    <div>
                      {evalItem.isComplete ? (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Lengkap
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> {evalItem.missingFields.length} Kolom Belum Terisi
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Rincian per kategori */}
              {(['Identitas & Status', 'Kontak & Domisili', 'Pendidikan', 'Legalitas STR/SIP', 'Penugasan'] as const).map(cat => {
                const catFields = monitoredFields.filter(f => f.category === cat && (!f.isApplicable || f.isApplicable(selectedStaffDetail)));
                if (catFields.length === 0) return null;

                return (
                  <div key={cat} className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {cat}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {catFields.map(f => {
                        const isFilled = f.checkFilled(selectedStaffDetail);
                        const rawVal = selectedStaffDetail[f.id] || selectedStaffDetail[f.aliases.find(a => selectedStaffDetail[a]) || ''];

                        return (
                          <div 
                            key={f.id}
                            className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 ${
                              isFilled 
                                ? 'bg-emerald-50/40 border-emerald-200/80' 
                                : 'bg-rose-50/60 border-rose-200'
                            }`}
                          >
                            <div>
                              <div className="text-[11px] font-bold text-slate-800">{f.label}</div>
                              <div className="text-xs text-slate-600 mt-0.5 truncate max-w-[200px]">
                                {isFilled ? String(rawVal || 'Terisi') : <span className="text-rose-600 font-semibold italic">(Belum Diisi)</span>}
                              </div>
                            </div>
                            {isFilled ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setSelectedStaffDetail(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
