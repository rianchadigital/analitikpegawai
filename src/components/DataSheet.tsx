import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Copy, 
  MoreHorizontal, 
  CheckSquare, 
  Square, 
  Hash, 
  Calendar, 
  DollarSign, 
  Percent, 
  Tag, 
  FunctionSquare, 
  EyeOff, 
  Sparkles,
  ChevronDown,
  Table2,
  Eye,
  Building2
} from 'lucide-react';
import { ColumnDef, RowData, Sheet, FilterCondition, SortConfig } from '../types/sheet';
import { formatCellValue, calculateAggregation, recalculateRow } from '../utils/analytics';
import { EmployeeDetailModal } from './Modals/EmployeeDetailModal';

interface DataSheetProps {
  sheet: Sheet;
  onUpdateSheet: (updated: Sheet) => void;
  onOpenAddColumn: () => void;
  onOpenFilter: () => void;
  activeFilters: FilterCondition[];
  onClearFilters: () => void;
}

export const DataSheet: React.FC<DataSheetProps> = ({
  sheet,
  onUpdateSheet,
  onOpenAddColumn,
  onOpenFilter,
  activeFilters,
  onClearFilters,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [openColMenuId, setOpenColMenuId] = useState<string | null>(null);
  const [showDataCleanMenu, setShowDataCleanMenu] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<RowData | null>(null);
  const [quickTag, setQuickTag] = useState<string>('ALL');

  const isSdmk = useMemo(() => {
    return sheet.id === 'sheet-master-puskesmas' || 
      sheet.columns.some(c => c.id === 'tempat_tugas' || c.id === 'status_kepegawaian');
  }, [sheet]);

  const columns = useMemo(() => {
    return sheet.columns.filter(c => c.visible !== false);
  }, [sheet.columns]);

  // Filter & Search rows
  const filteredRows = useMemo(() => {
    return sheet.rows.filter(row => {
      // SDMK Quick Tag Filter
      if (quickTag !== 'ALL') {
        if (quickTag === 'NAKES' && row.jenis_tenaga !== 'Tenaga Kesehatan') return false;
        if (quickTag === 'NON_NAKES' && row.jenis_tenaga !== 'Tenaga Penunjang') return false;
        if (quickTag === 'PNS' && row.status_kepegawaian !== 'PNS') return false;
        if (quickTag === 'PPPK' && !String(row.status_kepegawaian).includes('PPPK')) return false;
        if (quickTag === 'NON_PNS' && row.status_kepegawaian !== 'NON PNS') return false;
        if (quickTag === 'PJLP' && row.status_kepegawaian !== 'PJLP') return false;
        if (quickTag === '24JAM' && !String(row.jam_kerja).includes('24 JAM')) return false;
      }

      // Global Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = columns.some(col => {
          const val = row[col.id];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(query);
        });
        if (!matchesSearch) return false;
      }

      // Filter Conditions
      if (activeFilters.length > 0) {
        for (const filter of activeFilters) {
          const cellVal = row[filter.columnId];
          const cellStr = cellVal !== null && cellVal !== undefined ? String(cellVal).toLowerCase() : '';
          const targetStr = filter.value.toLowerCase();
          const cellNum = parseFloat(cellVal);
          const targetNum = parseFloat(filter.value);

          switch (filter.operator) {
            case 'contains':
              if (!cellStr.includes(targetStr)) return false;
              break;
            case 'equals':
              if (cellStr !== targetStr) return false;
              break;
            case 'starts_with':
              if (!cellStr.startsWith(targetStr)) return false;
              break;
            case 'greater_than':
              if (isNaN(cellNum) || isNaN(targetNum) || cellNum <= targetNum) return false;
              break;
            case 'less_than':
              if (isNaN(cellNum) || isNaN(targetNum) || cellNum >= targetNum) return false;
              break;
            case 'is_empty':
              if (cellStr.trim() !== '') return false;
              break;
            case 'is_not_empty':
              if (cellStr.trim() === '') return false;
              break;
          }
        }
      }

      return true;
    });
  }, [sheet.rows, columns, searchQuery, activeFilters]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortConfig) return filteredRows;

    const col = sheet.columns.find(c => c.id === sortConfig.columnId);
    if (!col) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      let valA = a[sortConfig.columnId];
      let valB = b[sortConfig.columnId];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (col.type === 'number' || col.type === 'currency' || col.type === 'percent' || col.type === 'formula') {
        const numA = parseFloat(valA) || 0;
        const numB = parseFloat(valB) || 0;
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortConfig, sheet.columns]);

  // Handle Sort Toggle
  const handleSort = (columnId: string) => {
    if (sortConfig?.columnId === columnId) {
      if (sortConfig.direction === 'asc') {
        setSortConfig({ columnId, direction: 'desc' });
      } else {
        setSortConfig(null);
      }
    } else {
      setSortConfig({ columnId, direction: 'asc' });
    }
  };

  // Cell Editing
  const startEditing = (rowId: string, colId: string, currentVal: any, colType: string) => {
    if (colType === 'formula') return; // formulas are computed
    setEditingCell({ rowId, colId });
    setEditValue(currentVal === null || currentVal === undefined ? '' : String(currentVal));
  };

  const saveCellEdit = () => {
    if (!editingCell) return;
    const { rowId, colId } = editingCell;
    const col = sheet.columns.find(c => c.id === colId);
    if (!col) return;

    let finalVal: any = editValue;
    if (col.type === 'number' || col.type === 'currency' || col.type === 'percent') {
      const parsed = parseFloat(editValue.replace(/[^0-9.-]/g, ''));
      finalVal = isNaN(parsed) ? 0 : parsed;
    }

    const updatedRows = sheet.rows.map(r => {
      if (r._id === rowId) {
        const updatedRow = { ...r, [colId]: finalVal };
        return recalculateRow(updatedRow, sheet.columns);
      }
      return r;
    });

    onUpdateSheet({
      ...sheet,
      rows: updatedRows,
      updatedAt: new Date().toISOString(),
    });

    setEditingCell(null);
  };

  // Add New Row
  const handleAddRow = () => {
    const newRow: RowData = {
      _id: `row_${Date.now()}`,
    };

    // fill default values
    sheet.columns.forEach(col => {
      if (col.type === 'number' || col.type === 'currency' || col.type === 'percent') {
        newRow[col.id] = 0;
      } else if (col.type === 'date') {
        newRow[col.id] = new Date().toISOString().slice(0, 10);
      } else if (col.type === 'category' && col.options?.length) {
        newRow[col.id] = col.options[0];
      } else if (col.type === 'badge' && col.options?.length) {
        newRow[col.id] = col.options[0];
      } else {
        newRow[col.id] = '';
      }
    });

    const calculated = recalculateRow(newRow, sheet.columns);
    onUpdateSheet({
      ...sheet,
      rows: [calculated, ...sheet.rows],
      updatedAt: new Date().toISOString(),
    });
  };

  // Duplicate Row
  const handleDuplicateRow = (row: RowData) => {
    const cloned = { ...row, _id: `row_${Date.now()}` };
    const calculated = recalculateRow(cloned, sheet.columns);
    onUpdateSheet({
      ...sheet,
      rows: [...sheet.rows, calculated],
      updatedAt: new Date().toISOString(),
    });
  };

  // Delete Single Row
  const handleDeleteRow = (rowId: string) => {
    const updated = sheet.rows.filter(r => r._id !== rowId);
    onUpdateSheet({
      ...sheet,
      rows: updated,
      updatedAt: new Date().toISOString(),
    });
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
  };

  // Bulk Row Actions
  const toggleSelectAll = () => {
    if (selectedRowIds.size === sortedRows.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(sortedRows.map(r => r._id)));
    }
  };

  const toggleSelectRow = (rowId: string) => {
    const next = new Set(selectedRowIds);
    if (next.has(rowId)) {
      next.delete(rowId);
    } else {
      next.add(rowId);
    }
    setSelectedRowIds(next);
  };

  const handleBulkDelete = () => {
    if (!confirm(`Hapus ${selectedRowIds.size} baris terpilih?`)) return;
    const updated = sheet.rows.filter(r => !selectedRowIds.has(r._id));
    onUpdateSheet({
      ...sheet,
      rows: updated,
      updatedAt: new Date().toISOString(),
    });
    setSelectedRowIds(new Set());
  };

  // Delete Column
  const handleDeleteColumn = (colId: string) => {
    if (sheet.columns.length <= 1) {
      alert("Sheet harus memiliki minimal 1 kolom.");
      return;
    }
    if (!confirm("Hapus kolom ini dari sheet?")) return;
    const updatedCols = sheet.columns.filter(c => c.id !== colId);
    onUpdateSheet({
      ...sheet,
      columns: updatedCols,
      updatedAt: new Date().toISOString(),
    });
    setOpenColMenuId(null);
  };

  // Data Cleaning actions
  const handleRemoveEmptyRows = () => {
    const updated = sheet.rows.filter(row => {
      return columns.some(col => {
        const val = row[col.id];
        return val !== null && val !== undefined && String(val).trim() !== '' && val !== 0;
      });
    });
    onUpdateSheet({
      ...sheet,
      rows: updated,
      updatedAt: new Date().toISOString(),
    });
    setShowDataCleanMenu(false);
  };

  const handleFillEmptyZeros = () => {
    const numCols = sheet.columns.filter(c => c.type === 'number' || c.type === 'currency' || c.type === 'percent');
    const updated = sheet.rows.map(row => {
      const r = { ...row };
      numCols.forEach(col => {
        if (r[col.id] === null || r[col.id] === undefined || r[col.id] === '') {
          r[col.id] = 0;
        }
      });
      return recalculateRow(r, sheet.columns);
    });
    onUpdateSheet({
      ...sheet,
      rows: updated,
      updatedAt: new Date().toISOString(),
    });
    setShowDataCleanMenu(false);
  };

  // Column Type Icon
  const getColIcon = (type: ColumnDef['type']) => {
    switch (type) {
      case 'number':
        return <Hash className="w-3.5 h-3.5 text-slate-500" />;
      case 'currency':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-600" />;
      case 'percent':
        return <Percent className="w-3.5 h-3.5 text-amber-600" />;
      case 'date':
        return <Calendar className="w-3.5 h-3.5 text-blue-500" />;
      case 'category':
      case 'badge':
        return <Tag className="w-3.5 h-3.5 text-indigo-500" />;
      case 'formula':
        return <FunctionSquare className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <span className="text-[11px] font-mono text-slate-600 font-bold">Aa</span>;
    }
  };

  // Category Badge Colors
  const getBadgeStyle = (val: string) => {
    const lower = String(val).toLowerCase();
    if (lower.includes('kesehatan') || lower.includes('nakes') || lower.includes('selesai') || lower.includes('efektif') || lower.includes('hemat') || lower.includes('sesuai') || lower.includes('aktif')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
    }
    if (lower.includes('penunjang') || lower.includes('kirim') || lower.includes('elektronik') || lower.includes('teknologi')) {
      return 'bg-sky-50 text-sky-700 border-sky-200 font-semibold';
    }
    if (lower.includes('pns')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold';
    }
    if (lower.includes('pppk')) {
      return 'bg-purple-50 text-purple-700 border-purple-200 font-semibold';
    }
    if (lower.includes('pjlp')) {
      return 'bg-teal-50 text-teal-700 border-teal-200 font-semibold';
    }
    if (lower.includes('proses') || lower.includes('optimal') || lower.includes('pending') || lower.includes('non pns')) {
      return 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
    }
    if (lower.includes('batal') || lower.includes('lebih') || lower.includes('optimasi') || lower.includes('rugi') || lower.includes('cpns')) {
      return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200 font-medium';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-105px)] bg-slate-50">
      {/* Control Toolbar */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        {/* Left Search & Filter Buttons */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="sheet-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kata kunci di semua sel..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Filter Button */}
          <button
            id="btn-filter-trigger"
            onClick={onOpenFilter}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              activeFilters.length > 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
            {activeFilters.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilters.length}
              </span>
            )}
          </button>

          {activeFilters.length > 0 && (
            <button
              onClick={onClearFilters}
              className="text-xs text-rose-600 hover:text-rose-800 underline font-medium"
            >
              Reset Filter
            </button>
          )}

          {/* Data Cleanup Tool */}
          <div className="relative">
            <button
              onClick={() => setShowDataCleanMenu(!showDataCleanMenu)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
              title="Alat Pembersihan Data"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Bersihkan</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {showDataCleanMenu && (
              <div 
                className="absolute left-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-40 text-xs text-slate-700"
                onClick={() => setShowDataCleanMenu(false)}
              >
                <button
                  onClick={handleRemoveEmptyRows}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Hapus Baris Kosong</span>
                </button>
                <button
                  onClick={handleFillEmptyZeros}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>Isi Sel Angka Kosong dgn 0</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Actions: Add Column & Add Row */}
        <div className="flex items-center gap-2">
          {selectedRowIds.size > 0 && (
            <div className="flex items-center gap-2 mr-2 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 animate-in fade-in">
              <span>{selectedRowIds.size} baris terpilih</span>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 text-rose-700 hover:text-rose-900 font-semibold ml-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih</span>
              </button>
            </div>
          )}

          <button
            id="btn-add-column"
            onClick={onOpenAddColumn}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tambah Kolom</span>
          </button>

          <button
            id="btn-add-row"
            onClick={handleAddRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Baris</span>
          </button>
        </div>
      </div>

      {/* SDMK Quick Filter Chips Bar */}
      {isSdmk && (
        <div className="px-4 py-1.5 bg-slate-100/80 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-slate-500 font-bold shrink-0 mr-1">Filter Cepat SDMK:</span>
          {[
            { id: 'ALL', label: `Semua (${sheet.rows.length})` },
            { id: 'NAKES', label: 'Tenaga Kesehatan' },
            { id: 'NON_NAKES', label: 'Tenaga Penunjang' },
            { id: 'PNS', label: 'PNS' },
            { id: 'PPPK', label: 'PPPK' },
            { id: 'NON_PNS', label: 'NON PNS' },
            { id: 'PJLP', label: 'PJLP' },
            { id: '24JAM', label: 'Layanan 24 Jam' },
          ].map(tag => (
            <button
              key={tag.id}
              onClick={() => setQuickTag(tag.id)}
              className={`px-2.5 py-0.5 rounded-full font-semibold shrink-0 transition-all ${
                quickTag === tag.id
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      )}

      {/* Spreadsheet Table Container */}
      <div className="flex-1 overflow-auto bg-white relative">
        <table className="w-full border-collapse text-left text-xs min-w-max">
          {/* Table Header */}
          <thead className="bg-slate-100/90 backdrop-blur-xs sticky top-0 z-20 border-b border-slate-300 shadow-2xs">
            <tr>
              {/* Checkbox Column */}
              <th className="w-10 px-3 py-2.5 text-center border-r border-slate-200 sticky left-0 bg-slate-100 z-30">
                <button
                  onClick={toggleSelectAll}
                  className="text-slate-400 hover:text-slate-600 flex items-center justify-center mx-auto"
                >
                  {selectedRowIds.size === sortedRows.length && sortedRows.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>

              {/* Row Index Column */}
              <th className="w-12 px-2 py-2.5 text-center text-slate-600 font-semibold border-r border-slate-200 sticky left-10 bg-slate-100 z-30">
                #
              </th>

              {/* Dynamic Columns */}
              {columns.map((col) => {
                const isSorted = sortConfig?.columnId === col.id;
                return (
                  <th
                    key={col.id}
                    style={{ width: col.width ? `${col.width}px` : '150px' }}
                    className="px-3 py-2.5 text-slate-700 font-bold border-r border-slate-200 select-none group relative hover:bg-slate-200/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      {/* Column Icon + Title */}
                      <div 
                        className="flex items-center gap-1.5 cursor-pointer truncate flex-1"
                        onClick={() => handleSort(col.id)}
                        title={`Klik untuk mengurutkan ${col.name}`}
                      >
                        {getColIcon(col.type)}
                        <span className="truncate">{col.name}</span>
                        {col.formula && (
                          <span className="text-[10px] px-1 bg-purple-100 text-purple-700 rounded font-mono">
                            fx
                          </span>
                        )}
                      </div>

                      {/* Sort Indicator */}
                      <div className="flex items-center">
                        <button
                          onClick={() => handleSort(col.id)}
                          className="text-slate-400 hover:text-slate-700 p-0.5"
                        >
                          {isSorted ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-60" />
                          )}
                        </button>

                        {/* Column Menu Trigger */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenColMenuId(openColMenuId === col.id ? null : col.id);
                            }}
                            className="p-0.5 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>

                          {openColMenuId === col.id && (
                            <div 
                              className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-40 text-xs font-normal"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-3 py-1 text-[11px] text-slate-600 border-b border-slate-100">
                                Tipe: <span className="font-semibold text-slate-700 capitalize">{col.type}</span>
                              </div>
                              <button
                                onClick={() => {
                                  const updated = sheet.columns.map(c => c.id === col.id ? { ...c, visible: false } : c);
                                  onUpdateSheet({ ...sheet, columns: updated });
                                  setOpenColMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                              >
                                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                <span>Sembunyikan Kolom</span>
                              </button>
                              <button
                                onClick={() => handleDeleteColumn(col.id)}
                                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 flex items-center gap-2 text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus Kolom</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </th>
                );
              })}

              {/* Actions Column */}
              <th className="w-16 px-2 py-2.5 text-center text-slate-600 font-semibold">
                Aksi
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-200">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 3} className="text-center py-12 text-slate-600">
                  <div className="max-w-xs mx-auto flex flex-col items-center gap-2">
                    <Table2 className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-700">Tidak ada baris data</p>
                    <p className="text-xs text-slate-600">
                      {searchQuery || activeFilters.length > 0 
                        ? 'Coba sesuaikan kata kunci pencarian atau hapus filter aktif.'
                        : 'Mulai dengan menambahkan baris data pertama atau impor berkas CSV.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedRows.map((row, rIdx) => {
                const isSelected = selectedRowIds.has(row._id);
                return (
                  <tr
                    key={row._id}
                    className={`group hover:bg-emerald-50/30 transition-colors ${
                      isSelected ? 'bg-emerald-50/50' : rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="w-10 px-3 py-2 text-center border-r border-slate-200 sticky left-0 bg-inherit z-10">
                      <button
                        onClick={() => toggleSelectRow(row._id)}
                        className="text-slate-400 hover:text-slate-600 flex items-center justify-center mx-auto"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                        )}
                      </button>
                    </td>

                    {/* Row Index */}
                    <td className="w-12 px-2 py-2 text-center text-slate-600 font-mono text-[11px] border-r border-slate-200 sticky left-10 bg-inherit z-10">
                      {rIdx + 1}
                    </td>

                    {/* Cells */}
                    {columns.map((col) => {
                      const isEditing = editingCell?.rowId === row._id && editingCell?.colId === col.id;
                      const rawVal = row[col.id];
                      const isNumeric = col.type === 'number' || col.type === 'currency' || col.type === 'percent' || col.type === 'formula';

                      return (
                        <td
                          key={col.id}
                          onDoubleClick={() => startEditing(row._id, col.id, rawVal, col.type)}
                          className={`px-3 py-1.5 border-r border-slate-200 relative ${
                            isNumeric ? 'text-right tabular-nums font-mono' : 'text-left'
                          } ${col.type === 'formula' ? 'bg-purple-50/20' : 'cursor-text'}`}
                        >
                          {isEditing ? (
                            col.type === 'category' && col.options?.length ? (
                              <select
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveCellEdit}
                                className="w-full text-xs p-1 bg-white border border-emerald-500 rounded shadow-xs focus:outline-none"
                              >
                                {col.options.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : col.type === 'badge' && col.options?.length ? (
                              <select
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveCellEdit}
                                className="w-full text-xs p-1 bg-white border border-emerald-500 rounded shadow-xs focus:outline-none"
                              >
                                {col.options.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                autoFocus
                                type={col.type === 'date' ? 'date' : 'text'}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveCellEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveCellEdit();
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-full text-xs p-1 bg-white border border-emerald-500 rounded shadow-xs focus:outline-none"
                              />
                            )
                          ) : (
                            <div className="flex items-center gap-1.5 justify-between">
                              {col.type === 'badge' ? (
                                <span className={`inline-block px-2 py-0.5 text-[11px] font-medium border rounded-full ${getBadgeStyle(String(rawVal || ''))}`}>
                                  {rawVal || '-'}
                                </span>
                              ) : col.type === 'category' ? (
                                <span className="inline-block px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded-md">
                                  {rawVal || '-'}
                                </span>
                              ) : (
                                <span className="truncate w-full">
                                  {formatCellValue(rawVal, col)}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Row Action Buttons */}
                    <td className="w-20 px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setSelectedEmployee(row)}
                          title="Lihat Profil & Biodata Pegawai"
                          className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicateRow(row)}
                          title="Duplikasi Baris"
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRow(row._id)}
                          title="Hapus Baris"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Sticky Summary / Aggregation Footer */}
          <tfoot className="bg-slate-100 sticky bottom-0 z-20 border-t-2 border-slate-300 font-semibold text-slate-800 shadow-md">
            <tr>
              <td className="px-3 py-2 text-center border-r border-slate-200 sticky left-0 bg-slate-100 z-30">
                -
              </td>
              <td className="px-2 py-2 text-center text-slate-600 font-mono text-[11px] border-r border-slate-200 sticky left-10 bg-slate-100 z-30">
                ∑
              </td>
              {columns.map(col => {
                const agg = calculateAggregation(sortedRows, col);
                const isNumeric = col.type === 'number' || col.type === 'currency' || col.type === 'percent' || col.type === 'formula';
                return (
                  <td
                    key={col.id}
                    className={`px-3 py-2 border-r border-slate-200 ${
                      isNumeric ? 'text-right tabular-nums font-mono' : 'text-left'
                    }`}
                  >
                    {agg && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-600 uppercase font-sans tracking-wide font-semibold">
                          {col.aggregation}
                        </span>
                        <span className="text-emerald-800 font-bold">{agg}</span>
                      </div>
                    )}
                  </td>
                );
              })}
              <td className="px-2 py-2 text-center text-slate-600 text-[11px]">
                Ringkasan
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Bottom Status Bar */}
      <div className="px-4 py-2 bg-white border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span>
            Total: <strong className="text-slate-800">{sheet.rows.length}</strong> baris data
          </span>
          {sortedRows.length !== sheet.rows.length && (
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Filter aktif: {sortedRows.length} baris ditampilkan
            </span>
          )}
          <span>
            Kolom: <strong className="text-slate-800">{columns.length}</strong> aktif
          </span>
        </div>

        <div className="text-[11px] text-slate-600">
          Tip: Klik dua kali pada sel untuk mengedit nilai secara instan.
        </div>
      </div>

      {/* Employee Profile Dossier Modal */}
      <EmployeeDetailModal
        isOpen={Boolean(selectedEmployee)}
        onClose={() => setSelectedEmployee(null)}
        employee={selectedEmployee}
      />
    </div>
  );
};
