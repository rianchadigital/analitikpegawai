/**
 * Google Drive Helper & Photo Asset Manager
 * Mengelola tautan Google Drive, konversi tautan ke pratinjau gambar langsung,
 * serta integrasi penyimpanan foto pegawai Puskesmas Kepulauan Seribu Selatan
 * ke Google Drive Folder dan Kolom AD Google Spreadsheet.
 */

export const GOOGLE_DRIVE_FOTO_FOLDER_URL = 'https://drive.google.com/drive/folders/1zKpxWC7zsKx-AQsrGaaVLyBGGCYLyLnb?usp=sharing';
export const GOOGLE_DRIVE_FOTO_FOLDER_ID = '1zKpxWC7zsKx-AQsrGaaVLyBGGCYLyLnb';
export const SPREADSHEET_ID = '10MGH1h8nirliwFsyICcCghylhARdjCt8ulhKfrng_c0';
export const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=0`;
export const SPREADSHEET_FOTO_COLUMN = 'AD'; // Kolom 30 dengan judul FOTO

/**
 * Kode Google Apps Script siap pakai untuk dipasang di Ekstensi > Apps Script
 * pada Google Spreadsheet Uraian Tugas agar upload foto otomatis masuk ke Google Drive
 * dan link langsung masuk ke Kolom AD (Kolom 30).
 */
export const APPS_SCRIPT_CODE_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT - PUSKESMAS KEPULAUAN SERIBU SELATAN
 * Otomasi Simpan Foto ke Google Drive & Tulis Link ke Kolom AD Spreadsheet
 * 
 * CARA PASANG:
 * 1. Buka Spreadsheet Uraian Tugas (ID: 10MGH1h8nirliwFsyICcCghylhARdjCt8ulhKfrng_c0)
 * 2. Klik menu 'Ekstensi' > 'Apps Script'
 * 3. Hapus kode bawaan, lalu salin dan tempel (paste) seluruh kode ini
 * 4. Klik tombol 'Deploy' (Terapkan) > 'New deployment' (Deployment baru)
 * 5. Pilih jenis 'Web app' (Aplikasi web)
 * 6. Setel:
 *    - Execute as: 'Me' (Saya)
 *    - Who has access: 'Anyone' (Siapa saja)
 * 7. Klik 'Deploy' dan salin Web App URL (berakhiran /exec)
 * 8. Tempelkan URL tersebut pada aplikasi di menu 'Pengaturan Integrasi Drive & Spreadsheet'
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var folderId = data.folderId || "1zKpxWC7zsKx-AQsrGaaVLyBGGCYLyLnb";
    var spreadsheetId = data.spreadsheetId || "10MGH1h8nirliwFsyICcCghylhARdjCt8ulhKfrng_c0";
    var folder = DriveApp.getFolderById(folderId);
    
    var fileUrl = "";
    var fileId = "";
    var driveViewUrl = "";
    
    // 1. Simpan foto ke Google Drive jika berupa base64
    if (data.photo && data.photo.indexOf('data:image') === 0) {
      var parts = data.photo.split(',');
      var mime = parts[0].match(/:(.*?);/)[1];
      var bytes = Utilities.base64Decode(parts[1]);
      var ext = mime.split('/')[1] || 'jpg';
      if (ext === 'jpeg') ext = 'jpg';
      var cleanName = (data.nip || data.nama || "pegawai").toString().replace(/[^a-zA-Z0-9]/g, '_');
      var filename = "FOTO_" + cleanName + "_" + (new Date().getTime()) + "." + ext;
      var blob = Utilities.newBlob(bytes, mime, filename);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileId = file.getId();
      fileUrl = "https://lh3.googleusercontent.com/d/" + fileId;
      driveViewUrl = file.getUrl();
    } else if (data.photo) {
      fileUrl = data.photo;
    }
    
    // 2. Tulis Link ke Google Spreadsheet Kolom AD (Kolom 30)
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sheet = ss.getSheetByName("Uraian") || ss.getSheets()[0];
    var values = sheet.getDataRange().getValues();
    var updatedRow = -1;
    
    var searchNip = String(data.nip || '').trim();
    var searchNama = String(data.nama || '').trim().toLowerCase();
    
    // Iterasi baris data (melewati 2 baris header pertama)
    for (var r = 2; r < values.length; r++) {
      var rowNip = String(values[r][4] || '').trim(); // Kolom E (NIP)
      var rowNama = String(values[r][1] || '').trim().toLowerCase(); // Kolom B (NAMA)
      
      var isMatch = false;
      if (searchNip && searchNip.length > 5 && rowNip === searchNip) {
        isMatch = true;
      } else if (searchNama && searchNama.length > 3 && (rowNama.indexOf(searchNama) !== -1 || searchNama.indexOf(rowNama) !== -1)) {
        isMatch = true;
      }
      
      if (isMatch) {
        // Kolom AD adalah kolom ke-30 (1-based index)
        sheet.getRange(r + 1, 30).setValue(fileUrl);
        updatedRow = r + 1;
        break;
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileId: fileId,
      fileUrl: fileUrl,
      driveViewUrl: driveViewUrl,
      updatedRow: updatedRow,
      column: "AD",
      message: updatedRow !== -1 
        ? "Foto berhasil disimpan ke Google Drive dan link ditulis ke Spreadsheet Kolom AD baris " + updatedRow
        : "Foto berhasil disimpan ke Google Drive. Baris pegawai tidak ditemukan di spreadsheet."
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

/**
 * Mengonversi berbagai format URL Google Drive menjadi tautan gambar langsung (direct embeddable image).
 */
export function convertGoogleDriveUrl(inputUrl: string): string {
  if (!inputUrl || typeof inputUrl !== 'string') return '';
  const trimmed = inputUrl.trim();

  // Jika sudah merupakan data URL (base64) atau path internal, langsung kembalikan
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('/') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Cek apakah tautan dari Google Drive
  const driveFileRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]{20,})/;
  const match = trimmed.match(driveFileRegex);

  if (match && match[1]) {
    const fileId = match[1];
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  // Jika berupa ID unik Drive murni (panjang > 25 karakter alfanumerik tanpa slash/titik)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    return `https://lh3.googleusercontent.com/d/${trimmed}`;
  }

  return trimmed;
}

/**
 * Mengonversi file lokal (File object) ke Base64 Data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Membuka folder Google Drive di tab baru
 */
export function openGoogleDriveFolder(): void {
  window.open(GOOGLE_DRIVE_FOTO_FOLDER_URL, '_blank', 'noopener,noreferrer');
}

/**
 * Membuka Spreadsheet di tab baru
 */
export function openGoogleSpreadsheet(): void {
  window.open(SPREADSHEET_URL, '_blank', 'noopener,noreferrer');
}

const LOCAL_PHOTOS_CACHE_KEY = 'puskesmas_staff_photos_cache';
const LOCAL_APPS_SCRIPT_URL_KEY = 'puskesmas_apps_script_url';

export interface SavePhotoResult {
  success: boolean;
  photoUrl: string;
  fullPhotoUrl?: string;
  driveUrl?: string;
  driveViewUrl?: string;
  updatedRow?: number;
  appsScriptSynced?: boolean;
  message?: string;
}

/**
 * Menyimpan foto pegawai ke Cloud Server (/api/save-photo), mem-forward ke Google Apps Script
 * jika dikonfigurasi, dan memperbarui cache lokal browser.
 */
export async function savePhotoToServer(
  staffKey: string,
  photoDataOrUrl: string,
  nip?: string,
  nama?: string,
  appsScriptUrlOverride?: string
): Promise<SavePhotoResult> {
  const localAppsScriptUrl = appsScriptUrlOverride || localStorage.getItem(LOCAL_APPS_SCRIPT_URL_KEY) || '';

  try {
    // 1. Simpan ke local cache terlebih dahulu untuk responsivitas instan
    try {
      const cached = JSON.parse(localStorage.getItem(LOCAL_PHOTOS_CACHE_KEY) || '{}');
      if (staffKey) cached[staffKey] = photoDataOrUrl;
      if (nip) cached[nip] = photoDataOrUrl;
      if (nama) cached[`nama:${nama.trim().toLowerCase()}`] = photoDataOrUrl;
      localStorage.setItem(LOCAL_PHOTOS_CACHE_KEY, JSON.stringify(cached));
    } catch {
      // Abaikan jika storage penuh
    }

    // 2. Kirim ke backend Express /api/save-photo
    const response = await fetch('/api/save-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffKey,
        nip,
        nama,
        photo: photoDataOrUrl,
        appsScriptUrlOverride: localAppsScriptUrl
      })
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.photoUrl) {
        // Perbarui cache dengan URL permanen dari server / Drive
        try {
          const cached = JSON.parse(localStorage.getItem(LOCAL_PHOTOS_CACHE_KEY) || '{}');
          const effectiveUrl = result.photoUrl;
          if (staffKey) cached[staffKey] = effectiveUrl;
          if (nip) cached[nip] = effectiveUrl;
          if (nama) cached[`nama:${nama.trim().toLowerCase()}`] = effectiveUrl;
          localStorage.setItem(LOCAL_PHOTOS_CACHE_KEY, JSON.stringify(cached));
        } catch {
          // No-op
        }
        return result;
      }
    }
  } catch (err) {
    console.warn('Gagal menyimpan foto ke /api/save-photo, menggunakan cache lokal:', err);
  }

  // Fallback jika offline
  return {
    success: true,
    photoUrl: convertGoogleDriveUrl(photoDataOrUrl),
    message: 'Foto disimpan di penyimpanan browser lokal.'
  };
}

/**
 * Mengambil semua foto pegawai yang tersimpan di cloud server untuk sinkronisasi lintas browser
 */
export async function fetchServerStaffPhotos(): Promise<Record<string, string>> {
  let serverPhotos: Record<string, string> = {};
  try {
    const res = await fetch('/api/staff-photos');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.photos) {
        serverPhotos = data.photos;
      }
    }
  } catch (err) {
    console.warn('Gagal mengambil /api/staff-photos:', err);
  }

  try {
    const localCached = JSON.parse(localStorage.getItem(LOCAL_PHOTOS_CACHE_KEY) || '{}');
    return { ...localCached, ...serverPhotos };
  } catch {
    return serverPhotos;
  }
}

/**
 * Mengambil URL Apps Script dari server / lokal
 */
export async function getAppsScriptUrl(): Promise<string> {
  try {
    const res = await fetch('/api/apps-script-config');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.appsScriptUrl) {
        localStorage.setItem(LOCAL_APPS_SCRIPT_URL_KEY, data.appsScriptUrl);
        return data.appsScriptUrl;
      }
    }
  } catch (e) {
    console.warn('Error fetching apps script config:', e);
  }
  return localStorage.getItem(LOCAL_APPS_SCRIPT_URL_KEY) || '';
}

/**
 * Menyimpan URL Apps Script ke server dan lokal
 */
export async function saveAppsScriptUrl(url: string): Promise<boolean> {
  const cleanUrl = url.trim();
  localStorage.setItem(LOCAL_APPS_SCRIPT_URL_KEY, cleanUrl);
  try {
    const res = await fetch('/api/apps-script-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appsScriptUrl: cleanUrl })
    });
    return res.ok;
  } catch {
    return false;
  }
}
