import React, { useState } from 'react';
import { 
  Table2, 
  BarChart3, 
  Layers, 
  Sparkles, 
  Plus, 
  Upload, 
  Download, 
  RotateCcw, 
  Undo2, 
  Redo2, 
  CheckCircle2, 
  Trash2,
  FileSpreadsheet,
  TrendingUp,
  PieChart,
  RefreshCw,
  ExternalLink,
  Package,
  Server,
  HelpCircle,
  Check,
  X,
  FileText,
  GitBranch
} from 'lucide-react';
import { Sheet, ActiveTab } from '../types/sheet';

interface HeaderProps {
  sheets: Sheet[];
  activeSheetId: string;
  onSelectSheet: (id: string) => void;
  onAddNewSheet: () => void;
  onDeleteSheet: (id: string) => void;
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onOpenImportModal: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onResetDefaults: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  lastSaved: string;
  onSyncGoogleSheet?: () => void;
  isSyncing?: boolean;
  lastSynced?: string;
}

export const Header: React.FC<HeaderProps> = ({
  sheets,
  activeSheetId,
  onSelectSheet,
  onAddNewSheet,
  onDeleteSheet,
  activeTab,
  onChangeTab,
  onOpenImportModal,
  onExportCsv,
  onExportJson,
  onResetDefaults,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  lastSaved,
  onSyncGoogleSheet,
  isSyncing = false,
  lastSynced,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDeployGuide, setShowDeployGuide] = useState(false);
  const activeSheet = sheets.find(s => s.id === activeSheetId);

  const getSheetIcon = (iconName?: string) => {
    switch (iconName) {
      case 'TrendingUp':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'PieChart':
        return <PieChart className="w-4 h-4 text-sky-600" />;
      case 'FileText':
        return <FileText className="w-4 h-4 text-emerald-700" />;
      default:
        return <FileSpreadsheet className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Application Bar */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        {/* Brand & App Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs">
            <Table2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Sheet Analitik
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                Sistem Pengelolaan & BI
              </span>
            </div>
            <p className="text-xs text-slate-700">
              {activeSheet?.description || 'Pengelolaan data tabular dan analitik terintegrasi'}
            </p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 mr-1">
            <button
              id="btn-undo"
              onClick={onUndo}
              disabled={!canUndo}
              title="Urungkan Perubahan (Undo)"
              className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              id="btn-redo"
              onClick={onRedo}
              disabled={!canRedo}
              title="Ulangi Perubahan (Redo)"
              className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Google Sheets Sync Pill */}
          {activeSheet?.id === 'sheet-master-puskesmas' && (
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-800 hidden md:inline">Sheets SDMK Terkoneksi</span>
              {onSyncGoogleSheet && (
                <button
                  onClick={onSyncGoogleSheet}
                  disabled={isSyncing}
                  title="Tarik data terbaru dari Google Sheets SDMK"
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 px-2 py-0.5 rounded shadow-2xs transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkron'}</span>
                </button>
              )}
              <a
                href="https://docs.google.com/spreadsheets/d/1ykpLnIE8305uphJMvXOdPuwb8T_mkQsnw8GOmByLFko/edit?gid=1900197277#gid=1900197277"
                target="_blank"
                rel="noopener noreferrer"
                title="Buka Spreadsheet SDMK di Google Sheets"
                className="text-emerald-700 hover:text-emerald-900 p-0.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {activeSheet?.id === 'sheet-uraian-tugas' && (
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-800 hidden md:inline">Sheets Uraian Tugas Terkoneksi</span>
              {onSyncGoogleSheet && (
                <button
                  onClick={onSyncGoogleSheet}
                  disabled={isSyncing}
                  title="Tarik data terbaru dari Google Sheets Uraian Tugas"
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 px-2 py-0.5 rounded shadow-2xs transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkron'}</span>
                </button>
              )}
              <a
                href="https://docs.google.com/spreadsheets/d/10MGH1h8nirliwFsyICcCghylhARdjCt8ulhKfrng_c0/edit?gid=0#gid=0"
                target="_blank"
                rel="noopener noreferrer"
                title="Buka Spreadsheet Uraian Tugas di Google Sheets"
                className="text-emerald-700 hover:text-emerald-900 p-0.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Auto-saved indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tersimpan {lastSaved}</span>
          </div>

          {/* Import CSV */}
          <button
            id="btn-import-csv"
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Impor CSV</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              id="btn-export-dropdown"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Ekspor Data</span>
            </button>
            {showExportMenu && (
              <div 
                className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 text-xs text-slate-700"
                onClick={() => setShowExportMenu(false)}
              >
                <button
                  onClick={onExportCsv}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span>Unduh Format CSV</span>
                  <span className="text-[10px] text-slate-400 font-mono">.csv</span>
                </button>
                <button
                  onClick={onExportJson}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span>Unduh Format JSON</span>
                  <span className="text-[10px] text-slate-400 font-mono">.json</span>
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <a
                  href="./hostinger_public_html.zip"
                  download="hostinger_public_html.zip"
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-emerald-800 flex items-center justify-between font-semibold"
                >
                  <span className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Paket Hostinger Siap Pakai</span>
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded font-mono">.zip</span>
                </a>
              </div>
            )}
          </div>

          {/* Dedicated Hostinger Deploy Button */}
          <button
            id="btn-hostinger-deploy"
            onClick={() => setShowDeployGuide(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
          >
            <Server className="w-3.5 h-3.5" />
            <span>Deploy Hostinger</span>
          </button>

          {/* Reset / Pulihkan sample button */}
          <button
            id="btn-reset-sample"
            onClick={onResetDefaults}
            title="Pulihkan & Selaraskan Data Resmi Master SDMK (Reset Cache)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Pulihkan Data</span>
          </button>
        </div>
      </div>

      {/* Sheets Navigation & Workspace View Switcher */}
      <div className="px-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 border-t border-slate-100">
        {/* Sheet Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto py-1.5 max-w-full">
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider px-1">
            Lembar:
          </span>
          {sheets.map(sheet => {
            const isActive = sheet.id === activeSheetId;
            return (
              <div
                key={sheet.id}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                  isActive
                    ? 'bg-white text-emerald-800 border-slate-300 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent'
                }`}
                onClick={() => {
                  onSelectSheet(sheet.id);
                  if (sheet.id === 'sheet-uraian-tugas') {
                    if (activeTab === 'analytics' || activeTab === 'pivot') {
                      onChangeTab('uraian_tugas');
                    }
                  } else {
                    if (activeTab === 'uraian_tugas' || activeTab === 'struktur_organisasi') {
                      onChangeTab('analytics');
                    }
                  }
                }}
              >
                {getSheetIcon(sheet.icon)}
                <span className="truncate max-w-[160px]">{sheet.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full font-mono">
                  {sheet.rows.length}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSheet(sheet.id);
                  }}
                  title={`Hapus lembar kerja "${sheet.name}"`}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all ml-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          <button
            id="btn-add-sheet"
            onClick={onAddNewSheet}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors border border-dashed border-slate-300"
            title="Tambah Lembar Kerja Baru"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Sheet Baru</span>
          </button>
        </div>

        {/* Workspace View Mode Selector */}
        <div className="flex items-center gap-1.5 py-1.5">
          {/* 1. Master SDMK */}
          <button
            id="tab-master-sdmk-view"
            onClick={() => {
              onSelectSheet('sheet-master-puskesmas');
              onChangeTab('sheet');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeSheetId === 'sheet-master-puskesmas' && activeTab === 'sheet'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
            title="Buka Data Master SDMK 158 Pegawai Puskesmas"
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Master SDMK (158)</span>
          </button>

          {/* 2. Uraian Tugas Pegawai */}
          <button
            id="tab-uraian-view"
            onClick={() => {
              onSelectSheet('sheet-uraian-tugas');
              onChangeTab('uraian_tugas');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeSheetId === 'sheet-uraian-tugas' && (activeTab === 'uraian_tugas' || activeTab === 'sheet')
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
            title="Buka Lembar Pengelolaan & Kartu Uraian Tugas 164 Pegawai"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Uraian Tugas (164)</span>
          </button>

          {/* 3. Struktur Organisasi */}
          <button
            id="tab-struktur-view"
            onClick={() => {
              onSelectSheet('sheet-uraian-tugas');
              onChangeTab('struktur_organisasi');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'struktur_organisasi'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
            title="Bagan Struktur Organisasi Resmi (Pergub DKI No. 14/2023 & ILP Kemenkes)"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Struktur Organisasi</span>
          </button>

          {/* 4. Analitik & Grafik */}
          <button
            id="tab-analytics-view"
            onClick={() => {
              onSelectSheet('sheet-master-puskesmas');
              onChangeTab('analytics');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'analytics' || activeTab === 'pivot'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
            title="Dashboard Analitik SDMK, Grafik & Matriks Pivot"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analitik & Pivot</span>
          </button>

          {/* 5. Wawasan AI */}
          <button
            id="tab-ai-view"
            onClick={() => onChangeTab('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'ai'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
            title="Analisis Cerdas & Rekomendasi Beban Kerja AI Gemini"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Wawasan AI</span>
          </button>
        </div>
      </div>

      {/* Hostinger Deploy Guide Modal */}
      {showDeployGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Server className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Panduan Deploy Niagahoster / Hostinger</h3>
                  <p className="text-[11px] text-emerald-100">analitikpegawai.puskesmasseribuselatan.com (Master SDMK & Uraian Tugas)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDeployGuide(false)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed text-emerald-950">
                  <strong>Penyempurnaan Sinkronisasi Produksi:</strong> Seluruh dataset <strong>Master SDMK (158 Pegawai)</strong> dan <strong>Uraian Tugas (164 Pegawai)</strong> sudah tertanam mandiri (*pre-embedded*). Bundle produksi di folder <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-800">assets/</code> dan skrip <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-800">api-sync.php</code> telah diperbarui secara otomatis.
                </div>
              </div>

              {/* Step 1: Download ZIP */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">A</span>
                    Metode 1: Upload Paket Siap Pakai (.ZIP) ke cPanel
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Direkomendasikan</span>
                </div>
                <p className="text-[11px] text-slate-600 mb-3">
                  Unduh paket kompilasi terbaru berikut yang sudah berisi file <code className="text-slate-800 font-semibold">index.html</code>, folder <code className="text-slate-800 font-semibold">assets/</code>, skrip backend <code className="text-slate-800 font-semibold">api-sync.php</code>, dan konfigurasi <code className="text-slate-800 font-semibold">.htaccess</code>.
                </p>
                <a
                  href="./hostinger_public_html.zip"
                  download="hostinger_public_html.zip"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  <Package className="w-4 h-4" />
                  <span>Unduh: hostinger_public_html.zip (Versi Terbaru)</span>
                </a>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 mt-3 pl-1">
                  <li>Buka <strong>File Manager</strong> di cPanel / hPanel Niagahoster.</li>
                  <li>Buka folder root website: <code className="font-mono bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-800">public_html</code> (atau subfolder domain <code className="font-mono text-emerald-800">analitikpegawai.puskesmasseribuselatan.com</code>).</li>
                  <li>Upload file <code className="font-semibold text-emerald-700">hostinger_public_html.zip</code> dan klik <strong>Extract</strong> di dalam folder tersebut.</li>
                </ol>
              </div>

              {/* Step 2: Git Sync */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50/50">
                <span className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">B</span>
                  Metode 2: Sinkronisasi via GitHub ke Niagahoster
                </span>
                <p className="text-[11px] text-slate-600">
                  Jika menggunakan fitur <strong>Git Version Control</strong> di cPanel Niagahoster:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 pl-1">
                  <li>Lakukan <strong>Push</strong> dari GitHub ke branch <code className="font-mono bg-slate-200 px-1 rounded">main</code> atau <code className="font-mono bg-slate-200 px-1 rounded">production</code>.</li>
                  <li>Di cPanel Niagahoster ➔ <strong>Git Version Control</strong> ➔ Klik <strong>Update from Remote</strong> / <strong>Deploy HEAD Commit</strong>.</li>
                  <li>Folder <code className="font-mono bg-slate-200 px-1 rounded">assets/bundle.js</code> yang baru akan langsung terpasang otomatis di hosting.</li>
                </ol>
              </div>

              {/* Step 3: Cache Buster Info */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900 leading-relaxed">
                  <strong>Tips Pembersihan Cache Browser:</strong> Jika Anda baru saja membuka web di hosting dan lembar belum berubah, lakukan <strong>Hard Refresh (Ctrl + F5 atau Cmd + Shift + R)</strong> atau klik tombol <strong>"Pulihkan Data"</strong> di pojok kanan atas aplikasi untuk memuat dataset 164 pegawai secara instan.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowDeployGuide(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
