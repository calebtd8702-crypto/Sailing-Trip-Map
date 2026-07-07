'use strict';

/* ================= explore: live POIs from OpenStreetMap ================= */
const CATS = {
  marina:    {label:'Marinas',     icon:'ti-anchor',           color:'#ecc06a', on:true},
  anchorage: {label:'Anchorages',  icon:'ti-lifebuoy',         color:'#54e0c0', on:true},
  fuel:      {label:'Fuel',        icon:'ti-gas-station',      color:'#ef9f27', on:true},
  dive:      {label:'Dive',        icon:'ti-scuba-mask',       color:'#5fe3e9', on:true},
  wreck:     {label:'Wrecks',      icon:'ti-skull',            color:'#cbd5e1', on:true},
  surf:      {label:'Surf',        icon:'ti-ripple',           color:'#a3e635', on:true},
  fish:      {label:'Fishing',     icon:'ti-fish-hook',        color:'#f472b6', on:true},
  eat:       {label:'Eat & drink', icon:'ti-tools-kitchen-2',  color:'#ff9d78', on:true},
  stay:      {label:'Stay',        icon:'ti-bed',              color:'#afa9ec', on:true},
  see:       {label:'See & do',    icon:'ti-camera',           color:'#85b7eb', on:true}
};
let poiMarkers = [];
let pois = [], lastFetchKey = '', scanTimer = null, scanning = false;

const OVERPASS = [
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
let epIdx = 0;
async function overpassFetch(q){
  for (let attempt = 0; attempt < OVERPASS.length; attempt++){
    const url = OVERPASS[(epIdx + attempt) % OVERPASS.length];
    const ctrl = new AbortController();
    const timer = setTimeout(()=>ctrl.abort(), 22000);
    try{
      const r = await fetch(url, {method:'POST', body:'data='+encodeURIComponent(q), signal:ctrl.signal});
      clearTimeout(timer);
      if (!r.ok) throw new Error('http '+r.status);
      const js = await r.json();
      epIdx = (epIdx + attempt) % OVERPASS.length;
      return js;
    }catch(err){ clearTimeout(timer); }
  }
  throw new Error('all overpass mirrors failed');
}

const catsEl = document.getElementById('cats');
Object.entries(CATS).forEach(([k,c])=>{
  const b = document.createElement('div');
  b.className = 'cat' + (c.on?' on':'');
  b.style.setProperty('--cc', c.color);
  b.innerHTML = `<i class="ti ${c.icon}"></i>${c.label}`;
  b.onclick = ()=>{ c.on=!c.on; b.classList.toggle('on',c.on); drawPois(); };
  catsEl.appendChild(b);
});

function classify(t){
  if (t['seamark:type']==='wreck' || t.historic==='wreck') return 'wreck';
  if (t.amenity==='dive_centre' || t.shop==='scuba_diving' || t.sport==='scuba_diving') return 'dive';
  if (t.sport==='surfing') return 'surf';
  if (t.shop==='fishing' || t.natural==='reef') return 'fish';
  if (t.leisure==='marina' || t['seamark:type']==='harbour' || t.harbour) return 'marina';
  if (t['seamark:type']==='anchorage' || t.anchorage) return 'anchorage';
  if (t.waterway==='fuel' || (t.amenity==='fuel')) return 'fuel';
  if (['restaurant','cafe','bar','pub','fast_food','ice_cream'].includes(t.amenity)) return 'eat';
  if (['hotel','guest_house','hostel','apartment','resort'].includes(t.tourism)) return 'stay';
  if (['attraction','museum','viewpoint','artwork','gallery','beach'].includes(t.tourism) || t.natural==='beach' || t.historic) return 'see';
  return null;
}
function poiSub(t, cat){
  const bits = [];
  if (cat==='eat' && t.cuisine) bits.push(t.cuisine.split(';')[0].replace(/_/g,' '));
  if (cat==='marina' && t['seamark:harbour:category']) bits.push(t['seamark:harbour:category'].replace(/_/g,' '));
  if (cat==='wreck'){
    if (t['seamark:wreck:category']) bits.push(t['seamark:wreck:category'].replace(/_/g,' '));
    if (t.depth || t['seamark:wreck:depth']) bits.push((t.depth||t['seamark:wreck:depth'])+' m');
  }
  if (cat==='dive') bits.push(t.amenity==='dive_centre'||t.shop==='scuba_diving' ? 'dive shop' : 'dive site');
  if (cat==='fish') bits.push(t.natural==='reef' ? 'reef' : 'tackle shop');
  if (t.tourism && cat==='see') bits.push(t.tourism);
  if (cat!=='wreck' && t.historic) bits.push(t.historic.replace(/_/g,' '));
  if (t.stars) bits.push('★'.repeat(Math.min(5,parseInt(t.stars)||0)));
  return bits.join(' · ');
}

async function scanArea(){
  const z = map.getZoom();
  const status = document.getElementById('scanstatus');
  if (z < 10){ status.innerHTML=''; return; }
  const b = map.getBounds();
  const key = [z>=12, b.getSouth().toFixed(2), b.getWest().toFixed(2), b.getNorth().toFixed(2), b.getEast().toFixed(2)].join(',');
  if (key === lastFetchKey) return;
  if (scanning){ clearTimeout(scanTimer); scanTimer = setTimeout(scanArea, 2500); return; }
  scanning = true;
  status.innerHTML = '<span class="pulse"></span> scanning…';
  const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
  let q = `[out:json][timeout:25];(
    nwr["leisure"="marina"](${bbox});
    nwr["seamark:type"~"harbour|anchorage|wreck"](${bbox});
    nwr["historic"="wreck"](${bbox});
    nwr["sport"~"scuba_diving|surfing"](${bbox});
    nwr["natural"="reef"]["name"](${bbox});
    nwr["waterway"="fuel"](${bbox});`;
  if (z >= 12) q += `
    node["amenity"~"restaurant|cafe|bar|pub"](${bbox});
    nwr["amenity"="dive_centre"](${bbox});
    nwr["shop"~"scuba_diving|fishing"](${bbox});
    nwr["tourism"~"hotel|guest_house|attraction|museum|viewpoint"](${bbox});
    nwr["natural"="beach"]["name"](${bbox});`;
  q += `);out center 600;`;
  try{
    const js = await overpassFetch(q);
    pois = [];
    const seen = new Set();
    (js.elements||[]).forEach(el=>{
      const t = el.tags||{};
      const cat = classify(t); if (!cat) return;
      const lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon;
      if (lat==null) return;
      const name = t.name || t['seamark:name'] ||
        ({anchorage:'Anchorage', fuel:'Fuel dock', wreck:'Wreck', dive:'Dive site', surf:'Surf spot'})[cat] || null;
      if (!name) return;
      const dk = cat+'|'+name+'|'+lat.toFixed(3);
      if (seen.has(dk)) return; seen.add(dk);
      pois.push({cat, name, lat, lng, tags:t, uid:'poi'+(el.type||'n')+el.id});
    });
    lastFetchKey = key;
    drawPois();
    status.textContent = pois.length + ' found';
  }catch(err){
    status.textContent = 'scan failed — retrying…';
    setTimeout(()=>{ lastFetchKey=''; scanning=false; scanArea(); }, 9000);
    return;
  }
  scanning = false;
}

function poiPopupHTML(p, c, k){
  const t = p.tags;
  const g = key => t[key] || t['contact:'+key];
  const row = (icon, html) => `<div class="pp-row"><i class="ti ${icon}"></i><span>${html}</span></div>`;
  let rows = '';
  if (g('phone')) rows += row('ti-phone', `<a href="tel:${g('phone').replace(/[^+\d]/g,'')}">${g('phone')}</a>`);
  if (g('email')) rows += row('ti-mail', `<a href="mailto:${g('email')}">${g('email')}</a>`);
  if (g('website')){
    const url = g('website');
    rows += row('ti-world', `<a href="${url}" target="_blank">${url.replace(/^https?:\/\/(www\.)?/,'').replace(/\/.*$/,'')}</a>`);
  }
  const vhf = t['seamark:radio_station:channel'] || t.vhf || t['communication:vhf'];
  if (vhf) rows += row('ti-radio', 'VHF ' + vhf);
  if (t.opening_hours) rows += row('ti-clock', t.opening_hours.length>42 ? t.opening_hours.slice(0,42)+'…' : t.opening_hours);
  const fuels = ['fuel:diesel','fuel:petrol','fuel:gasoline','fuel:octane_95'].filter(f=>t[f]==='yes').map(f=>f==='fuel:diesel'?'diesel':'petrol');
  if (fuels.length) rows += row('ti-gas-station', 'Fuel: ' + [...new Set(fuels)].join(' + '));
  if (t.berths || t.capacity) rows += row('ti-anchor', (t.berths||t.capacity) + ' berths');
  if (t.internet_access && t.internet_access!=='no') rows += row('ti-wifi', 'Wifi' + (t.internet_access==='yes'?'':' ('+t.internet_access+')'));
  if (t.operator) rows += row('ti-building', t.operator);
  if (t.description) rows += row('ti-info-circle', t.description.length>100 ? t.description.slice(0,100)+'…' : t.description);
  const addrKnown = [t['addr:housenumber'],t['addr:street'],t['addr:city']].filter(Boolean).join(' ');
  rows += row('ti-map-pin', `<span id="pp-addr-${p.uid}">${addrKnown || '<span class="pp-dim">locating…</span>'}</span>`);

  const safeName = p.name.replace(/'/g,"\\'").replace(/"/g,'&quot;');
  const searchQ = encodeURIComponent(p.name + ' ' + (t['addr:city'] || '') + ' ' + (k==='marina'?'marina':k==='eat'?'restaurant':k==='stay'?'hotel':''));
  return `<b>${p.name}</b><br><span style="color:var(--muted);font-size:11px">${c.label}${poiSub(t,k)?' · '+poiSub(t,k):''}</span>
    <div class="pp-row"><i class="ti ti-current-location"></i><span style="font-variant-numeric:tabular-nums">${fmtCoord(p.lat,p.lng)}</span></div>
    ${rows}
    <div class="pp-actions">
      <a href="#" onclick="addAsWaypoint(${p.lat},${p.lng},'${safeName}');return false"><i class="ti ti-route"></i> add to course</a>
      <a href="#" onclick="logSpot(${p.lat},${p.lng},'${safeName}');return false"><i class="ti ti-star"></i> log it</a>
      <a id="pp-web-${p.uid}" href="https://www.google.com/search?q=${searchQ}" target="_blank"><i class="ti ti-search"></i> find online</a>
    </div>`;
}

async function resolvePoiExtras(p){
  if (p._resolved) return;
  p._resolved = true;
  try{
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${p.lat.toFixed(5)}&lon=${p.lng.toFixed(5)}&zoom=18&accept-language=en`);
    const js = await r.json();
    const a = js.address || {};
    const line = [[a.house_number, a.road].filter(Boolean).join(' '), a.village||a.town||a.city||a.island, a.state, a.country]
      .filter(Boolean).slice(0,3).join(', ');
    const el = document.getElementById('pp-addr-'+p.uid);
    if (el && line) el.textContent = line;
    const place = a.village||a.town||a.city||a.island||a.county||'';
    const web = document.getElementById('pp-web-'+p.uid);
    if (web && place){
      const kind = p.cat==='marina'?'marina':p.cat==='eat'?'restaurant':p.cat==='stay'?'hotel':p.cat==='dive'?'diving':'';
      web.href = 'https://www.google.com/search?q=' + encodeURIComponent(`${p.name} ${place} ${kind}`.trim());
    }
  }catch(err){ p._resolved = false; }
}

function drawPois(){
  poiMarkers.forEach(m=>m.remove()); poiMarkers=[];
  const list = document.getElementById('poilist');
  const groups = {};
  const capPerCat = 90;
  Object.keys(CATS).forEach(k=>groups[k]=[]);
  pois.forEach(p=>{ if (CATS[p.cat].on && groups[p.cat].length<capPerCat) groups[p.cat].push(p); });

  let any = false;
  list.innerHTML = '';
  Object.entries(groups).forEach(([k,items])=>{
    if (!items.length) return;
    any = true;
    const c = CATS[k];
    items.forEach(p=>{
      const mk = domMarker(
        `<div class="poimark${k==='wreck'?' wreck':''}" style="width:25px;height:25px;--pc:${c.color}"><i class="ti ${c.icon}"></i></div>`,
        p.lat, p.lng, {popup: poiPopupHTML(p, c, k), onPopupOpen: ()=> resolvePoiExtras(p)});
      poiMarkers.push(mk);
      p._mk = mk;
    });
    const det = document.createElement('details');
    det.className='poigroup'; det.open = (k==='marina'||k==='anchorage');
    det.innerHTML = `<summary><i class="ti ${c.icon}" style="color:${c.color}"></i>${c.label}<span class="n">${items.length}</span></summary>`;
    items.forEach(p=>{
      const d = document.createElement('div');
      d.className='poi';
      d.innerHTML = p.name + (poiSub(p.tags,k)?`<div class="sub">${poiSub(p.tags,k)}</div>`:'');
      d.onclick = ()=>{ flyToLL(p.lat, p.lng, Math.max(map.getZoom(),15)); if (p._mk && !p._mk.getPopup().isOpen()) p._mk.togglePopup(); };
      det.appendChild(d);
    });
    list.appendChild(det);
  });
  if (!any) list.innerHTML = `<div id="zoomhint"><i class="ti ti-zoom-in" style="color:var(--brass)"></i> ${map.getZoom()<10?'Zoom in on a coastline and everything nearby appears here — marinas &amp; anchorages first, then restaurants, hotels and sights as you get closer.':'Nothing charted in this view yet — pan along the coast or zoom to a harbor town.'}</div>`;
}

map.on('moveend', ()=>{
  clearTimeout(scanTimer);
  scanTimer = setTimeout(scanArea, 900);
});
