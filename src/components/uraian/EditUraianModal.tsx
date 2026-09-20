import React, { useState } from 'react';
import { RowData } from '../../types/sheet';
import { X, Save, Upload, User, FileText, CheckSquare, Shield, Calendar, FolderOpen, ExternalLink } from 'lucide-react';
import { convertGoogleDriveUrl, GOOGLE_DRIVE_FOTO_FOLDER_URL } from '../../utils/googleDriveHelper';

interface EditUraianModalProps {
  initialData?: RowData | null;
  onSave: (data: RowData) => void;
  onClose: () => void;
}

export const EditUraianModal: React.FC<EditUraianModalProps> = ({
  initialData,
  onSave,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'bio' | 'pokok' | 'tambahan' | 'pejabat'>('bio');

  const [formData, setFormData] = useState<RowData>(() => {
    if (initialData) return { ...initialData };
    return {
      _id: `uraian_staff_${Date.now()}`,
      no: 1,
      nama: '',
      nip: '',
      status: 'PNS',
      jabatan: '',
      tempat_tugas: 'Puskesmas Kepulauan Seribu Selatan',
      ikhtisar_jabatan: '',
      tugas_pokok_1: '',
      tugas_pokok_2: '',
      tugas_pokok_3: '',
      tugas_pokok_4: '',
      tugas_pokok_5: '',
      tugas_pokok_6: '',
      tugas_pokok_7: '',
      tugas_pokok_8: '',
      tugas_pokok_9: '',
      tugas_pokok_10: '',
      tugas_tambahan_1: '',
      tugas_tambahan_2: '',
      tugas_tambahan_3: '',
      tugas_tambahan_4: '',
      tugas_tambahan_5: '',
      foto: '',
      nama_pemberi_tugas: 'dr. Ignatius Dendy Purnama',
      nip_pemberi_tugas: '198607192014031004',
      jabatan_pemberi_tugas: 'Kepala Puskesmas Kepulauan Seribu Selatan',
      tanggal_penetapan: 'Jakarta, 03 Mei 2025'
    };
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          handleChange('foto', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama?.trim()) {
      alert('Nama pegawai wajib diisi!');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                {initialData ? 'Edit Data Uraian Tugas Pegawai' : 'Tambah Uraian Tugas Pegawai Baru'}
              </h3>
              <p className="text-[11px] text-emerald-100">
                Puskesmas Kepulauan Seribu Selatan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('bio')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'bio'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Biodata & Ikhtisar</span>
          </button>
          <button
            onClick={() => setActiveTab('pokok')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'pokok'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Tugas Pokok (1 - 10)</span>
          </button>
          <button
            onClick={() => setActiveTab('tambahan')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'tambahan'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Tugas Tambahan (1 - 5)</span>
          </button>
          <button
            onClick={() => setActiveTab('pejabat')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'pejabat'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Penandatangan & Tanggal</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: Biodata & Ikhtisar */}
          {activeTab === 'bio' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap & Gelar *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nama || ''}
                    onChange={(e) => handleChange('nama', e.target.value)}
                    placeholder="Contoh: Assya Zazhilla, S.K.M"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NIP / ID Pegawai
                  </label>
                  <input
                    type="text"
                    value={formData.nip || ''}
                    onChange={(e) => handleChange('nip', e.target.value)}
                    placeholder="Contoh: 199810182025062014"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Pegawai
                  </label>
                  <select
                    value={formData.status || 'PNS'}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="PPPK PW">PPPK PW</option>
                    <option value="NON PNS">NON PNS</option>
                    <option value="PJLP">PJLP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jabatan
                  </label>
                  <input
                    type="text"
                    value={formData.jabatan || ''}
                    onChange={(e) => handleChange('jabatan', e.target.value)}
                    placeholder="Contoh: Penata Kelola Layanan Kesehatan"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tempat / Unit Tugas
                  </label>
                  <select
                    value={formData.tempat_tugas || 'Puskesmas Kepulauan Seribu Selatan'}
                    onChange={(e) => handleChange('tempat_tugas', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="Puskesmas Kepulauan Seribu Selatan">Puskesmas Kepulauan Seribu Selatan</option>
                    <option value="Puskesmas Pembantu Pulau Pari">Puskesmas Pembantu Pulau Pari</option>
                    <option value="Puskesmas Pembantu Pulau Lancang">Puskesmas Pembantu Pulau Lancang</option>
                    <option value="Puskesmas Pembantu Pulau Untung Jawa">Puskesmas Pembantu Pulau Untung Jawa</option>
                  </select>
                </div>
              </div>

              {/* Photo upload / URL */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Pasfoto Pegawai (Latar Belakang Merah ASN)
                </label>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-20 border border-black bg-red-600 flex items-center justify-center overflow-hidden shrink-0 shadow-xs"
                    style={{ backgroundColor: '#c8102e' }}
                  >
                    {formData.foto ? (
                      <img src={formData.foto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-white font-bold text-center px-1">Pasfoto</span>
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <input
                      type="text"
                      placeholder="Masukkan URL Foto atau Tautan Google Drive"
                      value={formData.foto || ''}
                      onChange={(e) => handleChange('foto', convertGoogleDriveUrl(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Unggah dari Perangkat</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                      <a
                        href={GOOGLE_DRIVE_FOTO_FOLDER_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                        title="Buka Folder Google Drive Foto Resmi"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Folder Google Drive Foto</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {formData.foto && (
                        <button
                          type="button"
                          onClick={() => handleChange('foto', '')}
                          className="text-xs text-rose-600 hover:underline ml-auto"
                        >
                          Hapus Foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ikhtisar Jabatan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ikhtisar Jabatan
                </label>
                <textarea
                  rows={3}
                  value={formData.ikhtisar_jabatan || ''}
                  onChange={(e) => handleChange('ikhtisar_jabatan', e.target.value)}
                  placeholder="Ringkasan tugas jabatan..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Tugas Pokok (1 - 10) */}
          {activeTab === 'pokok' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 italic">
                Isi uraian tugas pokok pegawai (maksimal 10 butir sesuai format resmi):
              </p>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <div key={`input-pokok-${num}`} className="flex items-start gap-2">
                  <span className="w-6 pt-2 text-center font-bold text-xs text-slate-600">
                    {num}.
                  </span>
                  <input
                    type="text"
                    value={formData[`tugas_pokok_${num}`] || ''}
                    onChange={(e) => handleChange(`tugas_pokok_${num}`, e.target.value)}
                    placeholder={`Uraian tugas pokok ke-${num}`}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Tugas Tambahan (1 - 5) */}
          {activeTab === 'tambahan' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 italic">
                Isi tugas tambahan / tim kerja terintegrasi (maksimal 5 butir sesuai format resmi):
              </p>
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={`input-tambahan-${num}`} className="flex items-start gap-2">
                  <span className="w-6 pt-2 text-center font-bold text-xs text-slate-600">
                    {num}.
                  </span>
                  <input
                    type="text"
                    value={formData[`tugas_tambahan_${num}`] || ''}
                    onChange={(e) => handleChange(`tugas_tambahan_${num}`, e.target.value)}
                    placeholder={`Uraian tugas tambahan ke-${num}`}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: Penandatangan */}
          {activeTab === 'pejabat' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Data Yang Memberi Tugas (Pimpinan)
                </h4>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Kepala Puskesmas & Gelar
                  </label>
                  <input
                    type="text"
                    value={formData.nama_pemberi_tugas || 'dr. Ignatius Dendy Purnama'}
                    onChange={(e) => handleChange('nama_pemberi_tugas', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      NIP Kepala Puskesmas
                    </label>
                    <input
                      type="text"
                      value={formData.nip_pemberi_tugas || '198607192014031004'}
                      onChange={(e) => handleChange('nip_pemberi_tugas', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Jabatan Pimpinan
                    </label>
                    <input
                      type="text"
                      value={formData.jabatan_pemberi_tugas || 'Kepala Puskesmas Kepulauan Seribu Selatan'}
                      onChange={(e) => handleChange('jabatan_pemberi_tugas', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tempat & Tanggal Penetapan
                </label>
                <input
                  type="text"
                  value={formData.tanggal_penetapan || 'Jakarta, 03 Mei 2025'}
                  onChange={(e) => handleChange('tanggal_penetapan', e.target.value)}
                  placeholder="Contoh: Jakarta, 03 Mei 2025"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Uraian Tugas</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
