// ═══════════════════════════════════════════════════════
//  gauge.js — stroke-dasharray approach (bulletproof)
// ═══════════════════════════════════════════════════════

const GAUGE_CONFIG = {
  suhu:      {min:15,  max:40,   label:'Suhu',     unit:'°C'},
  pH:        {min:3,   max:11,   label:'pH',       unit:''},
  DO:        {min:0,   max:20,   label:'DO',       unit:'mg/L'},
  amonia:    {min:0,   max:10,   label:'Amonia',   unit:'mg/L'},
  nitrat:    {min:0,   max:200,  label:'Nitrat',   unit:'mg/L'},
  TDS:       {min:0,   max:1000, label:'TDS',      unit:'mg/L'},
  turbidity: {min:0,   max:500,  label:'Kekeruhan', unit:'NTU'},
};

const GAUGE_STATUS = {
  idle:    {label:'-',         color:'#5a7a8a'},
  aman:    {label:'AMAN',      color:'#00e57a'},
  waspada: {label:'WASPADA',   color:'#ffd84d'},
  bahaya:  {label:'BERBAHAYA', color:'#ff4d6a'},
};

// Konstanta geometri
const CX   = 30;   // pusat x
const CY   = 34;   // pusat y (di bawah viewBox agar arc melengkung ke atas)
const R    = 20;   // radius
const HALF = Math.PI * R;  // panjang setengah lingkaran (≈62.8)

function paramColor(key, val) {
  return GAUGE_STATUS[paramStatus(key, val)].color;
}

function paramStatus(key, val) {
  if (Number.isNaN(val)) return 'idle';

  switch (key) {
    case 'suhu':
      if (val >= 26 && val <= 30) return 'aman';
      if (val < 20 || val > 35) return 'bahaya';
      return 'waspada';
    case 'pH':
      if (val >= 7.0 && val <= 8.0) return 'aman';
      if (val < 6.0 || val > 9.0) return 'bahaya';
      return 'waspada';
    case 'DO':
      if (val >= 5) return 'aman';
      if (val < 3) return 'bahaya';
      return 'waspada';
    case 'amonia':
      if (val <= 0.1) return 'aman';
      if (val > 0.5) return 'bahaya';
      return 'waspada';
    case 'nitrat':
      if (val <= 10) return 'aman';
      if (val > 50) return 'bahaya';
      return 'waspada';
    case 'TDS':
      if (val >= 200 && val <= 500) return 'aman';
      if (val < 100 || val > 1000) return 'bahaya';
      return 'waspada';
    case 'turbidity':
      if (val <= 30) return 'aman';
      if (val > 100) return 'bahaya';
      return 'waspada';
    default:
      return 'idle';
  }
}

function drawGaugeSVG(key, val) {
  const c = GAUGE_CONFIG[key];
  if (!c) return '';

  const hasValue = !Number.isNaN(val);
  const pct  = hasValue ? Math.min(1, Math.max(0, (val - c.min) / (c.max - c.min))) : 0;
  const col  = hasValue ? paramColor(key, val) : GAUGE_STATUS.idle.color;
  const fill = pct * HALF;

  // stroke-dasharray trick:
  // - circle dimulai dari titik paling kanan (0°)
  // - kita rotate -180° supaya mulai dari kiri
  // - dasharray: [fill, sisanya] → hanya `fill` panjang yang terisi
  // - pathLength=HALF supaya unit dash = unit pct*HALF

  return `<svg viewBox="0 0 60 36" xmlns="http://www.w3.org/2000/svg">
    <!-- Track background: setengah lingkaran atas -->
    <circle
      cx="${CX}" cy="${CY}" r="${R}"
      fill="none"
      stroke="rgba(255,255,255,.1)"
      stroke-width="5"
      stroke-dasharray="${HALF.toFixed(2)} ${HALF.toFixed(2)}"
      stroke-linecap="round"
      transform="rotate(-180 ${CX} ${CY})"
    />
    <!-- Fill arc sesuai nilai -->
    <circle
      cx="${CX}" cy="${CY}" r="${R}"
      fill="none"
      stroke="${col}"
      stroke-width="4"
      stroke-dasharray="${fill.toFixed(2)} ${(HALF * 10).toFixed(2)}"
      stroke-linecap="round"
      transform="rotate(-180 ${CX} ${CY})"
    />
  </svg>`;
}

function updateGauges() {
  const row = document.getElementById('gaugeRow');
  if (!row) return;

  let html = '';
  Object.keys(GAUGE_CONFIG).forEach(key => {
    const el    = document.getElementById(key);
    const raw   = el ? el.value.trim() : '';
    const val   = raw === '' ? NaN : parseFloat(raw);
    const cfg   = GAUGE_CONFIG[key];
    const statusKey = paramStatus(key, val);
    const status = GAUGE_STATUS[statusKey];
    const disp  = Number.isNaN(val) ? '—' : raw;
    const unit  = cfg.unit ? `<span class="gauge-unit">${cfg.unit}</span>` : '';
    const svg   = drawGaugeSVG(key, val);

    html += `<div class="gauge-item gauge-item--${statusKey}">
      <div class="gauge-label">${cfg.label}</div>
      <div class="gauge-arc">${svg}</div>
      <div class="gauge-val" style="color:${status.color}">${disp}${unit}</div>
      <div class="gauge-status">${status.label}</div>
    </div>`;
  });

  row.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', updateGauges);
