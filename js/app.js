'use strict';

/* ================= map & layers ================= */
const map = L.map('map',{zoomControl:true, worldCopyJump:true}).setView([25.3, -77.6], 7);
map.zoomControl.setPosition('bottomleft');

const bases = [
  L.layerGroup([
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
      {maxZoom:11, maxNativeZoom:10, attribution:'Esri Ocean · OpenSeaMap · © OpenStreetMap contributors'}),
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {minZoom:12, maxZoom:19, attribution:'© OpenStreetMap contributors · OpenSeaMap'})
  ]),
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {maxZoom:19, attribution:'© OpenStreetMap contributors · OpenSeaMap'}),
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {maxZoom:19, attribution:'Esri World Imagery · OpenSeaMap'})
];
let baseIdx = 0;
bases[0].addTo(map);
const seamarks = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',{maxZoom:18, opacity:.9}).addTo(map);

document.getElementById('baseswap').onclick = () => {
  map.removeLayer(bases[baseIdx]);
  baseIdx = (baseIdx+1) % bases.length;
  const lyr = bases[baseIdx].addTo(map);
  if (lyr.bringToBack) lyr.bringToBack(); else lyr.eachLayer(l=>l.bringToBack());
};
document.getElementById('seamarks').onclick = (e) => {
  const b = e.currentTarget;
  if (map.hasLayer(seamarks)) { map.removeLayer(seamarks); b.classList.remove('active'); }
  else { seamarks.addTo(map); b.classList.add('active'); }
};
document.getElementById('sidetoggle').onclick = () => {
  const side = document.getElementById('side');
  side.classList.toggle('hidden');
  document.getElementById('topbar').style.left = side.classList.contains('hidden') ? '14px' : '352px';
};

/* ================= course state ================= */
let wps = [];            // {lat,lng,name}
let wpMarkers = [], legLabels = [], routeLine = null, plotting = true;

try { wps = JSON.parse(localStorage.getItem('helm-route')||'[]'); } catch(e){}
const speedEl = document.getElementById('speed');
const departEl = document.getElementById('depart');
speedEl.value = localStorage.getItem('helm-speed') || 6;

function persist(){
  localStorage.setItem('helm-route', JSON.stringify(wps));
  localStorage.setItem('helm-speed', speedEl.value);
}

function wpIcon(i){
  return L.divIcon({className:'', html:`<div class="wpmark" style="width:27px;height:27px">${i+1}</div>`, iconSize:[27,27], iconAnchor:[13,13]});
}

function render(){
  wpMarkers.forEach(m=>map.removeLayer(m)); wpMarkers=[];
  legLabels.forEach(m=>map.removeLayer(m)); legLabels=[];
  if (routeLine) { map.removeLayer(routeLine); routeLine=null; }

  if (wps.length > 1){
    routeLine = L.polyline(wps, {color:'#ecc06a', weight:3, opacity:.95, className:'routeline'}).addTo(map);
  }

  const speed = parseFloat(speedEl.value)||6;
  const dep = departEl.value ? new Date(departEl.value) : null;
  let cum = 0;
  const listEl = document.getElementById('wplist');
  listEl.innerHTML = '';

  wps.forEach((p,i)=>{
    const mk = L.marker(p, {icon:wpIcon(i), draggable:true}).addTo(map);
    mk.on('drag', e => { wps[i] = {...wps[i], lat:e.latlng.lat, lng:e.latlng.lng}; });
    mk.on('dragend', ()=>{ render(); });
    mk.on('contextmenu', ()=>{ wps.splice(i,1); render(); });
    mk.bindTooltip(p.name||`WP ${i+1}`, {direction:'top', offset:[0,-14], className:'leglabel'});
    wpMarkers.push(mk);

    let legHtml = '';
    if (i>0){
      const d = distNm(wps[i-1], p), brg = bearing(wps[i-1], p);
      cum += d;
      const mid = {lat:(wps[i-1].lat+p.lat)/2, lng:(wps[i-1].lng+p.lng)/2};
      const lbl = L.marker(mid, {interactive:false, icon:L.divIcon({className:'', html:
        `<div class="leglabel"><b>${d.toFixed(1)} nm</b> · ${Math.round(brg).toString().padStart(3,'0')}°</div>`, iconSize:null})});
      lbl.addTo(map); legLabels.push(lbl);
      let eta = '';
      if (dep && !isNaN(dep)) {
        const t = new Date(dep.getTime() + cum/speed*3600e3);
        eta = ` · <span class="eta">ETA ${t.toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</span>`;
      }
      legHtml = `<div class="leg">↳ ${d.toFixed(1)} nm @ ${Math.round(brg).toString().padStart(3,'0')}°T · ${cum.toFixed(1)} nm cum${eta}</div>`;
    }

    const div = document.createElement('div');
    div.className = 'wp';
    div.innerHTML = `<div class="row1"><div class="num">${i+1}</div><div class="name">${p.name||'Waypoint '+(i+1)}</div><i class="ti ti-x del" title="Remove"></i></div>
      <div class="coords">${fmtCoord(p.lat,p.lng)}</div>${legHtml}`;
    div.onclick = e => { if (e.target.classList.contains('del')) { wps.splice(i,1); render(); } else map.flyTo(p, Math.max(map.getZoom(),11)); };
    div.ondblclick = () => { const n = prompt('Name this waypoint:', p.name||''); if (n!==null){ wps[i].name = n; render(); } };
    listEl.appendChild(div);
  });

  if (!wps.length) listEl.innerHTML = `<div id="emptymsg"><i class="ti ti-hand-click"></i> Click anywhere on the water to drop your first waypoint and start charting a course.</div>`;

  document.getElementById('wpcount').textContent = wps.length ? wps.length + ' marks' : '';
  document.getElementById('t-dist').textContent = cum ? cum.toFixed(1) : '0';
  document.getElementById('t-time').textContent = cum ? fmtDur(cum/speed) : '—';
  let etaTxt = '—';
  if (cum && dep && !isNaN(dep)) etaTxt = new Date(dep.getTime()+cum/speed*3600e3).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  document.getElementById('t-eta').textContent = etaTxt;
  persist();
}

map.on('click', e => {
  if (!plotting) return;
  wps.push({lat:e.latlng.lat, lng:e.latlng.lng});
  render();
});

document.getElementById('undo').onclick = ()=>{ wps.pop(); render(); };
document.getElementById('clear').onclick = ()=>{ if (!wps.length || confirm('Clear the whole course?')){ wps=[]; render(); } };
document.getElementById('reverse').onclick = ()=>{ wps.reverse(); render(); };
speedEl.oninput = render; departEl.oninput = render;

const modechip = document.getElementById('modechip');
function setPlotting(v){
  plotting = v;
  document.getElementById('modelabel').textContent = v ? 'Plotting on' : 'Plotting off';
  modechip.querySelector('.ti').className = v ? 'ti ti-pencil' : 'ti ti-pencil-off';
  modechip.querySelector('.ti').style.color = v ? 'var(--brass)' : 'var(--muted)';
}
modechip.onclick = ()=> setPlotting(!plotting);
window.addEventListener('keydown', e=>{
  if (e.target.tagName==='INPUT') return;
  if (e.key==='p'||e.key==='P') setPlotting(!plotting);
  if ((e.key==='z'&&(e.metaKey||e.ctrlKey))){ wps.pop(); render(); }
});

document.getElementById('gpx').onclick = ()=>{
  if (!wps.length) return;
  const pts = wps.map((p,i)=>`    <rtept lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}"><name>${(p.name||'WP'+(i+1)).replace(/[<>&]/g,'')}</name></rtept>`).join('\n');
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Helm" xmlns="http://www.topografix.com/GPX/1/1">\n  <rte>\n    <name>Helm course</name>\n${pts}\n  </rte>\n</gpx>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([gpx],{type:'application/gpx+xml'}));
  a.download = 'helm-course.gpx';
  a.click();
};

window.addAsWaypoint = (lat,lng,name)=>{ wps.push({lat,lng,name}); render(); map.closePopup(); };

/* ================= cursor readout ================= */
map.on('mousemove', e => document.getElementById('cursorpos').textContent = fmtCoord(e.latlng.lat, e.latlng.lng));

/* ================= search (Nominatim) ================= */
document.getElementById('search').addEventListener('keydown', async e=>{
  if (e.key!=='Enter') return;
  const q = e.target.value.trim(); if (!q) return;
  e.target.disabled = true;
  try{
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,{headers:{'Accept-Language':'en'}});
    const js = await r.json();
    if (js[0]) map.flyTo([+js[0].lat, +js[0].lon], 11, {duration:1.6});
    else e.target.value = '';
  }catch(err){}
  e.target.disabled = false; e.target.focus();
});

/* ================= boot ================= */
const bootDep = new Date(Date.now()+3600e3);
bootDep.setMinutes(0,0,0);
departEl.value = bootDep.toISOString().slice(0,16);
render();
if (wps.length>1) map.fitBounds(L.latLngBounds(wps).pad(0.3));
setTimeout(()=>{ const h=document.getElementById('hint'); if(!h) return; h.style.transition='opacity 1s'; h.style.opacity='0'; setTimeout(()=>h.remove(),1000); }, 14000);
