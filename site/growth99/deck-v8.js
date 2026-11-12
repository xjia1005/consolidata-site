(function(){
  const slides = Array.from(document.querySelectorAll(".slide"));
  const dots = document.getElementById("dots");
  const counter = document.getElementById("counter");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  let i = 0;

  slides.forEach((_,n)=>{
    const d = document.createElement("i");
    d.addEventListener("click", ()=>go(n));
    dots.appendChild(d);
  });

  function syncHash(){ try{ history.replaceState(null,"","#slide-"+(i+1)); }catch(e){} }
  function go(n){
    i = Math.max(0, Math.min(slides.length-1, n));
    slides.forEach((s,k)=>s.classList.toggle("on", k===i));
    Array.from(dots.children).forEach((d,k)=>d.classList.toggle("on", k===i));
    counter.textContent = String(i+1).padStart(2,"0") + " / " + String(slides.length).padStart(2,"0");
    if(prevBtn) prevBtn.disabled = (i===0);
    if(nextBtn) nextBtn.disabled = (i===slides.length-1);
    try{ history.replaceState(null,"","#slide-"+(i+1)); }catch(e){}
  }

  if(prevBtn) prevBtn.addEventListener("click", ()=>go(i-1));
  if(nextBtn) nextBtn.addEventListener("click", ()=>go(i+1));

  document.addEventListener("keydown", e=>{
    if(e.key==="ArrowRight"||e.key==="ArrowDown"||e.key===" "||e.key==="PageDown"){ e.preventDefault(); go(i+1); }
    if(e.key==="ArrowLeft"||e.key==="ArrowUp"||e.key==="PageUp"){ e.preventDefault(); go(i-1); }
  });

  let lock = 0;
  window.addEventListener("wheel", e=>{
    const now = Date.now();
    if(now - lock < 550) return;
    if(Math.abs(e.deltaY) < 18) return;
    lock = now; go(i + (e.deltaY>0?1:-1));
  }, {passive:true});

  let tx=0;
  window.addEventListener("touchstart", e=>{ tx=e.touches[0].clientX; }, {passive:true});
  window.addEventListener("touchend", e=>{
    const dx = e.changedTouches[0].clientX - tx;
    if(Math.abs(dx)>50) go(i + (dx<0?1:-1));
  }, {passive:true});

  const h=(location.hash||"").match(/slide-(\d+)/);
  go(h? parseInt(h[1],10)-1 : 0);
})();

/* ---- per-recipient open tracking (uses nginx access log; no backend) ---- */
(function () {
  function slug() {
    try {
      var v = new URLSearchParams(location.search).get('u');
      return v ? v.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 48) : '';
    } catch (e) { return ''; }
  }
  var u = slug();
  if (!u) return;
  function ping(ev) {
    try {
      var img = new Image();
      img.src = '/t.gif?u=' + encodeURIComponent(u) + '&e=' + ev +
                '&r=' + Math.random().toString(36).slice(2, 8);
    } catch (e) {}
  }
  ping('open');
  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== document) {
      if (t.tagName === 'A' && t.className && String(t.className).indexOf('cta') > -1) {
        ping('cta');
        return;
      }
      t = t.parentNode;
    }
  }, true);
})();
