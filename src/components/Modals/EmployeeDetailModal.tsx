import React from 'react';
import { 
  X, 
  User, 
  Briefcase, 
  GraduationCap, 
  Clock, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Calendar,
  Hourglass,
  ExternalLink
} from 'lucide-react';
import { RowData } from '../../types/sheet';

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: RowData | null;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  isOpen,
  onClose,
  employee
}) => {
  if (!isOpen || !employee) return null;

  const isNakes = employee.jenis_tenaga === 'Tenaga Kesehatan';
  const whatsappUrl = employee.nomor_hp 
    ? `https://wa.me/${employee.nomor_hp.replace(/\D/g, '').replace(/^0/, '62')}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-xl font-bold text-white shadow-inner">
              {employee.nama ? employee.nama.charAt(0).toUpperCase() : <User className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                  isNakes ? 'bg-emerald-400/25 text-emerald-100 border border-emerald-300/30' : 'bg-sky-400/25 text-sky-100 border border-sky-300/30'
                }`}>
                  {employee.jenis_tenaga || 'Pegawai'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white/20 text-white">
                  {employee.status_kepegawaian || 'Aktif'}
                </span>
              </div>
              <h2 className="text-lg font-bold mt-1 text-white tracking-tight">
                {employee.nama_gelar || employee.nama || 'Data Pegawai'}
              </h2>
              <p className="text-xs text-emerald-100 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                <span>{employee.tempat_tugas || '-'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">NIP / ID Pegawai</span>
              <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block truncate">
                {employee.nip || '-'}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">Golongan</span>
              <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                {employee.gol || '-'}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">Masa Kerja</span>
              <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                {employee.masa_kerja || '-'}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">Usia Saat Ini</span>
              <span className="text-xs font-bold text-purple-700 mt-0.5 block">
                {employee.usia || '-'}
              </span>
            </div>
          </div>

          {/* Section 1: Informasi Jabatan & Penempatan */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Briefcase className="w-4 h-4 text-emerald-600" />
              <span>Informasi Jabatan & Penugasan</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
              <div>
                <span className="text-slate-500 block">Jabatan Pergub:</span>
                <span className="font-semibold text-slate-900">{employee.jabatan || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Rumpun Jabatan:</span>
                <span className="font-semibold text-slate-900">{employee.rumpun_jabatan || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Layanan / Jam Kerja (Kepgub 755):</span>
                <span className="font-semibold text-slate-900">{employee.jam_kerja || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Kerja Tim / Regu Shift:</span>
                <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold text-[11px]">
                  {employee.kerja_tim || 'Reguler'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">TMT Mulai Bekerja:</span>
                <span className="font-semibold text-slate-900">{employee.tmt_mulai || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status Bekerja:</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {employee.status_bekerja || 'AKTIF'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Riwayat Pendidikan & Kualifikasi */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <GraduationCap className="w-4 h-4 text-sky-600" />
              <span>Kualifikasi Pendidikan</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
              <div>
                <span className="text-slate-500 block">Jenjang Pendidikan:</span>
                <span className="font-semibold text-slate-900">{employee.pendidikan || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Asal Sekolah / Kampus:</span>
                <span className="font-semibold text-slate-900">{employee.sekolah_pt || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Tahun Kelulusan:</span>
                <span className="font-semibold text-slate-900">{employee.tahun_lulus || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Jenjang Karier Fungsional:</span>
                <span className="font-semibold text-slate-900">{employee.jenjang_saat_ini || '-'}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Garis Waktu Pensiun */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Hourglass className="w-4 h-4 text-amber-600" />
              <span>Prediksi & Garis Waktu Pensiun</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
              <div>
                <span className="text-slate-500 block">Batas Tanggal Pensiun:</span>
                <span className="font-semibold text-slate-900">{employee.tanggal_pensiun || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Sisa Masa Pengabdian:</span>
                <span className="font-semibold text-amber-700 font-mono">{employee.sisa_pensiun || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Kelompok Usia:</span>
                <span className="font-semibold text-slate-900">{employee.kelompok_usia || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Agama:</span>
                <span className="font-semibold text-slate-900">{employee.agama || '-'}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Kontak & Komunikasi */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Phone className="w-4 h-4 text-purple-600" />
              <span>Informasi Kontak</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[11px]">Email Resmi / Pribadi</span>
                  {employee.email ? (
                    <a href={`mailto:${employee.email}`} className="text-emerald-700 hover:underline font-medium">
                      {employee.email}
                    </a>
                  ) : (
                    <span className="text-slate-500">-</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[11px]">Nomor WhatsApp / HP</span>
                  {employee.nomor_hp ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-slate-900">{employee.nomor_hp}</span>
                      {whatsappUrl && (
                        <a 
                          href={whatsappUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded flex items-center gap-1 transition-colors"
                        >
                          <span>WA</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-500">-</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-600">
            Sumber Data: Google Sheets Master Puskesmas Kepulauan Seribu Selatan
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
