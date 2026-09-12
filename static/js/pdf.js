// ═══════════════════════════════════════════════════════
//  pdf.js — Generate PDF laporan prediksi via browser print
//  Tanpa library eksternal — pakai window.print() + CSS @media print
// ═══════════════════════════════════════════════════════
function generatePDF(result) {
  const now = new Date().toLocaleString('id-ID');
  const { status, probabilitas, peringatan, saran, input } = result;

  const LABELS = {suhu:'Suhu (°C)', pH:'pH', DO:'DO (mg/L)', amonia:'Amonia (mg/L)', nitrat:'Nitrat (mg/L)', TDS:'TDS (mg/L)', turbidity:'Turbidity (NTU)'};
  const EMOJI = {AMAN:'🟢', WASPADA:'🟡', BERBAHAYA:'🔴'};
  const WARNA = {AMAN:'#16a34a', WASPADA:'#d97706', BERBAHAYA:'#dc2626'};

  const paramRows = Object.entries(input).map(([k,v])=>
    `<tr><td>${LABELS[k]||k}</td><td><strong>${v}</strong></td></tr>`).join('');

  const warnRows = peringatan?.length > 0
    ? peringatan.map(w=>`<li>${w}</li>`).join('')
    : '<li style="color:#16a34a">✅ Semua parameter dalam rentang yang dapat diterima.</li>';

  const probRows = Object.entries(probabilitas).map(([k,v])=>
    `<tr><td>${k}</td><td>${(v*100).toFixed(1)}%</td></tr>`).join('');

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/>
  <title>Laporan Kualitas Air — ${now}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:32px;max-width:680px;margin:0 auto}
    h1{font-size:20px;color:#0077aa;margin-bottom:4px}
    .sub{color:#666;font-size:12px;margin-bottom:24px}
    .status-box{padding:14px 20px;border-radius:8px;margin-bottom:20px;border:2px solid ${WARNA[status]};background:${WARNA[status]}18}
    .status-label{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.06em}
    .status-val{font-size:28px;font-weight:700;color:${WARNA[status]}}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb;font-size:13px}
    th{background:#f3f4f6;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
    h3{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#555;margin-bottom:8px;margin-top:20px}
    ul{list-style:none;padding:0;margin:0}
    li{padding:7px 10px;background:#fef3c7;border-left:3px solid #d97706;margin-bottom:5px;border-radius:4px;font-size:12px}
    .reko{padding:12px;background:#eff6ff;border-left:3px solid #0077aa;border-radius:4px;font-size:13px}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#999;text-align:center}
    @media print{body{padding:16px}}
  </style></head><body>
  <h1>🐟 AquaGuard — Laporan Kualitas Air Kolam Lele Sangkuriang</h1>
  <div class="sub">Tanggal: ${now} · Algoritma: Random Forest · Akurasi: 92.68%</div>

  <div class="status-box">
    <div class="status-label">Status Kualitas Air</div>
    <div class="status-val">${EMOJI[status]} ${status}</div>
  </div>

  <h3>Parameter yang Diinput</h3>
  <table><thead><tr><th>Parameter</th><th>Nilai</th></tr></thead><tbody>${paramRows}</tbody></table>

  <h3>Skor Keputusan</h3>
  <table><thead><tr><th>Kelas</th><th>Probabilitas</th></tr></thead><tbody>${probRows}</tbody></table>

  <h3>Parameter Menyimpang</h3>
  <ul>${warnRows}</ul>

  <h3>Rekomendasi Tindakan</h3>
  <div class="reko">${saran}</div>

  <div class="footer">
    AquaGuard · Sistem Peringatan Dini Kualitas Air Kolam Ikan Lele Sangkuriang<br/>
    Referensi: SNI 6484.4:2014 · KepMenLH No.75/2001 · Boyd (1998)
  </div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=750,height=900');
  if (w) { w.document.write(html); w.document.close(); }
  else alert('Pop-up diblokir. Izinkan pop-up untuk mengunduh PDF.');
}
