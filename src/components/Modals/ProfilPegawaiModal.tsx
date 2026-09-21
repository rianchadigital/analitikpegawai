import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Share2, 
  Check, 
  Camera, 
  User, 
  QrCode as QrCodeIcon,
  Loader2,
  AlertCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { RowData } from '../../types/sheet';
import { LogoDkiJakarta, LogoPuskesmas, DRIVE_FOLDER_URL } from '../common/Logos';

export const DRIVE_LOGO_KESEHATAN_ID = '1ug3olhhWiIbAwqGjwaqrh1tcjEow_SLD';

interface ProfilPegawaiModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: RowData | null;
  onUpdateEmployee?: (rowId: string, updatedFields: Partial<RowData>) => void;
}

export const ProfilPegawaiModal: React.FC<ProfilPegawaiModalProps> = ({
  isOpen,
  onClose,
  employee,
  onUpdateEmployee
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [customPhoto, setCustomPhoto] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dkiLogoSrc, setDkiLogoSrc] = useState<string>('/images/logo-dki.png');
  const [puskesmasLogoSrc, setPuskesmasLogoSrc] = useState<string>('/images/logo-puskesmas.svg');

  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Preload logo asli dari folder Google Drive sebagai Base64 agar cetak PDF 100% tajam, instan dan bebas CORS
    const loadAsBase64 = async (url: string, setter: (val: string) => void) => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              setter(reader.result);
            }
          };
          reader.readAsDataURL(blob);
        }
      } catch (e) {
        console.warn('Fallback direct url:', url, e);
      }
    };

    loadAsBase64('/images/logo-dki.png', setDkiLogoSrc);
    loadAsBase64('/images/logo-puskesmas.svg', setPuskesmasLogoSrc);
  }, []);

  useEffect(() => {
    if (!employee) return;
    setErrorMessage(null);
    setDownloadSuccess(false);
    setPdfDownloadUrl(null);

    // Resolve photo if stored in localStorage
    const savedPhoto = localStorage.getItem(`profil_photo_${employee._id}`);
    if (savedPhoto) {
      setCustomPhoto(savedPhoto);
    } else if (employee.foto_url) {
      setCustomPhoto(employee.foto_url);
    } else {
      setCustomPhoto('');
    }

    // Generate real verification QR code
    const verificationUrl = `https://analitikpegawai.puskesmasseribuselatan.com/profil?nip=${encodeURIComponent(employee.nip || '')}&nik=${encodeURIComponent(employee.nik || '')}&nama=${encodeURIComponent(employee.nama || '')}`;
    QRCode.toDataURL(verificationUrl, {
      width: 140,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Gagal membuat QR Code:', err));
  }, [employee]);

  if (!isOpen || !employee) return null;

  // STRICT REAL SPREADSHEET DATA ONLY
  const namaLengkap = (employee.nama_gelar || employee.nama || '-').toUpperCase();
  const nip = employee.nip || '-';
  const nik = employee.nik || '-';
  const nrk = employee.nrk || '-';
  const statusPegawai = employee.status_kepegawaian || '-';
  const golongan = employee.gol || '-';
  const jabatan = employee.jabatan || '-';
  const rumpunJabatan = employee.rumpun_jabatan || '-';
  const jenisTenaga = employee.jenis_tenaga || '-';
  const tempatTugas = employee.tempat_tugas || 'Puskesmas Kepulauan Seribu Selatan';

  const tempatLahir = employee.tempat_lahir || '-';
  const tglLahir = employee.tanggal_lahir || '-';
  const usia = employee.usia_tahun || employee.usia ? `${employee.usia_tahun || employee.usia} Tahun` : '-';
  const ttl = `${tempatLahir}, ${tglLahir} (${usia})`;

  const jenisKelamin = employee.jenis_kelamin || '-';
  const agama = employee.agama || '-';

  // Alamat Lengkap dari Spreadsheet
  const alamatLengkap = [
    employee.alamat,
    employee.kelurahan ? `Kel. ${employee.kelurahan}` : '',
    employee.kecamatan ? `Kec. ${employee.kecamatan}` : '',
    employee.kab_kota,
    employee.provinsi
  ].filter(Boolean).join(', ') || '-';

  const noHp = employee.nomor_hp || '-';
  const email = employee.email || '-';

  // Data Kepegawaian dari Spreadsheet
  const tmtMulai = employee.tmt_mulai || '-';
  const masaKerja = employee.masa_kerja || (employee.masa_kerja_tahun ? `${employee.masa_kerja_tahun} Tahun` : '-');
  const tglPensiun = employee.tanggal_pensiun || '-';
  const sisaPensiun = employee.sisa_pensiun || (employee.sisa_pensiun_tahun ? `${employee.sisa_pensiun_tahun} Tahun` : '-');

  // Legalitas STR & SIP dari Spreadsheet
  const noStr = employee.no_str || '-';
  const masaStr = employee.masa_berlaku_str || employee.status_str || '-';
  const strDisplay = noStr !== '-' ? `${noStr} (${masaStr})` : (employee.status_str || '-');

  const noSip = employee.no_sip || '-';
  const masaSip = employee.masa_berlaku_sip || employee.status_sip || '-';
  const sipDisplay = noSip !== '-' ? `${noSip} (${masaSip})` : (employee.status_sip || '-');

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomPhoto(dataUrl);
      localStorage.setItem(`profil_photo_${employee._id}`, dataUrl);
      if (onUpdateEmployee) {
        onUpdateEmployee(employee._id, { foto_url: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  // PDF Generator with High Resolution
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPdf(true);
    setErrorMessage(null);
    setDownloadSuccess(false);

    try {
      const sourceEl = printAreaRef.current;

      const canvas = await html2canvas(sourceEl, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const hiddenElements = clonedDoc.querySelectorAll('.no-print');
          hiddenElements.forEach((el) => {
            (el as HTMLElement).style.display = 'none';
          });
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 8;
      const availableWidth = pdfWidth - margin * 2;
      const availableHeight = pdfHeight - margin * 2;

      const imgRatio = canvas.width / canvas.height;
      let renderWidth = availableWidth;
      let renderHeight = renderWidth / imgRatio;

      if (renderHeight > availableHeight) {
        renderHeight = availableHeight;
        renderWidth = renderHeight * imgRatio;
      }

      const posX = margin + (availableWidth - renderWidth) / 2;
      const posY = margin;

      pdf.addImage(imgData, 'JPEG', posX, posY, renderWidth, renderHeight);

      const safeName = (employee.nama || 'Pegawai').replace(/[^a-zA-Z0-9]/g, '_');
      const safeNip = (employee.nip || '').replace(/[^0-9]/g, '');
      const filename = `PROFIL_PEGAWAI_${safeName}_${safeNip || 'PKM_KSS'}.pdf`;

      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPdfDownloadUrl(blobUrl);

      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      try {
        pdf.save(filename);
      } catch (err) {
        console.warn('Fallback standard save:', err);
      }

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (error: any) {
      console.error('Gagal mengekspor PDF:', error);
      setErrorMessage(
        'Pembuatan PDF terkendala perizinan browser. Anda dapat menggunakan tombol "Print Langsung".'
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDirectPrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = `PROFIL PEGAWAI PUSKESMAS KEPULAUAN SERIBU SELATAN
Nama: ${namaLengkap}
NIP: ${nip} | NRK: ${nrk} | NIK: ${nik}
Status: ${statusPegawai} (Gol: ${golongan})
Jabatan: ${jabatan} (${rumpunJabatan})
Jenis Tenaga: ${jenisTenaga}
Tempat Tugas: ${tempatTugas}
TTL: ${ttl}
Gender: ${jenisKelamin} | Agama: ${agama}
Alamat: ${alamatLengkap}
Kontak: ${noHp} | ${email}
Pendidikan: ${employee.pendidikan || '-'} - ${employee.sekolah_pt || '-'} (${employee.tahun_lulus || '-'})
Masa Kerja: ${masaKerja} (TMT: ${tmtMulai})
Sisa Pensiun: ${sisaPensiun} (Pensiun: ${tglPensiun})
STR: ${strDisplay}
SIP: ${sipDisplay}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col my-auto max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Control Bar (Hidden on Print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Profil Resmi Pegawai</span>
                <span className="text-[11px] font-normal text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  Data Sesuai Master Spreadsheet
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Puskesmas Kepulauan Seribu Selatan</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Salin ringkasan data teks"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>

            <button
              onClick={handleDirectPrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Cetak langsung menggunakan dialog printer browser"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Langsung</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Unduh dokumen profil pegawai dalam format PDF A4 siap cetak"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Cetak PDF</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success / Error Notification Bar */}
        {downloadSuccess && (
          <div className="bg-emerald-600 text-white px-5 py-2 text-xs font-bold flex items-center justify-between shrink-0 animate-in fade-in">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>✓ Dokumen PDF Berhasil Dibuat dan Diunduh!</span>
            </span>
            {pdfDownloadUrl && (
              <a
                href={pdfDownloadUrl}
                download={`PROFIL_${namaLengkap}.pdf`}
                className="underline text-white hover:text-emerald-100 text-xs font-semibold"
              >
                Unduh ulang
              </a>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-600 text-white px-5 py-2 text-xs font-medium flex items-center justify-between shrink-0 animate-in fade-in">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </span>
            <button
              onClick={handleDirectPrint}
              className="px-2.5 py-1 bg-white text-rose-700 font-bold rounded text-xs ml-2 hover:bg-rose-50"
            >
              Print Browser
            </button>
          </div>
        )}

        {/* Modal Scrollable Container */}
        <div className="overflow-y-auto flex-1 p-4 md:p-6 bg-slate-100/70 flex justify-center print:p-0 print:bg-white">
          {/* Printable Document A4 Canvas */}
          <div 
            ref={printAreaRef}
            id="cetak-profil-pegawai-a4"
            className="w-full max-w-[740px] bg-white text-slate-900 p-6 md:p-8 shadow-md border border-slate-200/90 rounded-xl print:shadow-none print:border-none print:p-4 print:max-w-none"
            style={{ minHeight: '980px', fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            {/* KOP RESMI PEMERINTAH PROVINSI DKI JAKARTA (Persis Dokumen DUK & Format Resmi) */}
            <div className="border-b-[3px] border-black pb-2 mb-0.5">
              <div className="flex items-center justify-between gap-4">
                {/* Logo Jaya Raya Kiri (Sesuai Link Drive Resmi) */}
                <div className="w-20 md:w-24 flex-shrink-0 flex items-center justify-center">
                  <LogoDkiJakarta 
                    src={dkiLogoSrc} 
                    className="w-16 h-20 md:w-20 md:h-24" 
                  />
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
                    Email / Pos-el: <span className="text-blue-700 font-medium">puskesmasseribuselatan.jakarta.go.id</span> • JAKARTA
                  </p>
                </div>

                {/* Logo Puskesmas Kanan (Sesuai Link Drive Resmi) */}
                <div className="w-20 md:w-24 flex-shrink-0 flex items-center justify-center">
                  <LogoPuskesmas 
                    src={puskesmasLogoSrc} 
                    className="w-16 h-20 md:w-20 md:h-24" 
                  />
                </div>
              </div>
            </div>
            {/* Garis Ganda Tipis Bawah Kop Surat */}
            <div className="border-b border-black mb-4"></div>

            {/* JUDUL DOKUMEN RESMI */}
            <div className="text-center mb-5">
              <h2 className="text-base md:text-lg font-extrabold tracking-wide uppercase text-slate-950 underline underline-offset-4 decoration-slate-400">
                PROFIL PEGAWAI
              </h2>
              <p className="text-xs font-bold text-slate-700 uppercase mt-1 tracking-wider">
                PUSKESMAS KEPULAUAN SERIBU SELATAN
              </p>
            </div>

            {/* Content Body: Pas Foto + Rincian Pegawai (100% Data Riil Spreadsheet) */}
            <div className="pt-2 pb-3 grid grid-cols-12 gap-5 items-start">
              {/* Kolom Kiri: Pas Foto Pegawai Berlatar Belakang Merah */}
              <div className="col-span-12 sm:col-span-4 flex flex-col items-center justify-center pt-2">
                <div className="relative group">
                  <div className="w-36 h-36 md:w-40 md:h-40 rounded-full overflow-hidden bg-red-600 border-2 border-red-700 shadow-md flex items-center justify-center relative">
                    {customPhoto ? (
                      <img 
                        src={customPhoto} 
                        alt={namaLengkap} 
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white bg-red-600">
                        <User className="w-20 h-20 text-white/95 stroke-[1.5]" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider mt-1 bg-black/25 px-2 py-0.5 rounded-full">
                          Foto Resmi
                        </span>
                      </div>
                    )}
                  </div>

                  <label 
                    className="no-print absolute bottom-1 right-1 w-8 h-8 rounded-full bg-slate-900 hover:bg-emerald-600 text-white flex items-center justify-center cursor-pointer shadow-lg transition-colors"
                    title="Klik untuk ganti pas foto pegawai"
                  >
                    <Camera className="w-4 h-4" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handlePhotoUpload} 
                    />
                  </label>
                </div>

                <span className="no-print text-[10px] text-slate-400 mt-2 text-center">
                  Pas Foto Resmi
                </span>
              </div>

              {/* Kolom Kanan: Tabel Rincian Data Penting (Hanya Data Spreadsheet) */}
              <div className="col-span-12 sm:col-span-8">
                <table className="w-full text-xs text-slate-800 border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="py-1.5 font-semibold text-slate-900 w-36 whitespace-nowrap">Nama Lengkap & Gelar</td>
                      <td className="py-1.5 w-3 text-center">:</td>
                      <td className="py-1.5 font-bold text-slate-950 uppercase">{namaLengkap}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="py-1.5 font-semibold text-slate-900 whitespace-nowrap">NIP</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 font-mono font-bold text-slate-900">{nip}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="py-1.5 font-semibold text-slate-900 whitespace-nowrap">NIK / NRK</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 font-mono text-slate-900">{nik} / {nrk}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="py-1.5 font-semibold text-slate-900 whitespace-nowrap">Status Kepegawaian</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 font-bold text-slate-900">
                        {statusPegawai} {golongan !== '-' ? `(Gol. ${golongan})` : ''}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="py-1.5 font-semibold text-slate-900 whitespace-nowrap">Jabatan</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 text-slate-900">{jabatan}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="py-1.5 font-semibold text-slate-900 whitespace-nowrap">Rumpun Jabatan</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 text-slate-900">{rumpunJabatan}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="py-1.5 font-semibold text-slate-900 whitespace-nowrap">Jenis Tenaga</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 text-slate-900">{jenisTenaga}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="py-1.5 font-semibold text-slate-900 whitespace-nowrap">Tempat Tugas</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 text-slate-900">{tempatTugas}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="py-1.5 font-semibold text-slate-900 whitespace-nowrap">Tempat, Tgl Lahir</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 text-slate-900">{ttl}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="py-1.5 font-semibold text-slate-900 whitespace-nowrap">Jenis Kelamin / Agama</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 text-slate-900">{jenisKelamin} / {agama}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="py-1.5 font-semibold text-slate-900 align-top whitespace-nowrap">Alamat Domisili</td>
                      <td className="py-1.5 text-center align-top">:</td>
                      <td className="py-1.5 text-slate-900 leading-snug">{alamatLengkap}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="py-1.5 font-semibold text-slate-900 whitespace-nowrap">Kontak HP / Email</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 text-slate-900">{noHp} / {email}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="py-1.5 font-semibold text-slate-900 whitespace-nowrap">No. STR (Masa Aktif)</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 text-slate-900 font-mono">{strDisplay}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="py-1.5 font-semibold text-slate-900 whitespace-nowrap">No. SIP (Masa Aktif)</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 text-slate-900 font-mono">{sipDisplay}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 1: RIWAYAT PENDIDIKAN (Data Asli dari Spreadsheet) */}
            <div className="mt-5">
              <h3 className="text-xs md:text-sm font-bold text-blue-700 uppercase tracking-wide mb-1.5">
                RIWAYAT PENDIDIKAN
              </h3>
              <table className="w-full text-[11px] md:text-xs text-slate-800 border-collapse border-b border-slate-900">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-left font-bold text-slate-900">
                    <th className="py-1.5 w-24">Jenjang</th>
                    <th className="py-1.5 w-40">Rumpun / Jurusan</th>
                    <th className="py-1.5 w-24">Tahun Lulus</th>
                    <th className="py-1.5">Sekolah / Perguruan Tinggi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-slate-800">
                    <td className="py-1.5 font-semibold">{employee.pendidikan || '-'}</td>
                    <td className="py-1.5">{employee.rumpun_jabatan || '-'}</td>
                    <td className="py-1.5 font-mono">{employee.tahun_lulus || '-'}</td>
                    <td className="py-1.5 font-medium">{employee.sekolah_pt || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 2: RIWAYAT KEPEGAWAIAN & MASA KERJA (Data Asli dari Spreadsheet) */}
            <div className="mt-5">
              <h3 className="text-xs md:text-sm font-bold text-blue-700 uppercase tracking-wide mb-1.5">
                RIWAYAT MASA KERJA & PROYEKSI PENSIUN
              </h3>
              <table className="w-full text-[11px] md:text-xs text-slate-800 border-collapse border-b border-slate-900">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-left font-bold text-slate-900">
                    <th className="py-1.5 w-32">TMT Mulai Kerja</th>
                    <th className="py-1.5 w-32">Masa Kerja</th>
                    <th className="py-1.5 w-36">Tanggal Pensiun</th>
                    <th className="py-1.5">Sisa Masa Kerja Pensiun</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-slate-800">
                    <td className="py-1.5 font-mono">{tmtMulai}</td>
                    <td className="py-1.5 font-semibold">{masaKerja}</td>
                    <td className="py-1.5 font-mono">{tglPensiun}</td>
                    <td className="py-1.5 font-medium">{sisaPensiun}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer Bagian Bawah: Validasi Resmi & QR Code */}
            <div className="mt-8 pt-4 flex items-end justify-between border-t border-slate-200">
              <div className="text-[10px] text-slate-500 max-w-sm space-y-0.5">
                <p className="font-semibold text-slate-700">PUSKESMAS KEPULAUAN SERIBU SELATAN</p>
                <p>Dokumen ringkasan profil kepegawaian resmi bersumber dari Master Spreadsheet SDMK.</p>
                <p className="font-mono text-slate-400">
                  Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center shrink-0">
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code Validasi Pegawai" 
                    className="w-20 h-20 md:w-22 md:h-22 object-contain"
                  />
                ) : (
                  <div className="w-20 h-20 bg-slate-100 border border-slate-300 flex items-center justify-center">
                    <QrCodeIcon className="w-10 h-10 text-slate-400" />
                  </div>
                )}
                <span className="text-[10px] text-slate-600 font-sans mt-1 text-center font-medium">
                  Scan untuk Validasi
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden on Print) */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span>NIP: <code className="font-mono text-slate-800 font-bold">{employee.nip || employee._id}</code></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDirectPrint}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Langsung</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Cetak PDF</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
