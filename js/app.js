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
    glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sky:{
      'sky-color':'#0a1a30','horizon-color':'#1e4266','fog-color':'#11253d',
      'sky-horizon-blend':.6,'horizon-fog-blend':.5,'fog-ground-blend':.9,
      'atmosphere-blend':['interpolate',['linear'],['zoom'],0,.35,5,.15,7,0]
    },
    sources:{
      'esri-ocean':{type:'raster', tileSize:256, maxzoom:10, attribution:'Esri Ocean · OpenSeaMap · OpenFreeMap · © OpenStreetMap contributors',
        tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}']},
      'satellite':{type:'raster', tileSize:256, maxzoom:19, attribution:'Esri World Imagery · OpenSeaMap',
        tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}']},
      'omt':{type:'vector', url:'https://tiles.openfreemap.org/planet'},
      'seamarks':{type:'raster', tileSize:256, minzoom:8, maxzoom:18,
        tiles:['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png']},
      'depth':{type:'raster', tileSize:256, attribution:'GEBCO bathymetry',
        tiles:['https://wms.gebco.net/mapserv?service=WMS&request=GetMap&version=1.3.0&layers=GEBCO_LATEST&styles=&crs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256&format=image/png']}
    },
    layers:[
      {id:'bg', type:'background', paint:{'background-color':['interpolate',['linear'],['zoom'],11.4,'#0d2032',12,'#152a3d']}},
      {id:'esri-ocean-layer', type:'raster', source:'esri-ocean', maxzoom:12},
      {id:'satellite-layer', type:'raster', source:'satellite', layout:{visibility:'none'}},
      {id:'depth-layer', type:'raster', source:'depth', layout:{visibility:'none'}, paint:{'raster-opacity':.55}},

      {id:'v-wood', type:'fill', source:'omt', 'source-layer':'landcover', minzoom:11,
        filter:['in',['get','class'],['literal',['wood','forest','grass']]], paint:{'fill-color':'#15302c','fill-opacity':.7}},
      {id:'v-sand', type:'fill', source:'omt', 'source-layer':'landcover', minzoom:11,
        filter:['==',['get','class'],'sand'], paint:{'fill-color':'#33404a','fill-opacity':.6}},
      {id:'v-park', type:'fill', source:'omt', 'source-layer':'park', minzoom:11,
        paint:{'fill-color':'#143331','fill-opacity':.5}},
      {id:'v-water', type:'fill', source:'omt', 'source-layer':'water', minzoom:11,
        paint:{'fill-color':'#0d2032'}},
      {id:'v-waterway', type:'line', source:'omt', 'source-layer':'waterway', minzoom:11,
        paint:{'line-color':'#12314a','line-width':['interpolate',['linear'],['zoom'],11,.5,18,3]}},
      {id:'v-building', type:'fill', source:'omt', 'source-layer':'building', minzoom:15,
        paint:{'fill-color':'#1d3550','fill-opacity':.65}},
      {id:'v-road-minor', type:'line', source:'omt', 'source-layer':'transportation', minzoom:13,
        filter:['in',['get','class'],['literal',['minor','service','track','path']]],
        layout:{'line-cap':'round'}, paint:{'line-color':'#2c455e','line-width':['interpolate',['linear'],['zoom'],13,.5,18,4]}},
      {id:'v-road-mid', type:'line', source:'omt', 'source-layer':'transportation', minzoom:11,
        filter:['in',['get','class'],['literal',['secondary','tertiary']]],
        layout:{'line-cap':'round'}, paint:{'line-color':'#37536f','line-width':['interpolate',['linear'],['zoom'],11,1,18,6]}},
      {id:'v-road-major', type:'line', source:'omt', 'source-layer':'transportation', minzoom:8,
        filter:['in',['get','class'],['literal',['motorway','trunk','primary']]],
        layout:{'line-cap':'round'}, paint:{'line-color':'#43617f','line-width':['interpolate',['linear'],['zoom'],8,.8,18,8]}},
      {id:'v-boundary', type:'line', source:'omt', 'source-layer':'boundary', minzoom:2,
        filter:['all',['<=',['get','admin_level'],2],['!=',['get','maritime'],1]],
        paint:{'line-color':'#4a6b8a','line-width':1,'line-dasharray':[3,2],'line-opacity':.6}},

      {id:'v-road-label', type:'symbol', source:'omt', 'source-layer':'transportation_name', minzoom:14,
        layout:{'symbol-placement':'line','text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':10.5},
        paint:{'text-color':'#9db4cd','text-halo-color':'#0a1826','text-halo-width':1.2}},
      {id:'v-poi', type:'symbol', source:'omt', 'source-layer':'poi', minzoom:15,
        filter:['all',['in',['get','class'],['literal',['restaurant','fast_food','cafe','bar','beer','ice_cream','lodging','attraction','museum','marina','harbor','beach','fuel','grocery','alcohol_shop']]],['<=',['get','rank'],20]],
        layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':10,'text-max-width':8,'text-anchor':'top','text-offset':[0,.3],'text-optional':false},
        paint:{'text-color':'#8fbecb','text-halo-color':'#0a1826','text-halo-width':1.1}},
      {id:'v-water-name', type:'symbol', source:'omt', 'source-layer':'water_name', minzoom:2,
        layout:{'text-field':['get','name'],'text-font':['Noto Sans Italic'],'text-size':11,'text-letter-spacing':.15},
        paint:{'text-color':'#58809f','text-halo-color':'#0a1826','text-halo-width':1}},
      {id:'v-place-island', type:'symbol', source:'omt', 'source-layer':'place', minzoom:9,
        filter:['in',['get','class'],['literal',['island','islet']]],
        layout:{'text-field':['get','name'],'text-font':['Noto Sans Italic'],'text-size':10.5},
        paint:{'text-color':'#9db4cd','text-halo-color':'#0a1826','text-halo-width':1.1}},
      {id:'v-place-village', type:'symbol', source:'omt', 'source-layer':'place', minzoom:10,
        filter:['in',['get','class'],['literal',['village','hamlet','suburb','neighbourhood']]],
        layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':10.5},
        paint:{'text-color':'#a7bccd','text-halo-color':'#0a1826','text-halo-width':1.2}},
      {id:'v-place-town', type:'symbol', source:'omt', 'source-layer':'place', minzoom:8,
        filter:['==',['get','class'],'town'],
        layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':12},
        paint:{'text-color':'#c9d6e2','text-halo-color':'#0a1826','text-halo-width':1.3}},
      {id:'v-place-city', type:'symbol', source:'omt', 'source-layer':'place', minzoom:4,
        filter:['==',['get','class'],'city'],
        layout:{'text-field':['get','name'],'text-font':['Noto Sans Bold'],
          'text-size':['interpolate',['linear'],['zoom'],4,11.5,10,15]},
        paint:{'text-color':'#e8eef4','text-halo-color':'#0a1826','text-halo-width':1.4}},
      {id:'v-place-state', type:'symbol', source:'omt', 'source-layer':'place', minzoom:4, maxzoom:8,
        filter:['==',['get','class'],'state'],
        layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':10.5,'text-letter-spacing':.25,'text-transform':'uppercase'},
        paint:{'text-color':'#7a95ab','text-halo-color':'#0a1826','text-halo-width':1.1}},
      {id:'v-place-country', type:'symbol', source:'omt', 'source-layer':'place', minzoom:2, maxzoom:7,
        filter:['==',['get','class'],'country'],
        layout:{'text-field':['get','name'],'text-font':['Noto Sans Bold'],'text-size':['interpolate',['linear'],['zoom'],2,11,6,14],'text-letter-spacing':.1},
        paint:{'text-color':'#b9cbdc','text-halo-color':'#0a1826','text-halo-width':1.3}},

      {id:'seamarks-layer', type:'raster', source:'seamarks', paint:{'raster-opacity':.9}}
    ]
  }
});
map.on('error', e => console.error('[helm map]', (e.error && e.error.message) || e.error || e));
map.addControl(new maplibregl.NavigationControl({visualizePitch:false}), 'bottom-left');

/* guard against containers that get their real size after init (iframes, rotations) */
try{ new ResizeObserver(()=> map.resize()).observe(document.getElementById('map')); }catch(e){}
window.addEventListener('resize', ()=> map.resize());
[500, 1500, 4000].forEach(ms=> setTimeout(()=>{
  const c = map.getCanvas();
  if (Math.abs(c.clientWidth - c.parentElement.clientWidth) > 2) map.resize();
}, ms));
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
  if (opts.popup){
    const pp = new maplibregl.Popup({offset:16, maxWidth:'320px'}).setHTML(opts.popup);
    if (opts.onPopupOpen) pp.on('open', opts.onPopupOpen);
    mk.setPopup(pp);
  }
  return mk;
}

/* ---------- layers popover ---------- */
const V_FILLS = ['v-wood','v-sand','v-park','v-water','v-waterway'];
const V_ROADS = ['v-road-minor','v-road-mid','v-road-major'];
const V_LABELS = ['v-road-label','v-poi','v-water-name','v-place-island','v-place-village','v-place-town','v-place-city','v-place-state','v-place-country','v-boundary'];
let baseIdx = 0, seamarksOn = true, depthOn = false;
const layersPop = document.getElementById('layerspop');
const layerPrefs = (()=>{ try{ return JSON.parse(localStorage.getItem('helm-layers')||'{}'); }catch(e){ return {}; } })();
function saveLayerPrefs(){ localStorage.setItem('helm-layers', JSON.stringify(layerPrefs)); }
function setBase(i){
  whenMapReady(()=>{
    map.setLayoutProperty('esri-ocean-layer','visibility', i===0 ? 'visible' : 'none');
    map.setLayoutProperty('satellite-layer','visibility', i===2 ? 'visible' : 'none');
    const landVis = i===2 ? 'none' : 'visible';
    V_FILLS.concat(V_ROADS,['v-building']).forEach(id=> map.setLayoutProperty(id,'visibility', landVis));
    V_LABELS.forEach(id=> map.setLayoutProperty(id,'visibility','visible'));
    const fillMin = i===1 ? 0 : 11;
    V_FILLS.forEach(id=> map.setLayerZoomRange(id, fillMin, 24));
    map.setLayerZoomRange('v-road-major', i===1 ? 4 : 8, 24);
    map.setLayerZoomRange('v-road-mid', i===1 ? 9 : 11, 24);
    map.setPaintProperty('bg','background-color',
      i===1 ? '#152a3d' : i===2 ? '#0d2032' : ['interpolate',['linear'],['zoom'],11.4,'#0d2032',12,'#152a3d']);
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
    let justDragged = false;
    mk.on('dragstart', ()=>{ justDragged = true; });
    mk.on('drag', ()=>{ const ll = mk.getLngLat(); wps[i] = {...wps[i], lat:ll.lat, lng:ll.lng}; });
    mk.on('dragend', ()=>{ setTimeout(()=>justDragged=false, 200); render(); });
    mk.getElement().addEventListener('contextmenu', ev=>{ ev.preventDefault(); wps.splice(i,1); render(); });
    mk.getElement().addEventListener('click', ev=>{ ev.stopPropagation(); if (!justDragged) openWpBriefing(i); });
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
      <div class="coords">${fmtCoord(p.lat,p.lng)}</div>${legHtml}
      <div class="wpstay"><i class="ti ti-moon"></i>
        <input type="number" class="wpnights" value="${p.nights||0}" min="0" max="90" title="Nights at this stop">
        <span class="wpn-lbl">night${(p.nights||0)===1?'':'s'}</span>
        <select class="wpstaysel" title="Where you sleep"${(p.nights||0)?'':' style="display:none"'}>
          <option value="anchor"${(p.stay||'anchor')==='anchor'?' selected':''}>at anchor</option>
          <option value="marina"${p.stay==='marina'?' selected':''}>marina slip</option>
          <option value="shore"${p.stay==='shore'?' selected':''}>ashore (hotel)</option>
        </select></div>`;
    div.onclick = e => {
      if (e.target.closest('.wpstay')) return;
      if (e.target.classList.contains('del')) { wps.splice(i,1); render(); }
      else flyToLL(p.lat, p.lng, Math.max(map.getZoom(),11));
    };
    div.ondblclick = e => { if (e.target.closest('.wpstay')) return; const n = prompt('Name this waypoint:', p.name||''); if (n!==null){ wps[i].name = n; render(); } };
    div.querySelector('.wpnights').onchange = e => { wps[i].nights = Math.max(0, +e.target.value||0); render(); };
    div.querySelector('.wpstaysel').onchange = e => { wps[i].stay = e.target.value; render(); };
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
  if (typeof budgetRowText === 'function') budgetRowText();
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

/* ================= waypoint briefing ================= */
let wpPopup = null;
function nearestPoi(cat, from){
  if (typeof pois === 'undefined' || !pois.length) return null;
  let best = null, bd = Infinity;
  pois.forEach(p=>{ if (p.cat!==cat) return; const d = distNm(from, p); if (d < bd){ bd = d; best = p; } });
  return best ? {p:best, d:bd} : null;
}
function openWpBriefing(i){
  const p = wps[i];
  const speed = parseFloat(speedEl.value)||6;
  const dep = departEl.value ? new Date(departEl.value) : null;
  let cum = 0;
  for (let j=1;j<=i;j++) cum += distNm(wps[j-1], wps[j]);
  const eta = (dep && !isNaN(dep)) ? new Date(dep.getTime() + cum/speed*3600e3) : null;

  const row = (icon, html) => `<div class="pp-row"><i class="ti ${icon}"></i><span>${html}</span></div>`;
  let html = `<b>${p.name || 'Waypoint '+(i+1)}</b><br><span style="color:var(--muted);font-size:11px">mark ${i+1} of ${wps.length}</span>
    <div class="pp-row"><i class="ti ti-current-location"></i><span style="font-variant-numeric:tabular-nums">${fmtCoord(p.lat,p.lng)}</span></div>`;
  if (i>0) html += row('ti-route', `${cum.toFixed(1)} nm from start${eta ? ` · <span style="color:var(--brass)">ETA ${eta.toLocaleString([],{weekday:'short',hour:'numeric',minute:'2-digit'})}</span>` : ''}`);
  if (p.nights) html += row('ti-moon', `${p.nights} night${p.nights>1?'s':''} ${p.stay==='marina'?'in a marina slip':p.stay==='shore'?'ashore':'at anchor'}`);
  html += row('ti-wind', `<span id="wpb-wx" class="pp-dim">fetching forecast…</span>`);

  const near = [['marina','ti-anchor','Marina'],['fuel','ti-gas-station','Fuel'],['anchorage','ti-lifebuoy','Anchorage']]
    .map(([cat,icon,label])=>{ const n = nearestPoi(cat, p); return n && n.d < 30 ? row(icon, `${label}: ${n.p.name} · ${n.d.toFixed(1)} nm`) : ''; }).join('');
  html += near || row('ti-map-pin', '<span class="pp-dim">zoom in nearby to scan for marinas & fuel</span>');

  html += `<div class="pp-actions">
    <a href="#" onclick="wpRename(${i});return false"><i class="ti ti-edit"></i> rename</a>
    <a href="#" onclick="logSpot(${p.lat},${p.lng},'${(p.name||'').replace(/'/g,"\\'")}');return false"><i class="ti ti-star"></i> log it</a>
    <a href="#" onclick="wpRemove(${i});return false" style="color:var(--danger)"><i class="ti ti-trash"></i> remove</a>
  </div>`;

  if (wpPopup) wpPopup.remove();
  wpPopup = new maplibregl.Popup({offset:20, maxWidth:'320px'}).setLngLat([p.lng,p.lat]).setHTML(html).addTo(map);

  const when = eta && (eta.getTime()-Date.now()) < 16*864e5 ? eta : new Date();
  Promise.allSettled([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat.toFixed(3)}&longitude=${p.lng.toFixed(3)}&hourly=wind_speed_10m,wind_gusts_10m&wind_speed_unit=kn&forecast_days=16&timeformat=unixtime`).then(r=>r.json()),
    fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${p.lat.toFixed(3)}&longitude=${p.lng.toFixed(3)}&hourly=wave_height&forecast_days=8&timeformat=unixtime`).then(r=>r.json())
  ]).then(([wr, mr])=>{
    const el = document.getElementById('wpb-wx');
    if (!el) return;
    const pick = (res, field)=>{
      if (res.status!=='fulfilled' || !res.value.hourly || !res.value.hourly.time) return null;
      const h = res.value.hourly, ts = when.getTime()/1000;
      let idx = Math.round((ts - h.time[0])/3600);
      if (idx < 0 || idx >= h.time.length) return null;
      return h[field] ? h[field][idx] : null;
    };
    const wind = pick(wr,'wind_speed_10m'), gust = pick(wr,'wind_gusts_10m'), wave = pick(mr,'wave_height');
    const label = eta && when===eta ? 'at ETA' : 'now';
    el.className = '';
    el.innerHTML = wind!=null
      ? `${Math.round(wind)} kn (g${Math.round(gust||0)})${wave!=null ? ` · ${wave.toFixed(1)} m seas` : ''} <span style="color:var(--faint)">${label}</span>`
      : '<span class="pp-dim">no forecast for that time</span>';
  });
}
window.wpRename = i=>{ const n = prompt('Name this waypoint:', wps[i].name||''); if (n!==null){ wps[i].name = n; if (wpPopup) wpPopup.remove(); render(); } };
window.wpRemove = i=>{ if (wpPopup) wpPopup.remove(); wps.splice(i,1); render(); };

window.addAsWaypoint = (lat,lng,name)=>{
  wps.push({lat,lng,name});
  render();
  document.querySelectorAll('.maplibregl-popup').forEach(p=>p.remove());
};

/* ================= map context menu ================= */
const ctxMenu = document.createElement('div');
ctxMenu.id = 'ctxmenu';
ctxMenu.className = 'glass';
ctxMenu.hidden = true;
document.body.appendChild(ctxMenu);
let ctxLL = null;

map.on('contextmenu', e=>{
  e.preventDefault();
  ctxLL = e.lngLat;
  ctxMenu.innerHTML = `
    <button data-act="wp"><i class="ti ti-route"></i> Drop waypoint here</button>
    <button data-act="log"><i class="ti ti-star"></i> Log this spot</button>
    <button data-act="copy"><i class="ti ti-copy"></i> Copy coordinates</button>`;
  ctxMenu.querySelectorAll('button').forEach(b=> b.onclick = ()=>{
    ctxMenu.hidden = true;
    if (!ctxLL) return;
    if (b.dataset.act === 'wp'){ wps.push({lat:ctxLL.lat, lng:ctxLL.lng}); render(); }
    if (b.dataset.act === 'log') logSpot(ctxLL.lat, ctxLL.lng, '');
    if (b.dataset.act === 'copy'){
      const txt = `${fmtCoord(ctxLL.lat, ctxLL.lng)}  (${ctxLL.lat.toFixed(5)}, ${ctxLL.lng.toFixed(5)})`;
      navigator.clipboard && navigator.clipboard.writeText(txt);
    }
  });
  const x = e.originalEvent.clientX, y = e.originalEvent.clientY;
  ctxMenu.hidden = false;
  ctxMenu.style.left = Math.min(x, window.innerWidth - 210) + 'px';
  ctxMenu.style.top = Math.min(y, window.innerHeight - 140) + 'px';
});
['click','movestart'].forEach(ev=> map.on(ev, ()=>{ ctxMenu.hidden = true; }));
document.addEventListener('click', e=>{ if (!ctxMenu.contains(e.target)) ctxMenu.hidden = true; });

/* ================= cursor readout + hover locator ================= */
let hoverTimer = null, lastPlaceKey = '';
const placeCache = {};
map.on('mousemove', e => {
  document.getElementById('cursorcoords').textContent = fmtCoord(e.lngLat.lat, e.lngLat.lng);
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(()=> hoverLocate(e.lngLat), 700);
});
async function hoverLocate(ll){
  const z = map.getZoom();
  const tier = z<6 ? 3 : z<10 ? 8 : z<13 ? 10 : 14;
  const prec = tier===14 ? 2 : 1;
  const key = tier+':'+ll.lat.toFixed(prec)+','+ll.lng.toFixed(prec);
  if (key === lastPlaceKey) return;
  let info = placeCache[key];
  if (info === undefined){
    try{
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${ll.lat.toFixed(4)}&lon=${ll.lng.toFixed(4)}&zoom=${tier}&accept-language=en`);
      const js = await r.json();
      const a = js.address || {};
      const parts = [
        a.road || a.neighbourhood || a.suburb,
        a.village || a.town || a.city || a.municipality || a.island || a.county,
        tier <= 8 ? a.state : null,
        a.country
      ].filter(Boolean);
      info = [...new Set(parts)].slice(0,3).join(' · ');
      placeCache[key] = info;
    }catch(err){ return; }
  }
  lastPlaceKey = key;
  const el = document.getElementById('cursorplace');
  el.textContent = info || '';
  el.style.display = info ? 'inline' : 'none';
}

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
