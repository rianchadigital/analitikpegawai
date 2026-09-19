import React, { useState } from 'react';
import { X, PlusCircle, HelpCircle } from 'lucide-react';
import { ColumnDef, ColumnType, AggregationType } from '../../types/sheet';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddColumn: (column: ColumnDef, defaultValue: any) => void;
  existingColumns: ColumnDef[];
}

export const AddColumnModal: React.FC<AddColumnModalProps> = ({
  isOpen,
  onClose,
  onAddColumn,
  existingColumns,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ColumnType>('text');
  const [aggregation, setAggregation] = useState<AggregationType>('none');
  const [optionsStr, setOptionsStr] = useState('Pilihan 1, Pilihan 2, Pilihan 3');
  const [formula, setFormula] = useState('');
  const [defaultValue, setDefaultValue] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const id = `col_${Date.now()}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const options = (type === 'category' || type === 'badge')
      ? optionsStr.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const newCol: ColumnDef = {
      id,
      name: name.trim(),
      type,
      width: type === 'currency' || type === 'formula' ? 160 : 140,
      visible: true,
      aggregation,
      options,
      formula: type === 'formula' ? formula.trim() : undefined,
    };

    onAddColumn(newCol, defaultValue);
    // Reset form
    setName('');
    setType('text');
    setAggregation('none');
    setFormula('');
    setDefaultValue('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-800">Tambah Kolom Baru</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Kolom <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Diskon, Lokasi, Target Penjualan"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipe Data
              </label>
              <select
                value={type}
                onChange={(e) => {
                  const newType = e.target.value as ColumnType;
                  setType(newType);
                  if (newType === 'currency' || newType === 'number') {
                    setAggregation('sum');
                  } else if (newType === 'percent') {
                    setAggregation('avg');
                  } else {
                    setAggregation('none');
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="text">Teks (String)</option>
                <option value="number">Angka (Number)</option>
                <option value="currency">Mata Uang (Rupiah)</option>
                <option value="percent">Persentase (%)</option>
                <option value="date">Tanggal (Date)</option>
                <option value="category">Kategori (Pilihan Dropdown)</option>
                <option value="badge">Status / Label Badge</option>
                <option value="formula">Formula Terhitung (Fx)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total di Footer (Agregasi)
              </label>
              <select
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value as AggregationType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="none">Tidak Ada</option>
                <option value="sum">Jumlah Total (SUM)</option>
                <option value="avg">Rata-rata (AVERAGE)</option>
                <option value="min">Nilai Terkecil (MIN)</option>
                <option value="max">Nilai Terbesar (MAX)</option>
                <option value="count">Jumlah Baris (COUNT)</option>
              </select>
            </div>
          </div>

          {(type === 'category' || type === 'badge') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Opsi Pilihan (Pisahkan dengan koma)
              </label>
              <input
                type="text"
                value={optionsStr}
                onChange={(e) => setOptionsStr(e.target.value)}
                placeholder="Aktif, Pending, Selesai"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {type === 'formula' && (
            <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-emerald-900">
                  Rumus Matematika
                </label>
                <div className="flex items-center gap-1 text-[11px] text-emerald-700">
                  <HelpCircle className="w-3 h-3" />
                  <span>Gunakan format [id_kolom]</span>
                </div>
              </div>
              <input
                type="text"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="Contoh: [qty] * [unit_price] * 0.9"
                className="w-full px-3 py-2 text-xs font-mono border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              <div className="text-[11px] text-slate-600">
                Kolom tersedia: {existingColumns.map(c => `[${c.id}] (${c.name})`).join(', ')}
              </div>
            </div>
          )}

          {type !== 'formula' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nilai Awal (Default Value untuk baris saat ini)
              </label>
              <input
                type={type === 'number' || type === 'currency' || type === 'percent' ? 'number' : type === 'date' ? 'date' : 'text'}
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                placeholder="Opsional (dapat dikosongkan)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
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
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
            >
              Simpan Kolom
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
