import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  TrendingUp, 
  HelpCircle,
  FileText
} from 'lucide-react';
import { Sheet, AIAnalysisResult } from '../types/sheet';
import { generateLocalSmartInsights, calculatePivot } from '../utils/analytics';

interface SmartInsightsProps {
  sheet: Sheet;
}

export const SmartInsights: React.FC<SmartInsightsProps> = ({ sheet }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [insights, setInsights] = useState<AIAnalysisResult | null>(null);
  const [activePromptResponse, setActivePromptResponse] = useState<string | null>(null);
  const [sourceNote, setSourceNote] = useState<string>('');

  // Generate initial insights on mount or sheet change
  useEffect(() => {
    runAnalysis();
  }, [sheet.id, sheet.rows.length]);

  const runAnalysis = async () => {
    setLoading(true);
    setActivePromptResponse(null);

    // Prepare payload
    const metricCol = sheet.columns.find(c => c.id === sheet.primaryMetricId) ||
      sheet.columns.find(c => c.type === 'currency' || c.type === 'number');
    const categoryCol = sheet.columns.find(c => c.id === sheet.primaryCategoryId) ||
      sheet.columns.find(c => c.type === 'category');

    const pivot = calculatePivot(sheet.rows, categoryCol?.id || '', metricCol?.id || '');
    const summaryStats = {
      totalRows: sheet.rows.length,
      primaryMetric: metricCol?.name,
      pivotBreakdown: pivot.slice(0, 5),
    };

    try {
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetTitle: sheet.name,
          columns: sheet.columns.map(c => ({ id: c.id, name: c.name, type: c.type })),
          sampleRows: sheet.rows.slice(0, 15),
          summaryStats
        })
      });

      const resJson = await response.json();
      if (resJson.success && resJson.data?.executiveSummary) {
        setInsights(resJson.data);
        setSourceNote('Dianalisis menggunakan Gemini AI & Komputasi Statistik');
      } else {
        // Fallback to rich local statistical insights
        const local = generateLocalSmartInsights(sheet);
        setInsights(local);
        setSourceNote('Dianalisis menggunakan Mesin Statistik Lokal');
      }
    } catch {
      const local = generateLocalSmartInsights(sheet);
      setInsights(local);
      setSourceNote('Dianalisis menggunakan Mesin Statistik Lokal');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (questionType: 'outliers' | 'growth' | 'risk') => {
    if (!insights) return;
    if (questionType === 'outliers') {
      setActivePromptResponse(
        `Berdasarkan data "${sheet.name}", variasi entri dinilai berdasarkan standar deviasi rata-rata. ${insights.anomalies.join(' ')} Direkomendasikan untuk memvalidasi baris dengan perbedaan nilai yang signifikan terhadap rata-rata portofolio.`
      );
    } else if (questionType === 'growth') {
      setActivePromptResponse(
        `Untuk memaksimalkan pertumbuhan, fokuskan 70% sumber daya pada segmen dengan kontribusi tertinggi dan margin sehat, sementara 30% sisanya dialokasikan untuk menguji saluran atau produk berpotensi tinggi.`
      );
    } else {
      setActivePromptResponse(
        `Titik risiko utama terletak pada ketergantungan pada 1-2 entri atau kategori dominan. Diversifikasi portofolio sangat disarankan agar performa tidak terdisrupsi fluktuasi pasar.`
      );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-115px)]">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Konsultan & Wawasan Analitik Cerdas
              </h2>
              <p className="text-xs text-slate-700">
                Laporan eksekutif otomatis, temuan anomali, dan rekomendasi berbasis data
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {sourceNote && (
            <span className="text-[11px] text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              {sourceNote}
            </span>
          )}
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Menganalisis...' : 'Perbarui Analisis'}</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xs text-center space-y-3">
          <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            Sedang mengekstrak pola dan menghitung parameter analitik...
          </p>
          <p className="text-xs text-slate-600">
            Menganalisis {sheet.rows.length} baris data dan {sheet.columns.length} kolom
          </p>
        </div>
      )}

      {/* Insight Content */}
      {!loading && insights && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/50 p-6 rounded-xl border border-purple-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-2 text-purple-900">
              <FileText className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Ringkasan Eksekutif (Executive Summary)
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-800 font-medium">
              {insights.executiveSummary}
            </p>
          </div>

          {/* Grid of Key Findings, Anomalies, Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Key Findings */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm border-b border-slate-100 pb-2.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Temuan Kunci Data</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                {insights.keyFindings.map((finding, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Anomalies / Risks */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm border-b border-slate-100 pb-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Anomali & Perhatian Khusus</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                {insights.anomalies.map((anomaly, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{anomaly}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actionable Recommendations */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-sky-800 font-bold text-sm border-b border-slate-100 pb-2.5">
                <Lightbulb className="w-4 h-4 text-sky-600" />
                <span>Rekomendasi Tindakan</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                {insights.actionableRecommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick Analytical Deep-Dive Prompts */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              <span>Pertanyaan Analisis Cepat:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickQuestion('outliers')}
                className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded-lg border border-slate-200 transition-colors"
              >
                🔍 Apakah ada outlier yang signifikan?
              </button>
              <button
                onClick={() => handleQuickQuestion('growth')}
                className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg border border-slate-200 transition-colors"
              >
                🚀 Bagaimana strategi peningkatan performa?
              </button>
              <button
                onClick={() => handleQuickQuestion('risk')}
                className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-700 rounded-lg border border-slate-200 transition-colors"
              >
                ⚠️ Apa risiko konsentrasi segmen saat ini?
              </button>
            </div>

            {activePromptResponse && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed animate-in fade-in">
                {activePromptResponse}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
