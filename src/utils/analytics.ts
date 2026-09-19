import { ColumnDef, RowData, Sheet, AIAnalysisResult } from '../types/sheet';

// Format Indonesian Rupiah Currency
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);

  const isNeg = num < 0;
  const absVal = Math.abs(num);
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(absVal);

  return isNeg ? `-${formatted}` : formatted;
}

// Format Percent
export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return `${num.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
}

// Format Number with thousands separator
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return num.toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

// Format Date to short Indonesian format
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Format Cell Value according to its ColumnType
export function formatCellValue(value: any, column: ColumnDef): string {
  if (value === undefined || value === null || value === '') return '-';
  switch (column.type) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return formatPercent(value);
    case 'number':
      return formatNumber(value);
    case 'date':
      return formatDate(value);
    case 'formula':
      // if column name has 'margin' or '%' or formula produces ratio, or check name
      if (column.name.toLowerCase().includes('%') || column.name.toLowerCase().includes('margin')) {
        return formatPercent(value);
      }
      return formatCurrency(value);
    default:
      return String(value);
  }
}

// Evaluate simple safe mathematical formulas e.g. "[qty] * [unit_price]" or "[budget] - [actual]"
export function evaluateFormula(formula: string, row: RowData): number {
  try {
    // Replace column tokens like [qty] with numerical value from row
    const expression = formula.replace(/\[([a-zA-Z0-9_-]+)\]/g, (_, colId) => {
      const val = row[colId];
      const parsed = parseFloat(val);
      return isNaN(parsed) ? '0' : String(parsed);
    });

    // Clean expression to only allow safe arithmetic chars: digits, spaces, decimal point, + - * / ( )
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      return 0;
    }

    // Safely execute math expression using Function constructor
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${expression});`)();
    return typeof result === 'number' && !isNaN(result) && isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

// Recompute all formula cells in a row
export function recalculateRow(row: RowData, columns: ColumnDef[]): RowData {
  const updated = { ...row };
  for (const col of columns) {
    if (col.type === 'formula' && col.formula) {
      updated[col.id] = evaluateFormula(col.formula, updated);
    }
  }
  return updated;
}

// Column aggregation for footer
export function calculateAggregation(rows: RowData[], column: ColumnDef): string {
  if (!rows.length || column.aggregation === 'none') return '';
  
  if (column.aggregation === 'count') {
    return `${rows.length} data`;
  }

  const values: number[] = [];
  for (const row of rows) {
    const val = parseFloat(row[column.id]);
    if (!isNaN(val)) {
      values.push(val);
    }
  }

  if (values.length === 0) return '-';

  let resultNum = 0;
  switch (column.aggregation) {
    case 'sum':
      resultNum = values.reduce((acc, curr) => acc + curr, 0);
      break;
    case 'avg':
      resultNum = values.reduce((acc, curr) => acc + curr, 0) / values.length;
      break;
    case 'min':
      resultNum = Math.min(...values);
      break;
    case 'max':
      resultNum = Math.max(...values);
      break;
    default:
      return '';
  }

  if (column.type === 'currency' || column.type === 'formula') {
    return formatCurrency(resultNum);
  } else if (column.type === 'percent') {
    return formatPercent(resultNum);
  }
  return formatNumber(resultNum);
}

// Pivot / Group summary
export interface PivotItem {
  category: string;
  count: number;
  totalSum: number;
  average: number;
  min: number;
  max: number;
  sharePercent: number;
}

export function calculatePivot(
  rows: RowData[],
  groupByColId: string,
  metricColId: string
): PivotItem[] {
  if (!rows.length) return [];

  const groups: Record<string, number[]> = {};
  let overallSum = 0;

  for (const row of rows) {
    const key = String(row[groupByColId] || 'Lainnya / Tidak Ditentukan');
    const val = parseFloat(row[metricColId]) || 0;
    if (!groups[key]) groups[key] = [];
    groups[key].push(val);
    overallSum += val;
  }

  const result: PivotItem[] = Object.entries(groups).map(([cat, vals]) => {
    const count = vals.length;
    const totalSum = vals.reduce((a, b) => a + b, 0);
    const average = count > 0 ? totalSum / count : 0;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const sharePercent = overallSum > 0 ? (totalSum / overallSum) * 100 : 0;

    return {
      category: cat,
      count,
      totalSum,
      average,
      min,
      max,
      sharePercent,
    };
  });

  // Sort descending by totalSum
  return result.sort((a, b) => b.totalSum - a.totalSum);
}

// Generate Time Series for charts
export interface TimeSeriesPoint {
  date: string;
  displayDate: string;
  value: number;
  count: number;
}

export function calculateTimeSeries(
  rows: RowData[],
  dateColId: string,
  metricColId: string
): TimeSeriesPoint[] {
  if (!rows.length) return [];

  const dateMap: Record<string, { value: number; count: number }> = {};

  for (const row of rows) {
    const rawDate = row[dateColId];
    if (!rawDate) continue;
    const dateStr = String(rawDate).slice(0, 10);
    const val = parseFloat(row[metricColId]) || 0;

    if (!dateMap[dateStr]) {
      dateMap[dateStr] = { value: 0, count: 0 };
    }
    dateMap[dateStr].value += val;
    dateMap[dateStr].count += 1;
  }

  const sortedDates = Object.keys(dateMap).sort();

  return sortedDates.map((d) => ({
    date: d,
    displayDate: formatDate(d),
    value: dateMap[d].value,
    count: dateMap[d].count,
  }));
}

// Local fallback smart insights generator
export function generateLocalSmartInsights(sheet: Sheet): AIAnalysisResult {
  const rows = sheet.rows;
  const columns = sheet.columns;

  if (rows.length === 0) {
    return {
      executiveSummary: "Data sheet masih kosong. Silakan tambahkan baris data atau impor berkas CSV untuk melihat analitik menyeluruh.",
      keyFindings: ["Tidak ada data yang dapat dianalisis saat ini."],
      anomalies: ["Data belum memiliki entri numerik."],
      actionableRecommendations: ["Mulai input data transaksi atau gunakan salah satu templat bawaan di menu atas."]
    };
  }

  // Find primary metric column or first currency/number
  const metricCol = columns.find(c => c.id === sheet.primaryMetricId) ||
    columns.find(c => c.type === 'currency' || c.type === 'number' || c.type === 'formula') ||
    columns[0];

  const categoryCol = columns.find(c => c.id === sheet.primaryCategoryId) ||
    columns.find(c => c.type === 'category') ||
    columns[1];

  const pivot = calculatePivot(rows, categoryCol?.id || '', metricCol?.id || '');
  const totalRecords = rows.length;

  let totalMetric = 0;
  const values: number[] = [];
  rows.forEach(r => {
    const v = parseFloat(r[metricCol?.id || '']) || 0;
    totalMetric += v;
    values.push(v);
  });

  const avgMetric = totalRecords > 0 ? totalMetric / totalRecords : 0;
  const topSegment = pivot[0];
  const formattedTotal = metricCol?.type === 'currency' ? formatCurrency(totalMetric) : formatNumber(totalMetric);
  const formattedAvg = metricCol?.type === 'currency' ? formatCurrency(avgMetric) : formatNumber(avgMetric);

  // Anomaly check: items exceeding 2x average or negative
  const outliers = rows.filter(r => {
    const v = parseFloat(r[metricCol?.id || '']) || 0;
    return v > avgMetric * 2 || v < 0;
  });

  return {
    executiveSummary: `Lembar kerja "${sheet.name}" mencatat ${totalRecords} baris data aktif dengan total akumulasi ${metricCol?.name || 'Metrik'} mencapai ${formattedTotal} dan nilai rata-rata ${formattedAvg} per baris data. Segmen terkuat saat ini dipimpin oleh "${topSegment?.category || 'Utama'}" dengan pangsa ${topSegment ? topSegment.sharePercent.toFixed(1) : '0'}% dari total portofolio.`,
    keyFindings: [
      `Distribusi didominasi oleh ${topSegment?.category || 'Kategori Utama'} sebesar ${metricCol?.type === 'currency' ? formatCurrency(topSegment?.totalSum || 0) : formatNumber(topSegment?.totalSum || 0)} (${topSegment ? topSegment.sharePercent.toFixed(1) : 0}% dari keseluruhan).`,
      `Rerata nilai transaksi/entri berada pada level ${formattedAvg}, menunjukkan kestabilan volume pada mayoritas entri.`,
      `Terdapat ${pivot.length} segmen kategori teridentifikasi, dengan rasio konsentrasi data yang tersebar aktif.`
    ],
    anomalies: [
      outliers.length > 0 
        ? `Terdeteksi ${outliers.length} data dengan nilai signifikan (lonjakan ekstrem di atas rata-rata atau bernilai defisit/negatif).`
        : `Variasi data relatif proporsional tanpa ada fluktuasi tak wajar yang berlebih.`,
      `Pengecekan kelengkapan field: ${rows.filter(r => !r[metricCol?.id || '']).length} baris teridentifikasi memiliki nilai metrik kosong atau nol.`
    ],
    actionableRecommendations: [
      `Fokuskan optimasi alokasi pada segmen "${topSegment?.category || 'Unggulan'}" yang menghasilkan porsi terbesar untuk mempertahankan momentum pertumbuhan.`,
      `Lakukan tinjauan berkala terhadap baris data dengan lonjakan anomali agar proyeksi analitik tetap memiliki reliabilitas tinggi.`,
      `Manfaatkan fitur Agregasi & Filter lanjutan untuk mengevaluasi performa segmen bawah yang masih memiliki potensi peningkatan.`
    ]
  };
}

// Convert Sheet to CSV String
export function exportSheetToCsv(sheet: Sheet): string {
  const visibleCols = sheet.columns.filter(c => c.visible !== false);
  const header = visibleCols.map(c => `"${c.name.replace(/"/g, '""')}"`).join(',');

  const rows = sheet.rows.map(row => {
    return visibleCols.map(c => {
      const val = row[c.id];
      const strVal = val === null || val === undefined ? '' : String(val);
      return `"${strVal.replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

// Parse CSV text to columns and rows
export function parseCsvToSheet(csvText: string, filename: string): Sheet {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    throw new Error("File CSV kosong");
  }

  // Parse CSV line handling quotes
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === ';') && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return result;
  };

  const headers = parseLine(lines[0]);
  const rowLines = lines.slice(1);

  // Infer column types based on sample data
  const sampleValues: Record<number, string[]> = {};
  rowLines.slice(0, 10).forEach(line => {
    const parsed = parseLine(line);
    parsed.forEach((val, idx) => {
      if (!sampleValues[idx]) sampleValues[idx] = [];
      sampleValues[idx].push(val);
    });
  });

  const columns: ColumnDef[] = headers.map((header, idx) => {
    const id = `col_${idx}_${header.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const vals = sampleValues[idx] || [];
    
    // Type inference
    const isAllNumeric = vals.length > 0 && vals.every(v => v === '' || !isNaN(Number(v.replace(/[.,Rp%]/g, ''))));
    const isDate = vals.length > 0 && vals.every(v => v === '' || !isNaN(Date.parse(v)) && (v.includes('-') || v.includes('/')));
    const hasCurrency = vals.some(v => v.includes('Rp') || v.toLowerCase().includes('idr') || header.toLowerCase().includes('harga') || header.toLowerCase().includes('biaya') || header.toLowerCase().includes('omset') || header.toLowerCase().includes('total'));
    const isPercent = vals.some(v => v.includes('%') || header.toLowerCase().includes('margin') || header.toLowerCase().includes('rasio') || header.toLowerCase().includes('persen'));

    let type: ColumnDef['type'] = 'text';
    let aggregation: ColumnDef['aggregation'] = 'none';

    if (hasCurrency) {
      type = 'currency';
      aggregation = 'sum';
    } else if (isPercent) {
      type = 'percent';
      aggregation = 'avg';
    } else if (isDate) {
      type = 'date';
    } else if (isAllNumeric) {
      type = 'number';
      aggregation = 'sum';
    } else {
      // Check if few distinct categories
      const distinct = Array.from(new Set(vals.filter(Boolean)));
      if (distinct.length > 0 && distinct.length <= 6) {
        type = 'category';
        return {
          id,
          name: header || `Kolom ${idx + 1}`,
          type,
          width: 140,
          visible: true,
          aggregation: 'none',
          options: distinct
        };
      }
    }

    return {
      id,
      name: header || `Kolom ${idx + 1}`,
      type,
      width: 150,
      visible: true,
      aggregation
    };
  });

  const rows: RowData[] = rowLines.map((line, rIdx) => {
    const values = parseLine(line);
    const rowObj: RowData = { _id: `row_${Date.now()}_${rIdx}` };
    columns.forEach((col, cIdx) => {
      let raw = values[cIdx] !== undefined ? values[cIdx] : '';
      if (col.type === 'number' || col.type === 'currency' || col.type === 'percent') {
        const cleaned = raw.replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        rowObj[col.id] = isNaN(num) ? 0 : num;
      } else {
        rowObj[col.id] = raw;
      }
    });
    return rowObj;
  });

  const primaryMetric = columns.find(c => c.type === 'currency' || c.type === 'number');
  const primaryDate = columns.find(c => c.type === 'date');
  const primaryCategory = columns.find(c => c.type === 'category' || c.type === 'text');

  return {
    id: `sheet_${Date.now()}`,
    name: filename.replace(/\.csv$/i, '') || 'Impor Data CSV',
    description: `Diimpor dari ${filename} pada ${new Date().toLocaleDateString('id-ID')}`,
    icon: 'FileSpreadsheet',
    columns,
    rows,
    primaryMetricId: primaryMetric?.id,
    primaryDateId: primaryDate?.id,
    primaryCategoryId: primaryCategory?.id,
    updatedAt: new Date().toISOString()
  };
}
