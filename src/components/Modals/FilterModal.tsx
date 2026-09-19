import React, { useState } from 'react';
import { X, Filter, Plus, Trash2, Check } from 'lucide-react';
import { ColumnDef, FilterCondition, FilterOperator } from '../../types/sheet';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnDef[];
  filters: FilterCondition[];
  onApplyFilters: (newFilters: FilterCondition[]) => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  columns,
  filters,
  onApplyFilters,
}) => {
  const [localFilters, setLocalFilters] = useState<FilterCondition[]>(filters);

  if (!isOpen) return null;

  const handleAddCondition = () => {
    const firstCol = columns[0]?.id || '';
    const newCondition: FilterCondition = {
      id: `flt_${Date.now()}`,
      columnId: firstCol,
      operator: 'contains',
      value: '',
    };
    setLocalFilters([...localFilters, newCondition]);
  };

  const handleRemoveCondition = (id: string) => {
    setLocalFilters(localFilters.filter(f => f.id !== id));
  };

  const handleUpdateCondition = (id: string, field: keyof FilterCondition, val: any) => {
    setLocalFilters(
      localFilters.map(f => {
        if (f.id === id) {
          return { ...f, [field]: val };
        }
        return f;
      })
    );
  };

  const handleApply = () => {
    // Filter out invalid empty condition if needed, but allow is_empty / is_not_empty
    const valid = localFilters.filter(f => {
      if (f.operator === 'is_empty' || f.operator === 'is_not_empty') return true;
      return f.value.trim() !== '';
    });
    onApplyFilters(valid);
    onClose();
  };

  const handleClearAll = () => {
    setLocalFilters([]);
    onApplyFilters([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-800">Filter Data Lanjutan</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600">
            Terapkan satu atau beberapa kriteria penyaringan untuk membatasi baris data yang ditampilkan di tabel dan analitik.
          </p>

          {localFilters.length === 0 ? (
            <div className="py-6 text-center border-2 border-dashed border-slate-200 rounded-lg text-slate-500 text-xs">
              Belum ada kriteria filter yang aktif.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {localFilters.map((cond, idx) => (
                <div
                  key={cond.id}
                  className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <span className="text-[11px] font-semibold text-slate-600 w-6">
                    #{idx + 1}
                  </span>

                  {/* Column Picker */}
                  <select
                    value={cond.columnId}
                    onChange={(e) => handleUpdateCondition(cond.id, 'columnId', e.target.value)}
                    className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none max-w-[130px]"
                  >
                    {columns.map(col => (
                      <option key={col.id} value={col.id}>{col.name}</option>
                    ))}
                  </select>

                  {/* Operator Picker */}
                  <select
                    value={cond.operator}
                    onChange={(e) => handleUpdateCondition(cond.id, 'operator', e.target.value as FilterOperator)}
                    className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="contains">Mengandung</option>
                    <option value="equals">Sama Dengan (=)</option>
                    <option value="starts_with">Dimulai Dari</option>
                    <option value="greater_than">Lebih Besar (&gt;)</option>
                    <option value="less_than">Lebih Kecil (&lt;)</option>
                    <option value="is_not_empty">Tidak Kosong</option>
                    <option value="is_empty">Kosong</option>
                  </select>

                  {/* Value input (hidden if is_empty / is_not_empty) */}
                  {cond.operator !== 'is_empty' && cond.operator !== 'is_not_empty' && (
                    <input
                      type="text"
                      value={cond.value}
                      onChange={(e) => handleUpdateCondition(cond.id, 'value', e.target.value)}
                      placeholder="Nilai kriteria..."
                      className="flex-1 text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none min-w-[80px]"
                    />
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => handleRemoveCondition(cond.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200/60"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleAddCondition}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Kondisi Filter</span>
          </button>

          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium"
            >
              Hapus Semua Filter
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Terapkan Filter ({localFilters.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
