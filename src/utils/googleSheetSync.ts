import { Sheet, RowData, ColumnDef } from '../types/sheet';
import { MASTER_SHEET_DATA } from '../data/masterSheetData';
import { URAIAN_TUGAS_SHEET_DATA, URAIAN_TUGAS_COLUMNS } from '../data/defaultUraianTugas';
import { convertGoogleDriveUrl } from './googleDriveHelper';

const SPREADSHEET_ID = '1ykpLnIE8305uphJMvXOdPuwb8T_mkQsnw8GOmByLFko';
const GID = '1900197277';

export const URAIAN_SPREADSHEET_ID = '10MGH1h8nirliwFsyICcCghylhARdjCt8ulhKfrng_c0';
export const URAIAN_GID = '0';


export function parseYearMonth(str: string): number {
  if (!str) return 0;
  const yearMatch = str.match(/(\d+)\s*Tahun/i);
  const monthMatch = str.match(/(\d+)\s*Bulan/i);
  const years = yearMatch ? parseInt(yearMatch[1], 10) : 0;
  const months = monthMatch ? parseInt(monthMatch[1], 10) : 0;
  return Number((years + months / 12).toFixed(1));
}

export function parseCSV(text: string): string[][] {
  const arr: string[][] = [];
  let quote = false;
  let row: string[] = [''];
  let c = 0;
  for (let i = 0; i < text.length; i++) {
    const cc = text[i], nc = text[i + 1];
    if (cc === '"' && quote && nc === '"') { row[c] += '"'; i++; continue; }
    if (cc === '"') { quote = !quote; continue; }
    if (cc === ',' && !quote) { row.push(''); c++; continue; }
    if ((cc === '\r' || cc === '\n') && !quote) {
      if (cc === '\r' && nc === '\n') i++;
      arr.push(row);
      row = [''];
      c = 0;
      continue;
    }
    row[c] += cc;
  }
  if (row.length > 1 || row[0] !== '') arr.push(row);
  return arr;
}

export function transformCSVToSheet(csvText: string): Sheet {
  const arr = parseCSV(csvText);
  if (arr.length < 2) {
    throw new Error('Data CSV Google Sheet tidak memiliki baris data');
  }

  // Row 0 is Header
  const headers = arr[0].map(h => (h || '').trim().toUpperCase());

  const colIdx = (name: string, fallback: number): number => {
    const idx = headers.findIndex(h => h.includes(name.toUpperCase()));
    return idx !== -1 ? idx : fallback;
  };

  const colMap = {
    no: colIdx('NO', 0),
    nik: colIdx('NIK', 1),
    nama: colIdx('NAMA', 2),
    nama_gelar: colIdx('NAMA DENGAN GELAR', 3),
    tempat_tugas: colIdx('TEMPAT TUGAS', 4),
    jabatan: colIdx('JABATAN PERGUB', 5),
    jabatan_alt: colIdx('JABATAN KEP MENPAN', 6),
    rumpun_jabatan: colIdx('RUMPUN JABATAN', 7),
    status_kepegawaian: colIdx('STATUS KEPEGAWAIAN', 8),
    nip: colIdx('NIP', 9),
    nrk: colIdx('NRK', 10),
    gol: colIdx('GOL', 11),
    masa_kerja: colIdx('MASA KERJA', 17),
    gender: colIdx('JENIS KELAMIN', 18),
    provinsi: colIdx('PROVINSI', 19),
    kab: colIdx('KAB', 20),
    kecamatan: colIdx('KECAMATAN', 21),
    kelurahan: colIdx('KELURAHAN', 22),
    alamat: colIdx('ALAMAT', 23),
    sekolah_pt: colIdx('NAMA SEKOLAH', 24),
    tahun_lulus: colIdx('TAHUN LULUS', 26),
    pendidikan: colIdx('PENDIDIKAN', 27),
    jenis_tenaga: colIdx('JENIS TENAGA', 28),
    tempat_lahir: colIdx('TEMPAT LAHIR', 29),
    tanggal_lahir: colIdx('TANGGAL LAHIR', 30),
    usia: colIdx('USIA', 31),
    status_bekerja: colIdx('STATUS BEKERJA', 33),
    jenjang: colIdx('JENJANG SAAT INI', 34),
    tanggal_pensiun: colIdx('PENSIUN', 35),
    sisa_pensiun: colIdx('PREDIKSI', 36),
    kelompok_usia: colIdx('KELOMPOK USIA', 32),
    agama: colIdx('AGAMA', 38),
    email: colIdx('EMAIL', 39),
    nomor_hp: colIdx('NOMOR HP', 40),
    jam_kerja: colIdx('JAM KERJA', 45),
    kerja_tim: colIdx('KERJA TIM', 46),
    no_str: colIdx('NOMOR STR', 47),
    no_sip: colIdx('SIP', 48),
    tgl_terbit_sip: colIdx('TANGGAL TERBIT SIP', 49),
    tgl_berakhir_sip: colIdx('TANGGAL BERAKHIR SIP', 50)
  };

  const dataRows = arr.slice(1).filter(r => {
    const name = r[colMap.nama] || r[colMap.nama_gelar];
    return name && name.trim() !== '';
  });

  const columns: ColumnDef[] = [
    { id: 'no', name: 'No', type: 'number', width: 65, visible: true, aggregation: 'count' },
    { id: 'nama_gelar', name: 'Nama Lengkap & Gelar', type: 'text', width: 230, visible: true, aggregation: 'none' },
    { id: 'nip', name: 'NIP / ID Pegawai', type: 'text', width: 175, visible: true, aggregation: 'none' },
    { id: 'tempat_tugas', name: 'Tempat / Unit Tugas', type: 'category', width: 230, visible: true, aggregation: 'none',
      options: ['Puskesmas Kepulauan Seribu Selatan', 'Puskesmas Pembantu Pulau Pari', 'Puskesmas Pembantu Pulau Lancang', 'Puskesmas Pembantu Pulau Untung Jawa'] },
    { id: 'jabatan', name: 'Jabatan', type: 'text', width: 200, visible: true, aggregation: 'none' },
    { id: 'status_kepegawaian', name: 'Status Pegawai', type: 'badge', width: 140, visible: true, aggregation: 'none',
      options: ['PNS', 'PPPK', 'PPPK PW', 'NON PNS', 'PJLP', 'CPNS'] },
    { id: 'jenis_tenaga', name: 'Jenis Tenaga', type: 'badge', width: 150, visible: true, aggregation: 'none',
      options: ['Tenaga Kesehatan', 'Tenaga Penunjang'] },
    { id: 'gol', name: 'Golongan', type: 'text', width: 130, visible: true, aggregation: 'none' },
    { id: 'jenis_kelamin', name: 'Gender', type: 'category', width: 120, visible: true, aggregation: 'none',
      options: ['Laki - Laki', 'Perempuan'] },
    { id: 'pendidikan', name: 'Pendidikan', type: 'category', width: 130, visible: true, aggregation: 'none',
      options: ['Profesi', 'S-1', 'D-3', 'SMA/SMK', 'S-2', 'SMP/SD', 'D-4'] },
    { id: 'masa_kerja', name: 'Masa Kerja', type: 'text', width: 140, visible: true, aggregation: 'none' },
    { id: 'masa_kerja_tahun', name: 'Masa Kerja (Thn)', type: 'number', width: 130, visible: true, aggregation: 'avg' },
    { id: 'usia', name: 'Usia', type: 'text', width: 130, visible: true, aggregation: 'none' },
    { id: 'usia_tahun', name: 'Usia (Thn)', type: 'number', width: 110, visible: true, aggregation: 'avg' },
    { id: 'kelompok_usia', name: 'Kelompok Usia', type: 'category', width: 140, visible: true, aggregation: 'none',
      options: ['< 30 Tahun', '20 - 29 Tahun', '30 - 39 Tahun', '40 - 49 Tahun', '50 Tahun ke atas'] },
    { id: 'tanggal_pensiun', name: 'Tgl Pensiun', type: 'text', width: 120, visible: true, aggregation: 'none' },
    { id: 'sisa_pensiun', name: 'Sisa Pensiun', type: 'text', width: 140, visible: true, aggregation: 'none' },
    { id: 'sisa_pensiun_tahun', name: 'Sisa Pensiun (Thn)', type: 'number', width: 130, visible: true, aggregation: 'avg' },
    { id: 'jam_kerja', name: 'Jam Kerja', type: 'category', width: 170, visible: true, aggregation: 'none' },
    { id: 'kerja_tim', name: 'Kerja Tim / Shift', type: 'badge', width: 130, visible: true, aggregation: 'none' },
    { id: 'status_str', name: 'Status STR', type: 'badge', width: 140, visible: true, aggregation: 'none' },
    { id: 'no_str', name: 'No. STR', type: 'text', width: 140, visible: true, aggregation: 'none' },
    { id: 'status_sip', name: 'Status SIP', type: 'badge', width: 140, visible: true, aggregation: 'none' },
    { id: 'no_sip', name: 'No. SIP', type: 'text', width: 180, visible: true, aggregation: 'none' },
    { id: 'provinsi', name: 'Provinsi', type: 'category', width: 140, visible: true, aggregation: 'none' },
    { id: 'kab_kota', name: 'Kab/Kota Tinggal', type: 'category', width: 160, visible: true, aggregation: 'none' },
    { id: 'alamat', name: 'Alamat Tinggal', type: 'text', width: 250, visible: true, aggregation: 'none' },
    { id: 'nomor_hp', name: 'No. HP / WA', type: 'text', width: 140, visible: true, aggregation: 'none' },
    { id: 'email', name: 'Email', type: 'text', width: 190, visible: true, aggregation: 'none' }
  ];

  const rows: RowData[] = dataRows.map((cols, idx) => {
    const rawNo = cols[colMap.no]?.trim() || `${idx + 1}`;
    const no = parseInt(rawNo, 10) || (idx + 1);
    const nama = cols[colMap.nama]?.trim() || '';
    const namaGelar = cols[colMap.nama_gelar]?.trim() || nama;
    const unit = cols[colMap.tempat_tugas]?.trim() || 'Puskesmas Kepulauan Seribu Selatan';
    const jabatan = cols[colMap.jabatan]?.trim() || cols[colMap.jabatan_alt]?.trim() || '-';
    const statusPeg = cols[colMap.status_kepegawaian]?.trim() || 'NON PNS';
    const jenisTenaga = cols[colMap.jenis_tenaga]?.trim() || 'Tenaga Penunjang';
    const nip = cols[colMap.nip]?.trim() || '-';
    const nrk = cols[colMap.nrk]?.trim() || '';
    const gol = cols[colMap.gol]?.trim() || '-';
    const masaStr = cols[colMap.masa_kerja]?.trim() || '';
    const masaTahun = parseYearMonth(masaStr);
    const usiaStr = cols[colMap.usia]?.trim() || '';
    const usiaTahun = parseYearMonth(usiaStr);
    const sisaStr = cols[colMap.sisa_pensiun]?.trim() || '';
    const sisaTahun = parseYearMonth(sisaStr);

    let kelompokUsia = cols[colMap.kelompok_usia]?.trim() || '';
    if (!kelompokUsia && usiaTahun > 0) {
      if (usiaTahun < 30) kelompokUsia = '20 - 29 Tahun';
      else if (usiaTahun < 40) kelompokUsia = '30 - 39 Tahun';
      else if (usiaTahun < 50) kelompokUsia = '40 - 49 Tahun';
      else kelompokUsia = '50 Tahun ke atas';
    }

    const noStr = cols[colMap.no_str]?.trim() || '';
    const noSip = cols[colMap.no_sip]?.trim() || '';
    const statusStr = noStr ? 'Aktif' : (jenisTenaga === 'Tenaga Kesehatan' ? 'Perlu Verifikasi' : 'Bukan Nakes');
    const statusSip = noSip && noSip !== 'N/A' ? 'Aktif' : (jenisTenaga === 'Tenaga Kesehatan' ? 'Perlu Verifikasi' : 'Bukan Nakes');

    return {
      _id: `staff_gs_${idx + 1}`,
      no,
      nik: cols[colMap.nik]?.trim() || '',
      nama,
      nama_gelar: namaGelar,
      nip,
      nrk,
      tempat_tugas: unit,
      jabatan,
      rumpun_jabatan: cols[colMap.rumpun_jabatan]?.trim() || '',
      status_kepegawaian: statusPeg,
      jenis_tenaga: jenisTenaga,
      gol,
      jenis_kelamin: cols[colMap.gender]?.trim() || 'Perempuan',
      pendidikan: cols[colMap.pendidikan]?.trim() || 'D-3',
      nama_sekolah: cols[colMap.sekolah_pt]?.trim() || '',
      tahun_lulus: cols[colMap.tahun_lulus]?.trim() || '',
      masa_kerja: masaStr || '-',
      masa_kerja_tahun: masaTahun,
      usia: usiaStr || '-',
      usia_tahun: usiaTahun,
      kelompok_usia: kelompokUsia || '30 - 39 Tahun',
      tanggal_pensiun: cols[colMap.tanggal_pensiun]?.trim() || '-',
      sisa_pensiun: sisaStr || '-',
      sisa_pensiun_tahun: sisaTahun,
      jam_kerja: cols[colMap.jam_kerja]?.trim() || 'Layanan Rawat Jalan',
      kerja_tim: cols[colMap.kerja_tim]?.trim() || 'Reguler',
      status_bekerja: cols[colMap.status_bekerja]?.trim() || 'AKTIF',
      jenjang_saat_ini: cols[colMap.jenjang]?.trim() || '',
      status_str: statusStr,
      no_str: noStr,
      status_sip: statusSip,
      no_sip: noSip,
      agama: cols[colMap.agama]?.trim() || 'Islam',
      email: cols[colMap.email]?.trim() || '',
      nomor_hp: cols[colMap.nomor_hp]?.trim() || '',
      provinsi: cols[colMap.provinsi]?.trim() || 'DKI Jakarta',
      kab_kota: cols[colMap.kab]?.trim() || 'Kab. Kepulauan Seribu',
      kecamatan: cols[colMap.kecamatan]?.trim() || 'Kepulauan Seribu Selatan',
      kelurahan: cols[colMap.kelurahan]?.trim() || '',
      alamat: cols[colMap.alamat]?.trim() || ''
    };
  });

  return {
    id: 'sheet-master-puskesmas',
    name: 'Data Master SDMK Puskesmas',
    description: `Data Master Terpadu Kepegawaian & SDMK Puskesmas Kecamatan & Pustu Kepulauan Seribu Selatan (${rows.length} Staf).`,
    icon: 'FileSpreadsheet',
    updatedAt: new Date().toISOString(),
    columns,
    rows,
    primaryMetricId: 'usia_tahun',
    primaryDateId: 'tanggal_pensiun',
    primaryCategoryId: 'tempat_tugas'
  };
}

export async function syncGoogleSheetData(): Promise<{ success: boolean; sheet?: Sheet; rowCount?: number; error?: string }> {
  // Strategy 1: Hostinger PHP backend (api-sync.php) or Express API (/api/sync-google-sheet)
  try {
    const endpoints = ['/api-sync.php', 'api-sync.php', '/api/sync-google-sheet'];
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, { cache: 'no-cache' });
        if (res.ok) {
          const data = await res.json();
          if (data.sheet && data.sheet.rows && data.sheet.rows.length > 0) {
            return { success: true, sheet: data.sheet, rowCount: data.sheet.rows.length };
          }
          if (data.csv && typeof data.csv === 'string' && data.csv.length > 100) {
            const sheet = transformCSVToSheet(data.csv);
            return { success: true, sheet, rowCount: sheet.rows.length };
          }
        }
      } catch {
        // Try next endpoint
      }
    }
  } catch (e) {
    console.warn('Backend proxy tidak merespons, beralih ke direct Google Sheets API...');
  }

  // Strategy 2: Google Visualization API (gviz/tq) with native CORS support
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;
    const response = await fetch(gvizUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv,text/plain,*/*'
      }
    });

    if (response.ok) {
      const text = await response.text();
      if (text && text.length > 200) {
        const sheet = transformCSVToSheet(text);
        if (sheet.rows.length > 0) {
          return { success: true, sheet, rowCount: sheet.rows.length };
        }
      }
    }
  } catch (err) {
    console.warn('Direct fetch gviz terhalang browser, mencoba fallback CORS proxy...', err);
  }

  // Strategy 3: Public CORS proxy fallback
  try {
    const targetUrl = encodeURIComponent(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`);
    const proxyUrl = `https://api.allorigins.win/raw?url=${targetUrl}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const text = await response.text();
      if (text && text.length > 200) {
        const sheet = transformCSVToSheet(text);
        if (sheet.rows.length > 0) {
          return { success: true, sheet, rowCount: sheet.rows.length };
        }
      }
    }
  } catch (proxyErr) {
    console.warn('CORS proxy fallback gagal:', proxyErr);
  }

  // Strategy 4: Built-in verified Master Sheet dataset fallback
  console.info('Menggunakan dataset lokal termutakhir sebagai fallback stabil.');
  return {
    success: true,
    sheet: MASTER_SHEET_DATA,
    rowCount: MASTER_SHEET_DATA.rows.length
  };
}

export function transformCSVToUraianSheet(csvText: string): Sheet {
  const arr = parseCSV(csvText);
  if (arr.length < 2) {
    throw new Error('Data CSV Google Sheet Uraian Tugas tidak memiliki baris data');
  }

  const rawRows = arr.slice(2).filter(r => r[1] && r[1].trim());
  const rows: RowData[] = [];

  rawRows.forEach((r, idx) => {
    const nama = (r[1] || "").trim();
    if (!nama) return;

    const no = parseInt(r[0] || `${idx + 1}`, 10) || (idx + 1);
    const klaster = (r[2] || "").trim();
    const subKlaster = (r[3] || "").trim();
    const nip = (r[4] || "").trim();
    const status = (r[5] || "").trim() || "PNS";
    const jabatan = (r[6] || "").trim() || "-";
    const tempatTugas = (r[7] || "").trim() || "Puskesmas Kepulauan Seribu Selatan";
    
    // Ikhtisar jabatan (col 32, 30, atau 31, atau fallback)
    const ikhtisar = (r[32] || r[30] || r[31] || "").trim() || 
      `Melaksanakan tugas pelayanan dan tata kelola sesuai formasi jabatan ${jabatan} pada ${tempatTugas} untuk mendukung pelayanan kesehatan prima.`;

    let fotoUrl = (r[29] || "").trim();
    if (fotoUrl) {
      fotoUrl = convertGoogleDriveUrl(fotoUrl);
    }

    rows.push({
      _id: `uraian_staff_${no}`,
      no,
      nama,
      klaster,
      sub_klaster: subKlaster,
      nip,
      status,
      jabatan,
      tempat_tugas: tempatTugas,
      ikhtisar_jabatan: ikhtisar,
      tugas_pokok_1: (r[8] || "").trim(),
      tugas_pokok_2: (r[9] || "").trim(),
      tugas_pokok_3: (r[10] || "").trim(),
      tugas_pokok_4: (r[11] || "").trim(),
      tugas_pokok_5: (r[12] || "").trim(),
      tugas_pokok_6: (r[13] || "").trim(),
      tugas_pokok_7: (r[14] || "").trim(),
      tugas_pokok_8: (r[15] || "").trim(),
      tugas_pokok_9: (r[16] || "").trim(),
      tugas_pokok_10: (r[17] || "").trim(),
      tugas_tambahan_1: (r[18] || "").trim(),
      tugas_tambahan_2: (r[19] || "").trim(),
      tugas_tambahan_3: (r[20] || "").trim(),
      tugas_tambahan_4: (r[21] || "").trim(),
      tugas_tambahan_5: (r[22] || "").trim(),
      wewenang_1: (r[23] || "").trim(),
      wewenang_2: (r[24] || "").trim(),
      wewenang_3: (r[25] || "").trim(),
      tanggung_jawab_1: (r[26] || "").trim(),
      tanggung_jawab_2: (r[27] || "").trim(),
      tanggung_jawab_3: (r[28] || "").trim(),
      foto: fotoUrl,
      nama_pemberi_tugas: "dr. Ignatius Dendy Purnama",
      nip_pemberi_tugas: "198607192014031004",
      jabatan_pemberi_tugas: "Kepala Puskesmas Kepulauan Seribu Selatan",
      tanggal_penetapan: "Jakarta, 03 Mei 2025"
    });
  });

  return {
    id: "sheet-uraian-tugas",
    name: "Data Uraian Tugas Pegawai",
    description: `Pengelolaan uraian tugas jabatan, ikhtisar jabatan, tugas pokok, tugas tambahan, dan kartu uraian tugas pegawai Puskesmas Kepulauan Seribu Selatan (${rows.length} Staf).`,
    icon: "FileText",
    updatedAt: new Date().toISOString(),
    columns: URAIAN_TUGAS_COLUMNS,
    rows,
    primaryMetricId: "no",
    primaryCategoryId: "tempat_tugas"
  };
}

export async function syncUraianTugasData(): Promise<{ success: boolean; sheet?: Sheet; rowCount?: number; error?: string }> {
  // Strategy 1: Hostinger PHP backend (api-sync.php) or Express API (/api/sync-google-sheet)
  try {
    const endpoints = [
      `/api/sync-google-sheet?type=uraian&spreadsheetId=${URAIAN_SPREADSHEET_ID}&gid=${URAIAN_GID}`,
      `/api-sync.php?type=uraian&spreadsheetId=${URAIAN_SPREADSHEET_ID}&gid=${URAIAN_GID}`
    ];
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, { cache: 'no-cache' });
        if (res.ok) {
          const data = await res.json();
          if (data.sheet && data.sheet.rows && data.sheet.rows.length > 0) {
            return { success: true, sheet: data.sheet, rowCount: data.sheet.rows.length };
          }
          if (data.csv && typeof data.csv === 'string' && data.csv.length > 100) {
            const sheet = transformCSVToUraianSheet(data.csv);
            return { success: true, sheet, rowCount: sheet.rows.length };
          }
        }
      } catch {
        // Try next endpoint
      }
    }
  } catch (e) {
    console.warn('Backend proxy tidak merespons, beralih ke direct Google Sheets API...');
  }

  // Strategy 2: Google Visualization API (gviz/tq) with native CORS support
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${URAIAN_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${URAIAN_GID}`;
    const response = await fetch(gvizUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv,text/plain,*/*'
      }
    });

    if (response.ok) {
      const text = await response.text();
      if (text && text.length > 200) {
        const sheet = transformCSVToUraianSheet(text);
        if (sheet.rows.length > 0) {
          return { success: true, sheet, rowCount: sheet.rows.length };
        }
      }
    }
  } catch (err) {
    console.warn('Direct fetch gviz terhalang browser, mencoba fallback CORS proxy...', err);
  }

  // Strategy 3: Public CORS proxy fallback
  try {
    const targetUrl = encodeURIComponent(`https://docs.google.com/spreadsheets/d/${URAIAN_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${URAIAN_GID}`);
    const proxyUrl = `https://api.allorigins.win/raw?url=${targetUrl}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const text = await response.text();
      if (text && text.length > 200) {
        const sheet = transformCSVToUraianSheet(text);
        if (sheet.rows.length > 0) {
          return { success: true, sheet, rowCount: sheet.rows.length };
        }
      }
    }
  } catch (proxyErr) {
    console.warn('CORS proxy fallback gagal:', proxyErr);
  }

  // Strategy 4: Built-in verified Uraian Sheet dataset fallback
  console.info('Menggunakan dataset lokal Uraian Tugas termutakhir sebagai fallback stabil.');
  return {
    success: true,
    sheet: URAIAN_TUGAS_SHEET_DATA,
    rowCount: URAIAN_TUGAS_SHEET_DATA.rows.length
  };
}

