'use strict';

/* ================= map: MapLibre GL globe ================= */
const EMPTY_FC = {type:'FeatureCollection', features:[]};

const map = new maplibregl.Map({
  container:'map',
  center:[-77.6, 25.3],
  zoom:6,
  attributionControl:{compact:true},
  style:{
    version:8,
    projection:{type:'globe'},
    sky:{
      'sky-color':'#0a1a30','horizon-color':'#16324e','fog-color':'#0a1826',
      'sky-horizon-blend':.6,'horizon-fog-blend':.6,'fog-ground-blend':.8,
      'atmosphere-blend':['interpolate',['linear'],['zoom'],0,.9,6,.35,8,0]
    },
    sources:{
      'esri-ocean':{type:'raster', tileSize:256, maxzoom:10, attribution:'Esri Ocean · OpenSeaMap · © OpenStreetMap contributors',
        tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}']},
      'osm':{type:'raster', tileSize:256, maxzoom:19, attribution:'© OpenStreetMap contributors · OpenSeaMap',
        tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png']},
      'satellite':{type:'raster', tileSize:256, maxzoom:19, attribution:'Esri World Imagery · OpenSeaMap',
        tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}']},
      'seamarks':{type:'raster', tileSize:256, minzoom:8, maxzoom:18,
        tiles:['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png']},
      'depth':{type:'raster', tileSize:256, attribution:'GEBCO bathymetry',
        tiles:['https://wms.gebco.net/mapserv?service=WMS&request=GetMap&version=1.3.0&layers=GEBCO_LATEST&styles=&crs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256&format=image/png']}
    },
    layers:[
      {id:'bg', type:'background', paint:{'background-color':'#0d2032'}},
      {id:'esri-ocean-layer', type:'raster', source:'esri-ocean', maxzoom:12},
      {id:'osm-detail-layer', type:'raster', source:'osm', minzoom:12},
      {id:'osm-full-layer', type:'raster', source:'osm', layout:{visibility:'none'}},
      {id:'satellite-layer', type:'raster', source:'satellite', layout:{visibility:'none'}},
      {id:'depth-layer', type:'raster', source:'depth', layout:{visibility:'none'}, paint:{'raster-opacity':.55}},
      {id:'seamarks-layer', type:'raster', source:'seamarks', paint:{'raster-opacity':.9}}
    ]
  }
});
map.addControl(new maplibregl.NavigationControl({visualizePitch:false}), 'bottom-left');
map.touchZoomRotate.disableRotation();
map.dragRotate.disable();

let mapReady = false;
const _mrq = [];
function whenMapReady(fn){ mapReady ? fn() : _mrq.push(fn); }

map.on('load', ()=>{
  ['ghost','wx','route','zones'].forEach(id=> map.addSource(id, {type:'geojson', data:EMPTY_FC}));
  map.addLayer({id:'zones-fill', type:'fill', source:'zones',
    paint:{'fill-color':'#ff5a56','fill-opacity':['case',['get','peak'],.22,.12]}});
  map.addLayer({id:'zones-line', type:'line', source:'zones',
    paint:{'line-color':'#ff7a76','line-width':1.5,'line-dasharray':[2,2],'line-opacity':['case',['get','peak'],.8,.5]}});
  map.addLayer({id:'ghost-line', type:'line', source:'ghost',
    layout:{'line-cap':'round'},
    paint:{'line-color':['get','color'],'line-width':2.5,'line-opacity':.45,'line-dasharray':[.8,2.4]}});
  map.addLayer({id:'wx-line', type:'line', source:'wx',
    layout:{'line-cap':'round'},
    paint:{'line-color':['get','color'],'line-width':9,'line-opacity':.5}});
  map.addLayer({id:'route-glow', type:'line', source:'route',
    layout:{'line-cap':'round'},
    paint:{'line-color':'#ecc06a','line-width':7,'line-blur':6,'line-opacity':.55}});
  map.addLayer({id:'route-line', type:'line', source:'route',
    layout:{'line-cap':'round'},
    paint:{'line-color':'#ecc06a','line-width':3,'line-dasharray':[0,4,3]}});
  mapReady = true;
  _mrq.forEach(f=>f()); _mrq.length = 0;
  render();
});

/* marching-ants dash animation on the route line */
const DASH_SEQ = [[0,4,3],[.5,4,2.5],[1,4,2],[1.5,4,1.5],[2,4,1],[2.5,4,.5],[3,4,0],[0,.5,3,3.5],[0,1,3,3],[0,1.5,3,2.5],[0,2,3,2],[0,2.5,3,1.5],[0,3,3,1],[0,3.5,3,.5]];
let dashStep = 0;
setInterval(()=>{
  if (!mapReady || wps.length < 2) return;
  dashStep = (dashStep+1) % DASH_SEQ.length;
  map.setPaintProperty('route-line','line-dasharray', DASH_SEQ[dashStep]);
}, 90);

/* ---------- helpers ---------- */
function flyToLL(lat, lng, zoom){ map.flyTo({center:[lng,lat], zoom, duration:1400}); }
function fitWps(list){
  if (!list || list.length < 2) return;
  let s=90, n=-90, w=Infinity, e=-Infinity;
  list.forEach(p=>{ s=Math.min(s,p.lat); n=Math.max(n,p.lat); w=Math.min(w,p.lng); e=Math.max(e,p.lng); });
  map.fitBounds([[w,s],[e,n]], {padding:90, duration:900, maxZoom:12});
}
function domMarker(html, lat, lng, opts={}){
  const wrap = document.createElement('div');
  wrap.innerHTML = html.trim();
  const el = wrap.firstElementChild;
  if (opts.noPointer) el.style.pointerEvents = 'none';
  if (opts.title) el.title = opts.title;
  const mk = new maplibregl.Marker({element:el, anchor:'center', draggable:!!opts.draggable})
    .setLngLat([lng,lat]).addTo(map);
  if (opts.popup) mk.setPopup(new maplibregl.Popup({offset:16, maxWidth:'300px'}).setHTML(opts.popup));
  return mk;
}

/* ---------- layers popover ---------- */
const BASE_GROUPS = [['esri-ocean-layer','osm-detail-layer'], ['osm-full-layer'], ['satellite-layer']];
let baseIdx = 0, seamarksOn = true, depthOn = false;
const layersPop = document.getElementById('layerspop');
const layerPrefs = (()=>{ try{ return JSON.parse(localStorage.getItem('helm-layers')||'{}'); }catch(e){ return {}; } })();
function saveLayerPrefs(){ localStorage.setItem('helm-layers', JSON.stringify(layerPrefs)); }
function setBase(i){
  whenMapReady(()=>{
    BASE_GROUPS.forEach((g,gi)=> g.forEach(id=> map.setLayoutProperty(id,'visibility', gi===i?'visible':'none')));
  });
  baseIdx = i;
  document.querySelectorAll('.lp-base').forEach(b=>b.classList.toggle('on', +b.dataset.b===i));
  layerPrefs.base = i; saveLayerPrefs();
}
document.querySelectorAll('.lp-base').forEach(b=> b.onclick = ()=> setBase(+b.dataset.b));
document.getElementById('layersbtn').onclick = (e)=>{
  layersPop.hidden = !layersPop.hidden;
  e.currentTarget.classList.toggle('active', !layersPop.hidden);
};
document.addEventListener('click', e=>{
  if (!layersPop.hidden && !layersPop.contains(e.target) && !document.getElementById('layersbtn').contains(e.target)){
    layersPop.hidden = true;
    document.getElementById('layersbtn').classList.remove('active');
  }
});
document.getElementById('ov-seamarks').onchange = e=>{
  seamarksOn = e.target.checked;
  whenMapReady(()=> map.setLayoutProperty('seamarks-layer','visibility', seamarksOn?'visible':'none'));
  layerPrefs.seamarks = seamarksOn; saveLayerPrefs();
};
document.getElementById('ov-depth').onchange = e=>{
  depthOn = e.target.checked;
  whenMapReady(()=> map.setLayoutProperty('depth-layer','visibility', depthOn?'visible':'none'));
  document.getElementById('depthrow').style.display = depthOn ? 'flex' : 'none';
  layerPrefs.depth = depthOn; saveLayerPrefs();
};
document.getElementById('depth-op').oninput = e=>{
  whenMapReady(()=> map.setPaintProperty('depth-layer','raster-opacity', e.target.value/100));
  layerPrefs.depthOp = +e.target.value; saveLayerPrefs();
};
document.getElementById('sidetoggle').onclick = () => {
  const side = document.getElementById('side');
  side.classList.toggle('hidden');
  document.getElementById('topbar').style.left = side.classList.contains('hidden') ? '14px' : '352px';
};
if (typeof layerPrefs.base === 'number' && layerPrefs.base) setBase(layerPrefs.base);
if (layerPrefs.seamarks === false){ document.getElementById('ov-seamarks').checked = false; document.getElementById('ov-seamarks').onchange({target:{checked:false}}); }
if (layerPrefs.depthOp){ document.getElementById('depth-op').value = layerPrefs.depthOp; whenMapReady(()=> map.setPaintProperty('depth-layer','raster-opacity', layerPrefs.depthOp/100)); }
if (layerPrefs.depth){ document.getElementById('ov-depth').checked = true; document.getElementById('ov-depth').onchange({target:{checked:true}}); }

/* ================= course state (voyage.js owns persistence) ================= */
let wps = [];            // {lat,lng,name} — bound to the active voyage by voyage.js
let wpMarkers = [], legLabels = [], plotting = true;

const speedEl = document.getElementById('speed');
const departEl = document.getElementById('depart');
speedEl.value = localStorage.getItem('helm-speed') || 6;

function persist(){
  if (typeof persistVoyages === 'function') persistVoyages();
  localStorage.setItem('helm-speed', speedEl.value);
}

function render(){
  wpMarkers.forEach(m=>m.remove()); wpMarkers=[];
  legLabels.forEach(m=>m.remove()); legLabels=[];

  const vColor = (typeof activeVoyage === 'function' && activeVoyage()) ? activeVoyage().color : '#ecc06a';
  if (mapReady){
    map.getSource('route').setData(wps.length>1
      ? {type:'Feature', properties:{}, geometry:{type:'LineString', coordinates:wps.map(p=>[p.lng,p.lat])}}
      : EMPTY_FC);
    map.setPaintProperty('route-line','line-color', vColor);
    map.setPaintProperty('route-glow','line-color', vColor);
  }

  const speed = parseFloat(speedEl.value)||6;
  const dep = departEl.value ? new Date(departEl.value) : null;
  let cum = 0;
  const listEl = document.getElementById('wplist');
  listEl.innerHTML = '';

  wps.forEach((p,i)=>{
    const mk = domMarker(`<div class="wpmark" style="width:27px;height:27px">${i+1}</div>`, p.lat, p.lng,
      {draggable:true, title:p.name||`WP ${i+1}`});
    mk.on('drag', ()=>{ const ll = mk.getLngLat(); wps[i] = {...wps[i], lat:ll.lat, lng:ll.lng}; });
    mk.on('dragend', ()=> render());
    mk.getElement().addEventListener('contextmenu', ev=>{ ev.preventDefault(); wps.splice(i,1); render(); });
    wpMarkers.push(mk);

    let legHtml = '';
    if (i>0){
      const d = distNm(wps[i-1], p), brg = bearing(wps[i-1], p);
      cum += d;
      const mid = {lat:(wps[i-1].lat+p.lat)/2, lng:(wps[i-1].lng+p.lng)/2};
      legLabels.push(domMarker(
        `<div class="leglabel"><b>${d.toFixed(1)} nm</b> · ${Math.round(brg).toString().padStart(3,'0')}°</div>`,
        mid.lat, mid.lng, {noPointer:true}));
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
    div.onclick = e => { if (e.target.classList.contains('del')) { wps.splice(i,1); render(); } else flyToLL(p.lat, p.lng, Math.max(map.getZoom(),11)); };
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
  if (typeof renderGhosts === 'function') renderGhosts();
  if (typeof scheduleRouteWx === 'function') scheduleRouteWx();
}

map.on('click', e => {
  if (!plotting) return;
  if (mapReady && map.queryRenderedFeatures(e.point, {layers:['ghost-line']}).length) return;
  wps.push({lat:e.lngLat.lat, lng:e.lngLat.lng});
  render();
});

document.getElementById('undo').onclick = ()=>{ wps.pop(); render(); };
document.getElementById('clear').onclick = ()=>{ if (!wps.length || confirm('Clear the whole course?')){ wps.length = 0; render(); } };
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
  if (e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA') return;
  if (e.key==='p'||e.key==='P') setPlotting(!plotting);
  if ((e.key==='z'&&(e.metaKey||e.ctrlKey))){ wps.pop(); render(); }
});

document.getElementById('gpx').onclick = ()=>{
  if (!wps.length) return;
  const vname = (typeof activeVoyage === 'function' && activeVoyage()) ? activeVoyage().name : 'Helm course';
  const pts = wps.map((p,i)=>`    <rtept lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}"><name>${(p.name||'WP'+(i+1)).replace(/[<>&]/g,'')}</name></rtept>`).join('\n');
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Helm" xmlns="http://www.topografix.com/GPX/1/1">\n  <rte>\n    <name>${vname.replace(/[<>&]/g,'')}</name>\n${pts}\n  </rte>\n</gpx>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([gpx],{type:'application/gpx+xml'}));
  a.download = vname.toLowerCase().replace(/[^a-z0-9]+/g,'-') + '.gpx';
  a.click();
};

window.addAsWaypoint = (lat,lng,name)=>{
  wps.push({lat,lng,name});
  render();
  document.querySelectorAll('.maplibregl-popup').forEach(p=>p.remove());
};

/* ================= cursor readout ================= */
map.on('mousemove', e => document.getElementById('cursorpos').textContent = fmtCoord(e.lngLat.lat, e.lngLat.lng));

/* ================= search (Nominatim) ================= */
document.getElementById('search').addEventListener('keydown', async e=>{
  if (e.key!=='Enter') return;
  const q = e.target.value.trim(); if (!q) return;
  e.target.disabled = true;
  try{
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,{headers:{'Accept-Language':'en'}});
    const js = await r.json();
    if (js[0]) map.flyTo({center:[+js[0].lon, +js[0].lat], zoom:11, duration:2200});
    else e.target.value = '';
  }catch(err){}
  e.target.disabled = false; e.target.focus();
});

/* ================= boot (render happens in voyage.js once state is bound) ================= */
const bootDep = new Date(Date.now()+3600e3);
bootDep.setMinutes(0,0,0);
departEl.value = bootDep.toISOString().slice(0,16);
setTimeout(()=>{ const h=document.getElementById('hint'); if(!h) return; h.style.transition='opacity 1s'; h.style.opacity='0'; setTimeout(()=>h.remove(),1000); }, 14000);
