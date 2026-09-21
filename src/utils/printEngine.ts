import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

/**
 * Print & PDF Engine Terpadu
 * Menyediakan export PDF langsung (A4 Landscape / Portrait), Unduh Gambar PNG,
 * Tampil di NEW TAB dengan Pratinjau Lengkap, dan Auto-Download.
 */

export interface PrintOptions {
  title: string;
  orientation?: 'landscape' | 'portrait';
  scaleToFit?: boolean;
}

export interface PdfExportOptions {
  filename?: string;
  title?: string;
  orientation?: 'landscape' | 'portrait';
  backgroundColor?: string;
  targetWindow?: Window | null;
  openInNewTab?: boolean;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Buka Pratinjau PDF di TAB BARU, Tampilkan Pratinjau Lengkap Sesuai Ukuran A4 & Otomatis Download
 */
export async function openPdfInNewTabAndDownload(
  elementId: string,
  options: PdfExportOptions = {}
): Promise<boolean> {
  // Jika tab baru belum disiapkan oleh pemanggil, coba buka sekarang
  let targetWin = options.targetWindow;
  if (!targetWin || targetWin.closed) {
    try {
      targetWin = window.open('about:blank', '_blank');
    } catch {
      targetWin = null;
    }
  }

  const isLandscape = options.orientation === 'landscape';
  const rawTitle = options.title || options.filename || 'Dokumen Resmi Puskesmas';
  const filename = (options.filename || rawTitle).replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_\-\s]/g, '') + '.pdf';
  const pageTitle = options.title || filename.replace('.pdf', '');

  // Tampilkan antarmuka memuat sementara di tab baru
  if (targetWin && !targetWin.closed) {
    try {
      targetWin.document.open();
      targetWin.document.write(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>Menyiapkan PDF - ${escapeHtml(pageTitle)}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background-color: #0f172a;
              color: #f8fafc;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 24px;
              text-align: center;
            }
            .spinner {
              width: 56px;
              height: 56px;
              border: 4px solid rgba(255, 255, 255, 0.15);
              border-top-color: #10b981;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
              margin-bottom: 24px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #ffffff; }
            p { font-size: 14px; color: #94a3b8; max-width: 480px; line-height: 1.6; }
            .badge {
              display: inline-block;
              margin-top: 18px;
              padding: 6px 14px;
              background: rgba(16, 185, 129, 0.15);
              border: 1px solid rgba(16, 185, 129, 0.3);
              color: #34d399;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h1>Menyiapkan Dokumen PDF A4 ${isLandscape ? 'Landscape' : 'Portrait'}...</h1>
          <p>Sistem sedang me-render bagan dan dokumen dengan resolusi tinggi agar pas tepat 1 lembar A4. PDF akan segera terbuka di tab ini dan terunduh otomatis ke perangkat Anda.</p>
          <div class="badge">Puskesmas Kepulauan Seribu Selatan</div>
        </body>
        </html>
      `);
      targetWin.document.close();
    } catch (e) {
      console.warn('Gagal menulis loader ke tab baru:', e);
    }
  }

  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    console.error(`Elemen dengan ID "${elementId}" tidak ditemukan.`);
    if (targetWin && !targetWin.closed) {
      targetWin.document.body.innerHTML = `
        <div style="font-family: sans-serif; text-align: center; padding: 40px; color: #ef4444;">
          <h2>Elemen dokumen tidak ditemukan</h2>
          <p>Pastikan halaman yang ingin dicetak terbuka dengan benar.</p>
        </div>
      `;
    }
    return false;
  }

  try {
    // Simpan style transform asli jika ada zoom aktif di layar (baik di elemen maupun wrapper parent)
    const originalTransform = sourceEl.style.transform;
    const originalTransformOrigin = sourceEl.style.transformOrigin;
    const captureWrapper = (document.getElementById('canvas-capture-wrapper') || sourceEl.parentElement) as HTMLElement | null;
    const originalWrapperTransform = captureWrapper ? captureWrapper.style.transform : '';
    const originalWrapperOrigin = captureWrapper ? captureWrapper.style.transformOrigin : '';
    
    // Matikan zoom sementara agar hasil render canvas tajam 100% dan tidak terpotong
    if (captureWrapper) {
      captureWrapper.style.transform = 'none';
      captureWrapper.style.transformOrigin = 'top center';
    }
    sourceEl.style.transform = 'none';
    sourceEl.style.transformOrigin = 'top left';

    // Berikan jeda sejenak agar DOM terhitung sempurna
    await new Promise((r) => setTimeout(r, 90));

    // Render ke canvas resolusi tinggi dengan proteksi CORS anti-taint
    const canvas = await html2canvas(sourceEl, {
      scale: 2, // 2x resolusi untuk ketajaman tulisan dan garis bagan
      useCORS: true,
      allowTaint: false, // WAJIB false agar toDataURL tidak SecurityError
      logging: false,
      backgroundColor: options.backgroundColor || (elementId.includes('ilp') ? '#0B2559' : '#ffffff'),
      windowWidth: isLandscape ? 1220 : 850,
      imageTimeout: 12000,
      onclone: (clonedDoc) => {
        // Stabilkan container bagan pada clonedDoc ke ukuran standar A4
        const clonedTarget = clonedDoc.getElementById(elementId);
        if (clonedTarget) {
          clonedTarget.style.transform = 'none';
          clonedTarget.style.margin = '0 auto';
          if (isLandscape) {
            clonedTarget.style.width = '1180px';
            clonedTarget.style.minWidth = '1180px';
            clonedTarget.style.maxWidth = '1180px';
          }
        }

        // 1. Sanitasi semua gambar di clonedDoc
        const allImages = clonedDoc.querySelectorAll('img');
        allImages.forEach((img) => {
          img.crossOrigin = 'anonymous';

          // Jika URL gambar eksternal (Google Drive / http eksternal), proksikan lewat server lokal
          if (img.src && img.src.startsWith('http') && !img.src.includes(window.location.host)) {
            img.src = `/api/image-proxy?url=${encodeURIComponent(img.src)}`;
          }

          // Kunci batas ukuran logo agar tidak meledak ke resolusi asli
          if (img.src && (img.src.includes('logo-dki') || img.alt?.includes('Jaya Raya'))) {
            img.style.width = isLandscape ? '52px' : '64px';
            img.style.height = isLandscape ? '52px' : '64px';
            img.style.minWidth = isLandscape ? '52px' : '64px';
            img.style.minHeight = isLandscape ? '52px' : '64px';
            img.style.maxWidth = isLandscape ? '52px' : '64px';
            img.style.maxHeight = isLandscape ? '52px' : '64px';
            img.style.objectFit = 'contain';
          } else if (img.src && img.src.includes('logo-puskesmas')) {
            img.style.width = '64px';
            img.style.height = '64px';
            img.style.maxWidth = '64px';
            img.style.maxHeight = '64px';
            img.style.objectFit = 'contain';
          } else {
            // Foto avatar pegawai
            img.style.maxWidth = '100%';
            img.style.objectFit = 'cover';
          }
        });

        // 2. Sembunyikan elemen interaktif yang tidak boleh ada di cetakan
        const interactiveEls = clonedDoc.querySelectorAll('button, .print\\:hidden, #btn-copy-uraian, #btn-upload-photo-uraian-bar, #btn-edit-staff-uraian');
        interactiveEls.forEach((el) => {
          (el as HTMLElement).style.display = 'none';
        });
      }
    });

    // Kembalikan style transform asli di layar pengguna
    if (captureWrapper) {
      captureWrapper.style.transform = originalWrapperTransform;
      captureWrapper.style.transformOrigin = originalWrapperOrigin;
    }
    sourceEl.style.transform = originalTransform;
    sourceEl.style.transformOrigin = originalTransformOrigin;

    // Ambil data gambar base64 format PNG tanpa kompresi buram untuk garis & teks tajam
    const imgData = canvas.toDataURL('image/png');

    // Konfigurasi Standar Dimensi A4 dalam milimeter:
    // A4 Landscape: 297mm x 210mm | A4 Portrait: 210mm x 297mm
    const pdfWidth = isLandscape ? 297 : 210;
    const pdfHeight = isLandscape ? 210 : 297;
    const marginX = isLandscape ? 4 : 6;
    const marginY = isLandscape ? 4 : 6;

    const availableWidth = pdfWidth - marginX * 2;
    const availableHeight = pdfHeight - marginY * 2;

    // Hitung proporsi gambar agar pas tepat 1 lembar A4 tanpa terpotong
    const imgRatio = canvas.width / canvas.height;
    let renderWidth = availableWidth;
    let renderHeight = renderWidth / imgRatio;

    if (renderHeight > availableHeight) {
      renderHeight = availableHeight;
      renderWidth = renderHeight * imgRatio;
    }

    const posX = marginX + (availableWidth - renderWidth) / 2;
    const posY = marginY + (availableHeight - renderHeight) / 2;

    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Isi background jika halaman berwarna (misal bagan biru tua #0B2559 atau teal)
    if (options.backgroundColor && options.backgroundColor !== '#ffffff') {
      doc.setFillColor(options.backgroundColor);
      doc.rect(0, 0, pdfWidth, pdfHeight, 'F');
    }

    // Tempelkan gambar resolusi tinggi tepat 1 lembar
    doc.addImage(imgData, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');

    // Buat Blob dan Blob URL
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    // Unduh langsung di tab utama sebagai kepastian
    try {
      doc.save(filename);
    } catch (saveErr) {
      console.warn('Direct doc.save warning:', saveErr);
    }

    // Jika tab baru terbuka, tampilkan viewer PDF interaktif di Tab Baru
    if (targetWin && !targetWin.closed) {
      try {
        targetWin.document.open();
        targetWin.document.write(`
          <!DOCTYPE html>
          <html lang="id">
          <head>
            <meta charset="utf-8">
            <title>${escapeHtml(pageTitle)} - Dokumen Resmi PDF A4 ${isLandscape ? 'Landscape' : 'Portrait'}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              html, body {
                width: 100%;
                height: 100%;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #0f172a;
                color: #f8fafc;
              }
              header {
                height: 56px;
                background: #0b192c;
                border-bottom: 1px solid #1e293b;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 16px;
                gap: 12px;
                z-index: 100;
              }
              .title-area {
                display: flex;
                align-items: center;
                gap: 12px;
                overflow: hidden;
              }
              .badge-org {
                background: #0284c7;
                color: white;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.5px;
                white-space: nowrap;
              }
              .badge-format {
                background: ${isLandscape ? '#f59e0b' : '#10b981'};
                color: #1e293b;
                padding: 3px 8px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 800;
                white-space: nowrap;
              }
              .doc-title {
                font-size: 13px;
                font-weight: 600;
                color: #e2e8f0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .action-area {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-shrink: 0;
              }
              .btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 14px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                text-decoration: none;
                border: none;
                transition: all 0.15s ease;
              }
              .btn-download {
                background: #059669;
                color: white;
                box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
              }
              .btn-download:hover {
                background: #047857;
              }
              .btn-print {
                background: #2563eb;
                color: white;
              }
              .btn-print:hover {
                background: #1d4ed8;
              }
              .btn-close {
                background: #334155;
                color: #cbd5e1;
              }
              .btn-close:hover {
                background: #475569;
                color: white;
              }
              #viewerContainer {
                width: 100%;
                height: calc(100% - 56px);
                position: relative;
                background: #334155;
              }
              #pdfFrame {
                width: 100%;
                height: 100%;
                border: none;
              }
              .toast {
                position: fixed;
                bottom: 16px;
                right: 16px;
                background: #064e3b;
                border: 1px solid #059669;
                color: #a7f3d0;
                padding: 10px 16px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 600;
                box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 1000;
              }
              @page {
                size: A4 ${isLandscape ? 'landscape' : 'portrait'};
                margin: 0;
              }
              @media print {
                header, .toast {
                  display: none !important;
                }
                body, html, #viewerContainer {
                  width: 100% !important;
                  height: 100% !important;
                  background: transparent !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                #pdfFrame {
                  width: 100% !important;
                  height: 100% !important;
                }
              }
            </style>
          </head>
          <body>
            <header>
              <div class="title-area">
                <span class="badge-org">PUSKESMAS KEP. SERIBU SELATAN</span>
                <span class="badge-format">A4 ${isLandscape ? 'LANDSCAPE' : 'PORTRAIT'}</span>
                <span class="doc-title">${escapeHtml(pageTitle)}</span>
              </div>
              <div class="action-area">
                <a id="btnDownload" href="${blobUrl}" download="${escapeHtml(filename)}" class="btn btn-download">
                  <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Download PDF A4</span>
                </a>
                <button id="btnPrint" class="btn btn-print" onclick="printDoc()">
                  <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  <span>Cetak (Print)</span>
                </button>
                <button class="btn btn-close" onclick="window.close()">Tutup</button>
              </div>
            </header>

            <div id="viewerContainer">
              <iframe id="pdfFrame" src="${blobUrl}#view=Fit&toolbar=1" type="application/pdf"></iframe>
            </div>

            <div id="toastSuccess" class="toast">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
              <span>Dokumen A4 ${isLandscape ? 'Landscape' : 'Portrait'} siap! Otomatis terunduh.</span>
            </div>

            <script>
              function printDoc() {
                var f = document.getElementById('pdfFrame');
                try {
                  if (f && f.contentWindow) {
                    f.contentWindow.focus();
                    f.contentWindow.print();
                    return;
                  }
                } catch(e) {
                  console.warn('Iframe print restricted:', e);
                }
                window.print();
              }

              // Hilangkan toast setelah beberapa detik
              setTimeout(function() {
                var t = document.getElementById('toastSuccess');
                if (t) t.style.display = 'none';
              }, 4500);

              // Auto-download file setelah viewer dimuat
              window.addEventListener('load', function() {
                setTimeout(function() {
                  var dl = document.getElementById('btnDownload');
                  if (dl) {
                    dl.click();
                  }
                }, 300);
              });
            </script>
          </body>
          </html>
        `);
        targetWin.document.close();
      } catch (writeErr) {
        console.warn('Gagal menulis viewer ke tab baru:', writeErr);
      }
    }

    return true;
  } catch (err) {
    console.error('Gagal membuat PDF via jsPDF/canvas:', err);

    // Fallback darurat jika canvas di browser pengguna mengalami kegagalan
    if (targetWin && !targetWin.closed) {
      try {
        const cloned = sourceEl.cloneNode(true) as HTMLElement;
        cloned.style.transform = 'none';
        cloned.style.margin = '0 auto';
        cloned.style.boxShadow = 'none';

        // Sanitasi ukuran gambar pada fallback
        const imgs = cloned.querySelectorAll('img');
        imgs.forEach((img) => {
          if (img.src && (img.src.includes('logo-dki') || img.alt?.includes('Jaya Raya'))) {
            img.style.width = isLandscape ? '48px' : '64px';
            img.style.height = isLandscape ? '48px' : '64px';
            img.style.maxWidth = isLandscape ? '48px' : '64px';
            img.style.maxHeight = isLandscape ? '48px' : '64px';
            img.style.objectFit = 'contain';
          }
        });

        targetWin.document.open();
        targetWin.document.write(`
          <!DOCTYPE html>
          <html lang="id">
          <head>
            <meta charset="utf-8">
            <title>${escapeHtml(pageTitle)} - Format A4 ${isLandscape ? 'Landscape' : 'Portrait'}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page {
                size: A4 ${isLandscape ? 'landscape' : 'portrait'};
                margin: 4mm;
              }
              body {
                margin: 0;
                padding: 16px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #f1f5f9;
              }
              .toolbar {
                position: sticky;
                top: 0;
                background: #0B2559;
                color: white;
                padding: 12px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 12px;
                margin-bottom: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 100;
              }
              .btn-action {
                background: #10b981;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                font-size: 13px;
              }
              .btn-action:hover { background: #059669; }
              .page-wrapper {
                width: ${isLandscape ? '287mm' : '200mm'};
                margin: 0 auto;
                background: white;
                box-shadow: 0 4px 16px rgba(0,0,0,0.1);
                border-radius: 8px;
                overflow: hidden;
                page-break-inside: avoid;
                break-inside: avoid;
              }
              .scale-wrapper {
                ${isLandscape ? 'transform: scale(0.68); transform-origin: top center; width: 1120px; margin: 0 auto;' : 'width: 100%;'}
              }
              @media print {
                .toolbar { display: none !important; }
                body { padding: 0 !important; background: white !important; }
                .page-wrapper {
                  box-shadow: none !important;
                  border-radius: 0 !important;
                  width: 100% !important;
                  max-height: 100% !important;
                  overflow: hidden !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="toolbar">
              <div>
                <strong>${escapeHtml(pageTitle)}</strong>
                <span style="font-size: 12px; opacity: 0.85; margin-left: 8px;">Format A4 ${isLandscape ? 'Landscape (1 Halaman)' : 'Portrait (1 Halaman)'}</span>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn-action" onclick="window.print()">Cetak / Simpan PDF (Ctrl+P)</button>
                <button class="btn-action" style="background: #475569;" onclick="window.close()">Tutup</button>
              </div>
            </div>
            <div class="page-wrapper">
              <div class="scale-wrapper">
                ${cloned.outerHTML}
              </div>
            </div>
          </body>
          </html>
        `);
        targetWin.document.close();
        return true;
      } catch (fallbackErr) {
        console.error('Fallback error:', fallbackErr);
      }
    }

    return false;
  }
}

/**
 * Ekspor elemen DOM langsung menjadi file dokumen PDF berkualitas tinggi
 */
export async function exportElementToPdf(
  elementId: string,
  options: PdfExportOptions = {}
): Promise<boolean> {
  return openPdfInNewTabAndDownload(elementId, options);
}

/**
 * Ekspor elemen DOM menjadi gambar resolusi tinggi (PNG)
 */
export async function downloadElementAsImage(
  elementId: string,
  filename: string = 'bagan_struktur.png'
): Promise<boolean> {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) return false;

  try {
    const originalTransform = sourceEl.style.transform;
    sourceEl.style.transform = 'none';

    await new Promise((r) => setTimeout(r, 60));

    const canvas = await html2canvas(sourceEl, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      windowWidth: Math.max(sourceEl.scrollWidth, 1280),
      onclone: (clonedDoc) => {
        const imgs = clonedDoc.querySelectorAll('img');
        imgs.forEach((img) => {
          img.crossOrigin = 'anonymous';
          if (img.src && img.src.startsWith('http') && !img.src.includes(window.location.host)) {
            img.src = `/api/image-proxy?url=${encodeURIComponent(img.src)}`;
          }
          if (img.src && (img.src.includes('logo-dki') || img.alt?.includes('Jaya Raya'))) {
            img.style.width = '48px';
            img.style.height = '48px';
            img.style.maxWidth = '48px';
            img.style.maxHeight = '48px';
            img.style.objectFit = 'contain';
          }
        });
      }
    });

    sourceEl.style.transform = originalTransform;

    const imgUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    link.href = imgUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (err) {
    console.error('Gagal mengekspor gambar:', err);
    return false;
  }
}

/**
 * Cetak elemen DOM tertentu secara bersih via dialog cetak browser
 */
export function printElementById(elementId: string, options: PrintOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const sourceEl = document.getElementById(elementId);
    if (!sourceEl) {
      console.error(`Elemen dengan ID "${elementId}" tidak ditemukan.`);
      window.print();
      resolve(false);
      return;
    }

    try {
      const isLandscape = options.orientation === 'landscape';

      // Buat container portal cetak khusus di dokumen utama
      const printPortalId = 'app-custom-print-portal';
      let portal = document.getElementById(printPortalId);
      if (portal) {
        portal.remove();
      }

      portal = document.createElement('div');
      portal.id = printPortalId;
      portal.className = 'custom-print-active';

      // Clone node
      const cloned = sourceEl.cloneNode(true) as HTMLElement;
      cloned.style.transform = isLandscape ? 'scale(0.70)' : 'none';
      cloned.style.transformOrigin = 'top center';
      cloned.style.margin = '0 auto';
      cloned.style.boxShadow = 'none';
      cloned.style.width = isLandscape ? '1120px' : '100%';
      cloned.style.maxWidth = isLandscape ? '1120px' : '800px';

      // Sanitasi ukuran gambar pada portal cetak
      const imgs = cloned.querySelectorAll('img');
      imgs.forEach((img) => {
        if (img.src && (img.src.includes('logo-dki') || img.alt?.includes('Jaya Raya'))) {
          img.style.width = isLandscape ? '48px' : '64px';
          img.style.height = isLandscape ? '48px' : '64px';
          img.style.maxWidth = isLandscape ? '48px' : '64px';
          img.style.maxHeight = isLandscape ? '48px' : '64px';
          img.style.objectFit = 'contain';
        }
      });

      portal.appendChild(cloned);
      document.body.appendChild(portal);

      // Suntik style @media print sementara
      const styleId = 'app-custom-print-style';
      let styleEl = document.getElementById(styleId);
      if (styleEl) styleEl.remove();

      styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.innerHTML = `
        @page {
          size: A4 ${isLandscape ? 'landscape' : 'portrait'};
          margin: 4mm;
        }
        @media screen {
          #${printPortalId} {
            display: none !important;
          }
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          #${printPortalId}, #${printPortalId} * {
            visibility: visible !important;
          }
          #${printPortalId} {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            display: block !important;
            z-index: 9999999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print\\:hidden, .no-print {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(styleEl);

      const cleanup = () => {
        if (portal && document.body.contains(portal)) portal.remove();
        if (styleEl && document.head.contains(styleEl)) styleEl.remove();
        window.removeEventListener('afterprint', cleanup);
      };

      window.addEventListener('afterprint', cleanup);

      // Jalankan print
      setTimeout(() => {
        window.print();
        setTimeout(cleanup, 2500);
        resolve(true);
      }, 150);

    } catch (err) {
      console.error('Print engine error:', err);
      window.print();
      resolve(false);
    }
  });
}
