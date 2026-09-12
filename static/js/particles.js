// ── Subtle background particles ──────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const c = document.getElementById('bgParticles');
  if (!c) return;
  for (let i = 0; i < 14; i++) {
    const d = document.createElement('div');
    const sz  = Math.random() * 3 + 1;
    const dur = (6 + Math.random() * 8).toFixed(1);
    const del = (Math.random() * 4).toFixed(1);
    const dx  = (Math.random() > .5 ? '' : '-') + (Math.random() * 14).toFixed(0);
    Object.assign(d.style, {
      position:'absolute', width:sz+'px', height:sz+'px', borderRadius:'50%',
      background:`rgba(0,200,255,${(Math.random()*.12+.04).toFixed(2)})`,
      left:(Math.random()*100).toFixed(1)+'%', top:(Math.random()*100).toFixed(1)+'%',
      animation:`fp${i} ${dur}s ease-in-out ${del}s infinite alternate`,
      pointerEvents:'none',
    });
    c.appendChild(d);
    const s = document.createElement('style');
    s.textContent = `@keyframes fp${i}{from{transform:translateY(0) translateX(0);opacity:.3}to{transform:translateY(-28px) translateX(${dx}px);opacity:.75}}`;
    document.head.appendChild(s);
  }
});
