import React, { useState } from 'react';
import { RowData } from '../../types/sheet';
import { 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Edit3, 
  ArrowLeft, 
  Share2, 
  CheckCircle2, 
  UserCheck, 
  Building2, 
  Briefcase,
  Layers,
  FileText,
  Camera,
  Upload,
  FolderOpen,
  ExternalLink,
  X,
  Save,
  Check,
  Loader2
} from 'lucide-react';
import { 
  convertGoogleDriveUrl, 
  GOOGLE_DRIVE_FOTO_FOLDER_URL, 
  fileToBase64,
  savePhotoToServer 
} from '../../utils/googleDriveHelper';
import { printElementById, openPdfInNewTabAndDownload } from '../../utils/printEngine';
import { GoogleDriveSyncModal } from '../common/GoogleDriveSyncModal';

interface KartuUraianTugasProps {
  rows: RowData[];
  selectedRowId?: string;
  onSelectRowId?: (id: string) => void;
  onBackToTable?: () => void;
  onEditRow?: (row: RowData) => void;
  onOpenBatchPrint?: () => void;
  onUpdateStaffPhoto?: (staffId: string, photoUrl: string) => void;
}

export const KartuUraianTugas: React.FC<KartuUraianTugasProps> = ({
  rows,
  selectedRowId,
  onSelectRowId,
  onBackToTable,
  onEditRow,
  onOpenBatchPrint,
  onUpdateStaffPhoto
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoInput, setPhotoInput] = useState('');
  const [saveToast, setSaveToast] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfToast, setPdfToast] = useState<string | null>(null);
  const [isDriveSyncModalOpen, setIsDriveSyncModalOpen] = useState(false);
  const [lastSavedInfo, setLastSavedInfo] = useState<{
    photoUrl: string;
    fullPhotoUrl?: string;
    driveUrl?: string;
    updatedRow?: number;
    staffName?: string;
    staffNip?: string;
  } | null>(null);

  // Find active employee or default to first
  const currentIndex = Math.max(0, rows.findIndex(r => r._id === selectedRowId));
  const activeStaff = rows[currentIndex] || rows[0];

  const handlePrev = () => {
    if (currentIndex > 0 && onSelectRowId) {
      onSelectRowId(rows[currentIndex - 1]._id);
    }
  };

  const handleNext = () => {
    if (currentIndex < rows.length - 1 && onSelectRowId) {
      onSelectRowId(rows[currentIndex + 1]._id);
    }
  };

  const handlePrint = async () => {
    if (!activeStaff) return;
    setIsExportingPdf(true);
    setPdfToast('Membuka Tab Baru & Menyiapkan Dokumen PDF...');

    // Langsung buka window/tab baru saat gestur klik user agar tidak terblokir sandbox/popup-blocker
    let newTabWindow: Window | null = null;
    try {
      newTabWindow = window.open('about:blank', '_blank');
    } catch (e) {
      console.warn('Popup blocker mencegah pembukaan tab otomatis:', e);
      newTabWindow = null;
    }

    const cleanStaffName = (activeStaff.nama || 'Pegawai')
      .replace(/[^a-zA-Z0-9_\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    const filename = `Kartu_Uraian_Tugas_${cleanStaffName}.pdf`;
    const title = `Kartu Uraian Tugas - ${activeStaff.nama}`;

    try {
      const success = await openPdfInNewTabAndDownload('official-kartu-uraian-paper', {
        filename,
        title,
        orientation: 'portrait',
        backgroundColor: '#ffffff',
        targetWindow: newTabWindow
      });

      setIsExportingPdf(false);
      if (success) {
        setPdfToast('Dokumen PDF berhasil dibuka di Tab Baru & diunduh!');
        setTimeout(() => setPdfToast(null), 4000);
      } else {
        setPdfToast('Membuka dialog cetak browser...');
        await printElementById('official-kartu-uraian-paper', {
          title,
          orientation: 'portrait'
        });
        setTimeout(() => setPdfToast(null), 3000);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      setIsExportingPdf(false);
      setPdfToast('Membuka dialog cetak browser (Ctrl+P)...');
      await printElementById('official-kartu-uraian-paper', {
        title,
        orientation: 'portrait'
      });
      setTimeout(() => setPdfToast(null), 3000);
    }
  };

  const handleOpenPhotoModal = () => {
    setPhotoInput(activeStaff?.foto || '');
    setIsPhotoModalOpen(true);
  };

  const handleSavePhotoModal = async () => {
    if (!activeStaff) return;
    setIsSavingPhoto(true);

    const saveResult = await savePhotoToServer(
      activeStaff._id,
      photoInput,
      String(activeStaff.nip || ''),
      String(activeStaff.nama || '')
    );

    const finalUrl = saveResult.photoUrl || convertGoogleDriveUrl(photoInput);
    if (onUpdateStaffPhoto) {
      onUpdateStaffPhoto(activeStaff._id, finalUrl);
    } else {
      activeStaff.foto = finalUrl;
    }

    setLastSavedInfo({
      photoUrl: finalUrl,
      fullPhotoUrl: saveResult.fullPhotoUrl,
      driveUrl: saveResult.driveUrl,
      updatedRow: saveResult.updatedRow,
      staffName: activeStaff.nama,
      staffNip: activeStaff.nip
    });

    setIsSavingPhoto(false);
    setIsPhotoModalOpen(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 5000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setPhotoInput(base64);
      } catch (err) {
        console.error('Gagal membaca file foto:', err);
      }
    }
  };

  const handleCopySummary = () => {
    if (!activeStaff) return;
    const text = `URAIAN TUGAS PEGAWAI
PUSKESMAS KEPULAUAN SERIBU SELATAN
----------------------------------------
Nama: ${activeStaff.nama}
NIP: ${activeStaff.nip || '-'}
Jabatan: ${activeStaff.jabatan || '-'}
Tempat Tugas: ${activeStaff.tempat_tugas || '-'}

IKHTISAR JABATAN:
${activeStaff.ikhtisar_jabatan || '-'}

TUGAS POKOK:
1. ${activeStaff.tugas_pokok_1 || '-'}
2. ${activeStaff.tugas_pokok_2 || '-'}
3. ${activeStaff.tugas_pokok_3 || '-'}
4. ${activeStaff.tugas_pokok_4 || '-'}
5. ${activeStaff.tugas_pokok_5 || '-'}
6. ${activeStaff.tugas_pokok_6 || '-'}
7. ${activeStaff.tugas_pokok_7 || '-'}
8. ${activeStaff.tugas_pokok_8 || '-'}
9. ${activeStaff.tugas_pokok_9 || '-'}
10. ${activeStaff.tugas_pokok_10 || '-'}

TUGAS TAMBAHAN:
1. ${activeStaff.tugas_tambahan_1 || '-'}
2. ${activeStaff.tugas_tambahan_2 || '-'}
3. ${activeStaff.tugas_tambahan_3 || '-'}
4. ${activeStaff.tugas_tambahan_4 || '-'}
5. ${activeStaff.tugas_tambahan_5 || '-'}`;

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Filter staff list for quick selector
  const filteredList = rows.filter(r => {
    const q = searchTerm.toLowerCase();
    const nama = String(r.nama || '').toLowerCase();
    const nip = String(r.nip || '').toLowerCase();
    const jab = String(r.jabatan || '').toLowerCase();
    return nama.includes(q) || nip.includes(q) || jab.includes(q);
  });

  if (!activeStaff) {
    return (
      <div className="p-8 text-center text-slate-500">
        Data uraian tugas pegawai tidak tersedia.
      </div>
    );
  }

  // Count filled tasks
  const filledPokok = [1,2,3,4,5,6,7,8,9,10].filter(i => activeStaff[`tugas_pokok_${i}`]?.toString().trim()).length;
  const filledTambahan = [1,2,3,4,5].filter(i => activeStaff[`tugas_tambahan_${i}`]?.toString().trim()).length;

  return (
    <div className="space-y-6">
      {/* Control Bar (Hidden in Print) */}
      <div className="print:hidden bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Back button & Title */}
          <div className="flex items-center gap-3">
            {onBackToTable && (
              <button
                id="btn-back-uraian-table"
                onClick={onBackToTable}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Kembali ke Tabel Pengelolaan Data"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Tabel</span>
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Kartu Uraian Tugas Pegawai
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  Format Standar Resmi Puskesmas
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pratinjau fisik A4 resmi sesuai template SK/Penugasan Puskesmas Kepulauan Seribu Selatan
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {onOpenBatchPrint && (
              <button
                id="btn-batch-print-uraian"
                onClick={onOpenBatchPrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
                title="Cetak Semua Kartu Pegawai atau Per Unit"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-700" />
                <span>Cetak Massal (Batch)</span>
              </button>
            )}

            <button
              id="btn-copy-uraian"
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
              title="Salin Rangkuman Uraian Tugas ke Clipboard"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{copiedNotification ? 'Tersalin!' : 'Salin Teks'}</span>
            </button>

            {onEditRow && (
              <button
                id="btn-edit-staff-uraian"
                onClick={() => onEditRow(activeStaff)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                title="Edit Rincian Tugas Pegawai Ini"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Tugas</span>
              </button>
            )}

            <button
              id="btn-upload-photo-uraian-bar"
              onClick={handleOpenPhotoModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
              title="Unggah atau Ganti Foto Pegawai (Google Drive / Perangkat)"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-700" />
              <span>Upload Foto</span>
            </button>

            <button
              id="btn-print-uraian-single"
              onClick={handlePrint}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg shadow-xs transition-colors"
              title="Cetak atau Simpan PDF (A4 Portrait - Buka di Tab Baru)"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuka Tab PDF...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Cetak Kartu (PDF)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Employee Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              id="btn-prev-staff-uraian"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg border border-slate-200"
              title="Pegawai Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Selector Dropdown with Search */}
            <div className="relative min-w-[280px] sm:min-w-[340px]">
              <select
                id="select-active-staff-uraian"
                value={activeStaff._id}
                onChange={(e) => onSelectRowId && onSelectRowId(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {rows.map((r, idx) => (
                  <option key={r._id} value={r._id}>
                    {idx + 1}. {r.nama} ({r.jabatan}) - {r.nip || 'Non NIP'}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="btn-next-staff-uraian"
              onClick={handleNext}
              disabled={currentIndex === rows.length - 1}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg border border-slate-200"
              title="Pegawai Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="text-xs text-slate-500 font-mono">
              {currentIndex + 1} dari {rows.length} Pegawai
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{filledPokok}/10 Tugas Pokok</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>{filledTambahan}/5 Tugas Tambahan</span>
            </span>
          </div>
        </div>
      </div>

      {/* Official Printed Card Paper Container */}
      <div className="flex justify-center w-full overflow-x-auto pb-12">
        <div 
          id="official-kartu-uraian-paper"
          className="bg-white text-black shadow-lg border border-slate-300 print:border-0 print:shadow-none print:m-0 w-full max-w-[800px] p-6 sm:p-8 font-sans transition-all"
          style={{ minHeight: '1050px' }}
        >
          {/* Exact Master Outer Border Box */}
          <div className="border-[2px] border-black p-4 flex flex-col justify-between" style={{ minHeight: '980px' }}>
            {/* Top Area: Kop, Identity, Table */}
            <div>
              {/* Kop Surat (Header) */}
              <div className="border-b-[2px] border-black pb-3 mb-3">
                <div className="grid grid-cols-[80px_1fr_80px] items-center gap-2">
                  {/* Left Logo: Pemprov DKI Jakarta */}
                  <div className="flex justify-center items-center">
                    <img
                      src="/images/logo-dki.png"
                      alt="Logo Jaya Raya DKI Jakarta"
                      className="w-16 h-16 object-contain"
                      onError={(e) => {
                        // Fallback to svg if png fails
                        (e.target as HTMLImageElement).src = '/images/logo-dki.svg';
                      }}
                    />
                  </div>

                  {/* Center Text: Bold Official Heading */}
                  <div className="text-center">
                    <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-black leading-tight">
                      URAIAN TUGAS PEGAWAI
                    </h1>
                    <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-black leading-tight mt-0.5">
                      PUSKESMAS KEPULAUAN SERIBU SELATAN
                    </h2>
                  </div>

                  {/* Right Logo: Puskesmas */}
                  <div className="flex justify-center items-center">
                    <img
                      src="/images/logo-puskesmas.svg"
                      alt="Logo Puskesmas"
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Identity & Photo Section */}
              <div className="border-b-[2px] border-black pb-3 mb-3">
                <div className="grid grid-cols-[1fr_110px] gap-4 items-start">
                  {/* Left Column: Metadata */}
                  <div className="text-[12px] sm:text-[13px] leading-relaxed space-y-1 text-black">
                    <div className="grid grid-cols-[130px_10px_1fr] items-start">
                      <span className="font-bold">NAMA</span>
                      <span className="font-bold">:</span>
                      <span className="font-bold uppercase">{activeStaff.nama}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-start">
                      <span className="font-bold">NIP</span>
                      <span className="font-bold">:</span>
                      <span>{activeStaff.nip || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-start">
                      <span className="font-bold">JABATAN</span>
                      <span className="font-bold">:</span>
                      <span className="font-semibold">{activeStaff.jabatan || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-start">
                      <span className="font-bold">TEMPAT TUGAS</span>
                      <span className="font-bold">:</span>
                      <span>{activeStaff.tempat_tugas || 'Puskesmas Kepulauan Seribu Selatan'}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-start pt-0.5">
                      <span className="font-bold">IKHTISAR JABATAN</span>
                      <span className="font-bold">:</span>
                      <p className="text-justify leading-snug">
                        {activeStaff.ikhtisar_jabatan || `Mengelola administrasi, perencanaan, pelaksanaan, pemantauan, evaluasi, dan pelaporan sesuai formasi tugas ${activeStaff.jabatan || 'jabatan'} agar pelayanan kesehatan berjalan efektif, efisien, dan sesuai standar yang ditetapkan.`}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Pasfoto Berlatar Merah (Standard ASN) */}
                  <div className="flex flex-col items-center justify-center">
                    <div 
                      className="w-[100px] h-[130px] border border-black bg-red-600 flex flex-col items-center justify-center overflow-hidden shadow-xs relative group"
                      style={{ backgroundColor: '#c8102e' }}
                    >
                      {activeStaff.foto ? (
                        <img 
                          src={activeStaff.foto} 
                          alt={`Pasfoto ${activeStaff.nama}`} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-white p-1 text-center">
                          <div className="w-12 h-12 rounded-full border border-white/60 flex items-center justify-center mb-1 bg-white/20">
                            <UserCheck className="w-7 h-7 text-white" />
                          </div>
                          <span className="text-[9px] font-bold tracking-tight uppercase leading-tight">
                            PASFOTO 3X4
                          </span>
                          <span className="text-[8px] opacity-80 mt-0.5">
                            ASN PUSKESMAS
                          </span>
                        </div>
                      )}

                      {/* Hover Overlay Button to change photo */}
                      <button
                        type="button"
                        onClick={handleOpenPhotoModal}
                        className="absolute inset-0 bg-black/60 hover:bg-black/75 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-1 text-center print:hidden cursor-pointer"
                        title="Klik untuk Upload / Ganti Foto Pegawai"
                      >
                        <Camera className="w-5 h-5 mb-1 text-emerald-300" />
                        <span className="text-[9px] font-bold leading-tight">Ganti Foto</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Section: Tugas Pokok & Tugas Tambahan */}
              <div className="border border-black mb-4">
                {/* 1. TUGAS POKOK BLOCK */}
                <div className="border-b border-black">
                  <table className="w-full border-collapse text-[11px] sm:text-[12px]">
                    <tbody>
                      {/* 10 Rows of Tugas Pokok */}
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num, idx) => {
                        const taskText = activeStaff[`tugas_pokok_${num}`] || '';
                        return (
                          <tr key={`pokok-${num}`} className="border-b border-black last:border-b-0">
                            {/* Left vertical header cell (spans all 10 rows) */}
                            {idx === 0 && (
                              <td 
                                rowSpan={10} 
                                className="w-[125px] sm:w-[140px] border-r border-black font-extrabold uppercase text-center align-middle p-2 tracking-wider bg-slate-50/30"
                              >
                                TUGAS POKOK
                              </td>
                            )}
                            {/* Row Number */}
                            <td className="w-[28px] border-r border-black text-center font-bold align-top p-1">
                              {num}
                            </td>
                            {/* Duty Description */}
                            <td className="p-1 pl-2 align-top leading-snug min-h-[22px]">
                              {taskText}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 2. TUGAS TAMBAHAN BLOCK */}
                <div>
                  <table className="w-full border-collapse text-[11px] sm:text-[12px]">
                    <tbody>
                      {/* 5 Rows of Tugas Tambahan */}
                      {[1, 2, 3, 4, 5].map((num, idx) => {
                        const taskText = activeStaff[`tugas_tambahan_${num}`] || '';
                        return (
                          <tr key={`tambahan-${num}`} className="border-b border-black last:border-b-0">
                            {/* Left vertical header cell (spans all 5 rows) */}
                            {idx === 0 && (
                              <td 
                                rowSpan={5} 
                                className="w-[125px] sm:w-[140px] border-r border-black font-extrabold uppercase text-center align-middle p-2 tracking-wider bg-slate-50/30"
                              >
                                TUGAS TAMBAHAN
                              </td>
                            )}
                            {/* Row Number */}
                            <td className="w-[28px] border-r border-black text-center font-bold align-top p-1">
                              {num}
                            </td>
                            {/* Duty Description */}
                            <td className="p-1 pl-2 align-top leading-snug min-h-[22px]">
                              {taskText}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Bottom Signature Section */}
            <div className="pt-4 border-t-0">
              <div className="grid grid-cols-2 text-[11px] sm:text-[12px] leading-snug">
                {/* Left: Yang Memberi Tugas */}
                <div className="pl-4">
                  <p className="font-normal">Yang Memberi Tugas</p>
                  <p className="font-semibold">
                    {activeStaff.jabatan_pemberi_tugas || 'Kepala Puskesmas Kepulauan Seribu Selatan'}
                  </p>
                  
                  {/* Generous Space for Signature & Cap Puskesmas */}
                  <div className="h-16 sm:h-20 flex items-center">
                    {/* Placeholder space for physical signature or stamp */}
                  </div>

                  <p className="font-extrabold underline text-black">
                    {activeStaff.nama_pemberi_tugas || 'dr. Ignatius Dendy Purnama'}
                  </p>
                  <p className="text-black">
                    NIP. {activeStaff.nip_pemberi_tugas || '198607192014031004'}
                  </p>
                </div>

                {/* Right: Pelaksana Tugas */}
                <div className="text-left pl-8 sm:pl-16">
                  <p className="font-normal">
                    {activeStaff.tanggal_penetapan || 'Jakarta, 03 Mei 2025'}
                  </p>
                  <p className="font-semibold">Pelaksana</p>

                  {/* Generous Space for Signature */}
                  <div className="h-16 sm:h-20 flex items-center">
                    {/* Placeholder space for physical signature */}
                  </div>

                  <p className="font-extrabold underline text-black">
                    {activeStaff.nama}
                  </p>
                  <p className="text-black">
                    NIP {activeStaff.nip || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-semibold border border-emerald-500/40 animate-in fade-in slide-in-from-bottom-3">
          <div className="p-1.5 bg-emerald-600 text-white rounded-lg shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-emerald-400">
              Foto Berhasil Disimpan di Server Cloud & Kartu!
            </div>
            <div className="text-[11px] text-slate-300">
              {lastSavedInfo?.updatedRow && lastSavedInfo.updatedRow > 0
                ? `Tersinkron ke Spreadsheet Kolom AD baris ${lastSavedInfo.updatedRow}`
                : 'Foto permanen dan dapat dilihat dari browser manapun.'}
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

      {/* Google Drive & Spreadsheet Column AD Sync Modal */}
      <GoogleDriveSyncModal
        isOpen={isDriveSyncModalOpen}
        onClose={() => setIsDriveSyncModalOpen(false)}
        staffName={lastSavedInfo?.staffName || activeStaff?.nama}
        staffNip={lastSavedInfo?.staffNip || activeStaff?.nip}
        lastSavedPhotoUrl={lastSavedInfo?.photoUrl || activeStaff?.foto}
        lastSavedDriveUrl={lastSavedInfo?.driveUrl}
        lastUpdatedRow={lastSavedInfo?.updatedRow}
      />

      {/* Modal Upload & Ganti Foto Pegawai */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Upload / Ganti Foto Pegawai</h3>
                  <p className="text-[11px] text-emerald-100 truncate max-w-xs">
                    {activeStaff.nama} ({activeStaff.jabatan})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6 space-y-4">
              {/* Google Drive Official Folder Notice */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-2.5">
                  <FolderOpen className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900 space-y-1">
                    <p className="font-bold">Folder Google Drive Arsip Foto Resmi:</p>
                    <p className="text-[11px] text-blue-700">
                      Foto struktur organisasi dan pegawai tersimpan terpusat di Google Drive resmi Puskesmas Kepulauan Seribu Selatan.
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <a
                        href={GOOGLE_DRIVE_FOTO_FOLDER_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-bold text-blue-700 hover:text-blue-900 underline"
                      >
                        <span>Buka Folder Google Drive Foto</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="text-blue-300">•</span>
                      <button
                        type="button"
                        onClick={() => setIsDriveSyncModalOpen(true)}
                        className="font-bold text-blue-700 hover:text-blue-900 underline inline-flex items-center gap-1"
                      >
                        <span>Sinkron Kolom AD</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Box & Controls */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div
                  className="w-20 h-24 border-2 border-black bg-red-600 flex items-center justify-center overflow-hidden shrink-0 shadow-sm"
                  style={{ backgroundColor: '#c8102e' }}
                >
                  {photoInput ? (
                    <img
                      src={convertGoogleDriveUrl(photoInput)}
                      alt="Pratinjau Foto"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-[10px] text-white font-bold text-center px-1">
                      Pasfoto 3x4
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Upload File Foto dari Komputer / HP:
                    </label>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Pilih File Gambar</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Atau Tempel Tautan Google Drive / URL Foto:
                    </label>
                    <input
                      type="text"
                      placeholder="https://drive.google.com/file/d/..."
                      value={photoInput}
                      onChange={(e) => setPhotoInput(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {photoInput && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setPhotoInput('')}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Hapus Pasfoto Ini
                  </button>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsDriveSyncModalOpen(true)}
                className="text-xs text-blue-700 hover:text-blue-900 font-semibold inline-flex items-center gap-1 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Integrasi Drive & Kolom AD</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(false)}
                  disabled={isSavingPhoto}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSavePhotoModal}
                  disabled={isSavingPhoto || !photoInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-sm transition-colors"
                >
                  {isSavingPhoto ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan ke Cloud...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Foto Pegawai</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifikasi Cetak PDF */}
      {pdfToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700/80 flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center shrink-0">
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <span className="font-semibold text-slate-100">{pdfToast}</span>
        </div>
      )}
    </div>
  );
};
