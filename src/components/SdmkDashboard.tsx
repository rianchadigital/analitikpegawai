import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Stethoscope, 
  Briefcase, 
  Building2, 
  Clock, 
  Hourglass, 
  ShieldCheck, 
  AlertTriangle,
  GraduationCap,
  Calendar,
  ExternalLink,
  Filter,
  Eye,
  ChevronRight,
  TrendingUp,
  MapPin,
  HeartPulse
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Sheet, RowData } from '../types/sheet';
import { EmployeeDetailModal } from './Modals/EmployeeDetailModal';

interface SdmkDashboardProps {
  sheet: Sheet;
  onSelectEmployee?: (employee: RowData) => void;
}

const COLORS = [
  '#059669', // Emerald
  '#0284c7', // Sky
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#e11d48', // Rose
  '#0d9488', // Teal
  '#6366f1', // Indigo
  '#64748b', // Slate
];

export const SdmkDashboard: React.FC<SdmkDashboardProps> = ({ sheet }) => {
  const [filterUnit, setFilterUnit] = useState<string>('ALL');
  const [filterJenisTenaga, setFilterJenisTenaga] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedStaff, setSelectedStaff] = useState<RowData | null>(null);

  // Available unique units
  const units = useMemo(() => {
    const set = new Set<string>();
    sheet.rows.forEach(r => {
      if (r.tempat_tugas) set.add(r.tempat_tugas);
    });
    return Array.from(set);
  }, [sheet.rows]);

  // Available unique status
  const statusList = useMemo(() => {
    const set = new Set<string>();
    sheet.rows.forEach(r => {
      if (r.status_kepegawaian) set.add(r.status_kepegawaian);
    });
    return Array.from(set);
  }, [sheet.rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return sheet.rows.filter(r => {
      if (filterUnit !== 'ALL' && r.tempat_tugas !== filterUnit) return false;
      if (filterJenisTenaga !== 'ALL' && r.jenis_tenaga !== filterJenisTenaga) return false;
      if (filterStatus !== 'ALL' && r.status_kepegawaian !== filterStatus) return false;
      return true;
    });
  }, [sheet.rows, filterUnit, filterJenisTenaga, filterStatus]);

  // Key KPI Calculations
  const totalCount = filteredRows.length;
  const nakesCount = filteredRows.filter(r => r.jenis_tenaga === 'Tenaga Kesehatan').length;
  const nonNakesCount = totalCount - nakesCount;
  const nakesPercentage = totalCount > 0 ? ((nakesCount / totalCount) * 100).toFixed(1) : '0';

  const pnsCount = filteredRows.filter(r => r.status_kepegawaian === 'PNS').length;
  const pppkCount = filteredRows.filter(r => r.status_kepegawaian?.includes('PPPK')).length;
  const asnTotal = pnsCount + pppkCount;
  const nonAsnTotal = totalCount - asnTotal;

  // Average Age & Tenure
  const { avgAge, avgTenure, retiringSoonCount } = useMemo(() => {
    let ageSum = 0;
    let ageN = 0;
    let tenureSum = 0;
    let tenureN = 0;
    let retiringSoon = 0;

    filteredRows.forEach(r => {
      const ageNum = typeof r.usia_tahun === 'number' ? r.usia_tahun : parseFloat(r.usia_tahun);
      if (!isNaN(ageNum) && ageNum > 0) {
        ageSum += ageNum;
        ageN++;
      }

      const tenureNum = typeof r.masa_kerja_tahun === 'number' ? r.masa_kerja_tahun : parseFloat(r.masa_kerja_tahun);
      if (!isNaN(tenureNum) && tenureNum > 0) {
        tenureSum += tenureNum;
        tenureN++;
      }

      const sisaNum = typeof r.sisa_pensiun_tahun === 'number' ? r.sisa_pensiun_tahun : parseFloat(r.sisa_pensiun_tahun);
      if (!isNaN(sisaNum) && sisaNum > 0 && sisaNum <= 5) {
        retiringSoon++;
      }
    });

    return {
      avgAge: ageN > 0 ? (ageSum / ageN).toFixed(1) : '0',
      avgTenure: tenureN > 0 ? (tenureSum / tenureN).toFixed(1) : '0',
      retiringSoonCount: retiringSoon
    };
  }, [filteredRows]);

  // Chart Data: Status Kepegawaian
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRows.forEach(r => {
      const st = r.status_kepegawaian || 'Lainnya';
      map[st] = (map[st] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRows]);

  // Chart Data: Sebaran Tempat Tugas / Unit
  const unitData = useMemo(() => {
    const map: Record<string, { total: number; nakes: number }> = {};
    filteredRows.forEach(r => {
      let unit = r.tempat_tugas || 'Puskesmas Kecamatan';
      // Shorten label for chart clarity
      const shortName = unit.replace('Puskesmas Pembantu', 'Pustu').replace('Puskesmas Kepulauan Seribu Selatan', 'Puskesmas Kec.');
      if (!map[shortName]) map[shortName] = { total: 0, nakes: 0 };
      map[shortName].total++;
      if (r.jenis_tenaga === 'Tenaga Kesehatan') map[shortName].nakes++;
    });
    return Object.entries(map).map(([name, data]) => ({
      name,
      total: data.total,
      nakes: data.nakes,
      penunjang: data.total - data.nakes
    }));
  }, [filteredRows]);

  // Chart Data: Kelompok Usia & Gender
  const ageGenderData = useMemo(() => {
    const groups = ['20 - 29 Tahun', '30 - 39 Tahun', '40 - 49 Tahun', '50 Tahun ke atas'];
    const map: Record<string, { laki: number; perempuan: number }> = {};
    groups.forEach(g => {
      map[g] = { laki: 0, perempuan: 0 };
    });

    filteredRows.forEach(r => {
      const g = r.kelompok_usia || '30 - 39 Tahun';
      if (!map[g]) map[g] = { laki: 0, perempuan: 0 };
      const isLaki = r.jenis_kelamin?.toLowerCase().includes('laki');
      if (isLaki) map[g].laki++;
      else map[g].perempuan++;
    });

    return groups.map(g => ({
      name: g,
      Laki: map[g]?.laki || 0,
      Perempuan: map[g]?.perempuan || 0,
      Total: (map[g]?.laki || 0) + (map[g]?.perempuan || 0)
    }));
  }, [filteredRows]);

  // Chart Data: Jenjang Pendidikan
  const educationData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRows.forEach(r => {
      const edu = r.pendidikan || 'Lainnya';
      map[edu] = (map[edu] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRows]);

  // Chart Data: Layanan / Jam Kerja (Kepgub 755)
  const workScheduleData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRows.forEach(r => {
      const jk = r.jam_kerja || 'Lainnya';
      map[jk] = (map[jk] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredRows]);

  // Retiring Soon Staff List
  const retiringStaffList = useMemo(() => {
    return [...filteredRows]
      .filter(r => {
        const sisa = typeof r.sisa_pensiun_tahun === 'number' ? r.sisa_pensiun_tahun : parseFloat(r.sisa_pensiun_tahun);
        return !isNaN(sisa) && sisa > 0 && sisa <= 7;
      })
      .sort((a, b) => {
        const sA = parseFloat(a.sisa_pensiun_tahun) || 99;
        const sB = parseFloat(b.sisa_pensiun_tahun) || 99;
        return sA - sB;
      })
      .slice(0, 10);
  }, [filteredRows]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold text-emerald-100 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Terkoneksi Google Sheets Master: Puskesmas Kepulauan Seribu Selatan</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Dashboard Eksekutif SDMK & Kepegawaian
            </h2>
            <p className="text-xs md:text-sm text-emerald-100 max-w-2xl leading-relaxed">
              Pemantauan terpadu sebaran sumber daya manusia kesehatan, formasi ASN/Non-ASN, 
              kualifikasi kompetensi, perputaran shift 24 jam, dan proyeksi suksesi pensiun di 4 pulau.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="https://docs.google.com/spreadsheets/d/1ykpLnIE8305uphJMvXOdPuwb8T_mkQsnw8GOmByLFko/edit?gid=1900197277#gid=1900197277"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold border border-white/30 transition-all shadow-xs"
            >
              <span>Buka Google Sheets</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span>Filter Interaktif:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Unit / Tempat Tugas */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium">Tempat Tugas:</span>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="ALL">Semua Unit ({sheet.rows.length})</option>
              {units.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Jenis Tenaga */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium">Jenis Tenaga:</span>
            <select
              value={filterJenisTenaga}
              onChange={(e) => setFilterJenisTenaga(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="ALL">Semua Jenis</option>
              <option value="Tenaga Kesehatan">Tenaga Kesehatan (Nakes)</option>
              <option value="Tenaga Penunjang">Tenaga Penunjang</option>
            </select>
          </div>

          {/* Status Kepegawaian */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="ALL">Semua Status</option>
              {statusList.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {(filterUnit !== 'ALL' || filterJenisTenaga !== 'ALL' || filterStatus !== 'ALL') && (
            <button
              onClick={() => {
                setFilterUnit('ALL');
                setFilterJenisTenaga('ALL');
                setFilterStatus('ALL');
              }}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold px-2 py-1 underline"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Top KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Total SDMK */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total SDMK</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{totalCount}</span>
            <span className="text-xs text-slate-500">orang</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1">Data master tersinkron</p>
        </div>

        {/* Card 2: Tenaga Kesehatan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tenaga Kesehatan</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-teal-700 tracking-tight">{nakesCount}</span>
            <span className="text-xs font-semibold text-teal-600">({nakesPercentage}%)</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1">Dokter, Bidan, Perawat dll</p>
        </div>

        {/* Card 3: Tenaga Penunjang */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-sky-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tenaga Penunjang</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-sky-700 tracking-tight">{nonNakesCount}</span>
            <span className="text-xs text-slate-500">orang</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1">Manajemen & Operasional</p>
        </div>

        {/* Card 4: Formasi ASN (PNS & PPPK) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Aparatur Sipil (ASN)</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-indigo-700 tracking-tight">{asnTotal}</span>
            <span className="text-xs text-slate-500 font-medium">({totalCount > 0 ? ((asnTotal/totalCount)*100).toFixed(0) : 0}%)</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1">PNS: {pnsCount} | PPPK: {pppkCount}</p>
        </div>

        {/* Card 5: Rata-rata Usia */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-purple-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Rata-rata Usia</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-purple-700 tracking-tight">{avgAge}</span>
            <span className="text-xs text-slate-500">tahun</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1">Masa kerja rata-rata: {avgTenure} thn</p>
        </div>

        {/* Card 6: Pensiun <= 5 Tahun */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pensiun &le; 5 Thn</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-amber-700 tracking-tight">{retiringSoonCount}</span>
            <span className="text-xs text-slate-500">pegawai</span>
          </div>
          <p className="text-[11px] text-amber-700 font-semibold mt-1">Perlu perencanaan formasi</p>
        </div>
      </div>

      {/* Row of Charts: Formasi Status Kepegawaian & Sebaran Pulau */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Distribusi Status Kepegawaian */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Distribusi Status Kepegawaian
              </h3>
              <p className="text-xs text-slate-500">Komposisi pegawai berdasarkan status kontrak dan ketetapan</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
              {statusData.length} Status
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip 
                  formatter={(value: any) => [`${value} Pegawai`, 'Jumlah']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#059669" radius={[6, 6, 0, 0]}>
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Sebaran Pegawai Berdasarkan Tempat / Pulau Tugas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Sebaran SDMK per Unit / Pulau
              </h3>
              <p className="text-xs text-slate-500">Perbandingan Tenaga Kesehatan vs Tenaga Penunjang per lokasi</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              4 Lokasi Layanan
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unitData} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  interval={0}
                  angle={-10}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="nakes" name="Tenaga Kesehatan" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
                <Bar dataKey="penunjang" name="Tenaga Penunjang" stackId="a" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row of Charts: Kelompok Usia & Gender, Tingkat Pendidikan, dan Jam Kerja */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 3: Kelompok Usia & Gender */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Piramida Kelompok Usia
            </h3>
            <p className="text-xs text-slate-500">Komposisi usia pegawai per jenis kelamin</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageGenderData} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Bar dataKey="Laki" name="Laki-Laki" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Perempuan" name="Perempuan" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Jenjang Pendidikan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Kualifikasi Pendidikan
            </h3>
            <p className="text-xs text-slate-500">Tingkat pendidikan terakhir pegawai</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={educationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {educationData.map((_, index) => (
                    <Cell key={`cell-edu-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v} Orang`, 'Jumlah']} contentStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Layanan & Jam Kerja (Kepgub 755) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Pengaturan Jam Kerja (Kepgub 755)
            </h3>
            <p className="text-xs text-slate-500">Distribusi shift layanan 24 jam vs regular</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workScheduleData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#475569' }} />
                <Tooltip formatter={(v: any) => [`${v} Pegawai`, 'Pegawai']} contentStyle={{ fontSize: '11px' }} />
                <Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]}>
                  {workScheduleData.map((_, index) => (
                    <Cell key={`cell-ws-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Radar Perencanaan Suksesi & Pegawai Pensiun Dekat */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Hourglass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Monitoring Garis Waktu Pensiun & Regenerasi Formasi Pegawai
              </h3>
              <p className="text-xs text-slate-500">
                Daftar pegawai yang akan memasuki batas usia pensiun dalam 5-7 tahun ke depan
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
            {retiringStaffList.length} Pegawai Terpantau
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Nama Pegawai & Gelar</th>
                <th className="px-4 py-3">Jabatan</th>
                <th className="px-4 py-3">Unit Tugas</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Usia</th>
                <th className="px-4 py-3">Tgl Pensiun</th>
                <th className="px-4 py-3">Sisa Waktu</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {retiringStaffList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-slate-500">
                    Tidak ada pegawai yang mendekati pensiun pada filter saat ini.
                  </td>
                </tr>
              ) : (
                retiringStaffList.map((st) => {
                  const sisa = parseFloat(st.sisa_pensiun_tahun) || 10;
                  const isCritical = sisa <= 3;

                  return (
                    <tr key={st._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {st.nama_gelar || st.nama}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{st.jabatan || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{st.tempat_tugas || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-800">
                          {st.status_kepegawaian || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-purple-700 font-medium">{st.usia || '-'}</td>
                      <td className="px-4 py-3 text-slate-700 font-mono">{st.tanggal_pensiun || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          isCritical ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {st.sisa_pensiun || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedStaff(st)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Profil</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Detail Modal */}
      <EmployeeDetailModal
        isOpen={Boolean(selectedStaff)}
        onClose={() => setSelectedStaff(null)}
        employee={selectedStaff}
      />
    </div>
  );
};
