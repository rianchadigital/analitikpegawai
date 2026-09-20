import React, { useState } from 'react';
import { Sheet, RowData } from '../../types/sheet';
import { 
  GitBranch, 
  Layers, 
  Printer, 
  Building2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Camera, 
  X, 
  UserCheck, 
  ChevronRight, 
  FileText, 
  Sparkles,
  ExternalLink,
  Edit2,
  FolderOpen,
  Upload,
  Save,
  Check,
  Download,
  Loader2,
  FileSpreadsheet,
  HelpCircle
} from 'lucide-react';
import { 
  convertGoogleDriveUrl, 
  GOOGLE_DRIVE_FOTO_FOLDER_URL, 
  fileToBase64,
  savePhotoToServer,
  SPREADSHEET_URL
} from '../../utils/googleDriveHelper';
import { printElementById, exportElementToPdf, downloadElementAsImage, openPdfInNewTabAndDownload } from '../../utils/printEngine';
import { GoogleDriveSyncModal } from '../common/GoogleDriveSyncModal';

interface StrukturOrganisasiWorkspaceProps {
  sheet: Sheet;
  onUpdateSheet?: (updated: Sheet) => void;
}

export type StrukturSubMenu = 'ilp' | 'pergub14';

// Helper to normalize strings for robust lookup
const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

export const StrukturOrganisasiWorkspace: React.FC<StrukturOrganisasiWorkspaceProps> = ({ 
  sheet, 
  onUpdateSheet 
}) => {
  const [activeSubMenu, setActiveSubMenu] = useState<StrukturSubMenu>('ilp');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedStaff, setSelectedStaff] = useState<{
    roleTitle: string;
    targetName: string;
    targetNip: string;
    row?: RowData;
  } | null>(null);

  // Quick photo upload modal state
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [saveToast, setSaveToast] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [isDriveSyncModalOpen, setIsDriveSyncModalOpen] = useState(false);
  const [lastSavedInfo, setLastSavedInfo] = useState<{
    photoUrl: string;
    fullPhotoUrl?: string;
    driveUrl?: string;
    updatedRow?: number;
    staffName?: string;
    staffNip?: string;
  } | null>(null);

  // PDF & Print state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfToast, setPdfToast] = useState<string | null>(null);

  // Handler Cetak / Unduh Bagan PDF di Tab Baru & Auto-Download
  const handleExportPdf = async () => {
    setIsGeneratingPdf(true);
    setPdfToast('Membuka Tab Baru & Menyiapkan Bagan PDF...');
    
    // Buka tab baru langsung saat gestur klik user agar tidak terblokir sandbox/popup-blocker
    let newTabWindow: Window | null = null;
    try {
      newTabWindow = window.open('about:blank', '_blank');
    } catch (e) {
      console.warn('Popup blocker mencegah pembukaan tab otomatis:', e);
      newTabWindow = null;
    }

    const baganId = activeSubMenu === 'ilp' ? 'bagan-ilp-lampiran-1' : 'bagan-pergub-lampiran-2';
    const filename = activeSubMenu === 'ilp'
      ? 'Bagan_Struktur_Organisasi_ILP_Puskesmas_Kepulauan_Seribu_Selatan'
      : 'Bagan_Struktur_Organisasi_Pergub14_Puskesmas_Kepulauan_Seribu_Selatan';
    const title = activeSubMenu === 'ilp'
      ? 'Bagan Struktur Organisasi Tipe ILP - Puskesmas Kepulauan Seribu Selatan'
      : 'Bagan Struktur Organisasi Pergub DKI 14 Tahun 2023 - Puskesmas Kepulauan Seribu Selatan';

    try {
      const success = await openPdfInNewTabAndDownload(baganId, {
        filename,
        title,
        orientation: 'landscape',
        backgroundColor: activeSubMenu === 'ilp' ? '#0B2559' : '#ffffff',
        targetWindow: newTabWindow
      });

      setIsGeneratingPdf(false);
      if (success) {
        setPdfToast('File PDF berhasil dibuka di Tab Baru & terunduh!');
        setTimeout(() => setPdfToast(null), 4000);
      } else {
        // Fallback jika html2canvas terhalang
        setPdfToast('Membuka dialog cetak browser...');
        await printElementById(baganId, {
          title: filename,
          orientation: 'landscape'
        });
        setTimeout(() => setPdfToast(null), 3000);
      }
    } catch (e) {
      console.error('PDF generation error:', e);
      setIsGeneratingPdf(false);
      setPdfToast('Membuka dialog cetak browser (Ctrl+P)...');
      await printElementById(baganId, {
        title: filename,
        orientation: 'landscape'
      });
      setTimeout(() => setPdfToast(null), 3000);
    }
  };

  // Handler Cetak Langsung Browser
  const handlePrint = async () => {
    const baganId = activeSubMenu === 'ilp' ? 'bagan-ilp-lampiran-1' : 'bagan-pergub-lampiran-2';
    const title = activeSubMenu === 'ilp'
      ? 'Struktur Organisasi Tipe ILP - Puskesmas Kepulauan Seribu Selatan'
      : 'Struktur Organisasi Pergub DKI 14 Tahun 2023 - Puskesmas Kepulauan Seribu Selatan';
    await printElementById(baganId, {
      title,
      orientation: 'landscape'
    });
  };

  // Handler Unduh Gambar PNG Resolusi Tinggi
  const handleDownloadImage = async () => {
    setIsGeneratingPdf(true);
    setPdfToast('Menyiapkan file gambar PNG bagan struktur...');
    const baganId = activeSubMenu === 'ilp' ? 'bagan-ilp-lampiran-1' : 'bagan-pergub-lampiran-2';
    const filename = activeSubMenu === 'ilp'
      ? 'Bagan_Struktur_Organisasi_ILP.png'
      : 'Bagan_Struktur_Organisasi_Pergub14.png';
    await downloadElementAsImage(baganId, filename);
    setIsGeneratingPdf(false);
    setPdfToast('File gambar PNG berhasil diunduh!');
    setTimeout(() => setPdfToast(null), 3000);
  };

  // Helper to query row from sheet.rows (data uraian tugas pegawai)
  const getStaff = (searchName: string, defaultNip: string, defaultJabatan: string, roleTitle: string) => {
    const normSearch = normalize(searchName);
    const rows = sheet.rows || [];

    // Try match by NIP first if clean
    let matchedRow: RowData | undefined = undefined;
    if (defaultNip && defaultNip.length > 5) {
      matchedRow = rows.find(r => String(r.nip || '').trim() === defaultNip.trim());
    }

    // Match by Name if not found
    if (!matchedRow) {
      matchedRow = rows.find(r => {
        const rowName = normalize(String(r.nama || r.nama_gelar || ''));
        return rowName.includes(normSearch) || normSearch.includes(rowName);
      });
    }

    // Match by significant keyword (e.g. 'dendy', 'saeful', 'budiman', 'wahyu')
    if (!matchedRow) {
      const keywords = searchName.split(/\s+/).map(normalize).filter(w => 
        w.length > 3 && !['dr', 'drg', 'skm', 'amd', 'kep', 'keb', 'apt', 'sstr'].includes(w)
      );
      if (keywords.length > 0) {
        matchedRow = rows.find(r => {
          const rowName = normalize(String(r.nama || r.nama_gelar || ''));
          return keywords.some(k => rowName.includes(k));
        });
      }
    }

    return {
      nama: matchedRow ? String(matchedRow.nama || matchedRow.nama_gelar || searchName) : searchName,
      nip: matchedRow ? String(matchedRow.nip || defaultNip) : defaultNip,
      jabatan: matchedRow ? String(matchedRow.jabatan || defaultJabatan) : defaultJabatan,
      foto: matchedRow ? String(matchedRow.foto || '') : '',
      status: matchedRow ? String(matchedRow.status || 'PNS') : 'PNS',
      tempat_tugas: matchedRow ? String(matchedRow.tempat_tugas || 'Puskesmas Kepulauan Seribu Selatan') : 'Puskesmas Kepulauan Seribu Selatan',
      roleTitle,
      row: matchedRow
    };
  };

  // Save updated photo directly into sheet.rows and persist to server & Google Drive
  const handleSavePhoto = async (newPhotoUrl: string) => {
    if (!selectedStaff || !onUpdateSheet) return;
    setIsSavingPhoto(true);

    const staffTargetName = selectedStaff.targetName;
    const staffTargetNip = selectedStaff.targetNip;
    const staffKey = selectedStaff.row?._id || staffTargetNip || staffTargetName;

    // Simpan ke cloud server & Google Drive / Spreadsheet Kolom AD
    const saveResult = await savePhotoToServer(
      staffKey,
      newPhotoUrl,
      staffTargetNip,
      staffTargetName
    );

    const finalUrl = saveResult.photoUrl || convertGoogleDriveUrl(newPhotoUrl);

    let updatedRows = [...sheet.rows];
    let matchedIndex = -1;

    if (selectedStaff.row?._id) {
      matchedIndex = updatedRows.findIndex(r => r._id === selectedStaff.row?._id);
    }
    if (matchedIndex === -1 && staffTargetNip && staffTargetNip.length > 5) {
      matchedIndex = updatedRows.findIndex(r => String(r.nip || '').trim() === staffTargetNip.trim());
    }
    if (matchedIndex === -1 && staffTargetName) {
      const normTarget = normalize(staffTargetName);
      matchedIndex = updatedRows.findIndex(r => {
        const rName = normalize(String(r.nama || r.nama_gelar || ''));
        return rName.includes(normTarget) || normTarget.includes(rName);
      });
    }

    if (matchedIndex !== -1) {
      updatedRows[matchedIndex] = {
        ...updatedRows[matchedIndex],
        foto: finalUrl
      };
    } else {
      const newRow: RowData = {
        _id: `uraian_staff_${Date.now()}`,
        no: updatedRows.length + 1,
        nama: staffTargetName,
        nip: staffTargetNip,
        status: 'PNS',
        jabatan: selectedStaff.roleTitle,
        tempat_tugas: 'Puskesmas Kepulauan Seribu Selatan',
        foto: finalUrl,
        nama_pemberi_tugas: 'dr. Ignatius Dendy Purnama',
        nip_pemberi_tugas: '198607192014031004',
        jabatan_pemberi_tugas: 'Kepala Puskesmas Kepulauan Seribu Selatan',
        tanggal_penetapan: 'Jakarta, 03 Mei 2025'
      };
      updatedRows.push(newRow);
    }

    onUpdateSheet({
      ...sheet,
      rows: updatedRows,
      updatedAt: new Date().toISOString()
    });

    // Update current selected staff view
    setSelectedStaff(prev => prev ? {
      ...prev,
      row: {
        ...(prev.row || {}),
        foto: finalUrl
      } as RowData
    } : null);

    setIsSavingPhoto(false);
    setIsPhotoModalOpen(false);
    setPhotoUrlInput('');

    setLastSavedInfo({
      photoUrl: finalUrl,
      fullPhotoUrl: saveResult.fullPhotoUrl,
      driveUrl: saveResult.driveUrl,
      updatedRow: saveResult.updatedRow,
      staffName: staffTargetName,
      staffNip: staffTargetNip
    });

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 5000);
  };

  // Preset Avatar Portrait component when photo isn't uploaded yet
  const renderAvatar = (nama: string, foto: string, sizeClass = "w-10 h-10", shape = "circle") => {
    const directPhotoUrl = convertGoogleDriveUrl(foto);
    if (directPhotoUrl && directPhotoUrl.trim() !== '') {
      return (
        <img
          src={directPhotoUrl}
          alt={nama}
          className={`${sizeClass} object-cover ${shape === 'circle' ? 'rounded-full' : 'rounded-lg'} border-2 border-amber-400 shadow-xs`}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }

    // Stylized professional ASN silhouette
    const isMale = /ignatius|dendy|saeful|budiman|dede|hary|markus|randi|jajul|jamaludin|defry|ambro|wahyu|amsir|rahim|arifin/i.test(nama);
    const isDoctor = /dr\.|drg\./i.test(nama);
    const initials = nama
      .replace(/dr\.|drg\.|ns\.|s\.k\.m|skm|s\.kep|a\.md\.kep|a\.md\.keb|s\.tr\.keb|apt/gi, '')
      .trim()
      .split(/\s+/)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'P';

    return (
      <div 
        className={`${sizeClass} ${shape === 'circle' ? 'rounded-full' : 'rounded-lg'} bg-gradient-to-br ${
          isDoctor ? 'from-sky-700 to-indigo-900 text-sky-100' : isMale ? 'from-amber-700 to-amber-950 text-amber-100' : 'from-emerald-700 to-teal-950 text-emerald-100'
        } flex flex-col items-center justify-center font-bold border-2 border-amber-400 shadow-xs shrink-0 select-none overflow-hidden relative`}
      >
        <span className="text-[10px] tracking-wider z-10">{initials}</span>
        {/* Subtle ASN collar badge */}
        <div className="absolute -bottom-1 w-full h-3 bg-amber-400/20 rounded-full blur-[1px]"></div>
      </div>
    );
  };

  // =========================================================================
  // DATA MAPPING FROM URAIAN TUGAS FOR IMAGE 1 (ILP)
  // =========================================================================
  const ilpKepala = getStaff('dr. Ignatius Dendy Purnama', '198607192014031004', 'Kepala Puskesmas', 'Kepala Puskesmas');

  const ilpKlaster1 = {
    koordinator: getStaff('Saeful Muslimin, SKM', '197305291995031001', 'Kasubbag Tata Usaha', 'Koordinator Klaster 1 (Manajemen)'),
    items: [
      { role: 'Manajemen inti Puskesmas;', staff: getStaff('Assya Zazhilla, S.K.M', '199810182025062014', 'Penata Kelola Layanan Kesehatan', 'Manajemen inti Puskesmas') },
      { role: 'Manajemen Arsip', staff: getStaff('Sri Mega, S.Tr.Keb', '199011112020122020', 'Bidan Ahli Pertama', 'Manajemen Arsip') },
      { role: 'Manajemen Sumber Daya Manusia', staff: getStaff('Pipit Apriyani, A.Md.Kep', '198904222019032014', 'Perawat Mahir', 'Manajemen Sumber Daya Manusia') },
      { role: 'Manajemen Sarana, Prasarana, dan Perbekalan Kesehatan;', staff: getStaff('Jajul Karomi, A.Md.Kep', '198907102020121008', 'Perawat Mahir', 'Manajemen Sarana Prasarana') },
      { role: 'Manajemen Mutu Pelayanan;', staff: getStaff('drg. Putri Ajri Mawadara', '199505272022032008', 'Dokter Gigi Ahli Pertama', 'Manajemen Mutu Pelayanan') },
      { role: 'Manajemen Keuangan dan Aset atau Barang Milik Daerah;', staff: getStaff('Jamaludin, Amkg', '199008122015031001', 'Terapis Gigi dan Mulut', 'Manajemen Keuangan dan Aset') },
      { role: 'Manajemen Sistem Informasi Digital;', staff: getStaff('Defry Dwi Bastanta, Amd. Rad', '199602202022031003', 'Radiografer Mahir', 'Manajemen Sistem Informasi Digital') },
      { role: 'manajemen jejaring; dan', staff: getStaff('dr. Ambro Henri Shite', '198605202014111001', 'Dokter Ahli Muda', 'Manajemen Jejaring') },
      { role: 'manajemen pemberdayaan masyarakat.', staff: getStaff('Masriyah, SKM', '198403152014032003', 'Tenaga Sanitasi Lingkungan', 'Manajemen Pemberdayaan Masyarakat') }
    ]
  };

  const ilpKlaster2 = {
    koordinator: getStaff('dr. Tri Wahyu Ningrum', '198812152019032009', 'Dokter Ahli Pertama', 'Koordinator Klaster 2 (Ibu dan Anak)'),
    items: [
      { role: 'ibu hamil, bersalin, atau nifas;', staff: getStaff('Sunarti.A.Md.Keb', '198705042019032007', 'Bidan Mahir', 'Ibu Hamil, Bersalin, Nifas') },
      { role: 'bayi dan anak balita;', staff: getStaff('Dwi Putri Hasanah, Amd. Keb', '199609202020122017', 'Bidan Pelaksana', 'Bayi dan Anak Balita') },
      { role: 'anak pra sekolah;', staff: getStaff('Ade Inma Rahayu, A.Md.Keb', '199201222020122018', 'Bidan Mahir', 'Anak Pra Sekolah') },
      { role: 'anak usia sekolah', staff: getStaff('drg. Zazkia Zita Zhafira Soni', '199708282024042001', 'Dokter Gigi', 'Anak Usia Sekolah') },
      { role: 'remaja.', staff: getStaff('Amsir, A.Md. Kep', '198608272019031004', 'Perawat Mahir', 'Kesehatan Remaja') }
    ]
  };

  const ilpKlaster3 = {
    koordinator: getStaff('dr. Ambro Henri Shite', '198605202014111001', 'Dokter Ahli Muda', 'Koordinator Klaster 3 (Usia Dewasa & Lansia)'),
    items: [
      { role: 'Usia Dewasa', staff: getStaff('Ns. Rahmawati, S. Kep', '198506082011012015', 'Perawat Ahli Pertama', 'Pelayanan Usia Dewasa') },
      { role: 'Lanjut Usia', staff: getStaff('Mudawaroh, A. Md. Kep', '199105152020122012', 'Perawat Terampil', 'Pelayanan Lanjut Usia') }
    ]
  };

  const ilpKlaster4 = {
    koordinator: getStaff('Ns. Budiman, S. Kep', '197310051993031004', 'Perawat Ahli Muda', 'Koordinator Klaster 4 (Penanggulangan P2P)'),
    items: [
      { role: 'Kesehatan Lingkungan', staff: getStaff('Masriyah, SKM', '198403152014032003', 'Sanitarian Ahli Muda', 'Kesehatan Lingkungan') },
      { role: 'Survielans', staff: getStaff('Wahyu Indratmoko, SKM', '198707122014031003', 'Epidemiolog Kesehatan', 'Surveilans Epidemiologi') }
    ]
  };

  const ilpLintasKlaster = {
    koordinator: getStaff('dr. Dede Hary Irawan', '197706232008041001', 'Dokter Ahli Madya', 'Koordinator Lintas Klaster'),
    items: [
      { role: 'Kegawatdaruratan', staff: getStaff('Rahim, A. Md. Kep', '198804122014031002', 'Perawat Mahir', 'Kegawatdaruratan (UGD 24 Jam)') },
      { role: 'Rawat Inap', staff: getStaff('Muntarsih, A. Md. Kep', '198709152014032002', 'Perawat Mahir', 'Pelayanan Rawat Inap') },
      { role: 'Laboratorium', staff: getStaff('Arifin Widiyanto, AMAK', '199401202020121010', 'Pranata Laboratorium Kesehatan', 'Laboratorium Medis') },
      { role: 'Kefarmasian', staff: getStaff('Debora, S.Farm, Apt', '199102142019032011', 'Apoteker Ahli Pertama', 'Pelayanan Kefarmasian') }
    ]
  };

  // =========================================================================
  // DATA MAPPING FROM URAIAN TUGAS FOR IMAGE 2 (PERGUB 14 TAHUN 2023)
  // =========================================================================
  const pergubKepala = getStaff('dr. Ignatius Dendy Purnama', '198607192014031004', 'Kepala Puskesmas', 'Kepala Puskesmas');
  const pergubKasubbag = getStaff('Saeful Muslimin, SKM', '197305291995031001', 'Kepala Subbagian Tata Usaha', 'Kasubbag Tata Usaha');
  const pergubPustuPari = getStaff('dr. Rahmah Erfa Qorina', '198811052014112001', 'Dokter Ahli Pertama', 'Kepala Pustu Pulau Pari');
  const pergubPustuLancang = getStaff('dr. Markus Septian', '198909082019031003', 'Dokter Ahli Pertama', 'Kepala Pustu Pulau Lancang');
  const pergubPustuUntungJawa = getStaff('drg. Ahmad Randi Oknelis', '198510082011021001', 'Dokter Gigi Ahli Muda', 'Kepala Pustu P. Untung Jawa');
  const pergubKasatpelUkm = getStaff('Ns. Budiman, S. Kep', '197310051993031004', 'Perawat Ahli Muda', 'Kasatpel UKM');
  const pergubKasatpelUkp = getStaff('dr. Dede Hary Irawan', '197706232008041001', 'Dokter Ahli Madya', 'Kasatpel UKP');

  return (
    <div className="space-y-6">
      {/* Top Banner & Sub-Menu Selector (Hidden during print) */}
      <div className="print:hidden bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0B2559] to-blue-700 text-amber-300 flex items-center justify-center shadow-xs">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Struktur Organisasi Puskesmas Kepulauan Seribu Selatan
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-900 rounded-full border border-amber-300">
                  Tahun 2026 (Live Terhubung Data Uraian Tugas)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Peta struktur visual resmi sesuai lampiran, terhubung otomatis ke data pegawai di lembar uraian tugas. Klik nama untuk detail/ubah foto.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button
                onClick={() => setZoomLevel(Math.max(0.65, zoomLevel - 0.1))}
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-colors"
                title="Perkecil Tampilan"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-[11px] font-mono font-semibold text-slate-600">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(Math.min(1.4, zoomLevel + 0.1))}
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-colors"
                title="Perbesar Tampilan"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-white transition-colors"
                title="Reset Zoom (100%)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setIsDriveSyncModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
              title="Integrasi Otomatis Google Drive & Spreadsheet Kolom AD"
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Drive & Kolom AD</span>
            </button>

            <button
              id="btn-upload-photo-toolbar"
              onClick={() => {
                const staffToEdit = activeSubMenu === 'ilp' ? ilpKepala : pergubKepala;
                setSelectedStaff({
                  roleTitle: staffToEdit.roleTitle,
                  targetName: staffToEdit.nama,
                  targetNip: staffToEdit.nip,
                  row: staffToEdit.row
                });
                setPhotoUrlInput(staffToEdit.foto || '');
                setIsPhotoModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
              title="Upload / Simpan Foto Pegawai Struktur Organisasi"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-700" />
              <span>Upload Foto</span>
            </button>

            {/* Tombol Cetak / Unduh Bagan PDF */}
            <div className="flex items-center gap-1">
              <button
                id="btn-print-struktur-lampiran"
                onClick={handleExportPdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#0B2559] hover:bg-blue-900 disabled:opacity-60 rounded-lg shadow-xs transition-colors"
                title="Unduh / Cetak Bagan Struktur Organisasi Langsung Dokumen PDF (A4 Landscape)"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4 text-amber-300" />
                )}
                <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Cetak Bagan (PDF)'}</span>
              </button>

              <button
                onClick={handleDownloadImage}
                disabled={isGeneratingPdf}
                className="p-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
                title="Unduh Gambar Bagan PNG Resolusi Tinggi"
              >
                <Download className="w-3.5 h-3.5 text-slate-700" />
              </button>
            </div>
          </div>
        </div>

        {/* Sub-menu Tabs Switcher */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            id="submenu-struktur-ilp"
            onClick={() => setActiveSubMenu('ilp')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all border ${
              activeSubMenu === 'ilp'
                ? 'bg-[#0B2559] text-amber-300 border-[#0B2559] shadow-md ring-2 ring-amber-400/40'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Struktur Organisasi Tipe ILP (Integrasi Layanan Primer) Sesuai Lampiran 1</span>
          </button>

          <button
            id="submenu-struktur-pergub14"
            onClick={() => setActiveSubMenu('pergub14')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all border ${
              activeSubMenu === 'pergub14'
                ? 'bg-[#006D77] text-amber-300 border-[#006D77] shadow-md ring-2 ring-amber-400/40'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Struktur Organisasi Pergub DKI No. 14 Tahun 2023 Sesuai Lampiran 2</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div className="overflow-x-auto pb-6">
        <div 
          id="canvas-capture-wrapper"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
          className="transition-transform duration-150 min-w-[1180px] flex justify-center w-full"
        >
          {/* ========================================================================= */}
          {/* LAMPIRAN 1: STRUKTUR ORGANISASI TIPE ILP (TAHUN 2026)                    */}
          {/* ========================================================================= */}
          {activeSubMenu === 'ilp' && (
            <div 
              id="bagan-ilp-lampiran-1"
              className="w-[1180px] min-w-[1180px] max-w-[1180px] min-h-[820px] mx-auto bg-[#0B2559] text-white rounded-2xl shadow-xl overflow-hidden relative border-4 border-[#07193C] print:border-none print:shadow-none print:m-0"
              style={{
                backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(20, 50, 110, 0.6) 0%, rgba(11, 37, 89, 0.95) 100%)'
              }}
            >
              {/* Golden Diagonal Decorative Shapes on top corners */}
              <div className="absolute top-0 left-0 w-36 h-28 bg-[#FFD100] -translate-x-12 -translate-y-12 rotate-45 opacity-90 pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-36 h-28 bg-[#FFD100] translate-x-12 -translate-y-12 -rotate-45 opacity-90 pointer-events-none"></div>

              {/* Header: Jaya Raya & Golden Title */}
              <div className="pt-6 pb-4 px-6 text-center relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-xs p-1.5 rounded-xl border border-amber-300/40 shadow-md mb-2 flex items-center justify-center">
                  <img
                    src="/images/logo-dki.png"
                    alt="Logo Jaya Raya DKI Jakarta"
                    className="w-12 h-12 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/logo-dki.svg';
                    }}
                  />
                </div>

                <h1 className="text-2xl sm:text-3xl font-black italic tracking-wider uppercase text-[#FFD100] drop-shadow-md leading-tight">
                  STRUKTUR ORGANISASI
                </h1>
                <h2 className="text-2xl sm:text-3xl font-black italic tracking-wider uppercase text-[#FFD100] drop-shadow-md leading-tight">
                  INTEGRASI LAYANAN PRIMER (ILP)
                </h2>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className="text-sm sm:text-base font-extrabold uppercase text-[#FFD100] tracking-wide">
                    PUSKESMAS KEPULAUAN SERIBU SELATAN
                  </span>
                </div>
                <div className="text-sm font-extrabold text-[#FFD100] tracking-widest mt-0.5">
                  TAHUN 2026
                </div>
              </div>

              {/* Faint Background Puskesmas Watermark */}
              <div 
                className="absolute inset-0 opacity-10 pointer-events-none bg-repeat"
                style={{
                  backgroundImage: `url("data:image/svg2+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`
                }}
              ></div>

              {/* Hierarchy Tree Area */}
              <div className="p-6 relative z-10 flex flex-col items-center">
                {/* LEVEL 1: KEPALA PUSKESMAS */}
                <div className="flex flex-col items-center">
                  <div 
                    onClick={() => setSelectedStaff({
                      roleTitle: ilpKepala.roleTitle,
                      targetName: ilpKepala.nama,
                      targetNip: ilpKepala.nip,
                      row: ilpKepala.row
                    })}
                    className="group bg-white text-slate-900 rounded-xl p-2.5 pr-6 shadow-2xl flex items-center gap-3.5 border-2 border-[#FFD100] cursor-pointer hover:scale-105 transition-transform"
                  >
                    <div className="relative">
                      {renderAvatar(ilpKepala.nama, ilpKepala.foto, "w-14 h-14", "circle")}
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#FFD100] rounded-full border border-slate-900 flex items-center justify-center text-[9px] font-bold text-slate-900">
                        ★
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">
                        {ilpKepala.nama}
                      </div>
                      <div className="text-xs font-bold text-slate-700 font-mono mt-0.5">
                        NIP {ilpKepala.nip}
                      </div>
                      <div className="text-xs font-extrabold uppercase text-[#0B2559] mt-0.5 tracking-wide">
                        {ilpKepala.roleTitle}
                      </div>
                    </div>
                  </div>

                  {/* Vertical Connecting Line */}
                  <div className="w-1 h-8 bg-white border-dashed"></div>
                </div>

                {/* Horizontal Crossbar across 5 Klaster */}
                <div className="w-full relative h-6 mb-3">
                  {/* Crossbar connecting from 10% (center of Klaster 1) to 90% (center of Klaster 5) */}
                  <div 
                    className="absolute top-0 h-0.5 bg-white" 
                    style={{ left: '10%', right: '10%' }}
                  ></div>
                  {/* Central feeder line from Kepala Puskesmas */}
                  <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-white"></div>
                  {/* 5 Drop nodes for 5 Klaster touching exact column centers */}
                  <div className="absolute top-0 bottom-0 left-[10%] -translate-x-1/2 w-0.5 bg-white"></div>
                  <div className="absolute top-0 bottom-0 left-[30%] -translate-x-1/2 w-0.5 bg-white"></div>
                  <div className="absolute top-0 bottom-0 left-[50%] -translate-x-1/2 w-0.5 bg-white"></div>
                  <div className="absolute top-0 bottom-0 left-[70%] -translate-x-1/2 w-0.5 bg-white"></div>
                  <div className="absolute top-0 bottom-0 left-[90%] -translate-x-1/2 w-0.5 bg-white"></div>
                </div>

                {/* 5 KLASTER COLUMNS GRID */}
                <div className="grid grid-cols-5 gap-3 w-full">
                  {/* ========================================================= */}
                  {/* KLASTER 1: MANAJEMEN */}
                  {/* ========================================================= */}
                  <div className="flex flex-col items-center">
                    {/* Header Box */}
                    <div 
                      onClick={() => setSelectedStaff({
                        roleTitle: ilpKlaster1.koordinator.roleTitle,
                        targetName: ilpKlaster1.koordinator.nama,
                        targetNip: ilpKlaster1.koordinator.nip,
                        row: ilpKlaster1.koordinator.row
                      })}
                      className="w-full bg-white text-slate-900 rounded-xl p-2 shadow-lg flex items-center gap-2 border-2 border-amber-400 cursor-pointer hover:bg-amber-50/90 transition-colors"
                    >
                      {renderAvatar(ilpKlaster1.koordinator.nama, ilpKlaster1.koordinator.foto, "w-10 h-10", "circle")}
                      <div className="text-left overflow-hidden">
                        <div className="text-[11px] font-black text-[#0B2559] uppercase leading-tight truncate">
                          Klaster 1 (Manajemen)
                        </div>
                        <div className="text-[10px] font-bold text-slate-800 truncate">
                          {ilpKlaster1.koordinator.nama}
                        </div>
                      </div>
                    </div>

                    {/* Vertical line connecting sub items */}
                    <div className="w-0.5 h-4 bg-white"></div>

                    {/* Sub Items (9 items) */}
                    <div className="w-full space-y-2 border-l-2 border-white pl-2">
                      {ilpKlaster1.items.map((it, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setSelectedStaff({
                            roleTitle: it.role,
                            targetName: it.staff.nama,
                            targetNip: it.staff.nip,
                            row: it.staff.row
                          })}
                          className="bg-white text-slate-900 rounded-lg p-1.5 shadow-sm flex items-center gap-2 border border-slate-200 cursor-pointer hover:border-amber-400 hover:shadow-md transition-all"
                        >
                          {renderAvatar(it.staff.nama, it.staff.foto, "w-7 h-7", "circle")}
                          <div className="text-left overflow-hidden min-w-0">
                            <div className="text-[9px] font-black text-[#0B2559] leading-tight line-clamp-2">
                              {it.role}
                            </div>
                            <div className="text-[9px] font-bold text-slate-800 truncate">
                              {it.staff.nama}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ========================================================= */}
                  {/* KLASTER 2: IBU DAN ANAK */}
                  {/* ========================================================= */}
                  <div className="flex flex-col items-center">
                    {/* Header Box */}
                    <div 
                      onClick={() => setSelectedStaff({
                        roleTitle: ilpKlaster2.koordinator.roleTitle,
                        targetName: ilpKlaster2.koordinator.nama,
                        targetNip: ilpKlaster2.koordinator.nip,
                        row: ilpKlaster2.koordinator.row
                      })}
                      className="w-full bg-white text-slate-900 rounded-xl p-2 shadow-lg flex items-center gap-2 border-2 border-amber-400 cursor-pointer hover:bg-amber-50/90 transition-colors"
                    >
                      {renderAvatar(ilpKlaster2.koordinator.nama, ilpKlaster2.koordinator.foto, "w-10 h-10", "circle")}
                      <div className="text-left overflow-hidden">
                        <div className="text-[11px] font-black text-[#0B2559] uppercase leading-tight truncate">
                          Klaster 2 (Ibu dan Anak)
                        </div>
                        <div className="text-[10px] font-bold text-slate-800 truncate">
                          {ilpKlaster2.koordinator.nama}
                        </div>
                      </div>
                    </div>

                    {/* Vertical line connecting sub items */}
                    <div className="w-0.5 h-4 bg-white"></div>

                    {/* Sub Items (5 items) */}
                    <div className="w-full space-y-2 border-l-2 border-white pl-2">
                      {ilpKlaster2.items.map((it, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setSelectedStaff({
                            roleTitle: it.role,
                            targetName: it.staff.nama,
                            targetNip: it.staff.nip,
                            row: it.staff.row
                          })}
                          className="bg-white text-slate-900 rounded-lg p-1.5 shadow-sm flex items-center gap-2 border border-slate-200 cursor-pointer hover:border-amber-400 hover:shadow-md transition-all"
                        >
                          {renderAvatar(it.staff.nama, it.staff.foto, "w-7 h-7", "circle")}
                          <div className="text-left overflow-hidden min-w-0">
                            <div className="text-[9px] font-black text-[#0B2559] leading-tight line-clamp-2">
                              {it.role}
                            </div>
                            <div className="text-[9px] font-bold text-slate-800 truncate">
                              {it.staff.nama}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ========================================================= */}
                  {/* KLASTER 3: USIA DEWASA & LANSIA */}
                  {/* ========================================================= */}
                  <div className="flex flex-col items-center">
                    {/* Header Box */}
                    <div 
                      onClick={() => setSelectedStaff({
                        roleTitle: ilpKlaster3.koordinator.roleTitle,
                        targetName: ilpKlaster3.koordinator.nama,
                        targetNip: ilpKlaster3.koordinator.nip,
                        row: ilpKlaster3.koordinator.row
                      })}
                      className="w-full bg-white text-slate-900 rounded-xl p-2 shadow-lg flex items-center gap-2 border-2 border-amber-400 cursor-pointer hover:bg-amber-50/90 transition-colors"
                    >
                      {renderAvatar(ilpKlaster3.koordinator.nama, ilpKlaster3.koordinator.foto, "w-10 h-10", "circle")}
                      <div className="text-left overflow-hidden">
                        <div className="text-[11px] font-black text-[#0B2559] uppercase leading-tight truncate">
                          Klaster 3 (Dewasa & Lansia)
                        </div>
                        <div className="text-[10px] font-bold text-slate-800 truncate">
                          {ilpKlaster3.koordinator.nama}
                        </div>
                      </div>
                    </div>

                    {/* Vertical line connecting sub items */}
                    <div className="w-0.5 h-4 bg-white"></div>

                    {/* Sub Items (2 items) */}
                    <div className="w-full space-y-2 border-l-2 border-white pl-2">
                      {ilpKlaster3.items.map((it, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setSelectedStaff({
                            roleTitle: it.role,
                            targetName: it.staff.nama,
                            targetNip: it.staff.nip,
                            row: it.staff.row
                          })}
                          className="bg-white text-slate-900 rounded-lg p-1.5 shadow-sm flex items-center gap-2 border border-slate-200 cursor-pointer hover:border-amber-400 hover:shadow-md transition-all"
                        >
                          {renderAvatar(it.staff.nama, it.staff.foto, "w-7 h-7", "circle")}
                          <div className="text-left overflow-hidden min-w-0">
                            <div className="text-[9px] font-black text-[#0B2559] leading-tight line-clamp-2">
                              {it.role}
                            </div>
                            <div className="text-[9px] font-bold text-slate-800 truncate">
                              {it.staff.nama}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ========================================================= */}
                  {/* KLASTER 4: PENANGGULANGAN P2P */}
                  {/* ========================================================= */}
                  <div className="flex flex-col items-center">
                    {/* Header Box */}
                    <div 
                      onClick={() => setSelectedStaff({
                        roleTitle: ilpKlaster4.koordinator.roleTitle,
                        targetName: ilpKlaster4.koordinator.nama,
                        targetNip: ilpKlaster4.koordinator.nip,
                        row: ilpKlaster4.koordinator.row
                      })}
                      className="w-full bg-white text-slate-900 rounded-xl p-2 shadow-lg flex items-center gap-2 border-2 border-amber-400 cursor-pointer hover:bg-amber-50/90 transition-colors"
                    >
                      {renderAvatar(ilpKlaster4.koordinator.nama, ilpKlaster4.koordinator.foto, "w-10 h-10", "circle")}
                      <div className="text-left overflow-hidden">
                        <div className="text-[11px] font-black text-[#0B2559] uppercase leading-tight truncate">
                          Klaster 4 (P2P)
                        </div>
                        <div className="text-[10px] font-bold text-slate-800 truncate">
                          {ilpKlaster4.koordinator.nama}
                        </div>
                      </div>
                    </div>

                    {/* Vertical line connecting sub items */}
                    <div className="w-0.5 h-4 bg-white"></div>

                    {/* Sub Items (2 items) */}
                    <div className="w-full space-y-2 border-l-2 border-white pl-2">
                      {ilpKlaster4.items.map((it, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setSelectedStaff({
                            roleTitle: it.role,
                            targetName: it.staff.nama,
                            targetNip: it.staff.nip,
                            row: it.staff.row
                          })}
                          className="bg-white text-slate-900 rounded-lg p-1.5 shadow-sm flex items-center gap-2 border border-slate-200 cursor-pointer hover:border-amber-400 hover:shadow-md transition-all"
                        >
                          {renderAvatar(it.staff.nama, it.staff.foto, "w-7 h-7", "circle")}
                          <div className="text-left overflow-hidden min-w-0">
                            <div className="text-[9px] font-black text-[#0B2559] leading-tight line-clamp-2">
                              {it.role}
                            </div>
                            <div className="text-[9px] font-bold text-slate-800 truncate">
                              {it.staff.nama}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ========================================================= */}
                  {/* LINTAS KLASTER */}
                  {/* ========================================================= */}
                  <div className="flex flex-col items-center">
                    {/* Header Box */}
                    <div 
                      onClick={() => setSelectedStaff({
                        roleTitle: ilpLintasKlaster.koordinator.roleTitle,
                        targetName: ilpLintasKlaster.koordinator.nama,
                        targetNip: ilpLintasKlaster.koordinator.nip,
                        row: ilpLintasKlaster.koordinator.row
                      })}
                      className="w-full bg-white text-slate-900 rounded-xl p-2 shadow-lg flex items-center gap-2 border-2 border-amber-400 cursor-pointer hover:bg-amber-50/90 transition-colors"
                    >
                      {renderAvatar(ilpLintasKlaster.koordinator.nama, ilpLintasKlaster.koordinator.foto, "w-10 h-10", "circle")}
                      <div className="text-left overflow-hidden">
                        <div className="text-[11px] font-black text-[#0B2559] uppercase leading-tight truncate">
                          Lintas Klaster
                        </div>
                        <div className="text-[10px] font-bold text-slate-800 truncate">
                          {ilpLintasKlaster.koordinator.nama}
                        </div>
                      </div>
                    </div>

                    {/* Vertical line connecting sub items */}
                    <div className="w-0.5 h-4 bg-white"></div>

                    {/* Sub Items (4 items) */}
                    <div className="w-full space-y-2 border-l-2 border-white pl-2">
                      {ilpLintasKlaster.items.map((it, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setSelectedStaff({
                            roleTitle: it.role,
                            targetName: it.staff.nama,
                            targetNip: it.staff.nip,
                            row: it.staff.row
                          })}
                          className="bg-white text-slate-900 rounded-lg p-1.5 shadow-sm flex items-center gap-2 border border-slate-200 cursor-pointer hover:border-amber-400 hover:shadow-md transition-all"
                        >
                          {renderAvatar(it.staff.nama, it.staff.foto, "w-7 h-7", "circle")}
                          <div className="text-left overflow-hidden min-w-0">
                            <div className="text-[9px] font-black text-[#0B2559] leading-tight line-clamp-2">
                              {it.role}
                            </div>
                            <div className="text-[9px] font-bold text-slate-800 truncate">
                              {it.staff.nama}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Social Media Banner Bar (Exactly as in Lampiran 1) */}
              <div className="mt-8 bg-[#07193C] border-t-2 border-[#FFD100] py-3 px-6 flex items-center justify-center gap-8 text-xs font-semibold text-white">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#FFD100] text-slate-900 flex items-center justify-center text-[10px] font-black">f</span>
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-black">▶</span>
                  <span>Puskesmas Seribu Selatan</span>
                </div>
                <div className="h-4 w-px bg-white/30"></div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white flex items-center justify-center text-[10px]">📷</span>
                  <span>puskesmasseribuselatan</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* LAMPIRAN 2: STRUKTUR ORGANISASI PERGUB 14 TAHUN 2023 (TAHUN 2026)         */}
          {/* ========================================================================= */}
          {activeSubMenu === 'pergub14' && (
            <div 
              id="bagan-pergub-lampiran-2"
              className="w-[1180px] min-w-[1180px] max-w-[1180px] min-h-[820px] mx-auto bg-white text-slate-900 rounded-2xl shadow-xl overflow-hidden relative border-4 border-slate-300 print:border-none print:shadow-none print:m-0"
              style={{
                backgroundImage: 'radial-gradient(circle at 50% 12%, #E6F4F5 0%, #FFFFFF 60%, #F5FAFA 100%)'
              }}
            >
              {/* Teal & Orange Corner Geometric Triangles (Sesuai Lampiran 2 Pergub 14/2023) */}
              <div className="absolute top-0 left-0 w-32 h-24 bg-[#006D77] -translate-x-10 -translate-y-10 rotate-45 opacity-90 pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-32 h-24 bg-[#FF9E3D] translate-x-10 -translate-y-10 -rotate-45 opacity-90 pointer-events-none"></div>
              <div className="absolute bottom-0 right-0 w-32 h-24 bg-[#006D77] translate-x-10 translate-y-10 rotate-45 opacity-90 pointer-events-none"></div>

              {/* Header: Jaya Raya & Dark Teal Title with Wavy Orange Lines */}
              <div className="pt-6 pb-2 px-8 text-center relative z-10 flex flex-col items-center">
                <div className="w-14 h-14 bg-white p-1 rounded-xl border border-slate-200 shadow-sm mb-1.5 flex items-center justify-center">
                  <img
                    src="/images/logo-dki.png"
                    alt="Logo Jaya Raya DKI Jakarta"
                    className="w-11 h-11 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/logo-dki.svg';
                    }}
                  />
                </div>

                <div className="flex items-center justify-center gap-4 w-full">
                  {/* Left Wavy Orange lines */}
                  <div className="flex flex-col gap-0.5 text-[#FF9E3D] opacity-80 text-lg font-mono select-none">
                    <span>∿∿∿∿</span>
                    <span>∿∿∿∿</span>
                  </div>

                  <div>
                    <h1 className="text-xl font-black tracking-wide uppercase text-[#006D77] leading-tight">
                      STRUKTUR ORGANISASI
                    </h1>
                    <h2 className="text-xl font-black tracking-wide uppercase text-[#006D77] leading-tight">
                      PUSKESMAS KEPULAUAN SERIBU SELATAN
                    </h2>
                    <div className="text-xs font-black text-[#FF9E3D] tracking-widest mt-0.5 uppercase">
                      TAHUN 2026
                    </div>
                  </div>

                  {/* Right Wavy Orange lines */}
                  <div className="flex flex-col gap-0.5 text-[#FF9E3D] opacity-80 text-lg font-mono select-none">
                    <span>∿∿∿∿</span>
                    <span>∿∿∿∿</span>
                  </div>
                </div>
              </div>

              {/* Hierarchical Structure Pergub 14/2023 */}
              <div className="pt-3 pb-6 px-8 relative z-10 flex flex-col items-center">
                {/* LEVEL 1: KEPALA PUSKESMAS */}
                <div className="relative z-20 flex flex-col items-center">
                  <div 
                    onClick={() => setSelectedStaff({
                      roleTitle: pergubKepala.roleTitle,
                      targetName: pergubKepala.nama,
                      targetNip: pergubKepala.nip,
                      row: pergubKepala.row
                    })}
                    className="bg-[#FF9E3D] text-white rounded-full py-2 px-8 shadow-lg flex items-center gap-3.5 border-2 border-white cursor-pointer hover:scale-105 transition-transform"
                  >
                    {renderAvatar(pergubKepala.nama, pergubKepala.foto, "w-12 h-12", "circle")}
                    <div className="text-left">
                      <div className="text-[11px] font-black text-amber-950 uppercase tracking-wide">
                        {pergubKepala.roleTitle}
                      </div>
                      <div className="text-base font-black text-white leading-tight">
                        {pergubKepala.nama}
                      </div>
                      <div className="text-[11px] font-bold text-amber-950 font-mono">
                        NIP {pergubKepala.nip}
                      </div>
                    </div>
                  </div>

                  {/* Feeder down to Level 2 */}
                  <div className="w-1 h-5 bg-[#006D77]"></div>
                </div>

                {/* LEVEL 2: TWO SYMMETRICAL WINGS (SUB KELOMPOK JABATAN FUNGSIONAL & SUBBAGIAN TATA USAHA) */}
                <div className="w-[960px] relative flex items-center justify-between z-20">
                  {/* Left Wing: Sub Kelompok Jabatan Fungsional (Garis Koordinasi Fungsional) */}
                  <div className="flex items-center">
                    <div className="bg-[#FF9E3D] text-white rounded-2xl py-2 px-4 shadow-md flex items-center gap-3 border-2 border-white w-[310px]">
                      <div className="w-9 h-9 rounded-full bg-[#006D77] flex items-center justify-center text-white font-bold border border-white shrink-0 text-sm shadow-xs">
                        ✦
                      </div>
                      <div className="text-left">
                        <div className="text-[11px] font-black uppercase leading-tight text-white">
                          Sub Kelompok
                        </div>
                        <div className="text-[12px] font-black uppercase leading-tight text-amber-950">
                          Jabatan Fungsional
                        </div>
                        <div className="text-[9px] font-semibold text-white/90 mt-0.5 leading-tight">
                          Kelompok Medis, Keperawatan, Kebidanan & Farmasi
                        </div>
                      </div>
                    </div>
                    {/* Dashed Coordination Line into central trunk */}
                    <div className="w-16 border-t-2 border-dashed border-[#006D77]"></div>
                  </div>

                  {/* Central Vertical Trunk through Level 2 */}
                  <div className="w-1 h-14 bg-[#006D77]"></div>

                  {/* Right Wing: Kasubbag Tata Usaha (Garis Komando Staf) */}
                  <div className="flex items-center">
                    {/* Solid Administrative Line from central trunk */}
                    <div className="w-16 border-t-2 border-[#006D77]"></div>
                    <div 
                      onClick={() => setSelectedStaff({
                        roleTitle: pergubKasubbag.roleTitle,
                        targetName: pergubKasubbag.nama,
                        targetNip: pergubKasubbag.nip,
                        row: pergubKasubbag.row
                      })}
                      className="bg-[#FF9E3D] text-white rounded-2xl py-2 px-4 shadow-md flex items-center gap-3 border-2 border-white cursor-pointer hover:scale-105 transition-transform w-[310px]"
                    >
                      {renderAvatar(pergubKasubbag.nama, pergubKasubbag.foto, "w-11 h-11", "circle")}
                      <div className="text-left overflow-hidden">
                        <div className="text-[12px] font-black text-white leading-tight">
                          {pergubKasubbag.nama}
                        </div>
                        <div className="text-[10px] font-bold text-amber-950 font-mono">
                          NIP {pergubKasubbag.nip}
                        </div>
                        <div className="text-[10px] font-black text-amber-950 uppercase mt-0.5 tracking-wide">
                          {pergubKasubbag.roleTitle}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trunk continues down from Level 2 to Level 3 */}
                <div className="w-1 h-5 bg-[#006D77]"></div>

                {/* LEVEL 3: HORIZONTAL CROSSBAR ACROSS 5 PILLARS */}
                <div className="w-full relative h-6">
                  {/* Horizontal Crossbar spanning from 10% (Col 1 center) to 90% (Col 5 center) */}
                  <div 
                    className="absolute top-0 h-1 bg-[#006D77]" 
                    style={{ left: '10%', right: '10%' }}
                  ></div>
                  {/* Center line connecting from trunk above */}
                  <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-[#006D77]"></div>
                  {/* 5 Vertical drop stems directly at column centers */}
                  <div className="absolute top-0 bottom-0 left-[10%] -translate-x-1/2 w-1 bg-[#006D77]"></div>
                  <div className="absolute top-0 bottom-0 left-[30%] -translate-x-1/2 w-1 bg-[#006D77]"></div>
                  <div className="absolute top-0 bottom-0 left-[50%] -translate-x-1/2 w-1 bg-[#006D77]"></div>
                  <div className="absolute top-0 bottom-0 left-[70%] -translate-x-1/2 w-1 bg-[#006D77]"></div>
                  <div className="absolute top-0 bottom-0 left-[90%] -translate-x-1/2 w-1 bg-[#006D77]"></div>
                </div>

                {/* 5 OPERATIONAL PILLARS GRID */}
                <div className="grid grid-cols-5 gap-3.5 w-full items-stretch mt-0">
                  {/* Pillar 1: Pustu Pulau Pari */}
                  <div className="flex flex-col items-center h-full">
                    <div 
                      onClick={() => setSelectedStaff({
                        roleTitle: pergubPustuPari.roleTitle,
                        targetName: pergubPustuPari.nama,
                        targetNip: pergubPustuPari.nip,
                        row: pergubPustuPari.row
                      })}
                      className="w-full h-full bg-[#FF9E3D] text-white rounded-2xl p-3 shadow-md border-2 border-white flex flex-col items-center text-center cursor-pointer hover:scale-[1.02] transition-transform justify-between"
                    >
                      <div className="w-full">
                        <div className="bg-[#006D77] text-white text-[10px] font-black uppercase py-1 px-2 rounded-lg tracking-wider mb-2 shadow-xs">
                          PUSTU PULAU PARI
                        </div>
                        <div className="flex justify-center mb-2">
                          {renderAvatar(pergubPustuPari.nama, pergubPustuPari.foto, "w-11 h-11", "circle")}
                        </div>
                        <div className="text-xs font-black text-white leading-tight mb-0.5">
                          {pergubPustuPari.nama}
                        </div>
                        <div className="text-[10px] font-bold text-amber-950 font-mono mb-1">
                          NIP {pergubPustuPari.nip}
                        </div>
                        <div className="text-[10px] font-extrabold text-amber-950 uppercase">
                          {pergubPustuPari.roleTitle}
                        </div>
                      </div>
                      
                      <div className="w-full mt-2.5 pt-2 border-t border-white/30 text-[9px] font-bold text-amber-950 text-left space-y-0.5">
                        <div className="flex items-center gap-1">• <span>Pelayanan Rawat Jalan & IGD</span></div>
                        <div className="flex items-center gap-1">• <span>Pelayanan KIA, KB, & Balita</span></div>
                        <div className="flex items-center gap-1">• <span>Rujukan Pasien Antar Pulau</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Pillar 2: Pustu Pulau Lancang */}
                  <div className="flex flex-col items-center h-full">
                    <div 
                      onClick={() => setSelectedStaff({
                        roleTitle: pergubPustuLancang.roleTitle,
                        targetName: pergubPustuLancang.nama,
                        targetNip: pergubPustuLancang.nip,
                        row: pergubPustuLancang.row
                      })}
                      className="w-full h-full bg-[#FF9E3D] text-white rounded-2xl p-3 shadow-md border-2 border-white flex flex-col items-center text-center cursor-pointer hover:scale-[1.02] transition-transform justify-between"
                    >
                      <div className="w-full">
                        <div className="bg-[#006D77] text-white text-[10px] font-black uppercase py-1 px-2 rounded-lg tracking-wider mb-2 shadow-xs">
                          PUSTU PULAU LANCANG
                        </div>
                        <div className="flex justify-center mb-2">
                          {renderAvatar(pergubPustuLancang.nama, pergubPustuLancang.foto, "w-11 h-11", "circle")}
                        </div>
                        <div className="text-xs font-black text-white leading-tight mb-0.5">
                          {pergubPustuLancang.nama}
                        </div>
                        <div className="text-[10px] font-bold text-amber-950 font-mono mb-1">
                          NIP {pergubPustuLancang.nip}
                        </div>
                        <div className="text-[10px] font-extrabold text-amber-950 uppercase">
                          {pergubPustuLancang.roleTitle}
                        </div>
                      </div>
                      
                      <div className="w-full mt-2.5 pt-2 border-t border-white/30 text-[9px] font-bold text-amber-950 text-left space-y-0.5">
                        <div className="flex items-center gap-1">• <span>Pelayanan Rawat Jalan Dasar</span></div>
                        <div className="flex items-center gap-1">• <span>Promotif, Preventif & Imunisasi</span></div>
                        <div className="flex items-center gap-1">• <span>Rujukan Medis Antar Pulau</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Pillar 3: Pustu Pulau Untung Jawa */}
                  <div className="flex flex-col items-center h-full">
                    <div 
                      onClick={() => setSelectedStaff({
                        roleTitle: pergubPustuUntungJawa.roleTitle,
                        targetName: pergubPustuUntungJawa.nama,
                        targetNip: pergubPustuUntungJawa.nip,
                        row: pergubPustuUntungJawa.row
                      })}
                      className="w-full h-full bg-[#FF9E3D] text-white rounded-2xl p-3 shadow-md border-2 border-white flex flex-col items-center text-center cursor-pointer hover:scale-[1.02] transition-transform justify-between"
                    >
                      <div className="w-full">
                        <div className="bg-[#006D77] text-white text-[10px] font-black uppercase py-1 px-2 rounded-lg tracking-wider mb-2 shadow-xs">
                          PUSTU P. UNTUNG JAWA
                        </div>
                        <div className="flex justify-center mb-2">
                          {renderAvatar(pergubPustuUntungJawa.nama, pergubPustuUntungJawa.foto, "w-11 h-11", "circle")}
                        </div>
                        <div className="text-xs font-black text-white leading-tight mb-0.5">
                          {pergubPustuUntungJawa.nama}
                        </div>
                        <div className="text-[10px] font-bold text-amber-950 font-mono mb-1">
                          NIP {pergubPustuUntungJawa.nip}
                        </div>
                        <div className="text-[10px] font-extrabold text-amber-950 uppercase">
                          {pergubPustuUntungJawa.roleTitle}
                        </div>
                      </div>
                      
                      <div className="w-full mt-2.5 pt-2 border-t border-white/30 text-[9px] font-bold text-amber-950 text-left space-y-0.5">
                        <div className="flex items-center gap-1">• <span>Pelayanan Medik Gigi & Mulut</span></div>
                        <div className="flex items-center gap-1">• <span>Pelayanan Rawat Jalan & Poskes</span></div>
                        <div className="flex items-center gap-1">• <span>Rujukan Kegawatdaruratan</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Pillar 4: Satpel UKM */}
                  <div className="flex flex-col items-center h-full">
                    <div 
                      onClick={() => setSelectedStaff({
                        roleTitle: pergubKasatpelUkm.roleTitle,
                        targetName: pergubKasatpelUkm.nama,
                        targetNip: pergubKasatpelUkm.nip,
                        row: pergubKasatpelUkm.row
                      })}
                      className="w-full h-full bg-[#FF9E3D] text-white rounded-2xl p-3 shadow-md border-2 border-white flex flex-col items-center text-center cursor-pointer hover:scale-[1.02] transition-transform justify-between"
                    >
                      <div className="w-full">
                        <div className="bg-[#006D77] text-white text-[10px] font-black uppercase py-1 px-2 rounded-lg tracking-wider mb-2 shadow-xs">
                          KASATPEL UKM
                        </div>
                        <div className="flex justify-center mb-2">
                          {renderAvatar(pergubKasatpelUkm.nama, pergubKasatpelUkm.foto, "w-11 h-11", "circle")}
                        </div>
                        <div className="text-xs font-black text-white leading-tight mb-0.5">
                          {pergubKasatpelUkm.nama}
                        </div>
                        <div className="text-[10px] font-bold text-amber-950 font-mono mb-1">
                          NIP {pergubKasatpelUkm.nip}
                        </div>
                        <div className="text-[10px] font-extrabold text-amber-950 uppercase">
                          {pergubKasatpelUkm.roleTitle}
                        </div>
                      </div>
                      
                      <div className="w-full mt-2.5 pt-2 border-t border-white/30 text-[9px] font-bold text-amber-950 text-left space-y-0.5">
                        <div className="flex items-center gap-1">• <span>Promosi Kesehatan & Kesling</span></div>
                        <div className="flex items-center gap-1">• <span>KIA, KB, & Gizi Masyarakat</span></div>
                        <div className="flex items-center gap-1">• <span>Pencegahan Penyakit (P2P)</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Pillar 5: Satpel UKP */}
                  <div className="flex flex-col items-center h-full">
                    <div 
                      onClick={() => setSelectedStaff({
                        roleTitle: pergubKasatpelUkp.roleTitle,
                        targetName: pergubKasatpelUkp.nama,
                        targetNip: pergubKasatpelUkp.nip,
                        row: pergubKasatpelUkp.row
                      })}
                      className="w-full h-full bg-[#FF9E3D] text-white rounded-2xl p-3 shadow-md border-2 border-white flex flex-col items-center text-center cursor-pointer hover:scale-[1.02] transition-transform justify-between"
                    >
                      <div className="w-full">
                        <div className="bg-[#006D77] text-white text-[10px] font-black uppercase py-1 px-2 rounded-lg tracking-wider mb-2 shadow-xs">
                          KASATPEL UKP
                        </div>
                        <div className="flex justify-center mb-2">
                          {renderAvatar(pergubKasatpelUkp.nama, pergubKasatpelUkp.foto, "w-11 h-11", "circle")}
                        </div>
                        <div className="text-xs font-black text-white leading-tight mb-0.5">
                          {pergubKasatpelUkp.nama}
                        </div>
                        <div className="text-[10px] font-bold text-amber-950 font-mono mb-1">
                          NIP {pergubKasatpelUkp.nip}
                        </div>
                        <div className="text-[10px] font-extrabold text-amber-950 uppercase">
                          {pergubKasatpelUkp.roleTitle}
                        </div>
                      </div>
                      
                      <div className="w-full mt-2.5 pt-2 border-t border-white/30 text-[9px] font-bold text-amber-950 text-left space-y-0.5">
                        <div className="flex items-center gap-1">• <span>BP Umum, Gigi & Tindakan UGD</span></div>
                        <div className="flex items-center gap-1">• <span>Farmasi & Laboratorium Medis</span></div>
                        <div className="flex items-center gap-1">• <span>Rawat Inap & Ambulans Laut</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer Regulatory Badge */}
                <div className="w-full mt-6 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <div className="bg-[#FF9E3D] text-amber-950 font-black text-xs px-4 py-2 rounded-xl border border-amber-300 shadow-xs flex items-center gap-2">
                    <span>Mengacu:</span>
                    <span className="text-white text-xs font-black">Peraturan Gubernur DKI Jakarta No. 14 Tahun 2023 (Lampiran 2)</span>
                  </div>

                  <div className="text-right text-[11px] text-slate-600 font-medium">
                    <span className="font-bold text-[#006D77]">Puskesmas Kepulauan Seribu Selatan</span> • Tata Kerja Organisasi Sesuai Regulasi Provinsi DKI Jakarta
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EMPLOYEE DETAIL & EDIT PHOTO MODAL / DRAWER                                */}
      {/* ========================================================================= */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Rincian Pegawai Struktur Organisasi
                </h3>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="relative group">
                {renderAvatar(selectedStaff.targetName, selectedStaff.row ? String(selectedStaff.row.foto || '') : '', "w-20 h-20", "circle")}
                {selectedStaff.row && onUpdateSheet && (
                  <button
                    onClick={() => {
                      setPhotoUrlInput(String(selectedStaff.row?.foto || ''));
                      setIsPhotoModalOpen(true);
                    }}
                    className="absolute inset-0 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] font-bold"
                    title="Ubah Foto Pegawai"
                  >
                    <Camera className="w-4 h-4 mb-0.5" />
                    <span>Ubah</span>
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-1">
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                  {selectedStaff.roleTitle}
                </div>
                <div className="text-base font-black text-slate-900">
                  {selectedStaff.targetName}
                </div>
                <div className="text-xs font-mono text-slate-600 font-semibold">
                  NIP: {selectedStaff.targetNip}
                </div>
                <div className="text-xs text-slate-600">
                  Jabatan: {selectedStaff.row ? String(selectedStaff.row.jabatan || '-') : 'Pejabat Struktural / Fungsional'}
                </div>
                <div className="text-xs text-slate-500">
                  Unit: {selectedStaff.row ? String(selectedStaff.row.tempat_tugas || 'Puskesmas Kepulauan Seribu Selatan') : 'Puskesmas Kepulauan Seribu Selatan'}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between pt-2">
              {selectedStaff.row && onUpdateSheet ? (
                <button
                  onClick={() => {
                    setPhotoUrlInput(String(selectedStaff.row?.foto || ''));
                    setIsPhotoModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-700" />
                  <span>{selectedStaff.row.foto ? 'Ganti Pasfoto' : 'Pasang Pasfoto'}</span>
                </button>
              ) : (
                <div className="text-xs text-slate-400 italic">
                  Data tersinkronisasi langsung dari Lembar Uraian Tugas
                </div>
              )}

              <button
                onClick={() => setSelectedStaff(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* UPLOAD / EDIT PHOTO URL MODAL WITH GOOGLE DRIVE INTEGRATION                */}
      {/* ========================================================================= */}
      {isPhotoModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-150 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Upload & Simpan Foto Pegawai
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Untuk Bagan Struktur Organisasi & Kartu Uraian Tugas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Google Drive Folder Banner */}
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <FolderOpen className="w-4 h-4 text-blue-700" />
                  <span>Folder Google Drive Foto Resmi:</span>
                </div>
                <a
                  href={GOOGLE_DRIVE_FOTO_FOLDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  <span>Buka Drive Foto</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Anda dapat mengunggah foto resmi pegawai ke folder Google Drive di atas, lalu salin (copy link) atau unggah file foto langsung melalui form di bawah ini.
              </p>
            </div>

            {/* Target Employee Info / Selector */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Pilih Pegawai yang Ingin Diperbarui Fotonya:
              </label>
              <select
                value={selectedStaff.targetNip || selectedStaff.targetName}
                onChange={(e) => {
                  const val = e.target.value;
                  const found = sheet.rows.find(r => r.nip === val || r.nama === val);
                  if (found) {
                    setSelectedStaff({
                      roleTitle: String(found.jabatan || selectedStaff.roleTitle),
                      targetName: String(found.nama || ''),
                      targetNip: String(found.nip || ''),
                      row: found
                    });
                    setPhotoUrlInput(String(found.foto || ''));
                  }
                }}
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {sheet.rows.map(r => (
                  <option key={r._id} value={r.nip || r.nama}>
                    {r.nama} {r.nip ? `(NIP: ${r.nip})` : ''} - {r.jabatan || 'Pegawai'}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-3 pt-1 text-xs">
                <div className="font-bold text-slate-900">{selectedStaff.targetName}</div>
                <span className="text-slate-400">•</span>
                <div className="text-slate-600 font-mono text-[11px]">NIP: {selectedStaff.targetNip || '-'}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Tempel Link Google Drive / URL Foto
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://drive.google.com/file/d/... atau URL gambar web"
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  {photoUrlInput && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrlInput('')}
                      className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Mendukung link share Google Drive ("Anyone with link"), Google Photos, Imgur, atau link gambar web lainnya.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Atau Upload File Foto dari Komputer / HP
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const base64 = await fileToBase64(file);
                          setPhotoUrlInput(base64);
                        } catch {
                          alert('Gagal membaca file gambar');
                        }
                      }
                    }}
                    className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>
              </div>

              {/* Preview */}
              {photoUrlInput && (
                <div className="pt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-[11px] font-bold text-slate-600 mb-2">Pratinjau Pasfoto:</div>
                  <div className="inline-block relative">
                    <img
                      src={convertGoogleDriveUrl(photoUrlInput)}
                      alt="Pratinjau Foto Pegawai"
                      className="w-24 h-24 object-cover rounded-full mx-auto border-3 border-emerald-500 shadow-md"
                      onError={() => {
                        console.warn('Gagal memuat URL foto');
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Foto akan langsung muncul di bagan struktur dan kartu uraian tugas pegawai.
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDriveSyncModalOpen(true)}
                  className="text-xs text-blue-700 hover:text-blue-900 font-semibold inline-flex items-center gap-1 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span>Integrasi Drive & Kolom AD</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(false)}
                  disabled={isSavingPhoto}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePhoto(photoUrlInput)}
                  disabled={isSavingPhoto || !photoUrlInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
                >
                  {isSavingPhoto ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan ke Server & Drive...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Foto Pegawai</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive & Spreadsheet Column AD Sync Modal */}
      <GoogleDriveSyncModal
        isOpen={isDriveSyncModalOpen}
        onClose={() => setIsDriveSyncModalOpen(false)}
        staffName={lastSavedInfo?.staffName}
        staffNip={lastSavedInfo?.staffNip}
        lastSavedPhotoUrl={lastSavedInfo?.photoUrl}
        lastSavedDriveUrl={lastSavedInfo?.driveUrl}
        lastUpdatedRow={lastSavedInfo?.updatedRow}
      />

      {/* PDF Generation Toast Notification */}
      {pdfToast && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#0B2559] text-white text-xs font-bold rounded-xl shadow-2xl border border-blue-400/30 animate-in slide-in-from-bottom-5">
          {isGeneratingPdf ? (
            <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400" />
          )}
          <span>{pdfToast}</span>
        </div>
      )}

      {/* Save Photo Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-2xl border border-emerald-500/40 animate-in slide-in-from-bottom-5">
          <div className="p-1.5 bg-emerald-600 text-white rounded-lg shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-emerald-400">
              Foto Berhasil Disimpan di Server Cloud!
            </div>
            <div className="text-[11px] text-slate-300">
              {lastSavedInfo?.updatedRow && lastSavedInfo.updatedRow > 0
                ? `Tersinkron ke Spreadsheet Kolom AD baris ${lastSavedInfo.updatedRow}`
                : 'Foto permanen di semua browser. Klik untuk detail Kolom AD.'}
            </div>
          </div>
          <button
            onClick={() => setIsDriveSyncModalOpen(true)}
            className="ml-2 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded text-[11px] transition-colors shrink-0"
          >
            Buka Kolom AD
          </button>
        </div>
      )}
    </div>
  );
};
