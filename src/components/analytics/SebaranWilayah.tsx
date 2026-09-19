import React, { useState, useMemo } from 'react';
import { 
  Map as MapIcon, 
  Award, 
  FileSpreadsheet, 
  Download, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Ship, 
  User, 
  Sparkles, 
  HeartPulse, 
  Baby, 
  Megaphone, 
  Leaf, 
  Microscope, 
  Utensils, 
  Pill as PillIcon, 
  Users, 
  ChevronRight,
  Info,
  Filter,
  Eye,
  Check,
  X,
  ExternalLink,
  Printer
} from 'lucide-react';
import { Sheet, RowData } from '../../types/sheet';
import { StaffListModal } from '../Modals/StaffListModal';
import { printReportInNewTab } from '../../utils/pdfReportGenerator';

interface SebaranWilayahProps {
  sheet: Sheet;
}

// 9 Nakes Wajib Categories definition based on Permenkes 43/2019
export interface NakesCategoryDef {
  key: string;
  name: string;
  shortLabel: string;
  number: number;
  iconEmoji: string;
  IconComponent: React.ComponentType<{ className?: string }>;
  color: string;
  iconBg: string;
  minStandardInduk: number; // Minimal Puskesmas Induk/Kecamatan
  minStandardPustu: number; // Minimal Pustu
}

export const NAKES_9_CATEGORIES: NakesCategoryDef[] = [
  {
    key: 'dr_umum',
    name: 'Dokter Umum',
    shortLabel: 'Dr. Umum',
    number: 1,
    iconEmoji: '👤',
    IconComponent: User,
    color: 'text-blue-600',
    iconBg: 'bg-blue-50',
    minStandardInduk: 2,
    minStandardPustu: 1
  },
  {
    key: 'dr_gigi',
    name: 'Dokter Gigi',
    shortLabel: 'Dr. Gigi',
    number: 2,
    iconEmoji: '🦷',
    IconComponent: Sparkles,
    color: 'text-cyan-600',
    iconBg: 'bg-cyan-50',
    minStandardInduk: 1,
    minStandardPustu: 0
  },
  {
    key: 'perawat',
    name: 'Perawat',
    shortLabel: 'Perawat',
    number: 3,
    iconEmoji: '🧑‍⚕️',
    IconComponent: HeartPulse,
    color: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    minStandardInduk: 8,
    minStandardPustu: 2
  },
  {
    key: 'bidan',
    name: 'Bidan',
    shortLabel: 'Bidan',
    number: 4,
    iconEmoji: '👶',
    IconComponent: Baby,
    color: 'text-amber-600',
    iconBg: 'bg-amber-50',
    minStandardInduk: 7,
    minStandardPustu: 2
  },
  {
    key: 'kesmas',
    name: 'Kesmas / Promkes',
    shortLabel: 'Kesmas',
    number: 5,
    iconEmoji: '📢',
    IconComponent: Megaphone,
    color: 'text-rose-600',
    iconBg: 'bg-rose-50',
    minStandardInduk: 2,
    minStandardPustu: 0
  },
  {
    key: 'kesling',
    name: 'Kesling / Sanitarian',
    shortLabel: 'Kesling',
    number: 6,
    iconEmoji: '🍃',
    IconComponent: Leaf,
    color: 'text-green-600',
    iconBg: 'bg-green-50',
    minStandardInduk: 1,
    minStandardPustu: 0
  },
  {
    key: 'atlm',
    name: 'ATLM / Analis Lab',
    shortLabel: 'ATLM',
    number: 7,
    iconEmoji: '🔬',
    IconComponent: Microscope,
    color: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
    minStandardInduk: 2,
    minStandardPustu: 1
  },
  {
    key: 'gizi',
    name: 'Tenaga Gizi',
    shortLabel: 'Gizi',
    number: 8,
    iconEmoji: '🍴',
    IconComponent: Utensils,
    color: 'text-yellow-600',
    iconBg: 'bg-yellow-50',
    minStandardInduk: 2,
    minStandardPustu: 0
  },
  {
    key: 'farmasi',
    name: 'Kefarmasian',
    shortLabel: 'Farmasi',
    number: 9,
    iconEmoji: '💊',
    IconComponent: PillIcon,
    color: 'text-sky-600',
    iconBg: 'bg-sky-50',
    minStandardInduk: 2,
    minStandardPustu: 1
  }
];

// Helper to categorize job into 9 nakes or admin/penunjang
export function detectNakesCategory(jobTitle: string): string {
  const j = (jobTitle || '').toLowerCase().trim();
  
  // 1. Terapis Gigi dan Mulut / Perawat Gigi adalah Tenaga Kesehatan Keterapian Fisik / Penunjang (bukan Dokter Gigi Permenkes)
  if (j.includes('terapis gigi') || j.includes('perawat gigi')) {
    return 'admin';
  }

  // 2. Dokter Gigi: Khusus Dokter Gigi / Drg. (bukan terapis)
  if (j.includes('dokter gigi') || j.includes('drg')) {
    return 'dr_gigi';
  }

  // 3. Dokter Umum / Dokter Pertama / Muda / Madya / Layanan Primer
  if (j.includes('dokter') && !j.includes('gigi')) {
    return 'dr_umum';
  }

  // 4. Perawat (Ahli, Terampil, Mahir, Ners)
  if (j.includes('perawat') || j.includes('ners')) {
    return 'perawat';
  }

  // 5. Bidan (Penyelia, Terampil, Ahli)
  if (j.includes('bidan')) {
    return 'bidan';
  }

  // 6. Tenaga Kesehatan Masyarakat / Promosi Kesehatan / Epidemiolog
  if (
    j.includes('promosi kesehatan') || 
    j.includes('epidemiolog') || 
    j.includes('kesmas') || 
    j.includes('promkes') ||
    j.includes('penyuluh kesehatan') ||
    j.includes('administrator kesehatan') ||
    j.includes('pembimbing kesehatan kerja')
  ) {
    return 'kesmas';
  }

  // 7. Tenaga Sanitasi Lingkungan / Sanitarian / Kesling
  if (
    j.includes('sanitasi') || 
    j.includes('kesling') || 
    j.includes('sanitarian') ||
    j.includes('lingkungan')
  ) {
    return 'kesling';
  }

  // 8. Ahli Teknologi Laboratorium Medik (ATLM) / Pranata Labkes
  if (
    j.includes('pranata laboratorium') || 
    j.includes('analis kesehatan') ||
    j.includes('analis lab') || 
    j.includes('atlm') || 
    j.includes('laboratorium kesehatan') ||
    (j.includes('laboratorium') && !j.includes('pengadministrasi'))
  ) {
    return 'atlm';
  }

  // 9. Tenaga Gizi (Nutrisionis / Dietisien)
  if (j.includes('nutrisionis') || j.includes('gizi') || j.includes('dietisien')) {
    return 'gizi';
  }

  // 10. Tenaga Kefarmasian (Apoteker / Asisten Apoteker / TTK)
  if (
    j.includes('apoteker') || 
    j.includes('farmasi') || 
    j.includes('asisten apoteker') ||
    j.includes('kefarmasian')
  ) {
    return 'farmasi';
  }

  // Tenaga Penunjang / Administrasi / Non-9 Nakes lainnya
  return 'admin';
}

const FACILITIES_METADATA = [
  {
    id: 'Puskesmas Kepulauan Seribu Selatan',
    name: 'Puskesmas Kepulauan Seribu Selatan',
    shortLabel: 'Puskesmas Kec. Seribu Selatan (Pulau Tidung)',
    island: 'Pulau Tidung',
    type: 'Puskesmas Kecamatan (Induk / Rawat Inap & 24 Jam)',
    isInduk: true,
    description: 'Pusat rujukan fasilitas kesehatan tingkat pertama (FKTP) di wilayah Kepulauan Seribu Selatan dengan UGD 24 Jam, Kamar Bersalin, Ruang Rawat Inap, Laboratorium, dan Farmasi.',
    boatTravel: 'Kapal Cepat ~1.5 jam dari Marina Ancol / Muara Angke'
  },
  {
    id: 'Puskesmas Pembantu Pulau Pari',
    name: 'Puskesmas Pembantu Pulau Pari',
    shortLabel: 'Pustu Pulau Pari',
    island: 'Pulau Pari',
    type: 'Puskesmas Pembantu (Pustu)',
    isInduk: false,
    description: 'Pos pelayanan kesehatan primer di Pulau Pari melayani masyarakat lokal dan wisatawan Pantai Pasir Perawan.',
    boatTravel: 'Kapal Cepat ~1 jam dari Marina Ancol / Muara Kamal'
  },
  {
    id: 'Puskesmas Pembantu Pulau Lancang',
    name: 'Puskesmas Pembantu Pulau Lancang',
    shortLabel: 'Pustu Pulau Lancang',
    island: 'Pulau Lancang',
    type: 'Puskesmas Pembantu (Pustu)',
    isInduk: false,
    description: 'Fasilitas kesehatan garda terdepan untuk masyarakat pemukiman nelayan Pulau Lancang, fokus pada KIA, KB, Posyandu, dan Imunisasi.',
    boatTravel: 'Kapal Tradisional ~45 menit dari Pulau Pari / Rawasaban'
  },
  {
    id: 'Puskesmas Pembantu Pulau Untung Jawa',
    name: 'Puskesmas Pembantu Pulau Untung Jawa',
    shortLabel: 'Pustu Pulau Untung Jawa',
    island: 'Pulau Untung Jawa',
    type: 'Puskesmas Pembantu (Pustu)',
    isInduk: false,
    description: 'Gerbang wisata Kepulauan Seribu terdekat dari daratan Jawa (Tanjung Pasir), melayani penduduk dan arus wisatawan.',
    boatTravel: 'Perahu Motor ~25 menit dari Tanjung Pasir Tangerang'
  },
  {
    id: 'Puskesmas Pembantu Pulau Payung',
    name: 'Pos Kesehatan / Pustu Pulau Payung',
    shortLabel: 'Poskes / Pustu Pulau Payung',
    island: 'Pulau Payung',
    type: 'Pos Kesehatan / Pustu Kepulauan',
    isInduk: false,
    description: 'Pos pelayanan pendukung satelit di gugusan Pulau Payung (Kelurahan Pulau Tidung / Pari).',
    boatTravel: 'Perahu Nelayan ~15 menit dari Pulau Tidung'
  }
];

export const SebaranWilayah: React.FC<SebaranWilayahProps> = ({ sheet }) => {
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('ALL');
  const [staffSearch, setStaffSearch] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Popup modal state for displaying staff members when clicking numbers
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

  // Compute facility table summary matching the screenshot
  const tableData = useMemo(() => {
    // Collect all units that exist in sheet rows or in metadata
    const unitMap = new Map<string, typeof FACILITIES_METADATA[0]>();
    FACILITIES_METADATA.forEach(f => unitMap.set(f.id, f));

    // Also check any extra unique unit in sheet.rows
    sheet.rows.forEach(r => {
      const u = r.tempat_tugas;
      if (u && !unitMap.has(u)) {
        unitMap.set(u, {
          id: u,
          name: u,
          shortLabel: u,
          island: u.replace(/puskesmas|pembantu|pustu/gi, '').trim() || u,
          type: 'Fasilitas Kesehatan Satelit',
          isInduk: u.toLowerCase().includes('kecamatan') || !u.toLowerCase().includes('pembantu'),
          description: `Unit penugasan ${u}`,
          boatTravel: 'Antar Pulau'
        });
      }
    });

    const list = Array.from(unitMap.values());

    return list.map(fac => {
      const staffInUnit = sheet.rows.filter(r => r.tempat_tugas === fac.id);

      const counts: Record<string, number> = {
        total: staffInUnit.length,
        dr_umum: 0,
        dr_gigi: 0,
        perawat: 0,
        bidan: 0,
        kesmas: 0,
        kesling: 0,
        atlm: 0,
        gizi: 0,
        farmasi: 0,
        admin: 0
      };

      staffInUnit.forEach(r => {
        const cat = detectNakesCategory(r.jabatan);
        counts[cat] = (counts[cat] || 0) + 1;
      });

      // Calculate how many of the 9 nakes are available (> 0)
      let available9NakesCount = 0;
      const missingCategories: string[] = [];

      NAKES_9_CATEGORIES.forEach(cat => {
        if (counts[cat.key] > 0) {
          available9NakesCount++;
        } else {
          missingCategories.push(cat.name);
        }
      });

      const compliancePercent = Math.round((available9NakesCount / 9) * 100);

      return {
        ...fac,
        counts,
        available9NakesCount,
        missingCategories,
        compliancePercent,
        isFullyCompliant: available9NakesCount === 9,
        staffList: staffInUnit
      };
    });
  }, [sheet.rows]);

  // Overall totals across all facilities
  const grandTotal = useMemo(() => {
    const counts: Record<string, number> = {
      total: sheet.rows.length,
      dr_umum: 0,
      dr_gigi: 0,
      perawat: 0,
      bidan: 0,
      kesmas: 0,
      kesling: 0,
      atlm: 0,
      gizi: 0,
      farmasi: 0,
      admin: 0
    };

    sheet.rows.forEach(r => {
      const cat = detectNakesCategory(r.jabatan);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    let availableCount = 0;
    NAKES_9_CATEGORIES.forEach(cat => {
      if (counts[cat.key] > 0) availableCount++;
    });

    return {
      counts,
      availableCount,
      compliancePercent: Math.round((availableCount / 9) * 100)
    };
  }, [sheet.rows]);

  // Export Excel / CSV Sebaran Wilayah
  const handleExportExcel = () => {
    const headers = [
      'Unit Tugas / Pustu Island',
      'Pulau',
      'Total SDMK',
      '1. Dr. Umum',
      '2. Dr. Gigi',
      '3. Perawat',
      '4. Bidan',
      '5. Kesmas / Promkes',
      '6. Kesling / Sanitarian',
      '7. ATLM / Analis Lab',
      '8. Tenaga Gizi',
      '9. Kefarmasian',
      'Admin / Tenaga Penunjang',
      'Kesesuaian 9 Nakes',
      'Persentase Kelengkapan',
      'Formasi Nakes Kosong'
    ];

    const rows = tableData.map(row => [
      `"${row.name.replace(/"/g, '""')}"`,
      `"${row.island.replace(/"/g, '""')}"`,
      row.counts.total,
      row.counts.dr_umum,
      row.counts.dr_gigi,
      row.counts.perawat,
      row.counts.bidan,
      row.counts.kesmas,
      row.counts.kesling,
      row.counts.atlm,
      row.counts.gizi,
      row.counts.farmasi,
      row.counts.admin,
      `"${row.available9NakesCount}/9 Nakes"`,
      `"${row.compliancePercent}%"`,
      `"${row.missingCategories.length > 0 ? row.missingCategories.join(', ') : 'Lengkap Semua'}"`
    ]);

    // Add total row
    rows.push([
      '"TOTAL KESELURUHAN (KECAMATAN & PUSTU)"',
      '"Semua Wilayah"',
      grandTotal.counts.total,
      grandTotal.counts.dr_umum,
      grandTotal.counts.dr_gigi,
      grandTotal.counts.perawat,
      grandTotal.counts.bidan,
      grandTotal.counts.kesmas,
      grandTotal.counts.kesling,
      grandTotal.counts.atlm,
      grandTotal.counts.gizi,
      grandTotal.counts.farmasi,
      grandTotal.counts.admin,
      `"${grandTotal.availableCount}/9 Nakes"`,
      `"${grandTotal.compliancePercent}%"`,
      '""'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pemetaan_Sebaran_SDMK_Standar_9_Nakes_Permenkes43.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handler Cetak PDF Tab Baru
  const handlePrintPdfNewTab = () => {
    const statsHtml = `
      <div class="stats-container">
        <div class="stat-card">
          <div class="label">Total SDMK Terpetakan</div>
          <div class="val">${grandTotal.counts.total} <span style="font-size:9pt;font-weight:normal;">Orang</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Fasilitas Pelayanan</div>
          <div class="val" style="color:#0284c7;">${tableData.length} <span style="font-size:9pt;font-weight:normal;">Faskes Pulau</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Kepatuhan Standar 9 Nakes</div>
          <div class="val" style="color:#059669;">${grandTotal.compliancePercent}% <span style="font-size:9pt;font-weight:normal;">(${grandTotal.availableCount}/9 Nakes)</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Tenaga Perawat & Bidan</div>
          <div class="val" style="color:#7c3aed;">${grandTotal.counts.perawat + grandTotal.counts.bidan} <span style="font-size:9pt;font-weight:normal;">Personil</span></div>
        </div>
      </div>
    `;

    let rowsHtml = '';
    tableData.forEach((row, idx) => {
      rowsHtml += `
        <tr>
          <td style="text-align:center; font-weight:700;">${idx + 1}</td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${row.name}</div>
            <div style="font-size:7.5pt; color:#64748b;">Pulau: ${row.island}</div>
          </td>
          <td style="text-align:center; font-weight:800; background:#f8fafc; font-size:9.5pt;">${row.counts.total}</td>
          <td style="text-align:center; ${row.counts.dr_umum > 0 ? 'font-weight:700; color:#059669;' : 'color:#94a3b8;'}">${row.counts.dr_umum}</td>
          <td style="text-align:center; ${row.counts.dr_gigi > 0 ? 'font-weight:700; color:#059669;' : 'color:#94a3b8;'}">${row.counts.dr_gigi}</td>
          <td style="text-align:center; ${row.counts.perawat > 0 ? 'font-weight:700; color:#059669;' : 'color:#94a3b8;'}">${row.counts.perawat}</td>
          <td style="text-align:center; ${row.counts.bidan > 0 ? 'font-weight:700; color:#059669;' : 'color:#94a3b8;'}">${row.counts.bidan}</td>
          <td style="text-align:center; ${row.counts.kesmas > 0 ? 'font-weight:700; color:#059669;' : 'color:#94a3b8;'}">${row.counts.kesmas}</td>
          <td style="text-align:center; ${row.counts.kesling > 0 ? 'font-weight:700; color:#059669;' : 'color:#94a3b8;'}">${row.counts.kesling}</td>
          <td style="text-align:center; ${row.counts.atlm > 0 ? 'font-weight:700; color:#059669;' : 'color:#94a3b8;'}">${row.counts.atlm}</td>
          <td style="text-align:center; ${row.counts.gizi > 0 ? 'font-weight:700; color:#059669;' : 'color:#94a3b8;'}">${row.counts.gizi}</td>
          <td style="text-align:center; ${row.counts.farmasi > 0 ? 'font-weight:700; color:#059669;' : 'color:#94a3b8;'}">${row.counts.farmasi}</td>
          <td style="text-align:center; color:#475569;">${row.counts.admin}</td>
          <td style="text-align:center; font-weight:800; color:#047857;">${row.available9NakesCount}/9</td>
          <td style="text-align:center;">
            <span class="badge ${row.compliancePercent >= 80 ? 'badge-pppk' : row.compliancePercent >= 50 ? 'badge-warning' : 'badge-danger'}">
              ${row.compliancePercent}%
            </span>
          </td>
        </tr>
      `;
    });

    const totRow = `
      <tr style="background:#e2e8f0; font-weight:800;">
        <td colspan="2" style="text-align:center; font-weight:800; text-transform:uppercase;">TOTAL KESELURUHAN (KECAMATAN & PUSTU)</td>
        <td style="text-align:center; font-weight:900; font-size:10pt; color:#1d4ed8;">${grandTotal.counts.total}</td>
        <td style="text-align:center;">${grandTotal.counts.dr_umum}</td>
        <td style="text-align:center;">${grandTotal.counts.dr_gigi}</td>
        <td style="text-align:center;">${grandTotal.counts.perawat}</td>
        <td style="text-align:center;">${grandTotal.counts.bidan}</td>
        <td style="text-align:center;">${grandTotal.counts.kesmas}</td>
        <td style="text-align:center;">${grandTotal.counts.kesling}</td>
        <td style="text-align:center;">${grandTotal.counts.atlm}</td>
        <td style="text-align:center;">${grandTotal.counts.gizi}</td>
        <td style="text-align:center;">${grandTotal.counts.farmasi}</td>
        <td style="text-align:center;">${grandTotal.counts.admin}</td>
        <td style="text-align:center; font-weight:800;">${grandTotal.availableCount}/9</td>
        <td style="text-align:center; font-weight:900; color:#047857;">${grandTotal.compliancePercent}%</td>
      </tr>
    `;

    const tableHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:30px; text-align:center;">No</th>
            <th style="width:170px;">Fasilitas Pelayanan / Pustu</th>
            <th style="width:50px; text-align:center;">Total</th>
            <th style="width:40px; text-align:center;" title="Dokter Umum">Dr.U</th>
            <th style="width:40px; text-align:center;" title="Dokter Gigi">Dr.G</th>
            <th style="width:40px; text-align:center;" title="Perawat">Pwt</th>
            <th style="width:40px; text-align:center;" title="Bidan">Bdn</th>
            <th style="width:40px; text-align:center;" title="Promkes/Kesmas">Ksm</th>
            <th style="width:40px; text-align:center;" title="Sanitarian/Kesling">Ksl</th>
            <th style="width:40px; text-align:center;" title="ATLM Laboratorium">Lab</th>
            <th style="width:40px; text-align:center;" title="Nutrisionis">Giz</th>
            <th style="width:40px; text-align:center;" title="Farmasi/Apoteker">Far</th>
            <th style="width:40px; text-align:center;" title="Non Nakes / Admin">Adm</th>
            <th style="width:55px; text-align:center;">Nakes</th>
            <th style="width:70px; text-align:center;">Kepatuhan</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          ${totRow}
        </tbody>
      </table>
    `;

    printReportInNewTab({
      title: 'PEMETAAN SEBARAN SDMK & KECUKUPAN 9 NAKES WAJIB PUSKESMAS',
      subtitle: 'Berdasarkan Standar Minimal Permenkes No. 43 Tahun 2019 • Faskes Kepulauan Seribu',
      orientation: 'landscape',
      tableHtml,
      statsHtml
    });
  };

  // Staff roster filtering
  const activeStaffList = useMemo(() => {
    let list = sheet.rows;

    if (selectedFacilityId !== 'ALL') {
      list = list.filter(r => r.tempat_tugas === selectedFacilityId);
    }

    if (selectedCategoryFilter !== 'ALL') {
      list = list.filter(r => detectNakesCategory(r.jabatan) === selectedCategoryFilter);
    }

    if (staffSearch.trim()) {
      const q = staffSearch.toLowerCase();
      list = list.filter(r => {
        const name = (r.nama_gelar || r.nama || '').toLowerCase();
        const jab = (r.jabatan || '').toLowerCase();
        const nip = (r.nip || '').toLowerCase();
        const unit = (r.tempat_tugas || '').toLowerCase();
        return name.includes(q) || jab.includes(q) || nip.includes(q) || unit.includes(q);
      });
    }

    return list;
  }, [sheet.rows, selectedFacilityId, selectedCategoryFilter, staffSearch]);

  const activeFacilityObj = tableData.find(f => f.id === selectedFacilityId);

  return (
    <div className="space-y-6">
      {/* 1. SECTION HEADER (matching user screenshot) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <MapIcon className="w-5 h-5 text-emerald-800" />
            </div>
            <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
              Pemetaan Sebaran SDMK & Standar 9 Nakes Wajib Puskesmas
            </h2>
          </div>
          <p className="text-xs md:text-sm text-slate-600 pl-11">
            Evaluasi kecukupan ketenagakerjaan berdasarkan Standar Minimal Permenkes No. 43/2019 di Puskesmas Kecamatan & 5 Pustu Kepulauan
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-600 rounded-lg shadow-2xs transition-all"
            title="Download file Excel/CSV Sebaran dan Evaluasi Standar 9 Nakes"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Excel Sebaran</span>
          </button>

          <button
            id="btn-cetak-pdf-sebaran"
            onClick={handlePrintPdfNewTab}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-all"
            title="Buka dan Cetak Dokumen Pemetaan Sebaran SDMK di Tab Baru"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Cetak PDF (Tab Baru)</span>
          </button>
        </div>
      </div>

      {/* 2. CARD: STANDAR MINIMAL 9 TENAGA KESEHATAN WAJIB PUSKESMAS (matching user screenshot) */}
      <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl p-4 md:p-5 shadow-2xs">
        {/* Title bar of the card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-700" />
            <h3 className="text-sm md:text-base font-bold text-[#065f46]">
              Standar Minimal 9 Tenaga Kesehatan Wajib Puskesmas (Permenkes 43/2019)
            </h3>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#047857] text-white shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Standar Nasional Kemenkes
            </span>
          </div>
        </div>

        {/* 9 Pills list horizontally */}
        <div className="flex flex-wrap items-center gap-2">
          {NAKES_9_CATEGORIES.map((cat) => {
            const Icon = cat.IconComponent;
            return (
              <div
                key={cat.key}
                className="bg-white px-3 py-1.5 rounded-full border border-slate-200/90 shadow-2xs text-xs font-semibold text-slate-800 flex items-center gap-1.5 hover:border-emerald-400 transition-colors"
              >
                <span className="text-sm">{cat.iconEmoji}</span>
                <span className="text-slate-900">{cat.number}. {cat.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. THE SEBARAN TABLE (matching user screenshot) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-800">
                {/* Column 1: Unit Tugas / Pustu Island (Dark Green) */}
                <th className="py-4 px-4 font-bold text-white bg-[#047857] min-w-[250px] sticky left-0 z-20 shadow-xs">
                  <div className="text-xs uppercase tracking-wider font-extrabold">
                    Unit Tugas / Pustu Island
                  </div>
                </th>

                {/* Column 2: Total SDMK (Mint Green) */}
                <th className="py-3 px-3.5 font-bold text-center text-[#065f46] bg-[#d1fae5] min-w-[90px] border-r border-emerald-200">
                  <div className="text-[11px] font-extrabold uppercase">Total</div>
                  <div className="text-xs font-extrabold">SDMK</div>
                </th>

                {/* Columns 3 - 11: 9 Nakes Columns */}
                {NAKES_9_CATEGORIES.map((cat) => {
                  const Icon = cat.IconComponent;
                  return (
                    <th 
                      key={cat.key}
                      className="py-3 px-2.5 font-bold text-center bg-[#ecfdf5] border-r border-emerald-100 min-w-[85px]"
                    >
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <div className="text-base">{cat.iconEmoji}</div>
                        <span className="text-[11px] font-bold text-slate-800 whitespace-nowrap">
                          {cat.shortLabel}
                        </span>
                      </div>
                    </th>
                  );
                })}

                {/* Column 12: Admin / Lain */}
                <th className="py-3 px-2.5 font-bold text-center bg-[#f0fdf4] border-r border-emerald-100 min-w-[95px]">
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <div className="text-base">👥</div>
                    <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                      Admin/Lain
                    </span>
                  </div>
                </th>

                {/* Column 13: Status Pemenuhan Standar */}
                <th className="py-3 px-4 font-bold text-center bg-[#e0f2fe] text-blue-900 min-w-[150px]">
                  <div className="text-[11px] font-bold uppercase">Status Kecukupan</div>
                  <div className="text-[10px] font-medium text-blue-700">9 Nakes Permenkes</div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {tableData.map((row, idx) => {
                const isSelected = selectedFacilityId === row.id;

                return (
                  <tr 
                    key={row.id}
                    onClick={() => setSelectedFacilityId(row.id === selectedFacilityId ? 'ALL' : row.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-50/70 hover:bg-blue-50' 
                        : idx % 2 === 0 ? 'bg-white hover:bg-emerald-50/40' : 'bg-slate-50/40 hover:bg-emerald-50/40'
                    }`}
                  >
                    {/* Unit Name */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 sticky left-0 bg-inherit z-10 border-r border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${row.counts.total > 0 ? (row.isInduk ? 'bg-emerald-600' : 'bg-blue-500') : 'bg-slate-300'}`} />
                        <div>
                          <div className="text-xs font-bold text-slate-900 line-clamp-1">{row.name}</div>
                          <div className="text-[11px] font-medium text-slate-500">
                            Pulau: <strong className="text-slate-700">{row.island}</strong> {row.isInduk && '• (Puskesmas Induk)'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Total SDMK */}
                    <td className="py-3 px-3 text-center bg-emerald-50/30 border-r border-slate-100 font-mono text-sm">
                      {row.counts.total > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenStaffModal(
                              `Daftar Semua SDMK - ${row.name}`,
                              `Unit Tugas: ${row.name} (${row.island})`,
                              row.staffList
                            );
                          }}
                          className="font-bold text-slate-900 inline-block px-2 py-0.5 rounded hover:bg-emerald-200 hover:text-emerald-950 transition-all cursor-pointer underline decoration-emerald-400 font-mono text-sm shadow-2xs"
                          title={`Klik untuk melihat seluruh ${row.counts.total} pegawai di ${row.name}`}
                        >
                          {row.counts.total}
                        </button>
                      ) : (
                        <span className="font-bold text-slate-400">0</span>
                      )}
                    </td>

                    {/* 9 Nakes cells */}
                    {NAKES_9_CATEGORIES.map((cat) => {
                      const count = row.counts[cat.key] || 0;
                      const hasStaff = count > 0;
                      const staffInCat = row.staffList.filter(r => detectNakesCategory(r.jabatan) === cat.key);

                      return (
                        <td 
                          key={cat.key}
                          className="py-3 px-2 text-center border-r border-slate-100 font-mono text-xs"
                        >
                          {hasStaff ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenStaffModal(
                                  `Daftar ${cat.name} - ${row.name}`,
                                  `Kategori: Standar ${cat.number} (${cat.name}) • Unit: ${row.name} (${row.island})`,
                                  staffInCat
                                );
                              }}
                              className="font-bold text-slate-900 inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-200 hover:scale-110 hover:shadow-xs transition-all cursor-pointer underline decoration-emerald-500"
                              title={`Klik untuk melihat ${count} orang pegawai ${cat.name} di ${row.name}`}
                            >
                              {count}
                            </button>
                          ) : (
                            <span className="font-semibold text-slate-300 inline-block px-1.5 py-0.5 rounded">
                              0
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Admin / Penunjang cell */}
                    <td className="py-3 px-2 text-center border-r border-slate-100 font-mono text-xs font-semibold text-slate-600">
                      {row.counts.admin > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const staffInAdmin = row.staffList.filter(r => detectNakesCategory(r.jabatan) === 'admin');
                            handleOpenStaffModal(
                              `Daftar Admin / Penunjang - ${row.name}`,
                              `Tenaga Non-Kesehatan / Administrasi di ${row.name}`,
                              staffInAdmin
                            );
                          }}
                          className="font-bold text-slate-700 inline-block px-1.5 py-0.5 rounded hover:bg-slate-200 hover:scale-110 transition-all cursor-pointer underline decoration-slate-400"
                          title={`Klik untuk melihat ${row.counts.admin} orang pegawai admin di ${row.name}`}
                        >
                          {row.counts.admin}
                        </button>
                      ) : '-'}
                    </td>

                    {/* Status 9 Nakes */}
                    <td className="py-3 px-3 text-center">
                      {row.counts.total === 0 ? (
                        <span className="text-[10px] text-slate-400 italic">Data Kosong</span>
                      ) : row.isFullyCompliant ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <Check className="w-3 h-3 text-emerald-700" />
                          9/9 Lengkap (100%)
                        </span>
                      ) : (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            {row.available9NakesCount}/9 Lengkap ({row.compliancePercent}%)
                          </span>
                          {row.missingCategories.length > 0 && (
                            <span className="text-[10px] text-slate-500 line-clamp-1 max-w-[130px]" title={`Kurang: ${row.missingCategories.join(', ')}`}>
                              Kurang: {row.missingCategories.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* TFOOT TOTAL ROW */}
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                <td className="py-3.5 px-4 sticky left-0 bg-slate-100 z-10 border-r border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 uppercase">
                      TOTAL KESELURUHAN (KECAMATAN & PUSTU)
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                      {tableData.length} Fasilitas
                    </span>
                  </div>
                </td>

                <td className="py-3.5 px-3 text-center text-emerald-900 bg-emerald-100/60 font-black font-mono text-sm border-r border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenStaffModal(
                        'Daftar Seluruh SDMK Puskesmas & Pustu',
                        'Total 158 Pegawai di Puskesmas Kecamatan & Seluruh Pustu Kepulauan',
                        sheet.rows
                      );
                    }}
                    className="hover:underline hover:text-emerald-950 cursor-pointer inline-block px-1 rounded hover:bg-emerald-200 transition-all font-black"
                    title="Klik untuk melihat seluruh 158 pegawai"
                  >
                    {grandTotal.counts.total}
                  </button>
                </td>

                {NAKES_9_CATEGORIES.map(cat => {
                  const staffInCat = sheet.rows.filter(r => detectNakesCategory(r.jabatan) === cat.key);
                  return (
                    <td key={cat.key} className="py-3.5 px-2 text-center text-slate-900 font-black font-mono text-xs border-r border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenStaffModal(
                            `Daftar Seluruh ${cat.name} (Semua Wilayah)`,
                            `Total ${grandTotal.counts[cat.key]} Pegawai ${cat.name} di Puskesmas Kecamatan & 5 Pustu`,
                            staffInCat
                          );
                        }}
                        className="hover:underline hover:text-emerald-800 cursor-pointer inline-block px-1 rounded hover:bg-emerald-200/70 transition-colors"
                        title={`Klik untuk melihat ${grandTotal.counts[cat.key]} pegawai ${cat.name}`}
                      >
                        {grandTotal.counts[cat.key]}
                      </button>
                    </td>
                  );
                })}

                <td className="py-3.5 px-2 text-center text-slate-800 font-black font-mono text-xs border-r border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      const staffInAdmin = sheet.rows.filter(r => detectNakesCategory(r.jabatan) === 'admin');
                      handleOpenStaffModal(
                        'Daftar Seluruh Tenaga Admin / Penunjang (Semua Wilayah)',
                        `Total ${grandTotal.counts.admin} Staf Non-Kesehatan / Administrasi`,
                        staffInAdmin
                      );
                    }}
                    className="hover:underline hover:text-slate-950 cursor-pointer inline-block px-1 rounded hover:bg-slate-200 transition-colors"
                    title={`Klik untuk melihat ${grandTotal.counts.admin} pegawai admin`}
                  >
                    {grandTotal.counts.admin}
                  </button>
                </td>

                <td className="py-3.5 px-3 text-center bg-blue-100 text-blue-950 font-black text-xs">
                  {grandTotal.availableCount}/9 Terisi ({grandTotal.compliancePercent}%)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Informational table note */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>
              Klik salah satu baris unit di tabel di atas untuk memfilter daftar staf di bawah.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Puskesmas Induk
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Puskesmas Pembantu (Pustu)
            </span>
          </div>
        </div>
      </div>

      {/* 4. DETAIL ROSTER & STAFF IN THE SELECTED FACILITY */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Roster header banner */}
        <div className="p-4 md:p-5 border-b border-slate-200 bg-slate-50/70">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm md:text-base font-bold text-slate-900">
                  {activeFacilityObj ? activeFacilityObj.name : 'Daftar Seluruh SDMK di Seluruh Fasilitas Kepulauan'}
                </h3>
                {activeFacilityObj && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Pulau {activeFacilityObj.island}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {activeFacilityObj 
                  ? activeFacilityObj.description
                  : `Menampilkan seluruh ${activeStaffList.length} pegawai yang terdaftar pada lembar kerja aktif.`}
              </p>
            </div>

            {selectedFacilityId !== 'ALL' && (
              <button
                onClick={() => setSelectedFacilityId('ALL')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors w-fit"
              >
                Tampilkan Semua Fasilitas
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              placeholder="Cari nama, jabatan, NIP..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-semibold"
            >
              <option value="ALL">Semua Unit ({sheet.rows.length} Staf)</option>
              {tableData.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.counts.total})</option>
              ))}
            </select>

            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-semibold"
            >
              <option value="ALL">Semua Kategori Tenaga</option>
              {NAKES_9_CATEGORIES.map(c => (
                <option key={c.key} value={c.key}>{c.iconEmoji} {c.name}</option>
              ))}
              <option value="admin">👥 Tenaga Administrasi / Penunjang</option>
            </select>
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold sticky top-0 z-10">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 min-w-[200px]">Nama Pegawai & NIP</th>
                <th className="py-3 px-3 min-w-[190px]">Jabatan</th>
                <th className="py-3 px-3 min-w-[150px]">Kategori 9 Nakes</th>
                <th className="py-3 px-3 min-w-[180px]">Tempat Tugas</th>
                <th className="py-3 px-3 min-w-[110px]">Status</th>
                <th className="py-3 px-3 min-w-[130px]">Pola Kerja Tim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeStaffList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ada data pegawai yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                activeStaffList.map((staff, idx) => {
                  const nakesCat = detectNakesCategory(staff.jabatan);
                  const nakesDef = NAKES_9_CATEGORIES.find(c => c.key === nakesCat);

                  return (
                    <tr key={staff._id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{staff.nama_gelar || staff.nama}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {staff.nip && staff.nip !== '-' ? staff.nip : 'NON-PNS'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {staff.jabatan}
                      </td>
                      <td className="py-2.5 px-3">
                        {nakesDef ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span>{nakesDef.iconEmoji}</span>
                            <span>{nakesDef.shortLabel}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                            👥 Admin/Penunjang
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {staff.tempat_tugas}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-100">
                          {staff.status_kepegawaian || 'PNS'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {staff.kerja_tim || staff.jam_kerja || 'Layanan 24 Jam'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PopUP Modal for Staff Names List */}
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
