// ── Dark / Light toggle ──────────────────────────────
// Terapkan tema SEBELUM DOM siap (cegah flash)
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// Pasang event listener SETELAH DOM siap
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('themeBtn');
  if (!btn) return;
  btn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  btn.addEventListener('click', () => {
    const cur  = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    btn.textContent = next === 'dark' ? '☀️' : '🌙';
  });
});
