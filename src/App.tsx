/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Sheet, ActiveTab, FilterCondition, ColumnDef, RowData } from './types/sheet';
import { DEFAULT_SHEETS } from './data/defaultSheets';
import { exportSheetToCsv, recalculateRow } from './utils/analytics';
import { syncGoogleSheetData, syncUraianTugasData } from './utils/googleSheetSync';
import { Header } from './components/Header';
import { DataSheet } from './components/DataSheet';
import { AnalyticsWorkspace } from './components/analytics/AnalyticsWorkspace';
import { SmartInsights } from './components/SmartInsights';
import { UraianTugasManager } from './components/uraian/UraianTugasManager';
import { StrukturOrganisasiWorkspace } from './components/struktur/StrukturOrganisasiWorkspace';
import { AddColumnModal } from './components/Modals/AddColumnModal';
import { ImportCsvModal } from './components/Modals/ImportCsvModal';
import { FilterModal } from './components/Modals/FilterModal';
import { fetchServerStaffPhotos } from './utils/googleDriveHelper';

const STORAGE_KEY = 'sheet_analitik_sdmk_v7';

// Validasi apakah baris data tergeser / terkorupsi dari cache versi terdahulu
export function isSheetDataCorrupted(sheet: Sheet): boolean {
  if (!sheet || !Array.isArray(sheet.rows) || sheet.rows.length === 0) return false;
  let corruptedCount = 0;
  const sample = sheet.rows.slice(0, 15);
  for (const r of sample) {
    const nip = String(r.nip || '');
    const unit = String(r.tempat_tugas || '');
    const jab = String(r.jabatan || '');
    // NIP berisi gelar dokter / teks nama
    if (/dr\.|drg\.|dokter/i.test(nip)) corruptedCount++;
    // tempat_tugas tertukar dengan formasi jabatan
    if (/dokter|perawat|bidan|subbagian|ahli muda|pelaksana/i.test(unit) && !unit.toLowerCase().includes('puskesmas')) corruptedCount++;
    // unit sama persis dengan jabatan dan bukan puskesmas
    if (unit && jab && unit === jab && !unit.toLowerCase().includes('puskesmas')) corruptedCount++;
  }
  return corruptedCount >= 2;
}

export function isUraianCorrupted(sheet: Sheet): boolean {
  if (!sheet || !Array.isArray(sheet.rows) || sheet.rows.length < 100) return true;
  // Periksa apakah baris pertama bukan Kepala Puskesmas dr. Ignatius Dendy Purnama
  const firstRow = sheet.rows[0];
  if (!firstRow || !String(firstRow.nama || '').toLowerCase().includes('ignatius')) {
    return true;
  }
  return false;
}

export default function App() {
  // Initialize Sheets from LocalStorage with Auto-Healing or Default Templates
  const [sheets, setSheets] = useState<Sheet[]>(() => {
    try {
      // Bersihkan key legacy yang berpotensi menyimpan cache baris tergeser atau sheet tidak lengkap
      ['sheet_analitik_state_v1', 'sheet_analitik_state_v2', 'sheet_analitik_state_v3', 'sheet_analitik_sdmk_v4', 'sheet_analitik_sdmk_v5', 'sheet_analitik_sdmk_v6'].forEach(k => {
        try { localStorage.removeItem(k); } catch {}
      });

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let currentSheets = parsed;
          const hasUraian = currentSheets.some((s: Sheet) => s.id === 'sheet-uraian-tugas');
          if (!hasUraian && DEFAULT_SHEETS.length > 1) {
            currentSheets = [...currentSheets, DEFAULT_SHEETS[1]];
          } else if (hasUraian) {
            const uraianSheet = currentSheets.find((s: Sheet) => s.id === 'sheet-uraian-tugas');
            if (uraianSheet && isUraianCorrupted(uraianSheet)) {
              console.warn("Memulihkan sheet uraian tugas dengan dataset 164 pegawai resmi termutakhir...");
              currentSheets = currentSheets.map((s: Sheet) => s.id === 'sheet-uraian-tugas' ? DEFAULT_SHEETS[1] : s);
            }
          }

          // Cek apakah data master tergeser/terkorupsi
          const masterSheet = currentSheets.find((s: Sheet) => s.id === 'sheet-master-puskesmas');
          if (masterSheet && isSheetDataCorrupted(masterSheet)) {
            console.warn("Mendeteksi data master SDMK terkorupsi di cache browser. Memulihkan dengan master data resmi...");
            currentSheets = currentSheets.map((s: Sheet) => s.id === 'sheet-master-puskesmas' ? DEFAULT_SHEETS[0] : s);
          }

          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSheets));
          return currentSheets;
        }
      }
    } catch (e) {
      console.error("Gagal memuat data dari localStorage:", e);
    }
    return DEFAULT_SHEETS;
  });

  // Sinkronisasi foto pegawai dari Cloud Server pada saat pertama kali dimuat
  useEffect(() => {
    async function syncPhotosFromServer() {
      try {
        const serverPhotos = await fetchServerStaffPhotos();
        if (serverPhotos && Object.keys(serverPhotos).length > 0) {
          setSheets(prev => {
            let changed = false;
            const nextSheets = prev.map(s => {
              const updatedRows = s.rows.map(r => {
                const nipKey = String(r.nip || '').trim();
                const idKey = r._id;
                const nameKey = r.nama ? `nama:${String(r.nama).trim().toLowerCase()}` : '';
                const savedPhoto = serverPhotos[nipKey] || serverPhotos[idKey] || (nameKey ? serverPhotos[nameKey] : undefined);
                if (savedPhoto && savedPhoto !== r.foto) {
                  changed = true;
                  return { ...r, foto: savedPhoto };
                }
                return r;
              });
              return changed ? { ...s, rows: updatedRows } : s;
            });
            return changed ? nextSheets : prev;
          });
        }
      } catch (err) {
        console.warn("Gagal menyinkronkan foto dari server:", err);
      }
    }
    syncPhotosFromServer();
  }, []);

  const [activeSheetId, setActiveSheetId] = useState<string>(() => {
    return 'sheet-master-puskesmas';
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('sheet');

  // Sheet Filters (keyed by sheetId)
  const [filtersMap, setFiltersMap] = useState<Record<string, FilterCondition[]>>({});

  // Undo / Redo History Stack
  const [history, setHistory] = useState<Sheet[][]>([sheets]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Modals state
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sheetToDelete, setSheetToDelete] = useState<Sheet | null>(null);

  // Auto-save notification timestamp
  const [lastSaved, setLastSaved] = useState<string>('baru saja');

  // Google Sheet live sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSyncGoogleSheet = async () => {
    try {
      setIsSyncing(true);

      // Jika sedang di sheet Uraian Tugas atau tab Uraian Tugas, sinkronkan data Uraian Tugas
      if (activeSheetId === 'sheet-uraian-tugas' || activeTab === 'uraian_tugas') {
        const data = await syncUraianTugasData();
        if (data.success && data.sheet) {
          const existingIdx = sheets.findIndex(s => s.id === 'sheet-uraian-tugas');
          let nextSheets: Sheet[];
          if (existingIdx >= 0) {
            nextSheets = sheets.map(s => s.id === 'sheet-uraian-tugas' ? data.sheet! : s);
          } else {
            nextSheets = [...sheets, data.sheet!];
          }
          updateSheetsState(nextSheets);
          setSyncToast({
            message: `Berhasil sinkronisasi data Uraian Tugas: ${data.rowCount || data.sheet.rows.length} pegawai termutakhir.`,
            type: 'success'
          });
        } else {
          setSyncToast({
            message: `Gagal sinkronisasi Uraian Tugas: ${data.error || 'Respon tidak valid'}`,
            type: 'error'
          });
        }
        return;
      }

      // Default: Sinkronisasi Master SDMK Puskesmas
      const data = await syncGoogleSheetData();
      if (data.success && data.sheet) {
        const existingIdx = sheets.findIndex(s => s.id === 'sheet-master-puskesmas');
        let nextSheets: Sheet[];
        if (existingIdx >= 0) {
          nextSheets = sheets.map(s => s.id === 'sheet-master-puskesmas' ? data.sheet! : s);
        } else {
          nextSheets = [data.sheet!, ...sheets];
        }
        updateSheetsState(nextSheets);
        setSyncToast({
          message: `Berhasil sinkronisasi data SDMK: ${data.rowCount || data.sheet.rows.length} pegawai termutakhir.`,
          type: 'success'
        });
      } else {
        setSyncToast({
          message: `Gagal sinkronisasi: ${data.error || 'Respon tidak valid'}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setSyncToast({
        message: `Gagal sinkronisasi: ${err.message || 'Koneksi terputus'}`,
        type: 'error'
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToast(null), 5000);
    }
  };

  // Active sheet reference
  const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0] || DEFAULT_SHEETS[0];
  const activeFilters = filtersMap[activeSheet.id] || [];

  // Update sheets with undo history tracking
  const updateSheetsState = useCallback((newSheets: Sheet[]) => {
    setSheets(newSheets);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSheets));
      const now = new Date();
      setLastSaved(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    } catch (e) {
      console.warn("Gagal menyimpan ke localStorage:", e);
    }

    // Push to history
    setHistory(prev => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newSheets];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Update a single active sheet
  const handleUpdateActiveSheet = useCallback((updatedSheet: Sheet) => {
    const updated = sheets.map(s => s.id === updatedSheet.id ? updatedSheet : s);
    updateSheetsState(updated);
  }, [sheets, updateSheetsState]);

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevSheets = history[prevIndex];
      setSheets(prevSheets);
      setHistoryIndex(prevIndex);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prevSheets));
      } catch {}
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextSheets = history[nextIndex];
      setSheets(nextSheets);
      setHistoryIndex(nextIndex);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSheets));
      } catch {}
    }
  };

  // Add New Blank Sheet
  const handleAddNewSheet = () => {
    const newId = `sheet_${Date.now()}`;
    const newSheet: Sheet = {
      id: newId,
      name: `Lembar Baru ${sheets.length + 1}`,
      description: 'Lembar kerja analitik baru siap diisi data',
      icon: 'FileSpreadsheet',
      updatedAt: new Date().toISOString(),
      columns: [
        { id: 'item_no', name: 'No', type: 'number', width: 90, visible: true, aggregation: 'count' },
        { id: 'date', name: 'Tanggal', type: 'date', width: 130, visible: true, aggregation: 'none' },
        { id: 'name', name: 'Nama Item', type: 'text', width: 190, visible: true, aggregation: 'none' },
        { 
          id: 'category', 
          name: 'Kategori', 
          type: 'category', 
          width: 150, 
          visible: true, 
          aggregation: 'none',
          options: ['Operasional', 'Penjualan', 'Logistik', 'Lainnya'] 
        },
        { id: 'amount', name: 'Nilai (Rp)', type: 'currency', width: 160, visible: true, aggregation: 'sum' },
        { 
          id: 'status', 
          name: 'Status', 
          type: 'badge', 
          width: 130, 
          visible: true, 
          aggregation: 'none',
          options: ['Aktif', 'Diproses', 'Selesai'] 
        }
      ],
      rows: [
        { _id: 'r_init_1', item_no: 1, date: new Date().toISOString().slice(0, 10), name: 'Entri Data Pertama', category: 'Operasional', amount: 500000, status: 'Aktif' },
        { _id: 'r_init_2', item_no: 2, date: new Date().toISOString().slice(0, 10), name: 'Entri Data Kedua', category: 'Penjualan', amount: 1250000, status: 'Selesai' }
      ],
      primaryMetricId: 'amount',
      primaryDateId: 'date',
      primaryCategoryId: 'category'
    };

    updateSheetsState([...sheets, newSheet]);
    setActiveSheetId(newId);
    setActiveTab('sheet');
  };

  // Delete Sheet Handler (Opens in-app confirmation modal)
  const handleDeleteSheet = (sheetId: string) => {
    const target = sheets.find(s => s.id === sheetId);
    if (target) {
      setSheetToDelete(target);
    }
  };

  const handleExecuteDelete = (sheetId: string) => {
    if (sheets.length <= 1) {
      // Create a fresh clean sheet
      const blankSheet: Sheet = {
        id: `sheet-${Date.now()}`,
        name: 'Lembar Baru',
        description: 'Lembar kerja baru',
        icon: 'FileSpreadsheet',
        columns: [
          { id: 'col_1', name: 'Kolom 1', type: 'text', width: 160, visible: true, aggregation: 'none' },
          { id: 'col_2', name: 'Kolom 2', type: 'text', width: 160, visible: true, aggregation: 'none' }
        ],
        rows: [
          { _id: 'row_1', col_1: '', col_2: '' }
        ],
        updatedAt: new Date().toISOString()
      };
      updateSheetsState([blankSheet]);
      setActiveSheetId(blankSheet.id);
      setActiveTab('sheet');
      setSyncToast({ message: 'Lembar kerja berhasil dibersihkan & dibuat baru.', type: 'success' });
      setTimeout(() => setSyncToast(null), 4000);
      return;
    }

    const remaining = sheets.filter(s => s.id !== sheetId);
    updateSheetsState(remaining);
    if (activeSheetId === sheetId) {
      setActiveSheetId(remaining[0].id);
    }
    setSyncToast({ message: 'Lembar kerja berhasil dihapus.', type: 'success' });
    setTimeout(() => setSyncToast(null), 4000);
  };

  // Row updater for analytics management (Domisili, STR/SIP, etc.)
  const handleUpdateRow = useCallback((rowId: string, updatedFields: Partial<RowData>) => {
    const updatedRows = activeSheet.rows.map(r => r._id === rowId ? { ...r, ...updatedFields } : r);
    handleUpdateActiveSheet({ ...activeSheet, rows: updatedRows });
  }, [activeSheet, handleUpdateActiveSheet]);

  // Reset / Pulihkan ke Data Bawaan Resmi Master SDMK & Uraian Tugas
  const handleResetDefaults = () => {
    ['sheet_analitik_state_v1', 'sheet_analitik_state_v2', 'sheet_analitik_state_v3', 'sheet_analitik_sdmk_v4', 'sheet_analitik_sdmk_v5', 'sheet_analitik_sdmk_v6', STORAGE_KEY].forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
    setSheets(DEFAULT_SHEETS);
    setActiveSheetId(DEFAULT_SHEETS[0].id);
    setHistory([DEFAULT_SHEETS]);
    setHistoryIndex(0);
    setFiltersMap({});
    setSyncToast({ message: 'Data master resmi SDMK berhasil dipulihkan & diselaraskan sesuai data resmi.', type: 'success' });
    setTimeout(() => setSyncToast(null), 4000);
  };

  // Export handlers
  const handleExportCsv = () => {
    const csv = exportSheetToCsv(activeSheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeSheet.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(activeSheet, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeSheet.name.toLowerCase().replace(/\s+/g, '_')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add Column Handler
  const handleAddColumn = (newCol: ColumnDef, defaultValue: any) => {
    const updatedCols = [...activeSheet.columns, newCol];
    const updatedRows = activeSheet.rows.map(row => {
      let initVal = defaultValue;
      if (newCol.type === 'number' || newCol.type === 'currency' || newCol.type === 'percent') {
        const parsed = parseFloat(defaultValue);
        initVal = isNaN(parsed) ? 0 : parsed;
      }
      const newRow = { ...row, [newCol.id]: initVal };
      return recalculateRow(newRow, updatedCols);
    });

    handleUpdateActiveSheet({
      ...activeSheet,
      columns: updatedCols,
      rows: updatedRows,
      updatedAt: new Date().toISOString()
    });
  };

  // Import handlers
  const handleImportNewSheet = (newSheet: Sheet) => {
    updateSheetsState([...sheets, newSheet]);
    setActiveSheetId(newSheet.id);
    setActiveTab('sheet');
  };

  const handleAppendToCurrentSheet = (newRows: any[], _newCols: any[]) => {
    const appendedRows: RowData[] = newRows.map((nr, idx) => ({
      ...nr,
      _id: `imp_${Date.now()}_${idx}`
    }));

    handleUpdateActiveSheet({
      ...activeSheet,
      rows: [...activeSheet.rows, ...appendedRows],
      updatedAt: new Date().toISOString()
    });
  };

  // Filter handlers
  const handleApplyFilters = (newFilters: FilterCondition[]) => {
    setFiltersMap(prev => ({
      ...prev,
      [activeSheet.id]: newFilters
    }));
  };

  const handleClearFilters = () => {
    setFiltersMap(prev => ({
      ...prev,
      [activeSheet.id]: []
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Application Header */}
      <Header
        sheets={sheets}
        activeSheetId={activeSheetId}
        onSelectSheet={(id) => setActiveSheetId(id)}
        onAddNewSheet={handleAddNewSheet}
        onDeleteSheet={handleDeleteSheet}
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        onResetDefaults={handleResetDefaults}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        lastSaved={lastSaved}
        onSyncGoogleSheet={handleSyncGoogleSheet}
        isSyncing={isSyncing}
      />

      {/* Sync Toast Notification */}
      {syncToast && (
        <div 
          className={`fixed top-14 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg border text-xs font-semibold flex items-center gap-2 transition-all transform animate-in fade-in slide-in-from-top-2 ${
            syncToast.type === 'success' 
              ? 'bg-emerald-800 text-white border-emerald-600' 
              : 'bg-rose-800 text-white border-rose-600'
          }`}
        >
          <span>{syncToast.message}</span>
        </div>
      )}

      {/* Main Workspace Area */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'uraian_tugas' && (
          <div className="h-full overflow-y-auto p-4 md:p-6 bg-slate-50/70">
            <UraianTugasManager
              sheet={sheets.find(s => s.id === 'sheet-uraian-tugas') || activeSheet}
              onUpdateSheet={(updated) => {
                const nextSheets = sheets.map(s => s.id === updated.id ? updated : s);
                updateSheetsState(nextSheets);
              }}
              onSyncGoogleSheet={handleSyncGoogleSheet}
              isSyncing={isSyncing}
            />
          </div>
        )}

        {activeTab === 'struktur_organisasi' && (
          <div className="h-full overflow-y-auto p-4 md:p-6 bg-slate-50/70">
            <StrukturOrganisasiWorkspace
              sheet={sheets.find(s => s.id === 'sheet-uraian-tugas') || activeSheet}
              onUpdateSheet={(updatedSheet) => {
                const nextSheets = sheets.map(s => s.id === updatedSheet.id ? updatedSheet : s);
                updateSheetsState(nextSheets);
              }}
            />
          </div>
        )}

        {activeTab === 'sheet' && (
          <DataSheet
            sheet={activeSheet}
            onUpdateSheet={handleUpdateActiveSheet}
            onOpenAddColumn={() => setIsAddColumnOpen(true)}
            onOpenFilter={() => setIsFilterModalOpen(true)}
            activeFilters={activeFilters}
            onClearFilters={handleClearFilters}
          />
        )}

        {(activeTab === 'analytics' || activeTab === 'pivot') && (
          <div className="h-full overflow-y-auto p-4 md:p-6 bg-slate-50/70">
            <AnalyticsWorkspace
              sheet={activeSheet}
              onUpdateRow={handleUpdateRow}
              initialSubTab={activeTab === 'pivot' ? 'matrix_pivot' : 'grafik_visual'}
            />
          </div>
        )}

        {activeTab === 'ai' && (
          <SmartInsights sheet={activeSheet} />
        )}
      </main>

      {/* In-App Delete Sheet Confirmation Modal */}
      {sheetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hapus Lembar Kerja?</h3>
                <p className="text-xs text-slate-500">Konfirmasi penghapusan lembar</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Apakah Anda yakin ingin menghapus lembar kerja <strong className="text-slate-900">"{sheetToDelete.name}"</strong>?
              {sheets.length === 1 ? (
                <span className="block mt-1 text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  Perhatian: Karena ini adalah lembar kerja satu-satunya, sistem akan membuatkan lembar baru yang bersih.
                </span>
              ) : (
                <span className="block mt-1 text-slate-500">
                  Data pada lembar kerja ini ({sheetToDelete.rows.length} baris) akan dihapus secara permanen.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSheetToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = sheetToDelete.id;
                  setSheetToDelete(null);
                  handleExecuteDelete(id);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors"
              >
                Ya, Hapus Lembar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddColumnModal
        isOpen={isAddColumnOpen}
        onClose={() => setIsAddColumnOpen(false)}
        onAddColumn={handleAddColumn}
        existingColumns={activeSheet.columns}
      />

      <ImportCsvModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportNewSheet={handleImportNewSheet}
        onAppendToCurrentSheet={handleAppendToCurrentSheet}
        activeSheetName={activeSheet.name}
      />

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        columns={activeSheet.columns}
        filters={activeFilters}
        onApplyFilters={handleApplyFilters}
      />
    </div>
  );
}
