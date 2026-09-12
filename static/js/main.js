// ═══════════════════════════════════════════════════════
//  AquaGuard — main.js (dengan validasi batas fisik)
// ═══════════════════════════════════════════════════════

const PRESETS = {
  aman:    {suhu:28.0,pH:7.5,DO:6.5,amonia:0.05,nitrat:8.0, TDS:350,turbidity:15.0},
  waspada: {suhu:25.0,pH:7.5,DO:4.5,amonia:0.20,nitrat:20.0,TDS:320,turbidity:80.0},
  bahaya:  {suhu:32.5,pH:5.8,DO:1.5,amonia:2.50,nitrat:155.0,TDS:650,turbidity:150.0},
};

const FIELDS = ['suhu','pH','DO','amonia','nitrat','TDS','turbidity'];

// Batas fisik valid — WAJIB sinkron dengan BATAS_VALID di app.py
const BATAS = {
  suhu:      {min:15,  max:40,   label:'Suhu',      satuan:'°C'},
  pH:        {min:3,   max:11,   label:'pH',         satuan:''},
  DO:        {min:0,   max:20,   label:'DO',         satuan:'mg/L'},
  amonia:    {min:0,   max:10,   label:'Amonia',     satuan:'mg/L'},
  nitrat:    {min:0,   max:200,  label:'Nitrat',     satuan:'mg/L'},
  TDS:       {min:0,   max:1000, label:'TDS',        satuan:'mg/L'},
  turbidity: {min:0,   max:500,  label:'Turbidity',  satuan:'NTU'},
};

const STATUS_META = {
  AMAN:      {emoji:'🟢', cls:'s-aman'},
  WASPADA:   {emoji:'🟡', cls:'s-waspada'},
  BERBAHAYA: {emoji:'🔴', cls:'s-berbahaya'},
};

let lastResult = null;

function setErr(id, v) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('input-error', v);
}

function showState(target) {
  ['stateIdle','stateLoading','stateResult','stateError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (el === target) ? '' : 'none';
  });
}

// ── Validasi batas fisik (frontend) ─────────────────────
function validasiFisik(payload) {
  const errors = [];
  for (const [feat, val] of Object.entries(payload)) {
    const b = BATAS[feat];
    if (!b) continue;
    if (val < b.min || val > b.max) {
      errors.push(`${b.label}: nilai ${val}${b.satuan} tidak valid (rentang yang diterima: ${b.min}–${b.max}${b.satuan})`);
      setErr(feat, true);
    }
  }
  return errors;
}

function renderResult(data) {
  const meta   = STATUS_META[data.status] || STATUS_META.AMAN;
  const banner = document.getElementById('statusBanner');
  const emoji  = document.getElementById('statusEmoji');
  const value  = document.getElementById('statusValue');
  const bars   = document.getElementById('probBars');
  const warns  = document.getElementById('warnList');
  const reko   = document.getElementById('rekoText');

  banner.className  = `status-banner ${meta.cls}`;
  emoji.textContent = meta.emoji;
  value.textContent = data.status;

  // Probability bars
  bars.innerHTML = '';
  ['AMAN','WASPADA','BERBAHAYA'].forEach(cls => {
    const prob = data.probabilitas[cls] ?? 0;
    const pct  = (prob * 100).toFixed(1);
    bars.insertAdjacentHTML('beforeend', `
      <div class="prob-bar-item">
        <div class="prob-bar-label"><span>${cls}</span><span>${pct}%</span></div>
        <div class="prob-bar-track">
          <div class="prob-bar-fill c-${cls.toLowerCase()}" style="width:0%" data-target="${pct}%"></div>
        </div>
      </div>`);
  });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bars.querySelectorAll('.prob-bar-fill').forEach(b => { b.style.width = b.dataset.target; });
  }));

  // Peringatan
  warns.innerHTML = '';
  if (data.peringatan?.length > 0) {
    data.peringatan.forEach(w => warns.insertAdjacentHTML('beforeend', `<li>⚠️ ${w}</li>`));
  } else {
    warns.insertAdjacentHTML('beforeend', `<li class="warn-none">✅ Semua parameter dalam rentang yang dapat diterima.</li>`);
  }
  reko.textContent = data.saran;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function downloadCsvTemplate() {
  const csv = [
    FIELDS.join(','),
    '28.0,7.5,6.5,0.05,8,350,15',
    '25.0,7.5,4.5,0.20,20,320,80',
    '32.5,5.8,1.5,2.50,155,650,150',
  ].join('\n');
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template_prediksi_aquaguard.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderBatchResult(data) {
  const box = document.getElementById('batchResult');
  if (!box) return;

  const summary = data.summary || {};
  const results = data.results || [];
  const errors = data.errors || [];

  const rows = results.slice(0, 50).map(r => {
    const input = r.input || {};
    const prob = r.probabilitas || {};
    return `<tr>
      <td>${r.row}</td>
      <td>${Number(input.suhu).toFixed(1)}</td>
      <td>${Number(input.pH).toFixed(1)}</td>
      <td>${Number(input.DO).toFixed(1)}</td>
      <td>${Number(input.amonia).toFixed(2)}</td>
      <td>${Number(input.nitrat).toFixed(1)}</td>
      <td>${Number(input.TDS).toFixed(0)}</td>
      <td>${Number(input.turbidity).toFixed(1)}</td>
      <td><span class="badge badge-${String(r.status).toLowerCase()}">${escapeHtml(r.status)}</span></td>
      <td>${((prob[r.status] ?? 0) * 100).toFixed(1)}%</td>
      <td>${r.peringatan_count}</td>
    </tr>`;
  }).join('');

  const errorItems = errors.slice(0, 8).map(e => {
    const detail = e.error?.pesan || e.error?.error || e.error?.detail?.join(', ') || e.error || 'Baris tidak valid';
    return `<li>Baris ${e.row}: ${escapeHtml(detail)}</li>`;
  }).join('');

  box.innerHTML = `
    <div class="batch-summary">
      <div><span>Total</span><strong>${summary.total_rows ?? 0}</strong></div>
      <div><span>Berhasil</span><strong>${summary.success ?? 0}</strong></div>
      <div><span>Gagal</span><strong>${summary.failed ?? 0}</strong></div>
      <div class="bs-aman"><span>AMAN</span><strong>${summary.AMAN ?? 0}</strong></div>
      <div class="bs-waspada"><span>WASPADA</span><strong>${summary.WASPADA ?? 0}</strong></div>
      <div class="bs-bahaya"><span>BERBAHAYA</span><strong>${summary.BERBAHAYA ?? 0}</strong></div>
    </div>
    ${results.length ? `<div class="table-wrap batch-table-wrap">
      <table class="riwayat-table batch-table">
        <thead><tr><th>Row</th><th>Suhu</th><th>pH</th><th>DO</th><th>Amonia</th><th>Nitrat</th><th>TDS</th><th>Turb.</th><th>Status</th><th>Skor</th><th>Warn</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>` : ''}
    ${results.length > 50 ? `<p class="batch-note">Menampilkan 50 baris pertama dari ${results.length} hasil berhasil.</p>` : ''}
    ${errors.length ? `<div class="batch-errors"><strong>Baris gagal:</strong><ul>${errorItems}</ul></div>` : ''}
  `;
}

document.addEventListener('DOMContentLoaded', () => {

  const form        = document.getElementById('predForm');
  const btnPredict  = document.getElementById('btnPredict');
  const btnReset    = document.getElementById('btnReset');
  const btnUlang    = document.getElementById('btnUlang');
  const btnPDF      = document.getElementById('btnPDF');
  const stateIdle   = document.getElementById('stateIdle');
  const stateLoad   = document.getElementById('stateLoading');
  const stateResult = document.getElementById('stateResult');
  const stateError  = document.getElementById('stateError');
  const errorMsg    = document.getElementById('errorMsg');
  const batchForm   = document.getElementById('batchForm');
  const csvFile     = document.getElementById('csvFile');
  const csvFileName = document.getElementById('csvFileName');
  const btnBatch    = document.getElementById('btnBatch');
  const btnTemplate = document.getElementById('btnTemplate');
  const batchResult = document.getElementById('batchResult');

  if (!form) return;

  // Inisialisasi state
  if (stateLoad)   stateLoad.style.display   = 'none';
  if (stateResult) stateResult.style.display = 'none';
  if (stateError)  stateError.style.display  = 'none';

  // Set attribute min/max pada input HTML agar browser validate juga
  FIELDS.forEach(f => {
    const el = document.getElementById(f);
    const b  = BATAS[f];
    if (el && b) {
      el.setAttribute('min', b.min);
      el.setAttribute('max', b.max);
    }
  });

  // Quick fill
  document.querySelectorAll('[data-preset]').forEach(b => {
    b.addEventListener('click', () => {
      const p = PRESETS[b.dataset.preset];
      if (!p) return;
      FIELDS.forEach(f => {
        const el = document.getElementById(f);
        if (el) { el.value = p[f]; setErr(f, false); }
      });
      if (typeof updateGauges === 'function') updateGauges();
      showState(stateIdle);
    });
  });

  // Reset
  if (btnReset) btnReset.addEventListener('click', () => {
    form.reset();
    FIELDS.forEach(f => setErr(f, false));
    if (typeof updateGauges === 'function') updateGauges();
    showState(stateIdle);
  });

  if (btnUlang) btnUlang.addEventListener('click', () => showState(stateIdle));

  // Live gauge
  FIELDS.forEach(f => {
    const el = document.getElementById(f);
    if (el) el.addEventListener('input', () => {
      if (typeof updateGauges === 'function') updateGauges();
    });
  });

  // ── Form submit ───────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Validasi 1: field tidak kosong
    let valid = true;
    const payload = {};
    FIELDS.forEach(f => {
      const el  = document.getElementById(f);
      const val = parseFloat(el.value);
      const ok  = !isNaN(val) && el.value.trim() !== '';
      setErr(f, !ok);
      if (!ok) valid = false;
      else payload[f] = val;
    });

    if (!valid) {
      if (errorMsg) errorMsg.textContent = 'Semua parameter harus diisi dengan nilai yang valid.';
      showState(stateError);
      return;
    }

    // Validasi 2: batas fisik di frontend
    const errFisik = validasiFisik(payload);
    if (errFisik.length > 0) {
      if (errorMsg) errorMsg.innerHTML =
        '<strong>Nilai di luar batas yang dapat diproses:</strong><br>' +
        errFisik.map(e => `• ${e}`).join('<br>');
      showState(stateError);
      return;
    }

    showState(stateLoad);
    if (btnPredict) btnPredict.disabled = true;

    try {
      const res  = await fetch('/predict', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      // Tangani response validasi dari server (HTTP 422)
      if (res.status === 422 && data.error_validasi) {
        if (errorMsg) errorMsg.innerHTML =
          `<strong>${data.pesan}</strong><br>` +
          data.detail.map(d => `• ${d}`).join('<br>');
        showState(stateError);
        return;
      }

      if (!res.ok || data.error) throw new Error(data.error || `Server error ${res.status}`);

      lastResult = {...data, input: payload};
      renderResult(data);
      showState(stateResult);

    } catch (err) {
      if (errorMsg) errorMsg.textContent = err.message || 'Gagal menghubungi server.';
      showState(stateError);
    } finally {
      if (btnPredict) btnPredict.disabled = false;
    }
  });

  // PDF button
  if (btnPDF) {
    btnPDF.addEventListener('click', () => {
      if (lastResult && typeof generatePDF === 'function') generatePDF(lastResult);
    });
  }

  if (btnTemplate) {
    btnTemplate.addEventListener('click', downloadCsvTemplate);
  }

  if (csvFile && csvFileName) {
    csvFile.addEventListener('change', () => {
      csvFileName.textContent = csvFile.files?.[0]?.name || 'Pilih file CSV parameter kualitas air';
    });
  }

  if (batchForm) {
    batchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = csvFile?.files?.[0];
      if (!file) {
        if (batchResult) batchResult.innerHTML = '<div class="batch-errors"><strong>File CSV belum dipilih.</strong></div>';
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      if (btnBatch) btnBatch.disabled = true;
      if (batchResult) batchResult.innerHTML = '<div class="batch-loading">Memproses file CSV...</div>';

      try {
        const res = await fetch('/predict-batch', {method: 'POST', body: formData});
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || `Server error ${res.status}`);
        renderBatchResult(data);
      } catch (err) {
        if (batchResult) batchResult.innerHTML = `<div class="batch-errors"><strong>${escapeHtml(err.message || 'Gagal memproses CSV.')}</strong></div>`;
      } finally {
        if (btnBatch) btnBatch.disabled = false;
      }
    });
  }

});
