import React, { useState, useMemo } from 'react';
import { 
  Grid, 
  Download, 
  RotateCcw,
  ArrowLeftRight,
  Search,
  ArrowUpDown,
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Printer
} from 'lucide-react';
import { Sheet, RowData } from '../../types/sheet';
import { StaffListModal } from '../Modals/StaffListModal';
import { printReportInNewTab } from '../../utils/pdfReportGenerator';

interface MatrixPivotProps {
  sheet: Sheet;
}

export interface PivotDimension {
  id: string;
  label: string;
  group: string;
  aliases: string[];
  getValue?: (row: RowData) => string;
}

export const MatrixPivot: React.FC<MatrixPivotProps> = ({ sheet }) => {
  // Master list of all dimensions requested from the column titles
  const masterDimensions: PivotDimension[] = useMemo(() => [
    // 1. Formasi & Unit Jabatan
    { 
      id: 'tempat_tugas', 
      label: 'TEMPAT TUGAS', 
      group: 'Unit & Formasi Jabatan',
      aliases: ['TEMPAT TUGAS', 'tempat_tugas', 'unit_tugas', 'Tempat Tugas', 'unit']
    },
    { 
      id: 'jabatan_pergub', 
      label: 'JABATAN PERGUB 1 Tahun 2017', 
      group: 'Unit & Formasi Jabatan',
      aliases: ['JABATAN PERGUB 1 Tahun 2017', 'jabatan_pergub', 'jabatan', 'JABATAN'],
      getValue: (r) => r.jabatan_pergub || r['JABATAN PERGUB 1 Tahun 2017'] || r.jabatan || '(Kosong)'
    },
    { 
      id: 'jabatan_menpan', 
      label: 'JABATAN KEP MENPAN RB', 
      group: 'Unit & Formasi Jabatan',
      aliases: ['JABATAN KEP MENPAN RB', 'jabatan_menpan', 'jabatan', 'JABATAN'],
      getValue: (r) => r.jabatan_menpan || r['JABATAN KEP MENPAN RB'] || r.jabatan || '(Kosong)'
    },
    { 
      id: 'rumpun_jabatan', 
      label: 'RUMPUN JABATAN', 
      group: 'Unit & Formasi Jabatan',
      aliases: ['RUMPUN JABATAN', 'rumpun_jabatan']
    },
    { 
      id: 'jenjang_saat_ini', 
      label: 'JENJANG SAAT INI', 
      group: 'Unit & Formasi Jabatan',
      aliases: ['JENJANG SAAT INI', 'jenjang_saat_ini', 'jenjang']
    },
    { 
      id: 'jenis_tenaga', 
      label: 'JENIS TENAGA', 
      group: 'Unit & Formasi Jabatan',
      aliases: ['JENIS TENAGA', 'jenis_tenaga']
    },

    // 2. Status & Kepegawaian
    { 
      id: 'status_kepegawaian', 
      label: 'STATUS KEPEGAWAIAN', 
      group: 'Status & Kepegawaian',
      aliases: ['STATUS KEPEGAWAIAN', 'status_kepegawaian', 'status_pegawai']
    },
    { 
      id: 'status_bekerja', 
      label: 'STATUS BEKERJA', 
      group: 'Status & Kepegawaian',
      aliases: ['STATUS BEKERJA', 'status_bekerja', 'status_kerja', 'status_aktif']
    },
    { 
      id: 'nip', 
      label: 'NIP / ID PEGAWAI', 
      group: 'Status & Kepegawaian',
      aliases: ['NIP/ ID PEGAWAI', 'NIP / ID PEGAWAI', 'nip', 'NIP', 'id_pegawai']
    },
    { 
      id: 'nrk', 
      label: 'NRK', 
      group: 'Status & Kepegawaian',
      aliases: ['NRK', 'nrk'],
      getValue: (r) => {
        const val = r.nrk || r['NRK'];
        if (val && String(val).trim() !== '') return String(val).trim();
        return r.status_kepegawaian === 'PNS' ? '(Belum Input)' : 'NON-PNS';
      }
    },
    { 
      id: 'gol', 
      label: 'GOLONGAN / PANGKAT', 
      group: 'Status & Kepegawaian',
      aliases: ['GOL', 'gol', 'golongan', 'pangkat_golongan']
    },
    { 
      id: 'tmt_pangkat', 
      label: 'TMT PANGKAT', 
      group: 'Status & Kepegawaian',
      aliases: ['TMT PANGKAT', 'tmt_pangkat'],
      getValue: (r) => r.tmt_pangkat || r['TMT PANGKAT'] || r.tmt_mulai || '(Belum Ada)'
    },
    { 
      id: 'tmt_jabatan', 
      label: 'TMT JABATAN', 
      group: 'Status & Kepegawaian',
      aliases: ['TMT JABATAN', 'tmt_jabatan'],
      getValue: (r) => r.tmt_jabatan || r['TMT JABATAN'] || r.tmt_mulai || '(Belum Ada)'
    },
    { 
      id: 'tmt_pangkat_berikutnya', 
      label: 'TMT PANGKAT BERIKUTNYA', 
      group: 'Status & Kepegawaian',
      aliases: ['TMT PANGKAT BERIKUTNYA', 'tmt_pangkat_berikutnya'],
      getValue: (r) => r.tmt_pangkat_berikutnya || r['TMT PANGKAT BERIKUTNYA'] || '(Belum Ada)'
    },
    { 
      id: 'tmt_mulai', 
      label: 'TMT MULAI BEKERJA', 
      group: 'Status & Kepegawaian',
      aliases: ['TMT MULAI BEKERJA', 'tmt_mulai', 'tmt_mulai_bekerja', 'tmt']
    },
    { 
      id: 'tmt_mulai_dipulau', 
      label: 'TMT MULAI BEKERJA (DIPULAU)', 
      group: 'Status & Kepegawaian',
      aliases: ['TMT MULAI BEKERJA (DIPULAU)', 'tmt_mulai_dipulau'],
      getValue: (r) => r.tmt_mulai_dipulau || r['TMT MULAI BEKERJA (DIPULAU)'] || r.tmt_mulai || '(Belum Ada)'
    },
    { 
      id: 'masa_kerja', 
      label: 'MASA KERJA', 
      group: 'Status & Kepegawaian',
      aliases: ['MASA KERJA', 'masa_kerja'],
      getValue: (r) => {
        if (r.masa_kerja) return String(r.masa_kerja);
        if (r['MASA KERJA']) return String(r['MASA KERJA']);
        if (r.masa_kerja_tahun) return `${r.masa_kerja_tahun} Tahun`;
        return '(Kosong)';
      }
    },
    { 
      id: 'masa_kerja_tahun', 
      label: 'MASA KERJA (TAHUN)', 
      group: 'Status & Kepegawaian',
      aliases: ['masa_kerja_tahun', 'Masa Kerja (Thn)'],
      getValue: (r) => {
        if (r.masa_kerja_tahun !== undefined && r.masa_kerja_tahun !== null) return `${r.masa_kerja_tahun} Thn`;
        return '(Kosong)';
      }
    },

    // 3. Biodata & Demografi
    { 
      id: 'nama_gelar', 
      label: 'NAMA LENGKAP & GELAR', 
      group: 'Biodata & Demografi',
      aliases: ['nama_gelar', 'NAMA DENGAN GELAR', 'nama', 'NAMA']
    },
    { 
      id: 'nama', 
      label: 'NAMA (TANPA GELAR)', 
      group: 'Biodata & Demografi',
      aliases: ['nama', 'NAMA']
    },
    { 
      id: 'nik', 
      label: 'NIK KTP', 
      group: 'Biodata & Demografi',
      aliases: ['NIK', 'nik']
    },
    { 
      id: 'jenis_kelamin', 
      label: 'JENIS KELAMIN', 
      group: 'Biodata & Demografi',
      aliases: ['JENIS KELAMIN', 'jenis_kelamin', 'gender']
    },
    { 
      id: 'agama', 
      label: 'AGAMA', 
      group: 'Biodata & Demografi',
      aliases: ['AGAMA', 'agama']
    },
    { 
      id: 'tempat_lahir', 
      label: 'TEMPAT LAHIR', 
      group: 'Biodata & Demografi',
      aliases: ['TEMPAT LAHIR', 'tempat_lahir']
    },
    { 
      id: 'tanggal_lahir', 
      label: 'TANGGAL LAHIR', 
      group: 'Biodata & Demografi',
      aliases: ['TANGGAL LAHIR', 'tanggal_lahir']
    },

    // 4. Usia & Pensiun
    { 
      id: 'usia', 
      label: 'USIA', 
      group: 'Usia & Pensiun',
      aliases: ['USIA', 'usia'],
      getValue: (r) => {
        if (r.usia) return String(r.usia);
        if (r['USIA']) return String(r['USIA']);
        if (r.usia_tahun) return `${r.usia_tahun} Thn`;
        return '(Kosong)';
      }
    },
    { 
      id: 'usia_tahun', 
      label: 'USIA (TAHUN)', 
      group: 'Usia & Pensiun',
      aliases: ['usia_tahun', 'Usia (Thn)'],
      getValue: (r) => {
        if (r.usia_tahun !== undefined && r.usia_tahun !== null) return `${r.usia_tahun} Thn`;
        return '(Kosong)';
      }
    },
    { 
      id: 'kelompok_usia', 
      label: 'KELOMPOK USIA', 
      group: 'Usia & Pensiun',
      aliases: ['KELOMPOK USIA', 'kelompok_usia']
    },
    { 
      id: 'tanggal_pensiun', 
      label: 'TANGGAL PENSIUN', 
      group: 'Usia & Pensiun',
      aliases: ['PENSIUN', 'tanggal_pensiun', 'tgl_pensiun', 'pensiun']
    },
    { 
      id: 'prediksi_pensiun', 
      label: 'PREDIKSI / SISA PENSIUN', 
      group: 'Usia & Pensiun',
      aliases: ['PREDIKSI', 'prediksi', 'prediksi_pensiun', 'sisa_pensiun'],
      getValue: (r) => {
        if (r.prediksi) return String(r.prediksi);
        if (r['PREDIKSI']) return String(r['PREDIKSI']);
        if (r.prediksi_pensiun) return String(r.prediksi_pensiun);
        if (r.tanggal_pensiun && String(r.tanggal_pensiun).includes('/')) {
          const parts = String(r.tanggal_pensiun).split('/');
          const yr = parts[parts.length - 1];
          if (yr && yr.length === 4) return `Tahun ${yr}`;
        }
        if (r.sisa_pensiun) return String(r.sisa_pensiun);
        return '(Belum Ada)';
      }
    },
    { 
      id: 'sisa_pensiun_tahun', 
      label: 'SISA PENSIUN (TAHUN)', 
      group: 'Usia & Pensiun',
      aliases: ['sisa_pensiun_tahun', 'Sisa Pensiun (Thn)'],
      getValue: (r) => {
        if (r.sisa_pensiun_tahun !== undefined && r.sisa_pensiun_tahun !== null) return `${r.sisa_pensiun_tahun} Thn`;
        return '(Kosong)';
      }
    },

    // 5. Pendidikan & Ijazah
    { 
      id: 'pendidikan', 
      label: 'PENDIDIKAN', 
      group: 'Pendidikan & Ijazah',
      aliases: ['PENDIDIKAN', 'pendidikan', 'jenjang_pendidikan']
    },
    { 
      id: 'sekolah_pt', 
      label: 'NAMA SEKOLAH / PT', 
      group: 'Pendidikan & Ijazah',
      aliases: ['NAMA SEKOLAH / PT', 'NAMA SEKOLAH', 'sekolah_pt', 'asal_sekolah']
    },
    { 
      id: 'nomor_ijazah', 
      label: 'NOMOR IJAZAH', 
      group: 'Pendidikan & Ijazah',
      aliases: ['NOMOR IAJZAH', 'NOMOR IJAZAH', 'nomor_ijazah', 'no_ijazah'],
      getValue: (r) => r.nomor_ijazah || r['NOMOR IAJZAH'] || r['NOMOR IJAZAH'] || (r.sekolah_pt ? 'Tercatat di Berkas' : '(Belum Input)')
    },
    { 
      id: 'tahun_lulus', 
      label: 'TAHUN LULUS', 
      group: 'Pendidikan & Ijazah',
      aliases: ['TAHUN LULUS', 'tahun_lulus']
    },

    // 6. Kontak & Komunikasi
    { 
      id: 'nomor_hp', 
      label: 'NOMOR HP / WA', 
      group: 'Kontak & Komunikasi',
      aliases: ['nomor_hp', 'NOMOR HP', 'no_hp', 'telepon', 'No. HP / WA']
    },
    { 
      id: 'email', 
      label: 'ALAMAT EMAIL', 
      group: 'Kontak & Komunikasi',
      aliases: ['email', 'EMAIL']
    },

    // 7. Domisili & Wilayah
    { 
      id: 'domisili_wilayah', 
      label: 'WILAYAH DOMISILI', 
      group: 'Domisili & Wilayah',
      aliases: ['WILAYAH DOMISILI', 'domisili_wilayah']
    },
    { 
      id: 'provinsi', 
      label: 'PROVINSI', 
      group: 'Domisili & Wilayah',
      aliases: ['PROVINSI', 'provinsi']
    },
    { 
      id: 'kab_kota', 
      label: 'KAB / KOTA', 
      group: 'Domisili & Wilayah',
      aliases: ['KAB', 'kab', 'kab_kota', 'kabupaten', 'kota', 'KAB/KOTA', 'Kab / Kota Domisili']
    },
    { 
      id: 'kecamatan', 
      label: 'KECAMATAN', 
      group: 'Domisili & Wilayah',
      aliases: ['KECAMATAN', 'kecamatan']
    },
    { 
      id: 'kelurahan', 
      label: 'KELURAHAN', 
      group: 'Domisili & Wilayah',
      aliases: ['KELURAHAN', 'kelurahan']
    },
    { 
      id: 'alamat', 
      label: 'ALAMAT LENGKAP', 
      group: 'Domisili & Wilayah',
      aliases: ['ALAMAT', 'alamat', 'alamat_lengkap']
    },

    // 8. Jam Kerja & Tim
    { 
      id: 'jam_kerja', 
      label: 'JAM KERJA KEPGUB 755', 
      group: 'Jam Kerja & Tim',
      aliases: ['JAM KERJA KEPGUB 755', 'jam_kerja', 'JAM KERJA', 'jam_kerja_kepgub']
    },
    { 
      id: 'kerja_tim', 
      label: 'KERJA TIM / SHIFT', 
      group: 'Jam Kerja & Tim',
      aliases: ['KERJA TIM', 'kerja_tim', 'shift', 'tim']
    },

    // 9. Legalitas STR & SIP
    { 
      id: 'status_str', 
      label: 'STATUS STR', 
      group: 'Legalitas STR & SIP',
      aliases: ['STATUS STR', 'status_str']
    },
    { 
      id: 'no_str', 
      label: 'NO. STR', 
      group: 'Legalitas STR & SIP',
      aliases: ['NO. STR', 'no_str', 'NOMOR STR']
    },
    { 
      id: 'masa_berlaku_str', 
      label: 'MASA BERLAKU STR', 
      group: 'Legalitas STR & SIP',
      aliases: ['masa_berlaku_str', 'MASA BERLAKU STR']
    },
    { 
      id: 'status_sip', 
      label: 'STATUS SIP', 
      group: 'Legalitas STR & SIP',
      aliases: ['STATUS SIP', 'status_sip']
    },
    { 
      id: 'no_sip', 
      label: 'NO. SIP', 
      group: 'Legalitas STR & SIP',
      aliases: ['NO. SIP', 'no_sip', 'SIP', 'NOMOR SIP']
    },
    { 
      id: 'tgl_terbit_sip', 
      label: 'TANGGAL TERBIT SIP', 
      group: 'Legalitas STR & SIP',
      aliases: ['tgl_terbit_sip', 'TANGGAL TERBIT SIP']
    },
    { 
      id: 'tgl_berakhir_sip', 
      label: 'TANGGAL BERAKHIR SIP', 
      group: 'Legalitas STR & SIP',
      aliases: ['tgl_berakhir_sip', 'TANGGAL BERAKHIR SIP']
    },
    { 
      id: 'masa_berlaku_sip', 
      label: 'MASA BERLAKU SIP', 
      group: 'Legalitas STR & SIP',
      aliases: ['masa_berlaku_sip', 'MASA BERLAKU SIP']
    }
  ], []);

  // Merge any other dynamic columns found in sheet.columns or sheet.rows that aren't already represented
  const allDimensions = useMemo(() => {
    const existingIds = new Set(masterDimensions.map(d => d.id.toLowerCase()));
    const extraDims: PivotDimension[] = [];

    // Helper to check if a key/name is represented
    const isRepresented = (key: string, name: string) => {
      const k = key.toLowerCase();
      const n = name.toLowerCase();
      return masterDimensions.some(m => 
        m.id.toLowerCase() === k || 
        m.label.toLowerCase() === n ||
        m.aliases.some(a => a.toLowerCase() === k || a.toLowerCase() === n)
      );
    };

    // 1. From sheet.columns
    sheet.columns.forEach(col => {
      if (col.id === '_id' || col.id === 'no' || existingIds.has(col.id.toLowerCase())) return;
      
      if (!isRepresented(col.id, col.name)) {
        extraDims.push({
          id: col.id,
          label: col.name.toUpperCase(),
          group: 'Kolom Tambahan Lainnya',
          aliases: [col.id, col.name]
        });
        existingIds.add(col.id.toLowerCase());
      }
    });

    // 2. From actual row keys (for any extra headers from imported spreadsheet)
    if (sheet.rows.length > 0) {
      const sampleRow = sheet.rows[0];
      Object.keys(sampleRow).forEach(key => {
        if (key === '_id' || key === 'no' || existingIds.has(key.toLowerCase())) return;
        if (!isRepresented(key, key)) {
          extraDims.push({
            id: key,
            label: key.replace(/_/g, ' ').toUpperCase(),
            group: 'Kolom Tambahan Lainnya',
            aliases: [key]
          });
          existingIds.add(key.toLowerCase());
        }
      });
    }

    return [...masterDimensions, ...extraDims];
  }, [masterDimensions, sheet.columns, sheet.rows]);

  // Grouped dimensions for <optgroup>
  const groupedDimensions = useMemo(() => {
    const groups: Record<string, PivotDimension[]> = {};
    allDimensions.forEach(dim => {
      if (!groups[dim.group]) {
        groups[dim.group] = [];
      }
      groups[dim.group].push(dim);
    });
    return groups;
  }, [allDimensions]);

  // Metric options
  const metricOptions = useMemo(() => [
    { id: 'count', label: 'Jumlah Pegawai (Count)', unit: 'orang' },
    { id: 'avg_usia', label: 'Rata-rata Usia', unit: 'thn', field: 'usia_tahun' },
    { id: 'avg_masa_kerja', label: 'Rata-rata Masa Kerja', unit: 'thn', field: 'masa_kerja_tahun' },
    { id: 'avg_sisa_pensiun', label: 'Rata-rata Sisa Pensiun', unit: 'thn', field: 'sisa_pensiun_tahun' }
  ], []);

  // Active configurations
  const [rowDimension, setRowDimension] = useState<string>('tempat_tugas');
  const [colDimension, setColDimension] = useState<string>('status_kepegawaian');
  const [metric, setMetric] = useState<string>('count');
  const [filterUnit, setFilterUnit] = useState<string>('ALL');

  // Interactive controls: search & sort rows
  const [rowSearch, setRowSearch] = useState<string>('');
  const [rowSortOrder, setRowSortOrder] = useState<'alpha_asc' | 'alpha_desc' | 'total_desc' | 'total_asc'>('alpha_asc');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal state for clicking on count numbers to view employee names
  const [staffModalData, setStaffModalData] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    badgeText?: string;
    staffList: RowData[];
  }>({
    isOpen: false,
    title: '',
    staffList: []
  });

  const handleOpenStaffModal = (title: string, subtitle: string, list: RowData[]) => {
    setStaffModalData({
      isOpen: true,
      title,
      subtitle,
      badgeText: `${list.length} Orang Pegawai`,
      staffList: list
    });
  };

  // Helper to extract value safely from row based on definition
  const getDimensionValue = (row: RowData, dimensionId: string): string => {
    const def = allDimensions.find(d => d.id === dimensionId);
    if (!def) {
      const direct = row[dimensionId];
      return (direct !== undefined && direct !== null && String(direct).trim() !== '') ? String(direct).trim() : '(Kosong)';
    }

    if (def.getValue) {
      const custom = def.getValue(row);
      if (custom && custom.trim() !== '') return custom.trim();
    }

    // 1. Direct match on id
    if (row[def.id] !== undefined && row[def.id] !== null && String(row[def.id]).trim() !== '') {
      return String(row[def.id]).trim();
    }

    // 2. Check aliases
    for (const alias of def.aliases) {
      if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== '') {
        return String(row[alias]).trim();
      }
    }

    // 3. Fallback: normalize check
    const targetNorm = def.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const key of Object.keys(row)) {
      const keyNorm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (keyNorm === targetNorm) {
        const v = row[key];
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          return String(v).trim();
        }
      }
    }

    return '(Kosong)';
  };

  // Filtered rows by unit kerja
  const activeRows = useMemo(() => {
    if (filterUnit === 'ALL') return sheet.rows;
    return sheet.rows.filter(r => {
      const unit = getDimensionValue(r, 'tempat_tugas');
      return unit === filterUnit;
    });
  }, [sheet.rows, filterUnit]);

  // Unique raw values for row dimension
  const allRowKeys = useMemo(() => {
    const set = new Set<string>();
    activeRows.forEach(r => {
      set.add(getDimensionValue(r, rowDimension));
    });
    return Array.from(set);
  }, [activeRows, rowDimension]);

  // Unique raw values for col dimension
  const colKeys = useMemo(() => {
    const set = new Set<string>();
    activeRows.forEach(r => {
      set.add(getDimensionValue(r, colDimension));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id-ID'));
  }, [activeRows, colDimension]);

  // Compute 2D matrix
  const { matrix, rowTotals, colTotals, grandTotal, maxVal } = useMemo(() => {
    const mat: Record<string, Record<string, { count: number; sum: number }>> = {};
    const rTotals: Record<string, { count: number; sum: number }> = {};
    const cTotals: Record<string, { count: number; sum: number }> = {};
    let gTotal = { count: 0, sum: 0 };
    let maximum = 0;

    const selectedMetricDef = metricOptions.find(m => m.id === metric);
    const numericField = selectedMetricDef?.field;

    // Initialize
    allRowKeys.forEach(r => {
      mat[r] = {};
      rTotals[r] = { count: 0, sum: 0 };
      colKeys.forEach(c => {
        mat[r][c] = { count: 0, sum: 0 };
      });
    });

    colKeys.forEach(c => {
      cTotals[c] = { count: 0, sum: 0 };
    });

    // Populate
    activeRows.forEach(r => {
      const rKey = getDimensionValue(r, rowDimension);
      const cKey = getDimensionValue(r, colDimension);
      const numVal = numericField ? Number(r[numericField]) || 0 : 1;

      if (mat[rKey] && mat[rKey][cKey]) {
        mat[rKey][cKey].count += 1;
        mat[rKey][cKey].sum += numVal;

        rTotals[rKey].count += 1;
        rTotals[rKey].sum += numVal;

        cTotals[cKey].count += 1;
        cTotals[cKey].sum += numVal;

        gTotal.count += 1;
        gTotal.sum += numVal;
      }
    });

    // Calculate maximum for heatmap intensity
    allRowKeys.forEach(r => {
      colKeys.forEach(c => {
        const item = mat[r][c];
        if (item) {
          const val = metric === 'count' ? item.count : (item.count > 0 ? item.sum / item.count : 0);
          if (val > maximum) maximum = val;
        }
      });
    });

    return {
      matrix: mat,
      rowTotals: rTotals,
      colTotals: cTotals,
      grandTotal: gTotal,
      maxVal: maximum || 1
    };
  }, [activeRows, rowDimension, colDimension, allRowKeys, colKeys, metric, metricOptions]);

  // Sorted and searched row keys
  const filteredSortedRowKeys = useMemo(() => {
    let list = [...allRowKeys];

    // Filter by search query
    if (rowSearch.trim()) {
      const q = rowSearch.toLowerCase();
      list = list.filter(k => k.toLowerCase().includes(q));
    }

    // Sort
    list.sort((a, b) => {
      if (rowSortOrder === 'alpha_asc') return a.localeCompare(b, 'id-ID');
      if (rowSortOrder === 'alpha_desc') return b.localeCompare(a, 'id-ID');
      const valA = metric === 'count' ? (rowTotals[a]?.count || 0) : (rowTotals[a]?.sum || 0);
      const valB = metric === 'count' ? (rowTotals[b]?.count || 0) : (rowTotals[b]?.sum || 0);
      if (rowSortOrder === 'total_desc') return valB - valA;
      return valA - valB;
    });

    return list;
  }, [allRowKeys, rowSearch, rowSortOrder, metric, rowTotals]);

  // Paginated rows
  const paginatedRowKeys = useMemo(() => {
    if (pageSize >= 999) return filteredSortedRowKeys;
    const start = (currentPage - 1) * pageSize;
    return filteredSortedRowKeys.slice(start, start + pageSize);
  }, [filteredSortedRowKeys, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredSortedRowKeys.length / (pageSize >= 999 ? 1 : pageSize)) || 1;

  // Swap row and column dimensions
  const handleSwapDimensions = () => {
    const currentR = rowDimension;
    const currentC = colDimension;
    setRowDimension(currentC);
    setColDimension(currentR);
    setCurrentPage(1);
  };

  // Formatter for cell value
  const formatCell = (item: { count: number; sum: number } | undefined) => {
    if (!item || item.count === 0) return '-';
    if (metric === 'count') {
      return item.count.toLocaleString('id-ID');
    }
    const avg = item.sum / item.count;
    return `${avg.toFixed(1)}`;
  };

  // Heatmap styling for cell
  const getHeatmapStyle = (item: { count: number; sum: number } | undefined) => {
    if (!item || item.count === 0) return {};
    const val = metric === 'count' ? item.count : (item.sum / item.count);
    const ratio = Math.min(val / maxVal, 1);
    
    if (ratio > 0.75) {
      return { backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 600 };
    } else if (ratio > 0.4) {
      return { backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 500 };
    } else if (ratio > 0.15) {
      return { backgroundColor: '#f8fafc', color: '#334155' };
    }
    return { color: '#475569' };
  };

  // Export Matrix to CSV
  const handleExportCSV = () => {
    const rowDef = allDimensions.find(d => d.id === rowDimension);
    const colDef = allDimensions.find(d => d.id === colDimension);
    const rowTitle = rowDef?.label || rowDimension;
    const colTitle = colDef?.label || colDimension;

    let csv = `Matrix Pivot SDMK: ${rowTitle} x ${colTitle}\n`;
    csv += `"${rowTitle} / ${colTitle}",` + colKeys.map(c => `"${c.replace(/"/g, '""')}"`).join(',') + ',"TOTAL"\n';

    allRowKeys.forEach(r => {
      const rowVals = colKeys.map(c => formatCell(matrix[r]?.[c]));
      const rTot = formatCell(rowTotals[r]);
      csv += `"${r.replace(/"/g, '""')}",` + rowVals.map(v => `"${v}"`).join(',') + `,"${rTot}"\n`;
    });

    const colTotVals = colKeys.map(c => formatCell(colTotals[c]));
    const gTotVal = formatCell(grandTotal);
    csv += `"TOTAL",` + colTotVals.map(v => `"${v}"`).join(',') + `,"${gTotVal}"\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Matrix_Pivot_${rowDimension}_x_${colDimension}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedRowLabel = allDimensions.find(d => d.id === rowDimension)?.label || rowDimension;
  const selectedColLabel = allDimensions.find(d => d.id === colDimension)?.label || colDimension;

  // Handler Cetak PDF Tab Baru Matriks Tabulasi Silang
  const handlePrintPdfNewTab = () => {
    const statsHtml = `
      <div class="stats-container">
        <div class="stat-card">
          <div class="label">Total SDMK Teranalisis</div>
          <div class="val">${activeRows.length} <span style="font-size:9pt;font-weight:normal;">Orang</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Dimensi Baris (Y)</div>
          <div class="val" style="color:#0284c7; font-size:11pt;">${selectedRowLabel}</div>
        </div>
        <div class="stat-card">
          <div class="label">Dimensi Kolom (X)</div>
          <div class="val" style="color:#059669; font-size:11pt;">${selectedColLabel}</div>
        </div>
        <div class="stat-card">
          <div class="label">Metrik Analisis</div>
          <div class="val" style="color:#7c3aed; font-size:11pt;">
            ${metric === 'count' ? 'Jumlah Pegawai (Count)' : metric === 'avg_usia' ? 'Rata-rata Usia' : metric === 'avg_masa_kerja' ? 'Rata-rata Masa Kerja' : 'Sisa Pensiun'}
          </div>
        </div>
      </div>
    `;

    // Build Matrix Table
    let tableHeaders = `
      <th>${selectedRowLabel} \\ ${selectedColLabel}</th>
      ${colKeys.map(c => `<th style="text-align:center; min-width:80px;">${c}</th>`).join('')}
      <th style="text-align:center; min-width:90px; background:#f1f5f9; font-weight:800;">TOTAL</th>
    `;

    let rowsHtml = '';
    filteredSortedRowKeys.forEach((r) => {
      const rTot = formatCell(rowTotals[r]);
      rowsHtml += `
        <tr>
          <td style="font-weight:700; color:#0f172a;">${r}</td>
          ${colKeys.map(c => {
            const val = matrix[r]?.[c];
            const formatted = formatCell(val);
            const isZero = !val || (val.count === 0);
            return `<td style="text-align:center; ${isZero ? 'color:#94a3b8;' : 'font-weight:700; color:#1e293b;'}">${formatted}</td>`;
          }).join('')}
          <td style="text-align:center; font-weight:800; background:#f8fafc; color:#0f172a;">${rTot}</td>
        </tr>
      `;
    });

    const colTotRow = `
      <tr style="background:#e2e8f0; font-weight:800;">
        <td style="font-weight:800; text-transform:uppercase;">TOTAL</td>
        ${colKeys.map(c => `<td style="text-align:center; font-weight:800; color:#0f172a;">${formatCell(colTotals[c])}</td>`).join('')}
        <td style="text-align:center; font-weight:900; font-size:10pt; color:#1d4ed8; background:#cbd5e1;">${formatCell(grandTotal)}</td>
      </tr>
    `;

    const tableHtml = `
      <table class="data-table">
        <thead>
          <tr>
            ${tableHeaders}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="100" style="text-align:center; padding:20px;">Tidak ada data matriks</td></tr>'}
          ${colTotRow}
        </tbody>
      </table>
    `;

    printReportInNewTab({
      title: `TABULASI SILANG MATRIKS SDMK (${selectedRowLabel} X ${selectedColLabel})`,
      subtitle: `Puskesmas Kepulauan Seribu Selatan • Filter Unit [${filterUnit}]`,
      orientation: 'landscape',
      tableHtml,
      statsHtml
    });
  };

  return (
    <div className="space-y-6">
      {/* Control Panel Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Matrix Pivot 2-Dimensi
                </h2>
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  {allDimensions.length} Pilihan Dimensi
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Tabulasi silang interaktif lengkap dengan seluruh judul data kepegawaian Puskesmas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSwapDimensions}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
              title="Tukar Baris dan Kolom"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Tukar Dimensi</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              title="Unduh file CSV matriks"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Matriks</span>
            </button>

            <button
              id="btn-cetak-pdf-pivot"
              onClick={handlePrintPdfNewTab}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs"
              title="Buka dan Cetak Tabulasi Matriks di Tab Baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Cetak PDF (Tab Baru)</span>
            </button>

            <button
              onClick={() => {
                setRowDimension('tempat_tugas');
                setColDimension('status_kepegawaian');
                setMetric('count');
                setFilterUnit('ALL');
                setRowSearch('');
                setRowSortOrder('alpha_asc');
                setCurrentPage(1);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              title="Reset ke konfigurasi default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Pivot Dimension Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Dimensi Baris (Row) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                Dimensi Baris (Row)
              </label>
              <span className="text-[10px] text-slate-400">
                {allRowKeys.length} varian
              </span>
            </div>
            <select
              value={rowDimension}
              onChange={(e) => {
                setRowDimension(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              {Object.entries(groupedDimensions).map(([groupName, dims]) => (
                <optgroup key={groupName} label={`— ${groupName} —`}>
                  {dims.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Dimensi Kolom (Column) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                Dimensi Kolom (Column)
              </label>
              <span className="text-[10px] text-slate-400">
                {colKeys.length} varian
              </span>
            </div>
            <select
              value={colDimension}
              onChange={(e) => setColDimension(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              {Object.entries(groupedDimensions).map(([groupName, dims]) => (
                <optgroup key={groupName} label={`— ${groupName} —`}>
                  {dims.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Metrik Nilai */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Metrik Nilai Sel
            </label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              {metricOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Filter Unit Kerja */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Filter Unit Tugas
            </label>
            <select
              value={filterUnit}
              onChange={(e) => {
                setFilterUnit(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              <option value="ALL">Semua Unit Kerja ({sheet.rows.length} Staf)</option>
              <option value="Puskesmas Kepulauan Seribu Selatan">Puskesmas Kec. Seribu Selatan</option>
              <option value="Puskesmas Pembantu Pulau Pari">Pustu Pulau Pari</option>
              <option value="Puskesmas Pembantu Pulau Lancang">Pustu Pulau Lancang</option>
              <option value="Puskesmas Pembantu Pulau Untung Jawa">Pustu Pulau Untung Jawa</option>
            </select>
          </div>
        </div>

        {/* Quick Toolbar for Row Search, Sort, and Pagination */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Cari data ${selectedRowLabel}...`}
                value={rowSearch}
                onChange={(e) => {
                  setRowSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={rowSortOrder}
                onChange={(e: any) => setRowSortOrder(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-medium"
              >
                <option value="alpha_asc">Nama Baris (A-Z)</option>
                <option value="alpha_desc">Nama Baris (Z-A)</option>
                <option value="total_desc">Total Tertinggi ↓</option>
                <option value="total_asc">Total Terendah ↑</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span>Tampilkan:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium"
            >
              <option value={15}>15 baris</option>
              <option value={25}>25 baris</option>
              <option value={50}>50 baris</option>
              <option value={999}>Semua Baris</option>
            </select>
          </div>
        </div>
      </div>

      {/* Matrix Configuration Highlight Banner */}
      <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-blue-950 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            Matriks:
          </span>
          <span className="bg-white px-2.5 py-1 rounded-md border border-blue-200 text-blue-900 font-bold shadow-2xs">
            {selectedRowLabel}
          </span>
          <span className="text-blue-500 font-black text-sm">×</span>
          <span className="bg-white px-2.5 py-1 rounded-md border border-blue-200 text-emerald-800 font-bold shadow-2xs">
            {selectedColLabel}
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-600 flex-wrap">
          <span>Baris: <strong className="text-slate-900">{filteredSortedRowKeys.length}</strong> / {allRowKeys.length}</span>
          <span>Kolom: <strong className="text-slate-900">{colKeys.length}</strong></span>
          <span>Total Pegawai: <strong className="text-blue-800 font-bold">{grandTotal.count}</strong> orang</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[640px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 sticky top-0 z-20">
                <th className="py-3 px-4 font-bold text-slate-800 border-r border-slate-200 sticky left-0 bg-slate-100 z-30 min-w-[220px]">
                  <div className="flex items-center justify-between">
                    <span>{selectedRowLabel}</span>
                    <span className="text-[10px] font-normal text-slate-500">({selectedColLabel} →)</span>
                  </div>
                </th>
                {colKeys.map(c => (
                  <th key={c} className="py-3 px-3.5 font-bold text-slate-800 text-right border-r border-slate-200 min-w-[120px] whitespace-nowrap">
                    {c}
                  </th>
                ))}
                <th className="py-3 px-4 font-bold text-blue-900 bg-blue-100/70 text-right min-w-[120px] whitespace-nowrap">
                  TOTAL BARIS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRowKeys.length === 0 ? (
                <tr>
                  <td colSpan={colKeys.length + 2} className="py-12 text-center text-slate-400">
                    Tidak ada baris data yang cocok dengan kriteria filter "{rowSearch}".
                  </td>
                </tr>
              ) : (
                paginatedRowKeys.map((r, idx) => {
                  const rTotal = rowTotals[r];
                  return (
                    <tr key={r} className={idx % 2 === 0 ? 'bg-white hover:bg-blue-50/40' : 'bg-slate-50/40 hover:bg-blue-50/40'}>
                      <td className="py-2.5 px-4 font-semibold text-slate-800 border-r border-slate-200 sticky left-0 bg-white/95 z-10">
                        <div className="truncate max-w-[280px]" title={r}>
                          {r}
                        </div>
                      </td>
                      {colKeys.map(c => {
                        const item = matrix[r]?.[c];
                        const style = getHeatmapStyle(item);
                        const hasStaff = item && item.count > 0;

                        return (
                          <td 
                            key={c} 
                            className="py-2 px-2.5 text-right border-r border-slate-100 font-mono text-slate-700"
                            style={style}
                          >
                            {hasStaff ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const cellStaff = activeRows.filter(
                                    row => getDimensionValue(row, rowDimension) === r && getDimensionValue(row, colDimension) === c
                                  );
                                  handleOpenStaffModal(
                                    `Daftar Pegawai: ${r} × ${c}`,
                                    `${selectedRowLabel}: "${r}" • ${selectedColLabel}: "${c}"`,
                                    cellStaff
                                  );
                                }}
                                className="w-full text-right font-bold hover:underline hover:scale-105 transition-transform cursor-pointer px-1 py-0.5 rounded hover:bg-blue-100/80"
                                title={`Klik untuk melihat ${item.count} pegawai pada "${r}" - "${c}"`}
                              >
                                {formatCell(item)}
                              </button>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 font-bold text-blue-900 bg-blue-50/50 text-right font-mono">
                        {rTotal && rTotal.count > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              const rowStaff = activeRows.filter(
                                row => getDimensionValue(row, rowDimension) === r
                              );
                              handleOpenStaffModal(
                                `Total Pegawai: ${r}`,
                                `Kategori ${selectedRowLabel}: "${r}" (Total Seluruh Kolom)`,
                                rowStaff
                              );
                            }}
                            className="hover:underline hover:text-blue-950 cursor-pointer px-1 py-0.5 rounded hover:bg-blue-200/70 transition-colors"
                            title={`Klik untuk melihat seluruh ${rTotal.count} pegawai pada baris "${r}"`}
                          >
                            {formatCell(rTotal)}
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="sticky bottom-0 z-20">
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <td className="py-3 px-4 text-slate-900 border-r border-slate-200 sticky left-0 bg-slate-100 z-30">
                  TOTAL KESELURUHAN
                </td>
                {colKeys.map(c => {
                  const cTotal = colTotals[c];
                  const hasStaff = cTotal && cTotal.count > 0;
                  return (
                    <td key={c} className="py-3 px-3.5 text-right border-r border-slate-200 text-slate-900 font-mono">
                      {hasStaff ? (
                        <button
                          type="button"
                          onClick={() => {
                            const colStaff = activeRows.filter(
                              row => getDimensionValue(row, colDimension) === c
                            );
                            handleOpenStaffModal(
                              `Total Pegawai: ${c}`,
                              `Kategori ${selectedColLabel}: "${c}" (Total Seluruh Baris)`,
                              colStaff
                            );
                          }}
                          className="hover:underline hover:text-blue-800 cursor-pointer px-1 py-0.5 rounded hover:bg-slate-200 transition-colors"
                          title={`Klik untuk melihat seluruh ${cTotal.count} pegawai pada kolom "${c}"`}
                        >
                          {formatCell(cTotal)}
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  );
                })}
                <td className="py-3 px-4 text-right bg-blue-600 text-white font-black text-sm font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenStaffModal(
                        'Total Seluruh Pegawai Matriks Pivot',
                        `Kombinasi ${selectedRowLabel} × ${selectedColLabel} (${grandTotal.count} Pegawai)`,
                        activeRows
                      );
                    }}
                    className="hover:underline hover:text-blue-100 cursor-pointer px-1 py-0.5 rounded hover:bg-blue-700 font-black transition-colors"
                    title={`Klik untuk melihat seluruh ${grandTotal.count} pegawai`}
                  >
                    {formatCell(grandTotal)}
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination Bar if more than 1 page */}
        {totalPages > 1 && pageSize < 999 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs">
            <span className="text-slate-500">
              Menampilkan {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredSortedRowKeys.length)} dari {filteredSortedRowKeys.length} baris
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>
              <span className="px-3 py-1 font-bold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PopUP Modal for Staff List upon clicking cell count */}
      {staffModalData.isOpen && (
        <StaffListModal
          isOpen={staffModalData.isOpen}
          onClose={() => setStaffModalData(prev => ({ ...prev, isOpen: false }))}
          title={staffModalData.title}
          subtitle={staffModalData.subtitle}
          badgeText={staffModalData.badgeText}
          staffList={staffModalData.staffList}
        />
      )}
    </div>
  );
};
