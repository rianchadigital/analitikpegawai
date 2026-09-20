import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  FileSpreadsheet,
  Check,
  Copy,
  ExternalLink,
  Code,
  ShieldCheck,
  X,
  Sparkles,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import {
  GOOGLE_DRIVE_FOTO_FOLDER_URL,
  SPREADSHEET_URL,
  SPREADSHEET_FOTO_COLUMN,
  APPS_SCRIPT_CODE_TEMPLATE,
  getAppsScriptUrl,
  saveAppsScriptUrl
} from '../../utils/googleDriveHelper';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffName?: string;
  staffNip?: string;
  lastSavedPhotoUrl?: string;
  lastSavedDriveUrl?: string;
  lastUpdatedRow?: number;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  staffName,
  staffNip,
  lastSavedPhotoUrl,
  lastSavedDriveUrl,
  lastUpdatedRow
}) => {
  const [appsScriptUrlInput, setAppsScriptUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'code'>('status');

  useEffect(() => {
    if (isOpen) {
      getAppsScriptUrl().then((url) => setAppsScriptUrlInput(url));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = async () => {
    setIsSaving(true);
    const ok = await saveAppsScriptUrl(appsScriptUrlInput);
    setIsSaving(false);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE_TEMPLATE);
    setIsCopiedCode(true);
    setTimeout(() => setIsCopiedCode(false), 2500);
  };

  const handleCopyPhotoLink = () => {
    const link = lastSavedDriveUrl || lastSavedPhotoUrl || '';
    if (link) {
      navigator.clipboard.writeText(link);
      setIsCopiedLink(true);
      setTimeout(() => setIsCopiedLink(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-linear-to-r from-[#0B2559] to-[#006D77] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <FolderOpen className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">Integrasi Google Drive & Spreadsheet Kolom AD</h3>
              <p className="text-xs text-blue-100">
                Otomasi simpan foto ke Google Drive dan catat link di Kolom AD (FOTO) Spreadsheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'status'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Status & Link Terkini
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'code'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Kode Otomasi Apps Script (1 Menit)</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {activeTab === 'status' ? (
            <>
              {/* Hasil Simpan Terakhir */}
              {(lastSavedPhotoUrl || staffName) && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-emerald-900">
                        Foto {staffName ? `"${staffName}"` : 'Pegawai'} Berhasil Disimpan di Server!
                      </span>
                    </div>
                    {lastUpdatedRow && lastUpdatedRow > 0 && (
                      <span className="px-2 py-0.5 bg-emerald-200/60 text-emerald-800 rounded font-semibold text-[10px]">
                        Tercatat di Baris {lastUpdatedRow}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Foto telah tersimpan di cloud server dan dapat dibuka oleh siapa saja di browser manapun.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      readOnly
                      value={lastSavedDriveUrl || lastSavedPhotoUrl || ''}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-emerald-300 rounded font-mono text-[11px] text-slate-800 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPhotoLink}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded transition-colors"
                    >
                      {isCopiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopiedLink ? 'Tersalin' : 'Salin Link'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Status Integrasi Dua Arah */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Google Drive Card */}
                <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <FolderOpen className="w-4 h-4 text-blue-600" />
                      Folder Google Drive Resmi
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                      Siap Digunakan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mb-2">
                    Semua pasfoto pegawai disimpan di folder Google Drive Puskesmas Kepulauan Seribu Selatan.
                  </p>
                  <a
                    href={GOOGLE_DRIVE_FOTO_FOLDER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline"
                  >
                    <span>Buka Folder Google Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Google Spreadsheet Card */}
                <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                      Google Sheet Uraian (Kolom AD)
                    </span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                      Kolom 30 (FOTO)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mb-2">
                    Setiap link foto yang tercatat pada Kolom AD akan otomatis dimuat di kartu uraian dan bagan struktur.
                  </p>
                  <a
                    href={SPREADSHEET_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:underline"
                  >
                    <span>Buka Spreadsheet Kolom AD</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Pengaturan Apps Script Webhook URL */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">URL Google Apps Script Web App (Opsi Otomatis)</h4>
                    <p className="text-[11px] text-slate-500">
                      Jika Anda telah menerapkan kode Apps Script pada spreadsheet, masukkan URL-nya di sini agar saat tombol "Simpan Foto" diklik, file otomatis terkirim ke Google Drive dan link langsung ditulis ke Kolom AD.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={appsScriptUrlInput}
                    onChange={(e) => setAppsScriptUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>Simpan Koneksi</span>
                  </button>
                </div>

                {saveSuccess && (
                  <p className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Koneksi Google Apps Script berhasil disimpan dan aktif!
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    Belum punya URL Apps Script? Buka tab "Kode Otomasi Apps Script" untuk menyalin script 1 menit.
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('code')}
                    className="text-[11px] font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Lihat Cara Pasang</span>
                    <Sparkles className="w-3 h-3 text-amber-500" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* TAB KODE APPS SCRIPT */
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                <h4 className="font-bold text-blue-900">Langkah Memasang Skrip Otomasi (1 Menit):</h4>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-800">
                  <li>
                    Buka Spreadsheet Uraian Tugas Anda:{' '}
                    <a href={SPREADSHEET_URL} target="_blank" rel="noopener noreferrer" className="underline font-bold">
                      Klik di sini untuk membuka Spreadsheet
                    </a>
                  </li>
                  <li>
                    Di menu atas Google Spreadsheet, klik <strong>Ekstensi</strong> &gt; <strong>Apps Script</strong>.
                  </li>
                  <li>
                    Hapus kode default di editor, lalu klik tombol <strong>"Salin Kode Script"</strong> di bawah dan tempelkan.
                  </li>
                  <li>
                    Klik <strong>Deploy (Terapkan)</strong> &gt; <strong>New deployment (Deployment baru)</strong>.
                  </li>
                  <li>
                    Pilih jenis <strong>Web app</strong>, setel <em>Who has access</em> ke <strong>Anyone (Siapa saja)</strong>, lalu klik <strong>Deploy</strong>.
                  </li>
                  <li>
                    Salin <strong>Web App URL</strong> yang dihasilkan (berakhiran <code>/exec</code>) dan simpan di tab Status pada aplikasi ini.
                  </li>
                </ol>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-slate-300 rounded-t-xl text-xs font-mono">
                  <span>GoogleAppsScript_DriveAndSheet.js</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-sans font-bold text-xs transition-colors"
                  >
                    {isCopiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopiedCode ? 'Kode Tersalin!' : 'Salin Kode Script'}</span>
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-b-xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-72">
                  {APPS_SCRIPT_CODE_TEMPLATE}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Kolom Spreadsheet: <strong>AD (Kolom 30 - FOTO)</strong> • Folder Drive: <code>1zKpxWC7zsKx...</code>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 bg-white border border-slate-300 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
