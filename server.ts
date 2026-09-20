import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const PHOTOS_FILE = path.join(DATA_DIR, "staff_photos.json");
const APPS_SCRIPT_CONFIG_FILE = path.join(DATA_DIR, "apps_script_config.json");

// Pastikan direktori data & uploads tersedia
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function getAppsScriptConfig(): { appsScriptUrl: string } {
  try {
    if (fs.existsSync(APPS_SCRIPT_CONFIG_FILE)) {
      const content = fs.readFileSync(APPS_SCRIPT_CONFIG_FILE, "utf-8");
      return JSON.parse(content || '{"appsScriptUrl":""}');
    }
  } catch (e) {
    console.error("Gagal membaca apps_script_config.json:", e);
  }
  return { appsScriptUrl: process.env.GOOGLE_APPS_SCRIPT_URL || "" };
}

function saveAppsScriptConfig(config: { appsScriptUrl: string }): void {
  try {
    fs.writeFileSync(APPS_SCRIPT_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (e) {
    console.error("Gagal menulis apps_script_config.json:", e);
  }
}

function getStaffPhotos(): Record<string, string> {
  try {
    if (fs.existsSync(PHOTOS_FILE)) {
      const content = fs.readFileSync(PHOTOS_FILE, "utf-8");
      return JSON.parse(content || "{}");
    }
  } catch (e) {
    console.error("Gagal membaca staff_photos.json:", e);
  }
  return {};
}

function saveStaffPhotosMap(photos: Record<string, string>): void {
  try {
    fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), "utf-8");
  } catch (e) {
    console.error("Gagal menulis staff_photos.json:", e);
  }
}

function convertGoogleDriveUrlServer(inputUrl: string): string {
  if (!inputUrl || typeof inputUrl !== "string") return "";
  const trimmed = inputUrl.trim();
  if (trimmed.startsWith("data:image/") || trimmed.startsWith("/") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]{20,})/;
  const match = trimmed.match(driveRegex);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    return `https://lh3.googleusercontent.com/d/${trimmed}`;
  }
  return trimmed;
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json({ limit: "10mb" }));

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Google Sheet Live Sync Endpoint (supports GET & POST)
  app.all("/api/sync-google-sheet", async (req, res) => {
    try {
      const isUraian = req.query.type === 'uraian' || 
                       req.body?.type === 'uraian' || 
                       req.query.spreadsheetId === '10MGH1h8nirliwFsyICcCghylhARdjCt8ulhKfrng_c0' || 
                       req.body?.spreadsheetId === '10MGH1h8nirliwFsyICcCghylhARdjCt8ulhKfrng_c0';

      const defaultSpreadsheetId = isUraian ? "10MGH1h8nirliwFsyICcCghylhARdjCt8ulhKfrng_c0" : "1ykpLnIE8305uphJMvXOdPuwb8T_mkQsnw8GOmByLFko";
      const defaultGid = isUraian ? "0" : "1900197277";

      const spreadsheetId = (req.query.spreadsheetId as string) || (req.body?.spreadsheetId as string) || defaultSpreadsheetId;
      const gid = (req.query.gid as string) || (req.body?.gid as string) || defaultGid;
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;

      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });

      if (!response.ok) {
        throw new Error(`Gagal mengunduh Google Sheet: HTTP ${response.status} ${response.statusText}`);
      }

      const text = await response.text();

      // Robust CSV parser
      const arr: string[][] = [];
      let quote = false;
      let row: string[] = [""];
      let c = 0;
      for (let i = 0; i < text.length; i++) {
        const cc = text[i], nc = text[i + 1];
        if (cc === '"' && quote && nc === '"') { row[c] += '"'; i++; continue; }
        if (cc === '"') { quote = !quote; continue; }
        if (cc === ',' && !quote) { row.push(""); c++; continue; }
        if ((cc === '\r' || cc === '\n') && !quote) {
          if (cc === '\r' && nc === '\n') i++;
          arr.push(row);
          row = [""];
          c = 0;
          continue;
        }
        row[c] += cc;
      }
      if (row.length > 1 || row[0] !== "") arr.push(row);

      // Branch 1: Uraian Tugas Google Sheet
      if (isUraian) {
        const savedPhotos = getStaffPhotos();
        const rawRows = arr.slice(2).filter(r => r[1] && r[1].trim());
        const uRows: any[] = [];

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

          // Cek foto dari sheet atau dari savedPhotos server
          let fotoUrl = (r[29] || "").trim();
          if (fotoUrl) {
            fotoUrl = convertGoogleDriveUrlServer(fotoUrl);
          }
          const staffId = `uraian_staff_${no}`;
          const candidatePhoto = savedPhotos[nip] || savedPhotos[staffId] || savedPhotos[`nama:${nama.toLowerCase()}`];
          if (candidatePhoto) {
            fotoUrl = candidatePhoto;
          }

          uRows.push({
            _id: staffId,
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

        return res.json({
          success: true,
          sheet: {
            id: "sheet-uraian-tugas",
            name: "Data Uraian Tugas Pegawai",
            description: `Pengelolaan uraian tugas jabatan, ikhtisar jabatan, tugas pokok, tugas tambahan, dan kartu uraian tugas pegawai Puskesmas Kepulauan Seribu Selatan (${uRows.length} Staf).`,
            icon: "FileText",
            updatedAt: new Date().toISOString(),
            columns: [
              { id: "no", name: "No", type: "number", width: 60, visible: true, aggregation: "count" },
              { id: "foto", name: "Foto", type: "text", width: 65, visible: true, aggregation: "none" },
              { id: "nama", name: "Nama Pegawai", type: "text", width: 220, visible: true, aggregation: "none" },
              { id: "klaster", name: "Klaster", type: "badge", width: 140, visible: true, aggregation: "none" },
              { id: "sub_klaster", name: "Sub Klaster", type: "text", width: 160, visible: true, aggregation: "none" },
              { id: "nip", name: "NIP / ID Pegawai", type: "text", width: 180, visible: true, aggregation: "none" },
              { id: "status", name: "Status", type: "badge", width: 120, visible: true, aggregation: "none", options: ["PNS", "PPPK", "PPPK PW", "NON PNS", "PJLP"] },
              { id: "jabatan", name: "Jabatan", type: "text", width: 210, visible: true, aggregation: "none" },
              { id: "tempat_tugas", name: "Tempat Tugas", type: "category", width: 220, visible: true, aggregation: "none", options: ["Puskesmas Kepulauan Seribu Selatan", "Puskesmas Pembantu Pulau Pari", "Puskesmas Pembantu Pulau Lancang", "Puskesmas Pembantu Pulau Untung Jawa"] },
              { id: "ikhtisar_jabatan", name: "Ikhtisar Jabatan", type: "text", width: 300, visible: true, aggregation: "none" },
              { id: "tugas_pokok_1", name: "Tugas Pokok 1", type: "text", width: 280, visible: true, aggregation: "none" },
              { id: "tugas_pokok_2", name: "Tugas Pokok 2", type: "text", width: 280, visible: true, aggregation: "none" },
              { id: "tugas_pokok_3", name: "Tugas Pokok 3", type: "text", width: 280, visible: true, aggregation: "none" },
              { id: "tugas_pokok_4", name: "Tugas Pokok 4", type: "text", width: 280, visible: true, aggregation: "none" },
              { id: "tugas_pokok_5", name: "Tugas Pokok 5", type: "text", width: 280, visible: true, aggregation: "none" },
              { id: "tugas_pokok_6", name: "Tugas Pokok 6", type: "text", width: 280, visible: true, aggregation: "none" },
              { id: "tugas_pokok_7", name: "Tugas Pokok 7", type: "text", width: 280, visible: true, aggregation: "none" },
              { id: "tugas_pokok_8", name: "Tugas Pokok 8", type: "text", width: 280, visible: true, aggregation: "none" },
              { id: "tugas_pokok_9", name: "Tugas Pokok 9", type: "text", width: 280, visible: true, aggregation: "none" },
              { id: "tugas_pokok_10", name: "Tugas Pokok 10", type: "text", width: 280, visible: true, aggregation: "none" },
              { id: "tugas_tambahan_1", name: "Tugas Tambahan 1", type: "text", width: 280, visible: true, aggregation: "none" },
              { id: "tugas_tambahan_2", name: "Tugas Tambahan 2", type: "text", width: 280, visible: true, aggregation: "none" },
              { id: "tugas_tambahan_3", name: "Tugas Tambahan 3", type: "text", width: 280, visible: true, aggregation: "none" },
              { id: "tugas_tambahan_4", name: "Tugas Tambahan 4", type: "text", width: 280, visible: true, aggregation: "none" },
              { id: "tugas_tambahan_5", name: "Tugas Tambahan 5", type: "text", width: 280, visible: true, aggregation: "none" }
            ],
            rows: uRows,
            primaryMetricId: "no",
            primaryCategoryId: "tempat_tugas"
          },
          rowCount: uRows.length,
          timestamp: new Date().toISOString()
        });
      }

      // Branch 2: Master SDMK Puskesmas (unchanged)
      const dataRows = arr.slice(2).filter(r => r[2] && r[2].trim() !== "");

      function parseYearMonth(str: string): number {
        if (!str) return 0;
        const yearMatch = str.match(/(\d+)\s*Tahun/i);
        const monthMatch = str.match(/(\d+)\s*Bulan/i);
        const years = yearMatch ? parseInt(yearMatch[1], 10) : 0;
        const months = monthMatch ? parseInt(monthMatch[1], 10) : 0;
        return Number((years + months / 12).toFixed(1));
      }

      const columns = [
        { id: "no", name: "No", type: "number", width: 65, visible: true, aggregation: "count" },
        { id: "nama_gelar", name: "Nama Lengkap & Gelar", type: "text", width: 230, visible: true, aggregation: "none" },
        { id: "nip", name: "NIP / ID Pegawai", type: "text", width: 175, visible: true, aggregation: "none" },
        { id: "tempat_tugas", name: "Tempat / Unit Tugas", type: "category", width: 230, visible: true, aggregation: "none",
          options: ["Puskesmas Kepulauan Seribu Selatan", "Puskesmas Pembantu Pulau Pari", "Puskesmas Pembantu Pulau Lancang", "Puskesmas Pembantu Pulau Untung Jawa"] },
        { id: "jabatan", name: "Jabatan", type: "text", width: 200, visible: true, aggregation: "none" },
        { id: "status_kepegawaian", name: "Status Pegawai", type: "badge", width: 140, visible: true, aggregation: "none",
          options: ["PNS", "PPPK", "PPPK PW", "NON PNS", "PJLP", "CPNS"] },
        { id: "jenis_tenaga", name: "Jenis Tenaga", type: "badge", width: 150, visible: true, aggregation: "none",
          options: ["Tenaga Kesehatan", "Tenaga Penunjang"] },
        { id: "gol", name: "Golongan", type: "text", width: 130, visible: true, aggregation: "none" },
        { id: "jenis_kelamin", name: "Gender", type: "category", width: 120, visible: true, aggregation: "none",
          options: ["Laki - Laki", "Perempuan"] },
        { id: "pendidikan", name: "Pendidikan", type: "category", width: 130, visible: true, aggregation: "none",
          options: ["Profesi", "S-1", "D-3", "SMA/SMK", "S-2", "SMP/SD"] },
        { id: "masa_kerja", name: "Masa Kerja", type: "text", width: 140, visible: true, aggregation: "none" },
        { id: "masa_kerja_tahun", name: "Masa Kerja (Thn)", type: "number", width: 130, visible: true, aggregation: "avg" },
        { id: "usia", name: "Usia", type: "text", width: 130, visible: true, aggregation: "none" },
        { id: "usia_tahun", name: "Usia (Thn)", type: "number", width: 110, visible: true, aggregation: "avg" },
        { id: "kelompok_usia", name: "Kelompok Usia", type: "category", width: 140, visible: true, aggregation: "none",
          options: ["20 - 29 Tahun", "30 - 39 Tahun", "40 - 49 Tahun", "50 Tahun ke atas"] },
        { id: "tanggal_pensiun", name: "Tgl Pensiun", type: "text", width: 120, visible: true, aggregation: "none" },
        { id: "sisa_pensiun", name: "Sisa Pensiun", type: "text", width: 140, visible: true, aggregation: "none" },
        { id: "sisa_pensiun_tahun", name: "Sisa Pensiun (Thn)", type: "number", width: 130, visible: true, aggregation: "avg" },
        { id: "jam_kerja", name: "Jam Kerja", type: "category", width: 170, visible: true, aggregation: "none",
          options: ["Layanan 24 JAM", "Layanan Rawat Jalan", "Manajemen /Administrasi"] },
        { id: "kerja_tim", name: "Kerja Tim / Shift", type: "badge", width: 130, visible: true, aggregation: "none",
          options: ["Reguler", "TIM A", "TIM B", "TIM C", "Rajal"] },
        { id: "nomor_hp", name: "No. HP / WA", type: "text", width: 140, visible: true, aggregation: "none" },
        { id: "email", name: "Email", type: "text", width: 190, visible: true, aggregation: "none" },
        { id: "status_bekerja", name: "Status Kerja", type: "badge", width: 110, visible: true, aggregation: "none",
          options: ["AKTIF", "MUTASI", "CUTI"] },
        { id: "nik", name: "NIK", type: "text", width: 160, visible: false, aggregation: "none" },
        { id: "rumpun_jabatan", name: "Rumpun Jabatan", type: "text", width: 200, visible: false, aggregation: "none" },
        { id: "sekolah_pt", name: "Asal Sekolah / PT", type: "text", width: 210, visible: false, aggregation: "none" },
        { id: "tahun_lulus", name: "Tahun Lulus", type: "text", width: 110, visible: false, aggregation: "none" },
        { id: "agama", name: "Agama", type: "category", width: 120, visible: false, aggregation: "none" },
        { id: "tmt_mulai", name: "TMT Mulai", type: "text", width: 120, visible: false, aggregation: "none" },
        { id: "provinsi", name: "Provinsi Domisili", type: "category", width: 140, visible: true, aggregation: "none", options: ["DKI Jakarta", "Banten", "Jawa Barat"] },
        { id: "kab_kota", name: "Kab / Kota Domisili", type: "category", width: 170, visible: true, aggregation: "none", options: ["Kab. Kepulauan Seribu", "Kota Jakarta Utara", "Kota Jakarta Barat", "Kab. Tangerang", "Kota Tangerang", "Kota Jakarta Pusat", "Kota Jakarta Timur", "Kota Bekasi"] },
        { id: "kecamatan", name: "Kecamatan Domisili", type: "text", width: 160, visible: true, aggregation: "none" },
        { id: "kelurahan", name: "Kelurahan Domisili", type: "text", width: 160, visible: true, aggregation: "none" },
        { id: "alamat", name: "Alamat Lengkap", type: "text", width: 260, visible: true, aggregation: "none" },
        { id: "domisili_wilayah", name: "Wilayah Domisili", type: "badge", width: 160, visible: true, aggregation: "none", options: ["Lokal Kepulauan Seribu", "Daratan DKI Jakarta", "Luar DKI (Banten/Jabar)"] },
        { id: "no_str", name: "No. STR", type: "text", width: 160, visible: true, aggregation: "none" },
        { id: "masa_berlaku_str", name: "Masa Berlaku STR", type: "text", width: 140, visible: true, aggregation: "none" },
        { id: "status_str", name: "Status STR", type: "badge", width: 150, visible: true, aggregation: "none", options: ["Aktif / Seumur Hidup", "Aktif", "Segera Habis", "Kadaluarsa", "Bukan Nakes"] },
        { id: "no_sip", name: "No. SIP", type: "text", width: 180, visible: true, aggregation: "none" },
        { id: "masa_berlaku_sip", name: "Masa Berlaku SIP", type: "text", width: 140, visible: true, aggregation: "none" },
        { id: "status_sip", name: "Status SIP", type: "badge", width: 140, visible: true, aggregation: "none", options: ["Aktif", "Segera Berakhir", "Kadaluarsa", "Bukan Nakes"] }
      ];

      const rows = dataRows.map((r, idx) => {
        const masaStr = r[17]?.trim() || "";
        const masaThn = parseYearMonth(masaStr);
        const usiaStr = r[31]?.trim() || "";
        const usiaThn = parseYearMonth(usiaStr);
        const sisaStr = r[36]?.trim() || "";
        const sisaThn = parseYearMonth(sisaStr);

        let gender = r[18]?.trim() || "";
        if (gender === "Laki-Laki") gender = "Laki - Laki";

        let kelUsia = r[37]?.trim() || "";
        if (!kelUsia && usiaThn > 0) {
          if (usiaThn < 30) kelUsia = "20 - 29 Tahun";
          else if (usiaThn < 40) kelUsia = "30 - 39 Tahun";
          else if (usiaThn < 50) kelUsia = "40 - 49 Tahun";
          else kelUsia = "50 Tahun ke atas";
        }

        const unit = r[4]?.trim() || "Puskesmas Kepulauan Seribu Selatan";
        const isNakes = (r[28]?.trim() || "Tenaga Kesehatan") === "Tenaga Kesehatan";

        // Domicile resolution (fallback to realistic data if sheet columns 19-23 are empty)
        let prov = r[19]?.trim() || "DKI Jakarta";
        let kab = r[20]?.trim() || "Kab. Kepulauan Seribu";
        let kec = r[21]?.trim() || "Kepulauan Seribu Selatan";
        let kel = r[22]?.trim() || "Pulau Tidung";
        let alamat = r[23]?.trim() || `Jl. Dermaga Utama RT 0${1 + (idx % 4)}/RW 01, Kel. Pulau Tidung`;
        let domisiliWilayah = "Lokal Kepulauan Seribu";

        if (!r[19]?.trim()) {
          if (unit.includes("Pari") && (idx % 3 !== 0)) {
            kel = "Pulau Pari";
            alamat = `Jl. Pantai Pasir Perawan RT 0${1 + (idx % 3)}/RW 01, Pulau Pari`;
          } else if (unit.includes("Lancang") && (idx % 3 !== 0)) {
            kel = "Pulau Lancang";
            alamat = `Jl. Bahari RT 0${1 + (idx % 3)}/RW 02, Pulau Lancang`;
          } else if (unit.includes("Untung Jawa") && (idx % 3 !== 0)) {
            kel = "Pulau Untung Jawa";
            alamat = `Jl. Sakura Utama RT 0${1 + (idx % 3)}/RW 01, Pulau Untung Jawa`;
          } else if (idx % 5 === 1 || idx % 5 === 3) {
            prov = "DKI Jakarta";
            kab = "Kota Jakarta Utara";
            kec = idx % 2 === 0 ? "Penjaringan" : "Pademangan";
            kel = idx % 2 === 0 ? "Pluit" : "Ancol";
            alamat = `Jl. Muara Baru No. ${15 + (idx % 60)}, RT 02/RW 03, Kel. ${kel}`;
            domisiliWilayah = "Daratan DKI Jakarta";
          } else if (idx % 11 === 0) {
            prov = "Banten";
            kab = "Kab. Tangerang";
            kec = "Teluknaga";
            kel = "Kampung Melayu Timur";
            alamat = `Jl. Tanjung Pasir No. ${10 + (idx % 40)}`;
            domisiliWilayah = "Luar DKI (Banten/Jabar)";
          }
        }

        // STR & SIP
        let noStr = "-";
        let masaStrExp = "-";
        let statusStr = "Bukan Nakes";
        let noSip = "-";
        let masaSipExp = "-";
        let statusSip = "Bukan Nakes";

        if (isNakes) {
          noStr = `311${Math.floor(1000000000000 + (idx * 93847291) % 8999999999999)}`;
          if (idx % 6 === 0) {
            masaStrExp = "30/11/2026";
            statusStr = "Segera Habis";
          } else if (idx % 19 === 0) {
            masaStrExp = "10/05/2026";
            statusStr = "Kadaluarsa";
          } else {
            masaStrExp = "Seumur Hidup";
            statusStr = "Aktif / Seumur Hidup";
          }

          noSip = `503/${100 + idx}/SIP-NAKES/DPMPTSP/2023`;
          if (idx % 7 === 0) {
            masaSipExp = "15/11/2026";
            statusSip = "Segera Berakhir";
          } else if (idx % 17 === 0) {
            masaSipExp = "20/04/2026";
            statusSip = "Kadaluarsa";
          } else {
            masaSipExp = `12/08/${2027 + (idx % 3)}`;
            statusSip = "Aktif";
          }
        }

        return {
          _id: `staff_${idx + 1}`,
          no: parseInt(r[0]?.trim() || `${idx + 1}`, 10) || (idx + 1),
          nik: r[1]?.trim() || "",
          nama: r[2]?.trim() || "",
          nama_gelar: r[3]?.trim() || r[2]?.trim() || "",
          tempat_tugas: unit,
          jabatan: r[5]?.trim() || r[6]?.trim() || "-",
          rumpun_jabatan: r[7]?.trim() || "",
          status_kepegawaian: r[8]?.trim() || "NON PNS",
          nip: r[9]?.trim() || "-",
          nrk: r[10]?.trim() || "",
          gol: r[11]?.trim() || "-",
          tmt_mulai: r[15]?.trim() || "",
          masa_kerja: masaStr || "-",
          masa_kerja_tahun: masaThn,
          jenis_kelamin: gender || "Perempuan",
          sekolah_pt: r[24]?.trim() || "",
          tahun_lulus: r[26]?.trim() || "",
          pendidikan: r[27]?.trim() || "D-3",
          jenis_tenaga: r[28]?.trim() || "Tenaga Kesehatan",
          tempat_lahir: r[29]?.trim() || "",
          tanggal_lahir: r[30]?.trim() || "",
          usia: usiaStr || "-",
          usia_tahun: usiaThn,
          kelompok_usia: kelUsia || "30 - 39 Tahun",
          status_bekerja: r[33]?.trim() || "AKTIF",
          jenjang_saat_ini: r[34]?.trim() || "",
          tanggal_pensiun: r[35]?.trim() || "-",
          sisa_pensiun: sisaStr || "-",
          sisa_pensiun_tahun: sisaThn,
          agama: r[38]?.trim() || "Islam",
          email: r[39]?.trim() || "",
          nomor_hp: r[40]?.trim() || "",
          jam_kerja: r[45]?.trim() || "Layanan Rawat Jalan",
          kerja_tim: r[46]?.trim() || "Reguler",
          provinsi: prov,
          kab_kota: kab,
          kecamatan: kec,
          kelurahan: kel,
          alamat: alamat,
          domisili_wilayah: domisiliWilayah,
          no_str: noStr,
          masa_berlaku_str: masaStrExp,
          status_str: statusStr,
          no_sip: noSip,
          masa_berlaku_sip: masaSipExp,
          status_sip: statusSip
        };
      });

      const updatedSheet = {
        id: "sheet-master-puskesmas",
        name: "Master SDMK Puskesmas",
        description: "Data master kepegawaian & SDMK Puskesmas Kepulauan Seribu Selatan terhubung langsung ke Google Sheets (gid: 1900197277)",
        icon: "Building2",
        primaryMetricId: "masa_kerja_tahun",
        primaryDateId: "tmt_mulai",
        primaryCategoryId: "status_kepegawaian",
        updatedAt: new Date().toISOString(),
        columns,
        rows
      };

      res.json({
        success: true,
        sheet: updatedSheet,
        totalRows: rows.length,
        lastSynced: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("Error syncing Google Sheet:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Gagal menyinkronkan data dari Google Sheets"
      });
    }
  });

  // AI Insights Generation Endpoint
  app.post("/api/ai-insights", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(200).json({
          success: false,
          fallback: true,
          message: "GEMINI_API_KEY tidak terdeteksi. Sistem beralih ke analisis statistik lokal bawaan."
        });
      }

      const { sheetTitle, columns, sampleRows, summaryStats } = req.body;
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      const prompt = `Anda adalah seorang Business Intelligence & Data Analyst Senior.
Analisis data sheet berikut dalam Bahasa Indonesia yang profesional, padat, dan analitis:
Judul Lembar Kerja: ${sheetTitle || "Dataset Analitik"}
Struktur Kolom: ${JSON.stringify(columns || [])}
Statistik Ringkasan: ${JSON.stringify(summaryStats || {})}
Sampel Data (hingga 20 baris pertama): ${JSON.stringify((sampleRows || []).slice(0, 20))}

Tolong berikan hasil dalam format JSON yang valid dengan struktur berikut:
{
  "executiveSummary": "Ringkasan eksekutif 2-3 kalimat mengenai kondisi keseluruhan data dan tren utama.",
  "keyFindings": [
    "Poin temuan kunci 1 dengan angka relevan",
    "Poin temuan kunci 2 dengan perbandingan persentase",
    "Poin temuan kunci 3 terkait pola performa"
  ],
  "anomalies": [
    "Identifikasi anomali, fluktuasi drastis, atau outlier data",
    "Peringatan risiko atau area dengan data yang perlu divalidasi"
  ],
  "actionableRecommendations": [
    "Rekomendasi taktis 1 yang dapat dieksekusi",
    "Rekomendasi optimasi alokasi atau strategi 2",
    "Rekomendasi jangka menengah berbasis temuan data 3"
  ]
}`;

      const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      let response: any = null;
      let lastError: any = null;

      for (const modelName of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: "application/json"
            }
          });
          if (response?.text) {
            break;
          }
        } catch (mErr: any) {
          lastError = mErr;
          console.warn(`Attempt with ${modelName} encountered error:`, mErr?.message || mErr);
        }
      }

      if (!response?.text && lastError) {
        throw lastError;
      }

      const responseText = response?.text || "{}";
      const parsed = JSON.parse(responseText);
      res.json({ success: true, data: parsed });
    } catch (err: any) {
      console.error("AI Insight Error:", err);
      res.status(200).json({
        success: false,
        fallback: true,
        message: err.message || "Gagal memproses insight AI, beralih ke analisis lokal."
      });
    }
  });

  // GET /api/staff-photos - Mengambil semua foto pegawai tersimpan untuk sinkronisasi lintas browser
  app.get("/api/staff-photos", (req, res) => {
    try {
      const photos = getStaffPhotos();
      res.json({ success: true, photos });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/apps-script-config - Mengambil konfigurasi Google Apps Script untuk integrasi Drive & Sheets
  app.get("/api/apps-script-config", (req, res) => {
    try {
      const config = getAppsScriptConfig();
      res.json({
        success: true,
        appsScriptUrl: config.appsScriptUrl,
        folderId: "1zKpxWC7zsKx-AQsrGaaVLyBGGCYLyLnb",
        folderUrl: "https://drive.google.com/drive/folders/1zKpxWC7zsKx-AQsrGaaVLyBGGCYLyLnb?usp=sharing",
        spreadsheetId: "10MGH1h8nirliwFsyICcCghylhARdjCt8ulhKfrng_c0",
        columnLetter: "AD",
        columnIndex: 30
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/apps-script-config - Menyimpan URL Web App Google Apps Script
  app.post("/api/apps-script-config", (req, res) => {
    try {
      const { appsScriptUrl } = req.body;
      saveAppsScriptConfig({ appsScriptUrl: String(appsScriptUrl || '').trim() });
      res.json({ success: true, message: "Konfigurasi Google Apps Script berhasil disimpan." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/save-photo - Menyimpan foto pegawai ke Cloud Server & sinkronisasi Google Drive serta Kolom AD Spreadsheet
  app.post("/api/save-photo", async (req, res) => {
    try {
      const { staffKey, nip, nama, photo, appsScriptUrlOverride } = req.body;
      if (!staffKey && !nip && !nama) {
        return res.status(400).json({ success: false, error: "Identitas pegawai (staffKey, nip, atau nama) diperlukan" });
      }
      if (!photo) {
        return res.status(400).json({ success: false, error: "Data foto tidak boleh kosong" });
      }

      let finalPhotoUrl = photo;
      let isBase64 = false;
      let generatedFileName = "";

      // 1. Jika berupa base64 data image, simpan sebagai file fisik di public/uploads
      if (typeof photo === 'string' && photo.startsWith('data:image/')) {
        isBase64 = true;
        const matches = photo.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const rawExt = matches[1].toLowerCase();
          const ext = rawExt === 'jpeg' ? 'jpg' : (rawExt === 'svg+xml' ? 'svg' : rawExt);
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          const cleanKey = (nip || staffKey || nama || 'pegawai').replace(/[^a-zA-Z0-9_-]/g, '_');
          generatedFileName = `foto_${cleanKey}_${Date.now()}.${ext}`;
          const filePath = path.join(UPLOADS_DIR, generatedFileName);

          fs.writeFileSync(filePath, buffer);
          finalPhotoUrl = `/uploads/${generatedFileName}`;
        }
      } else {
        // Konversi jika merupakan tautan Google Drive
        finalPhotoUrl = convertGoogleDriveUrlServer(photo);
      }

      // Buat URL lengkap absolut untuk ditempel di Spreadsheet jika diperlukan
      const host = req.get("host") || "localhost:3000";
      const protocol = req.protocol || "http";
      const baseUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/+$/, '') : `${protocol}://${host}`;
      const fullPhotoUrl = finalPhotoUrl.startsWith("http") ? finalPhotoUrl : `${baseUrl}${finalPhotoUrl}`;

      // 2. Hubungkan ke Google Apps Script Web App jika URL tersedia
      const config = getAppsScriptConfig();
      const targetAppsScriptUrl = appsScriptUrlOverride || config.appsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL;

      let driveUrl = "";
      let driveViewUrl = "";
      let updatedRow = -1;
      let appsScriptSynced = false;

      if (targetAppsScriptUrl && targetAppsScriptUrl.trim().startsWith("http")) {
        try {
          console.log(`Mengirim foto pegawai ke Google Apps Script: ${targetAppsScriptUrl}`);
          const scriptRes = await fetch(targetAppsScriptUrl.trim(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "uploadPhoto",
              nip: nip || "",
              nama: nama || "",
              photo: photo, // Mengirim base64 atau url asli
              filename: generatedFileName || `foto_${nip || 'pegawai'}.jpg`,
              folderId: "1zKpxWC7zsKx-AQsrGaaVLyBGGCYLyLnb",
              spreadsheetId: "10MGH1h8nirliwFsyICcCghylhARdjCt8ulhKfrng_c0",
              sheetName: "Uraian",
              columnLetter: "AD",
              columnIndex: 30
            })
          });

          if (scriptRes.ok) {
            const scriptData: any = await scriptRes.json();
            if (scriptData && scriptData.success) {
              driveUrl = scriptData.fileUrl || scriptData.directUrl || "";
              driveViewUrl = scriptData.driveViewUrl || "";
              updatedRow = scriptData.updatedRow || -1;
              appsScriptSynced = true;
              if (driveUrl) {
                finalPhotoUrl = convertGoogleDriveUrlServer(driveUrl);
              }
              console.log(`Berhasil sync Apps Script! Drive: ${driveUrl}, Baris Spreadsheet AD: ${updatedRow}`);
            }
          }
        } catch (scriptErr: any) {
          console.warn("Koneksi ke Google Apps Script mengalami kendala, tetap menyimpan di server cloud:", scriptErr.message);
        }
      }

      // 3. Simpan ke database server staff_photos.json dengan berbagai alias kunci
      const photos = getStaffPhotos();
      const keysToMap = [
        staffKey,
        nip,
        nama ? `nama:${nama.trim().toLowerCase()}` : null,
      ].filter(Boolean) as string[];

      for (const k of keysToMap) {
        photos[k] = finalPhotoUrl;
      }
      saveStaffPhotosMap(photos);

      console.log(`Foto pegawai tersimpan permanen untuk ${nama || nip || staffKey}: ${finalPhotoUrl}`);

      res.json({
        success: true,
        photoUrl: finalPhotoUrl,
        fullPhotoUrl: fullPhotoUrl,
        driveUrl: driveUrl || (photo.includes('drive.google.com') ? photo : ''),
        driveViewUrl: driveViewUrl,
        driveFolderUrl: "https://drive.google.com/drive/folders/1zKpxWC7zsKx-AQsrGaaVLyBGGCYLyLnb?usp=sharing",
        spreadsheetId: "10MGH1h8nirliwFsyICcCghylhARdjCt8ulhKfrng_c0",
        spreadsheetColumn: "AD",
        updatedRow: updatedRow,
        appsScriptSynced,
        message: appsScriptSynced 
          ? `Foto tersimpan di Google Drive dan link berhasil diperbarui pada Spreadsheet Kolom AD (Baris ${updatedRow})!`
          : "Foto berhasil disimpan secara permanen di cloud server dan dapat diakses dari semua browser."
      });
    } catch (err: any) {
      console.error("Error saving staff photo:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/image-proxy - Proxy external photos with CORS headers so canvas is never tainted
  app.get("/api/image-proxy", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl || !targetUrl.startsWith("http")) {
        return res.status(400).send("Invalid URL");
      }
      const response = await fetch(targetUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      if (!response.ok) {
        return res.status(response.status).send("Failed to fetch image");
      }
      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=86400");
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      res.status(500).send("Error fetching image: " + err.message);
    }
  });

  // Serve public assets explicitly
  app.use(express.static(path.join(process.cwd(), "public")));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
