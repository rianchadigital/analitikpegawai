import React, { useState } from 'react';
import { 
  PieChart as PieIcon, 
  Home, 
  Grid, 
  BadgeCheck, 
  Clock, 
  MapPin, 
  Layers,
  Sparkles,
  Award
} from 'lucide-react';
import { Sheet, RowData } from '../../types/sheet';
import { GrafikVisual } from './GrafikVisual';
import { DomisiliManager } from './DomisiliManager';
import { MatrixPivot } from './MatrixPivot';
import { StrSipMonitoring } from './StrSipMonitoring';
import { ProyeksiPensiun } from './ProyeksiPensiun';
import { SebaranWilayah } from './SebaranWilayah';
import { DukPegawai } from './DukPegawai';

export type AnalyticsSubTab = 
  | 'grafik_visual'
  | 'duk'
  | 'domisili'
  | 'matrix_pivot'
  | 'str_sip'
  | 'proyeksi_pensiun'
  | 'sebaran_wilayah';

interface AnalyticsWorkspaceProps {
  sheet: Sheet;
  onUpdateRow?: (rowId: string, updatedFields: Partial<RowData>) => void;
  initialSubTab?: AnalyticsSubTab;
}

export const AnalyticsWorkspace: React.FC<AnalyticsWorkspaceProps> = ({
  sheet,
  onUpdateRow,
  initialSubTab = 'grafik_visual'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubTab>(initialSubTab);

  const subTabs = [
    {
      id: 'grafik_visual' as AnalyticsSubTab,
      label: 'Grafik Visual',
      icon: PieIcon,
      color: 'text-blue-600',
      desc: 'Dashboard ringkasan metrik & grafik visual'
    },
    {
      id: 'duk' as AnalyticsSubTab,
      label: 'DUK (Urutan Kepangkatan)',
      icon: Award,
      color: 'text-indigo-600',
      desc: 'Daftar Urut Kepangkatan khusus ASN (PNS, CPNS & PPPK) urut pangkat tertinggi'
    },
    {
      id: 'domisili' as AnalyticsSubTab,
      label: 'Domisili Tempat Tinggal',
      icon: Home,
      color: 'text-teal-600',
      desc: 'Pengelolaan data alamat tinggal staf'
    },
    {
      id: 'matrix_pivot' as AnalyticsSubTab,
      label: 'Matrix Pivot',
      icon: Grid,
      color: 'text-cyan-600',
      desc: 'Tabulasi silang dimensi 2D'
    },
    {
      id: 'str_sip' as AnalyticsSubTab,
      label: 'STR & SIP Monitoring',
      icon: BadgeCheck,
      color: 'text-rose-600',
      desc: 'Monitoring surat tanda registrasi & izin praktik'
    },
    {
      id: 'proyeksi_pensiun' as AnalyticsSubTab,
      label: 'Proyeksi Pensiun',
      icon: Clock,
      color: 'text-amber-600',
      desc: 'Timeline suksesi & proyeksi pensiun'
    },
    {
      id: 'sebaran_wilayah' as AnalyticsSubTab,
      label: 'Sebaran Wilayah',
      icon: MapPin,
      color: 'text-blue-600',
      desc: 'Pemetaan sebaran SDMK & standar 9 nakes Permenkes 43/2019'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Navigation Bar matching user attachment */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-1">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`subtab-${tab.id}`}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20 font-bold'
                    : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/70 shadow-2xs font-semibold'
                }`}
                title={tab.desc}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
                <span className={isActive ? 'text-white' : 'text-slate-800'}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-tab view switch */}
      <div className="animate-in fade-in duration-150">
        {activeSubTab === 'grafik_visual' && (
          <GrafikVisual sheet={sheet} />
        )}
        {activeSubTab === 'duk' && (
          <DukPegawai sheet={sheet} />
        )}
        {activeSubTab === 'domisili' && (
          <DomisiliManager sheet={sheet} onUpdateRow={onUpdateRow} />
        )}
        {activeSubTab === 'matrix_pivot' && (
          <MatrixPivot sheet={sheet} />
        )}
        {activeSubTab === 'str_sip' && (
          <StrSipMonitoring sheet={sheet} onUpdateRow={onUpdateRow} />
        )}
        {activeSubTab === 'proyeksi_pensiun' && (
          <ProyeksiPensiun sheet={sheet} />
        )}
        {activeSubTab === 'sebaran_wilayah' && (
          <SebaranWilayah sheet={sheet} />
        )}
      </div>
    </div>
  );
};
