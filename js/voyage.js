'use strict';

/* ================= voyages: multi-route state ================= */
const VOYAGE_COLORS = ['#ecc06a','#54e0c0','#ff9d78','#afa9ec','#a3e635','#f472b6','#85b7eb','#5fe3e9'];
let voyages = [], activeId = null, logbook = [], hadSavedData = false;

(function loadState(){
  try{
    const st = JSON.parse(localStorage.getItem('helm-voyages')||'null');
    if (st && st.voyages && st.voyages.length){
      voyages = st.voyages; activeId = st.activeId ?? voyages[0].id;
      hadSavedData = true;
    }
  }catch(e){}
  if (!voyages.length){
    let old = [];
    try{ old = JSON.parse(localStorage.getItem('helm-route')||'[]'); }catch(e){}
    if (old.length) hadSavedData = true;
    voyages = [{id:'v'+Date.now(), name:'Voyage 1', color:VOYAGE_COLORS[0], wps:old}];
    activeId = voyages[0].id;
  }
  try{ logbook = JSON.parse(localStorage.getItem('helm-logbook')||'[]'); }catch(e){}
})();

function activeVoyage(){ return voyages.find(v=>v.id===activeId) || voyages[0]; }
function persistVoyages(){
  activeVoyage().wps = wps;
  localStorage.setItem('helm-voyages', JSON.stringify({voyages, activeId}));
  localStorage.setItem('helm-logbook', JSON.stringify(logbook));
}

/* ---------- ghost routes (inactive voyages) ---------- */
function renderGhosts(){
  if (!mapReady){ whenMapReady(renderGhosts); return; }
  map.getSource('ghost').setData({type:'FeatureCollection', features:
    voyages.filter(v=> v.id!==activeId && (v.wps||[]).length>1).map(v=>({
      type:'Feature',
      properties:{id:v.id, color:v.color, name:v.name, n:v.wps.length},
      geometry:{type:'LineString', coordinates:v.wps.map(p=>[p.lng,p.lat])}
    }))
  });
}
whenMapReady(()=>{
  map.on('click','ghost-line', e=>{
    const f = e.features && e.features[0];
    if (f) switchVoyage(f.properties.id);
  });
  map.on('mouseenter','ghost-line', ()=> map.getCanvas().style.cursor='pointer');
  map.on('mouseleave','ghost-line', ()=> map.getCanvas().style.cursor='');
});

/* ---------- voyage UI ---------- */
const vsel = document.getElementById('voyagesel');
function refreshVoyageUI(){
  vsel.innerHTML = '';
  voyages.forEach(v=>{
    const o = document.createElement('option');
    o.value = v.id; o.textContent = v.name;
    if (v.id === activeId) o.selected = true;
    vsel.appendChild(o);
  });
  document.getElementById('vdot').style.background = activeVoyage().color;
}
function switchVoyage(id){
  persistVoyages();
  activeId = id;
  wps = activeVoyage().wps;
  refreshVoyageUI();
  render();
  fitWps(wps);
}
vsel.onchange = e => switchVoyage(e.target.value);
document.getElementById('vnew').onclick = ()=>{
  const name = prompt('Name the new voyage (e.g. "Leg 2: Exumas → Turks"):', 'Voyage '+(voyages.length+1));
  if (name === null) return;
  const v = {id:'v'+Date.now(), name: name || 'Voyage '+(voyages.length+1),
             color: VOYAGE_COLORS[voyages.length % VOYAGE_COLORS.length], wps:[]};
  voyages.push(v);
  switchVoyage(v.id);
};
document.getElementById('vren').onclick = ()=>{
  const n = prompt('Rename voyage:', activeVoyage().name);
  if (n){ activeVoyage().name = n; refreshVoyageUI(); persistVoyages(); }
};
document.getElementById('vdel').onclick = ()=>{
  if (voyages.length === 1){ alert('This is your only voyage — clear it instead.'); return; }
  if (!confirm(`Delete "${activeVoyage().name}" and its ${wps.length} waypoints?`)) return;
  voyages = voyages.filter(v=>v.id!==activeId);
  activeId = voyages[0].id;
  wps = activeVoyage().wps;
  refreshVoyageUI();
  render();
};

/* ---------- export / import everything ---------- */
document.getElementById('vexport').onclick = ()=>{
  persistVoyages();
  const blob = new Blob([JSON.stringify({voyages, activeId, logbook, exported:new Date().toISOString()}, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'helm-data.json';
  a.click();
};
document.getElementById('vimportfile').onchange = e=>{
  const f = e.target.files[0]; if (!f) return;
  f.text().then(txt=>{
    const js = JSON.parse(txt);
    if (!js.voyages || !js.voyages.length) throw new Error('no voyages');
    if (!confirm(`Import ${js.voyages.length} voyage(s) and ${(js.logbook||[]).length} log entries? This replaces what's here.`)) return;
    voyages = js.voyages; activeId = js.activeId ?? voyages[0].id;
    logbook = js.logbook || [];
    wps = activeVoyage().wps;
    refreshVoyageUI(); render(); drawLogbook();
  }).catch(()=> alert('Could not read that file — expected a helm-data.json export.'));
  e.target.value = '';
};
document.getElementById('vimport').onclick = ()=> document.getElementById('vimportfile').click();

/* ================= cruising logbook ================= */
const LOGCATS = {
  anchorage:{label:'Anchorage', icon:'ti-lifebuoy'},
  dive:     {label:'Dive',      icon:'ti-scuba-mask'},
  surf:     {label:'Surf',      icon:'ti-ripple'},
  fishing:  {label:'Fishing',   icon:'ti-fish-hook'},
  food:     {label:'Food',      icon:'ti-tools-kitchen-2'},
  repair:   {label:'Repair',    icon:'ti-tool'},
  note:     {label:'Note',      icon:'ti-note'}
};
let logMarkers = [];
let pendingLog = null, logRating = 0;

window.logSpot = (lat, lng, name)=>{
  pendingLog = {lat, lng};
  document.getElementById('log-name').value = name || '';
  document.getElementById('log-notes').value = '';
  document.getElementById('log-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('log-cat').value = 'anchorage';
  setRating(0);
  document.getElementById('logmodal').hidden = false;
  map.closePopup();
  document.getElementById('log-name').focus();
};
function setRating(n){
  logRating = n;
  document.querySelectorAll('#log-stars .ti').forEach((s,i)=>{
    s.className = 'ti ' + (i < n ? 'ti-star-filled' : 'ti-star');
    s.style.color = i < n ? 'var(--brass)' : 'var(--faint)';
  });
}
document.querySelectorAll('#log-stars .ti').forEach((s,i)=> s.onclick = ()=> setRating(i+1));
document.getElementById('log-cancel').onclick = ()=> document.getElementById('logmodal').hidden = true;
document.getElementById('logmodal').onclick = e=>{ if (e.target.id==='logmodal') e.currentTarget.hidden = true; };
document.getElementById('log-save').onclick = ()=>{
  if (!pendingLog) return;
  logbook.unshift({
    id:'l'+Date.now(), lat:pendingLog.lat, lng:pendingLog.lng,
    name: document.getElementById('log-name').value || 'Logged spot',
    date: document.getElementById('log-date').value,
    cat: document.getElementById('log-cat').value,
    rating: logRating,
    notes: document.getElementById('log-notes').value
  });
  persistVoyages();
  drawLogbook();
  document.getElementById('logmodal').hidden = true;
};
window.deleteLog = id=>{
  logbook = logbook.filter(l=>l.id!==id);
  persistVoyages();
  drawLogbook();
};

function drawLogbook(){
  logMarkers.forEach(m=>m.remove()); logMarkers=[];
  const list = document.getElementById('loglist');
  list.innerHTML = '';
  document.getElementById('logcount').textContent = logbook.length || '';
  if (!logbook.length){
    list.innerHTML = '<div id="logempty">Nothing logged yet. Anchor somewhere good, surf something clean, catch something big — then hit + and write it down.</div>';
    return;
  }
  logbook.forEach(l=>{
    const c = LOGCATS[l.cat] || LOGCATS.note;
    const stars = l.rating ? '★'.repeat(l.rating) : '';
    const mk = domMarker(`<div class="logmark"><i class="ti ti-star-filled"></i></div>`, l.lat, l.lng, {
      popup:`<b>${l.name}</b><br>
      <span style="color:var(--muted);font-size:11px"><i class="ti ${c.icon}"></i> ${c.label} · ${l.date}${stars?' · <span style="color:var(--brass)">'+stars+'</span>':''}</span>
      ${l.notes?`<br>${l.notes.replace(/</g,'&lt;')}`:''}
      <br><a href="#" onclick="deleteLog('${l.id}');return false" style="color:var(--danger)"><i class="ti ti-trash"></i> remove</a>`});
    logMarkers.push(mk);
    l._mk = mk;

    const d = document.createElement('div');
    d.className = 'logentry';
    d.innerHTML = `<div class="row1"><i class="ti ${c.icon}"></i><span class="lname">${l.name}</span><span class="lstars">${stars}</span></div>
      <div class="lsub">${l.date}${l.notes ? ' — ' + l.notes.slice(0,80).replace(/</g,'&lt;') + (l.notes.length>80?'…':'') : ''}</div>`;
    d.onclick = ()=>{ flyToLL(l.lat, l.lng, Math.max(map.getZoom(),12)); if (!l._mk.getPopup().isOpen()) l._mk.togglePopup(); };
    list.appendChild(d);
  });
}
document.getElementById('logadd').onclick = e=>{
  e.stopPropagation();
  const c = map.getCenter();
  logSpot(c.lat, c.lng, '');
};
document.getElementById('loghead').onclick = ()=>{
  const body = document.getElementById('loglist');
  body.hidden = !body.hidden;
  document.getElementById('logchev').className = 'ti ti-chevron-' + (body.hidden ? 'down' : 'up');
};

/* ---------- shared-data offer (data/voyages.json in the repo) ---------- */
if (!hadSavedData){
  fetch('data/voyages.json').then(r=> r.ok ? r.json() : null).then(js=>{
    if (!js || !js.voyages || !js.voyages.length) return;
    voyages = js.voyages; activeId = js.activeId ?? voyages[0].id;
    if (js.logbook) logbook = js.logbook;
    wps = activeVoyage().wps;
    refreshVoyageUI(); render(); drawLogbook();
    fitWps(wps);
  }).catch(()=>{});
}

/* ---------- boot ---------- */
wps = activeVoyage().wps;
refreshVoyageUI();
render();
drawLogbook();
if (wps.length>1) whenMapReady(()=> fitWps(wps));
