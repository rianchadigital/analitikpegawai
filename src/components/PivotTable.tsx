import React, { useState, useMemo } from 'react';
import { Layers, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Sheet, RowData } from '../types/sheet';
import { calculatePivot, formatCurrency, formatNumber, PivotItem } from '../utils/analytics';
import { StaffListModal } from './Modals/StaffListModal';

interface PivotTableProps {
  sheet: Sheet;
}

export const PivotTable: React.FC<PivotTableProps> = ({ sheet }) => {
  const numericColumns = useMemo(() => {
    return sheet.columns.filter(
      c => c.type === 'number' || c.type === 'currency' || c.type === 'percent' || c.type === 'formula'
    );
  }, [sheet.columns]);

  const groupableColumns = useMemo(() => {
    return sheet.columns.filter(
      c => c.type === 'category' || c.type === 'badge' || c.type === 'text' || c.type === 'date'
    );
  }, [sheet.columns]);

  const [groupByColId, setGroupByColId] = useState<string>(() => {
    return sheet.primaryCategoryId || groupableColumns[0]?.id || '';
  });

  const [metricColId, setMetricColId] = useState<string>(() => {
    return sheet.primaryMetricId || numericColumns[0]?.id || '';
  });

  const [sortField, setSortField] = useState<keyof PivotItem>('totalSum');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Staff list popup modal state
  const [staffModalData, setStaffModalData] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    badgeText?: string;
    staffList: RowData[];
  }>({
    isOpen: false,
    title: '',
    staffList: []
  });

  const handleOpenStaffModal = (title: string, subtitle: string, list: RowData[]) => {
    setStaffModalData({
      isOpen: true,
      title,
      subtitle,
      badgeText: `${list.length} Pegawai`,
      staffList: list
    });
  };

  const metricCol = sheet.columns.find(c => c.id === metricColId) || numericColumns[0];
  const groupCol = sheet.columns.find(c => c.id === groupByColId) || groupableColumns[0];

  const pivotData = useMemo(() => {
    if (!groupByColId || !metricColId) return [];
    const raw = calculatePivot(sheet.rows, groupByColId, metricColId);

    return [...raw].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [sheet.rows, groupByColId, metricColId, sortField, sortOrder]);

  const totals = useMemo(() => {
    const totalCount = pivotData.reduce((acc, curr) => acc + curr.count, 0);
    const totalSum = pivotData.reduce((acc, curr) => acc + curr.totalSum, 0);
    const average = totalCount > 0 ? totalSum / totalCount : 0;
    return { totalCount, totalSum, average };
  }, [pivotData]);

  const handleSortToggle = (field: keyof PivotItem) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatValue = (val: number) => {
    if (metricCol?.type === 'currency' || metricCol?.name.toLowerCase().includes('harga') || metricCol?.name.toLowerCase().includes('omset') || metricCol?.name.toLowerCase().includes('biaya')) {
      return formatCurrency(val);
    }
    return formatNumber(val);
  };

  const handleExportPivotCsv = () => {
    const headers = ['Kategori', 'Jumlah Entri', `Total ${metricCol?.name}`, 'Rata-rata', 'Min', 'Max', 'Porsi (%)'];
    const rows = pivotData.map(p => [
      `"${p.category.replace(/"/g, '""')}"`,
      p.count,
      p.totalSum,
      p.average.toFixed(2),
      p.min,
      p.max,
      `${p.sharePercent.toFixed(2)}%`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pivot_${sheet.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-115px)]">
      {/* Configuration Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span>Tabel Ringkasan & Pivot Agregasi Data</span>
          </h2>
          <p className="text-xs text-slate-700">
            Kelompokkan baris data berdasarkan dimensi tertentu dan hitung akumulasi metrik otomatis
          </p>
        </div>

        {/* Pivot Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-700 font-semibold">Kelompokkan (Group By):</span>
            <select
              value={groupByColId}
              onChange={(e) => setGroupByColId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {groupableColumns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-700 font-semibold">Nilai Yang Dihitung:</span>
            <select
              value={metricColId}
              onChange={(e) => setMetricColId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {numericColumns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportPivotCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor Ringkasan</span>
          </button>
        </div>
      </div>

      {/* Pivot Table View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th 
                  className="px-4 py-3 cursor-pointer select-none hover:bg-slate-200/60"
                  onClick={() => handleSortToggle('category')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{groupCol?.name || 'Kelompok / Kategori'}</span>
                    {sortField === 'category' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>

                <th 
                  className="px-4 py-3 text-right cursor-pointer select-none hover:bg-slate-200/60"
                  onClick={() => handleSortToggle('count')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Jumlah Entri (Frekuensi)</span>
                    {sortField === 'count' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>

                <th 
                  className="px-4 py-3 text-right cursor-pointer select-none hover:bg-slate-200/60"
                  onClick={() => handleSortToggle('totalSum')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total Akumulasi ({metricCol?.name})</span>
                    {sortField === 'totalSum' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>

                <th 
                  className="px-4 py-3 text-right cursor-pointer select-none hover:bg-slate-200/60"
                  onClick={() => handleSortToggle('average')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Rata-Rata</span>
                    {sortField === 'average' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>

                <th className="px-4 py-3 text-right">Nilai Min</th>
                <th className="px-4 py-3 text-right">Nilai Max</th>

                <th 
                  className="px-4 py-3 text-left w-48 cursor-pointer select-none hover:bg-slate-200/60"
                  onClick={() => handleSortToggle('sharePercent')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Proporsi / Kontribusi</span>
                    {sortField === 'sharePercent' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {pivotData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-600">
                    Tidak ada data yang tersedia untuk pengelompokan pivot.
                  </td>
                </tr>
              ) : (
                pivotData.map((item, idx) => (
                  <tr key={item.category} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>{item.category}</span>
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {item.count > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            const groupStaff = sheet.rows.filter(r => String(r[groupByColId] ?? '(Kosong)') === item.category);
                            handleOpenStaffModal(
                              `Daftar Pegawai: ${item.category}`,
                              `Kategori: ${groupCol?.name || groupByColId} = "${item.category}"`,
                              groupStaff
                            );
                          }}
                          className="hover:underline hover:text-emerald-700 font-bold cursor-pointer inline-block px-1.5 py-0.5 rounded hover:bg-emerald-50"
                          title={`Klik untuk melihat ${item.count} pegawai`}
                        >
                          {item.count} entri
                        </button>
                      ) : (
                        '0 entri'
                      )}
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900 font-mono">
                      {formatValue(item.totalSum)}
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 font-mono">
                      {formatValue(item.average)}
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums text-slate-600 font-mono">
                      {formatValue(item.min)}
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums text-slate-600 font-mono">
                      {formatValue(item.max)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(item.sharePercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 tabular-nums w-12 text-right">
                          {item.sharePercent.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Pivot Totals Footer */}
            <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-slate-900">
              <tr>
                <td className="px-4 py-3">
                  TOTAL KESELURUHAN ({pivotData.length} Kelompok)
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenStaffModal(
                        'Total Seluruh Pegawai',
                        `Total Seluruh Data (${sheet.rows.length} Pegawai)`,
                        sheet.rows
                      );
                    }}
                    className="hover:underline hover:text-emerald-800 font-bold cursor-pointer inline-block px-1.5 py-0.5 rounded hover:bg-emerald-50"
                    title="Klik untuk melihat seluruh pegawai"
                  >
                    {totals.totalCount} entri
                  </button>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-800 text-sm font-mono">
                  {formatValue(totals.totalSum)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-800 font-mono">
                  {formatValue(totals.average)}
                </td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3">100.0%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Staff List Modal */}
      {staffModalData.isOpen && (
        <StaffListModal
          isOpen={staffModalData.isOpen}
          onClose={() => setStaffModalData(prev => ({ ...prev, isOpen: false }))}
          title={staffModalData.title}
          subtitle={staffModalData.subtitle}
          badgeText={staffModalData.badgeText}
          staffList={staffModalData.staffList}
        />
      )}
    </div>
  );
};
