// ═══════════════════════════════════════════════════════
//  tren.js — Grafik tren parameter (Chart.js)
// ═══════════════════════════════════════════════════════
if (typeof RIWAYAT_DATA !== 'undefined' && RIWAYAT_DATA.length > 0) {
  const data = [...RIWAYAT_DATA].reverse().slice(-50);
  const labels = data.map(r => r.waktu.slice(5,16));

  const COLORS = {
    suhu:'#00c8ff', pH:'#00e57a', DO:'#ffd84d',
    amonia:'#ff4d6a', nitrat:'#a78bfa', TDS:'#f97316', turbidity:'#ec4899',
  };

  let activeChart = null;
  let activeParam = 'suhu';

  function renderChart(param) {
    const ctx = document.getElementById('trenChart');
    if (!ctx) return;
    if (activeChart) { activeChart.destroy(); }

    const vals = data.map(r => r[param]);
    activeChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: param,
          data: vals,
          borderColor: COLORS[param]||'#00c8ff',
          backgroundColor: (COLORS[param]||'#00c8ff') + '22',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0a1828',
            borderColor: COLORS[param]||'#00c8ff',
            borderWidth: 1,
            titleColor: '#eaf4fb',
            bodyColor: '#c8dde8',
          }
        },
        scales: {
          x: { ticks: { color:'#5a7a8a', maxTicksLimit:10, font:{size:10} }, grid:{color:'rgba(255,255,255,.04)'} },
          y: { ticks: { color:'#5a7a8a', font:{size:10} }, grid:{color:'rgba(255,255,255,.04)'} },
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderChart(activeParam);
    document.querySelectorAll('.chart-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.chart-tab').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        activeParam = btn.dataset.param;
        renderChart(activeParam);
      });
    });
  });
}
