import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Sheet } from '../../types/sheet';
import { parseCsvToSheet } from '../../utils/analytics';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportNewSheet: (sheet: Sheet) => void;
  onAppendToCurrentSheet: (rows: any[], columns: any[]) => void;
  activeSheetName: string;
}

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({
  isOpen,
  onClose,
  onImportNewSheet,
  onAppendToCurrentSheet,
  activeSheetName
}) => {
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [importMode, setImportMode] = useState<'new_sheet' | 'append'>('new_sheet');
  const [error, setError] = useState<string | null>(null);
  const [previewParsed, setPreviewParsed] = useState<Sheet | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
      try {
        const parsed = parseCsvToSheet(text, file.name);
        setPreviewParsed(parsed);
      } catch (err: any) {
        setError(err.message || "Gagal membaca format file CSV.");
        setPreviewParsed(null);
      }
    };
    reader.onerror = () => {
      setError("Terjadi kesalahan saat membaca file.");
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (text: string) => {
    setFileContent(text);
    setError(null);
    if (!text.trim()) {
      setPreviewParsed(null);
      return;
    }
    try {
      const parsed = parseCsvToSheet(text, fileName || 'Data Tempel.csv');
      setPreviewParsed(parsed);
    } catch (err: any) {
      setError(err.message || "Format CSV belum valid");
      setPreviewParsed(null);
    }
  };

  const handleConfirmImport = () => {
    if (!previewParsed) return;

    if (importMode === 'new_sheet') {
      onImportNewSheet(previewParsed);
    } else {
      onAppendToCurrentSheet(previewParsed.rows, previewParsed.columns);
    }

    // Reset & close
    setFileContent('');
    setFileName('');
    setPreviewParsed(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-800">Impor Berkas CSV</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* File Upload Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/20 transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-sm font-semibold text-slate-700">
                {fileName ? fileName : 'Klik untuk memilih file CSV atau seret ke sini'}
              </div>
              <div className="text-xs text-slate-600">
                Mendukung file koma (,) atau titik-koma (;) dengan deteksi otomatis
              </div>
            </div>
          </div>

          {/* Paste Raw CSV Alternative */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Atau Tempel (Paste) Teks CSV Langsung:
            </label>
            <textarea
              rows={3}
              value={fileContent}
              onChange={(e) => handlePasteChange(e.target.value)}
              placeholder="id,tanggal,produk,jumlah,harga&#10;1,2026-09-01,Barang A,5,50000"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {previewParsed && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>File Siap Diimpor</span>
                </div>
                <div className="text-xs font-medium text-emerald-700">
                  {previewParsed.columns.length} Kolom, {previewParsed.rows.length} Baris Data
                </div>
              </div>
              
              <div className="text-xs text-slate-600">
                Kolom terdeteksi: <span className="font-medium text-slate-800">{previewParsed.columns.map(c => c.name).join(', ')}</span>
              </div>

              {/* Import destination options */}
              <div className="pt-2 border-t border-emerald-200/60 flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                  <input
                    type="radio"
                    name="importMode"
                    value="new_sheet"
                    checked={importMode === 'new_sheet'}
                    onChange={() => setImportMode('new_sheet')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Buat Lembar Kerja Baru</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Tambahkan ke "{activeSheetName}"</span>
                </label>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!previewParsed}
              onClick={handleConfirmImport}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 rounded-lg shadow-xs transition-colors"
            >
              Impor Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
