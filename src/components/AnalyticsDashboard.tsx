import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Line,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Layers, 
  Calendar, 
  Award, 
  Filter,
  BarChart2,
  PieChart as PieIcon
} from 'lucide-react';
import { Sheet } from '../types/sheet';
import { 
  formatCurrency, 
  formatNumber, 
  calculatePivot, 
  calculateTimeSeries 
} from '../utils/analytics';
import { SdmkDashboard } from './SdmkDashboard';

interface AnalyticsDashboardProps {
  sheet: Sheet;
}

const PALETTE = [
  '#059669', // Emerald
  '#0284c7', // Sky
  '#7c3aed', // Violet
  '#d97706', // Amber
  '#e11d48', // Rose
  '#0d9488', // Teal
  '#4f46e5', // Indigo
  '#64748b', // Slate
];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ sheet }) => {
  // Available numeric columns for metric selection
  const numericColumns = useMemo(() => {
    return sheet.columns.filter(
      c => c.type === 'number' || c.type === 'currency' || c.type === 'percent' || c.type === 'formula'
    );
  }, [sheet.columns]);

  // Available categorical columns for grouping
  const categoryColumns = useMemo(() => {
    return sheet.columns.filter(
      c => c.type === 'category' || c.type === 'badge' || c.type === 'text'
    );
  }, [sheet.columns]);

  // Available date columns
  const dateColumns = useMemo(() => {
    return sheet.columns.filter(c => c.type === 'date');
  }, [sheet.columns]);

  // State for chosen metric & category dimension
  const [selectedMetricId, setSelectedMetricId] = useState<string>(() => {
    return sheet.primaryMetricId || numericColumns[0]?.id || '';
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => {
    return sheet.primaryCategoryId || categoryColumns[0]?.id || '';
  });

  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | '7d' | '30d'>('all');
  const [sdmkMode, setSdmkMode] = useState<'sdmk' | 'custom'>('sdmk');

  const isSdmkSheet = useMemo(() => {
    return sheet.id === 'sheet-master-puskesmas' || 
      sheet.columns.some(c => c.id === 'status_kepegawaian' || c.id === 'tempat_tugas');
  }, [sheet]);

  const metricCol = sheet.columns.find(c => c.id === selectedMetricId) || numericColumns[0];
  const categoryCol = sheet.columns.find(c => c.id === selectedCategoryId) || categoryColumns[0];
  const dateCol = sheet.columns.find(c => c.type === 'date') || dateColumns[0];

  // Filter rows based on date range if applicable
  const filteredRows = useMemo(() => {
    if (dateRangeFilter === 'all' || !dateCol) return sheet.rows;
    
    // Sort rows by date and slice
    const sorted = [...sheet.rows].sort((a, b) => {
      const dA = new Date(a[dateCol.id] || '').getTime() || 0;
      const dB = new Date(b[dateCol.id] || '').getTime() || 0;
      return dB - dA;
    });

    const limit = dateRangeFilter === '7d' ? 7 : 30;
    return sorted.slice(0, limit);
  }, [sheet.rows, dateCol, dateRangeFilter]);

  // KPI Calculations
  const kpis = useMemo(() => {
    if (!filteredRows.length || !metricCol) {
      return {
        total: 0,
        average: 0,
        count: 0,
        max: 0,
        topSegment: { category: '-', sharePercent: 0, totalSum: 0 }
      };
    }

    const values = filteredRows.map(r => parseFloat(r[metricCol.id]) || 0);
    const total = values.reduce((a, b) => a + b, 0);
    const average = values.length ? total / values.length : 0;
    const max = Math.max(...values);

    const pivot = calculatePivot(filteredRows, categoryCol?.id || '', metricCol.id);
    const topSegment = pivot[0] || { category: '-', sharePercent: 0, totalSum: 0 };

    return {
      total,
      average,
      count: filteredRows.length,
      max,
      topSegment
    };
  }, [filteredRows, metricCol, categoryCol]);

  // Time series chart data
  const timeSeriesData = useMemo(() => {
    if (!dateCol || !metricCol) return [];
    return calculateTimeSeries(filteredRows, dateCol.id, metricCol.id);
  }, [filteredRows, dateCol, metricCol]);

  // Pivot / Category distribution data
  const categoryData = useMemo(() => {
    if (!categoryCol || !metricCol) return [];
    return calculatePivot(filteredRows, categoryCol.id, metricCol.id);
  }, [filteredRows, categoryCol, metricCol]);

  // Tooltip formatter
  const formatValueByMetric = (val: number) => {
    if (metricCol?.type === 'currency' || metricCol?.name.toLowerCase().includes('harga') || metricCol?.name.toLowerCase().includes('omset') || metricCol?.name.toLowerCase().includes('biaya')) {
      return formatCurrency(val);
    }
    return formatNumber(val);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-115px)]">
      {/* Mode switcher if SDMK sheet */}
      {isSdmkSheet && (
        <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Tampilan Analisis:</span>
            <div className="inline-flex p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setSdmkMode('sdmk')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  sdmkMode === 'sdmk'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏥 Dashboard Eksekutif SDMK Puskesmas
              </button>
              <button
                onClick={() => setSdmkMode('custom')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  sdmkMode === 'custom'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📊 Eksplorasi Metrik BI Dinamis
              </button>
            </div>
          </div>

          <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Terhubung ke Google Sheets Master: 158 Pegawai
          </span>
        </div>
      )}

      {/* Render SdmkDashboard if applicable */}
      {isSdmkSheet && sdmkMode === 'sdmk' ? (
        <SdmkDashboard sheet={sheet} />
      ) : (
        <>
          {/* Dashboard Header Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-emerald-600" />
                <span>Dashboard Analitik & Visualisasi Data</span>
              </h2>
              <p className="text-xs text-slate-700">
                Visualisasi metrik performa, pola tren waktu, dan distribusi segmen dari "{sheet.name}"
              </p>
            </div>

        {/* Dynamic Metric & Dimension Pickers */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-700 font-semibold">Metrik:</span>
            <select
              id="select-metric"
              value={selectedMetricId}
              onChange={(e) => setSelectedMetricId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {numericColumns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-700 font-semibold">Dimensi:</span>
            <select
              id="select-category"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {categoryColumns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {dateCol && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setDateRangeFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  dateRangeFilter === 'all' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setDateRangeFilter('7d')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  dateRangeFilter === '7d' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 Data Terakhir
              </button>
              <button
                onClick={() => setDateRangeFilter('30d')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  dateRangeFilter === '30d' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                30 Data Terakhir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Metric Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between text-slate-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total {metricCol?.name}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {formatValueByMetric(kpis.total)}
          </div>
          <div className="mt-1 text-xs text-emerald-600 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Akumulasi dari seluruh {kpis.count} baris</span>
          </div>
        </div>

        {/* Average Metric Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between text-slate-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Rata-rata Nilai</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {formatValueByMetric(kpis.average)}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Rata-rata per entri {metricCol?.name}
          </div>
        </div>

        {/* Top Performer Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-purple-200 transition-all">
          <div className="flex items-center justify-between text-slate-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Kontributor Utama</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 truncate" title={kpis.topSegment.category}>
            {kpis.topSegment.category}
          </div>
          <div className="mt-1 text-xs text-purple-700 font-medium">
            Menguasai {kpis.topSegment.sharePercent.toFixed(1)}% total ({formatValueByMetric(kpis.topSegment.totalSum)})
          </div>
        </div>

        {/* Total Records Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between text-slate-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Jumlah Data Entri</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {kpis.count} <span className="text-sm font-normal text-slate-700">Baris</span>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Nilai Tertinggi: {formatValueByMetric(kpis.max)}
          </div>
        </div>
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time-Series Area Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Tren Waktu: {metricCol?.name}
              </h3>
              <p className="text-xs text-slate-700">
                Pola fluktuasi kronologis berdasarkan {dateCol?.name || 'Tanggal'}
              </p>
            </div>
            <span className="text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-medium border border-emerald-100">
              Grafik Area Tren
            </span>
          </div>

          <div className="h-72 w-full">
            {timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    stroke="#cbd5e1"
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    stroke="#cbd5e1"
                    tickFormatter={(val) => {
                      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                      return String(val);
                    }}
                  />
                  <Tooltip 
                    formatter={(val: any) => [formatValueByMetric(Number(val)), metricCol?.name]}
                    labelFormatter={(label) => `Tanggal: ${label}`}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#059669" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#emeraldGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-600">
                Pilih kolom bertipe Tanggal untuk melihat tren kronologis.
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart Share % (1 Col) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Pangsa & Komposisi (%)
              </h3>
              <p className="text-xs text-slate-700">
                Distribusi porsi berdasarkan {categoryCol?.name}
              </p>
            </div>
            <PieIcon className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-60 w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="totalSum"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any, name: any, item: any) => [
                      `${formatValueByMetric(Number(val))} (${item.payload.sharePercent.toFixed(1)}%)`,
                      name
                    ]}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-600">
                Tidak ada data kategori yang cukup.
              </div>
            )}
          </div>

          {/* Mini Legend List */}
          <div className="mt-2 space-y-1 max-h-28 overflow-y-auto pr-1">
            {categoryData.slice(0, 5).map((item, idx) => (
              <div key={item.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                  <span className="truncate text-slate-700">{item.category}</span>
                </div>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {item.sharePercent.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Comparison Chart: Categorical Bar Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Perbandingan Akumulasi {metricCol?.name} per {categoryCol?.name}
            </h3>
            <p className="text-xs text-slate-700">
              Evaluasi peringkat kontribusi dan rerata per transaksi tiap segmen
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-3 h-3 bg-emerald-600 rounded-xs inline-block" /> Total Akumulasi
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-3 h-3 bg-amber-500 rounded-full inline-block" /> Rata-rata per Entri
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={categoryData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="category" 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  stroke="#cbd5e1"
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  stroke="#cbd5e1"
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                    return String(val);
                  }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#d97706' }} 
                  stroke="#fcd34d"
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                    return String(val);
                  }}
                />
                <Tooltip 
                  formatter={(val: any, name: any) => {
                    const label = name === 'totalSum' ? `Total ${metricCol?.name}` : 'Rerata per Entri';
                    return [formatValueByMetric(Number(val)), label];
                  }}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar 
                  yAxisId="left"
                  dataKey="totalSum" 
                  name="totalSum"
                  fill="#059669" 
                  radius={[4, 4, 0, 0]} 
                  barSize={32}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="average" 
                  name="average"
                  stroke="#d97706" 
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#d97706' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-600">
              Tidak ada data yang dapat divisualisasikan.
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
};
