import React, { useState } from 'react';
import { RowData } from '../../types/sheet';
import { Printer, X, Filter, Building2, UserCheck } from 'lucide-react';

interface BatchPrintKartuProps {
  rows: RowData[];
  onClose: () => void;
}

export const BatchPrintKartu: React.FC<BatchPrintKartuProps> = ({ rows, onClose }) => {
  const [selectedUnit, setSelectedUnit] = useState<string>('all');

  const unitOptions = [
    { value: 'all', label: 'Semua Unit Kerja (Semua Pegawai)' },
    { value: 'Puskesmas Kepulauan Seribu Selatan', label: 'Puskesmas Kepulauan Seribu Selatan (Kecamatan)' },
    { value: 'Puskesmas Pembantu Pulau Pari', label: 'Pustu Pulau Pari' },
    { value: 'Puskesmas Pembantu Pulau Lancang', label: 'Pustu Pulau Lancang' },
    { value: 'Puskesmas Pembantu Pulau Untung Jawa', label: 'Pustu Pulau Untung Jawa' }
  ];

  const filteredRows = rows.filter(r => {
    if (selectedUnit === 'all') return true;
    return String(r.tempat_tugas || '').includes(selectedUnit);
  });

  const handlePrintAll = () => {
    // Buka tab baru agar dialog cetak dan simpan PDF tidak diblokir oleh sandbox iframe
    const newTab = window.open('about:blank', '_blank');
    const container = document.getElementById('printable-batch-cards-container');
    
    if (!newTab || !container) {
      window.print();
      return;
    }

    try {
      const cloned = container.cloneNode(true) as HTMLElement;
      newTab.document.open();
      newTab.document.write(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>Cetak Massal Kartu Uraian Tugas (${filteredRows.length} Pegawai)</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 6mm;
            }
            body {
              background: #f1f5f9;
              margin: 0;
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .no-print-bar {
              position: sticky;
              top: 0;
              background: #064e3b;
              color: white;
              padding: 12px 24px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-radius: 12px;
              margin-bottom: 24px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              z-index: 100;
            }
            .btn-action {
              background: #10b981;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 8px;
              font-weight: 700;
              cursor: pointer;
              font-size: 13px;
            }
            .btn-action:hover {
              background: #059669;
            }
            @media print {
              .no-print-bar {
                display: none !important;
              }
              body {
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              #printable-batch-cards-container > div {
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
                min-height: 275mm !important;
                max-height: 280mm !important;
                margin: 0 auto !important;
                padding: 16px !important;
                box-shadow: none !important;
                border: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print-bar">
            <div>
              <strong style="font-size: 15px;">Pratinjau Cetak Massal - ${filteredRows.length} Kartu Pegawai</strong>
              <div style="font-size: 12px; opacity: 0.85;">Puskesmas Kepulauan Seribu Selatan</div>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="btn-action" onclick="window.print()">Cetak / Simpan PDF Sekarang (Ctrl+P)</button>
              <button class="btn-action" style="background: #475569;" onclick="window.close()">Tutup</button>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center;">
            ${cloned.outerHTML}
          </div>
          <script>
            window.addEventListener('load', function() {
              setTimeout(function() {
                window.print();
              }, 600);
            });
          </script>
        </body>
        </html>
      `);
      newTab.document.close();
    } catch (e) {
      console.error('Batch print error:', e);
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex flex-col items-center">
      {/* Top Fixed Control Bar for Modal (hidden during print) */}
      <div className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 px-6 py-3 shadow-md flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Cetak Massal Kartu Uraian Tugas (Batch Print)
            </h2>
            <p className="text-xs text-slate-500">
              Menyiapkan {filteredRows.length} lembar kartu A4 siap dicetak atau disimpan ke file PDF
            </p>
          </div>
        </div>

        {/* Filter per Unit */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              {unitOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            id="btn-execute-batch-print"
            onClick={handlePrintAll}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak {filteredRows.length} Kartu Sekarang</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors ml-2"
            title="Tutup Pratinjau Cetak Massal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Cards Loop */}
      <div id="printable-batch-cards-container" className="w-full max-w-[850px] p-6 space-y-12 print:space-y-0 print:p-0">
        {filteredRows.map((staff, pageIdx) => (
          <div
            key={staff._id}
            className="bg-white text-black shadow-lg border border-slate-300 print:border-0 print:shadow-none print:m-0 w-full p-6 sm:p-8 font-sans transition-all print:break-after-page"
            style={{ minHeight: '1050px', pageBreakAfter: 'always' }}
          >
            {/* Exact Master Outer Border Box */}
            <div className="border-[2px] border-black p-4 flex flex-col justify-between" style={{ minHeight: '980px' }}>
              <div>
                {/* Kop Surat */}
                <div className="border-b-[2px] border-black pb-3 mb-3">
                  <div className="grid grid-cols-[80px_1fr_80px] items-center gap-2">
                    <div className="flex justify-center items-center">
                      <img
                        src="/images/logo-dki.png"
                        alt="Logo DKI"
                        className="w-16 h-16 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/logo-dki.svg';
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-black leading-tight">
                        URAIAN TUGAS PEGAWAI
                      </h1>
                      <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-black leading-tight mt-0.5">
                        PUSKESMAS KEPULAUAN SERIBU SELATAN
                      </h2>
                    </div>
                    <div className="flex justify-center items-center">
                      <img
                        src="/images/logo-puskesmas.svg"
                        alt="Logo Puskesmas"
                        className="w-16 h-16 object-contain"
                      />
                    </div>
                  </div>
                </div>

                {/* Identity & Photo */}
                <div className="border-b-[2px] border-black pb-3 mb-3">
                  <div className="grid grid-cols-[1fr_110px] gap-4 items-start">
                    <div className="text-[12px] sm:text-[13px] leading-relaxed space-y-1 text-black">
                      <div className="grid grid-cols-[130px_10px_1fr] items-start">
                        <span className="font-bold">NAMA</span>
                        <span className="font-bold">:</span>
                        <span className="font-bold uppercase">{staff.nama}</span>
                      </div>
                      <div className="grid grid-cols-[130px_10px_1fr] items-start">
                        <span className="font-bold">NIP</span>
                        <span className="font-bold">:</span>
                        <span>{staff.nip || '-'}</span>
                      </div>
                      <div className="grid grid-cols-[130px_10px_1fr] items-start">
                        <span className="font-bold">JABATAN</span>
                        <span className="font-bold">:</span>
                        <span className="font-semibold">{staff.jabatan || '-'}</span>
                      </div>
                      <div className="grid grid-cols-[130px_10px_1fr] items-start">
                        <span className="font-bold">TEMPAT TUGAS</span>
                        <span className="font-bold">:</span>
                        <span>{staff.tempat_tugas || 'Puskesmas Kepulauan Seribu Selatan'}</span>
                      </div>
                      <div className="grid grid-cols-[130px_10px_1fr] items-start pt-0.5">
                        <span className="font-bold">IKHTISAR JABATAN</span>
                        <span className="font-bold">:</span>
                        <p className="text-justify leading-snug">
                          {staff.ikhtisar_jabatan || `Mengelola administrasi, perencanaan, pelaksanaan, pemantauan, evaluasi, dan pelaporan sesuai formasi tugas ${staff.jabatan || 'jabatan'} agar pelayanan kesehatan berjalan efektif, efisien, dan sesuai standar yang ditetapkan.`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                      <div 
                        className="w-[100px] h-[130px] border border-black bg-red-600 flex flex-col items-center justify-center overflow-hidden shadow-xs relative"
                        style={{ backgroundColor: '#c8102e' }}
                      >
                        {staff.foto ? (
                          <img 
                            src={staff.foto} 
                            alt={`Pasfoto ${staff.nama}`} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-white p-1 text-center">
                            <div className="w-12 h-12 rounded-full border border-white/60 flex items-center justify-center mb-1 bg-white/20">
                              <UserCheck className="w-7 h-7 text-white" />
                            </div>
                            <span className="text-[9px] font-bold tracking-tight uppercase leading-tight">
                              PASFOTO 3X4
                            </span>
                            <span className="text-[8px] opacity-80 mt-0.5">
                              ASN PUSKESMAS
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tugas Pokok & Tambahan Tables */}
                <div className="border border-black mb-4">
                  <div className="border-b border-black">
                    <table className="w-full border-collapse text-[11px] sm:text-[12px]">
                      <tbody>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num, idx) => {
                          const taskText = staff[`tugas_pokok_${num}`] || '';
                          return (
                            <tr key={`pokok-${num}`} className="border-b border-black last:border-b-0">
                              {idx === 0 && (
                                <td 
                                  rowSpan={10} 
                                  className="w-[125px] sm:w-[140px] border-r border-black font-extrabold uppercase text-center align-middle p-2 tracking-wider bg-slate-50/30"
                                >
                                  TUGAS POKOK
                                </td>
                              )}
                              <td className="w-[28px] border-r border-black text-center font-bold align-top p-1">
                                {num}
                              </td>
                              <td className="p-1 pl-2 align-top leading-snug min-h-[22px]">
                                {taskText}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <table className="w-full border-collapse text-[11px] sm:text-[12px]">
                      <tbody>
                        {[1, 2, 3, 4, 5].map((num, idx) => {
                          const taskText = staff[`tugas_tambahan_${num}`] || '';
                          return (
                            <tr key={`tambahan-${num}`} className="border-b border-black last:border-b-0">
                              {idx === 0 && (
                                <td 
                                  rowSpan={5} 
                                  className="w-[125px] sm:w-[140px] border-r border-black font-extrabold uppercase text-center align-middle p-2 tracking-wider bg-slate-50/30"
                                >
                                  TUGAS TAMBAHAN
                                </td>
                              )}
                              <td className="w-[28px] border-r border-black text-center font-bold align-top p-1">
                                {num}
                              </td>
                              <td className="p-1 pl-2 align-top leading-snug min-h-[22px]">
                                {taskText}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Signature */}
              <div className="pt-4 border-t-0">
                <div className="grid grid-cols-2 text-[11px] sm:text-[12px] leading-snug">
                  <div className="pl-4">
                    <p className="font-normal">Yang Memberi Tugas</p>
                    <p className="font-semibold">
                      {staff.jabatan_pemberi_tugas || 'Kepala Puskesmas Kepulauan Seribu Selatan'}
                    </p>
                    <div className="h-16 sm:h-20 flex items-center"></div>
                    <p className="font-extrabold underline text-black">
                      {staff.nama_pemberi_tugas || 'dr. Ignatius Dendy Purnama'}
                    </p>
                    <p className="text-black">
                      NIP. {staff.nip_pemberi_tugas || '198607192014031004'}
                    </p>
                  </div>

                  <div className="text-left pl-8 sm:pl-16">
                    <p className="font-normal">
                      {staff.tanggal_penetapan || 'Jakarta, 03 Mei 2025'}
                    </p>
                    <p className="font-semibold">Pelaksana</p>
                    <div className="h-16 sm:h-20 flex items-center"></div>
                    <p className="font-extrabold underline text-black">
                      {staff.nama}
                    </p>
                    <p className="text-black">
                      NIP {staff.nip || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
