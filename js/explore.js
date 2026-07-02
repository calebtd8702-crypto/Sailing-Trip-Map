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
const poiLayer = L.layerGroup().addTo(map);
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
  const key = [z>=13, b.getSouth().toFixed(2), b.getWest().toFixed(2), b.getNorth().toFixed(2), b.getEast().toFixed(2)].join(',');
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
  if (z >= 13) q += `
    node["amenity"~"restaurant|cafe|bar|pub"](${bbox});
    nwr["amenity"="dive_centre"](${bbox});
    nwr["shop"~"scuba_diving|fishing"](${bbox});
    nwr["tourism"~"hotel|guest_house|attraction|museum|viewpoint"](${bbox});
    nwr["natural"="beach"]["name"](${bbox});`;
  q += `);out center 500;`;
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
      pois.push({cat, name, lat, lng, tags:t});
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

function drawPois(){
  poiLayer.clearLayers();
  const list = document.getElementById('poilist');
  const groups = {};
  const capPerCat = 60;
  Object.keys(CATS).forEach(k=>groups[k]=[]);
  pois.forEach(p=>{ if (CATS[p.cat].on && groups[p.cat].length<capPerCat) groups[p.cat].push(p); });

  let any = false;
  list.innerHTML = '';
  Object.entries(groups).forEach(([k,items])=>{
    if (!items.length) return;
    any = true;
    const c = CATS[k];
    items.forEach(p=>{
      const mk = L.marker([p.lat,p.lng], {icon:L.divIcon({className:'', html:
        `<div class="poimark${k==='wreck'?' wreck':''}" style="width:25px;height:25px;--pc:${c.color}"><i class="ti ${c.icon}"></i></div>`, iconSize:[25,25], iconAnchor:[12,12]})});
      const t = p.tags;
      let pop = `<b>${p.name}</b><br><span style="color:var(--muted);font-size:11px">${c.label}${poiSub(t,k)?' · '+poiSub(t,k):''}</span><br>
        <span style="font-size:11px;font-variant-numeric:tabular-nums">${fmtCoord(p.lat,p.lng)}</span>`;
      if (t.phone||t['contact:phone']) pop += `<br><i class="ti ti-phone"></i> ${t.phone||t['contact:phone']}`;
      if (t.website||t['contact:website']) pop += `<br><a href="${t.website||t['contact:website']}" target="_blank"><i class="ti ti-external-link"></i> website</a>`;
      if (t['addr:street']) pop += `<br><span style="font-size:11px;color:var(--muted)">${[t['addr:housenumber'],t['addr:street'],t['addr:city']].filter(Boolean).join(' ')}</span>`;
      pop += `<br><a href="#" onclick="addAsWaypoint(${p.lat},${p.lng},'${p.name.replace(/'/g,"\\'")}');return false"><i class="ti ti-route"></i> add to course</a>`;
      mk.bindPopup(pop);
      mk.addTo(poiLayer);
      p._mk = mk;
    });
    const det = document.createElement('details');
    det.className='poigroup'; det.open = (k==='marina'||k==='anchorage');
    det.innerHTML = `<summary><i class="ti ${c.icon}" style="color:${c.color}"></i>${c.label}<span class="n">${items.length}</span></summary>`;
    items.forEach(p=>{
      const d = document.createElement('div');
      d.className='poi';
      d.innerHTML = p.name + (poiSub(p.tags,k)?`<div class="sub">${poiSub(p.tags,k)}</div>`:'');
      d.onclick = ()=>{ map.flyTo([p.lat,p.lng], Math.max(map.getZoom(),15)); p._mk && p._mk.openPopup(); };
      det.appendChild(d);
    });
    list.appendChild(det);
  });
  if (!any) list.innerHTML = `<div id="zoomhint"><i class="ti ti-zoom-in" style="color:var(--brass)"></i> ${map.getZoom()<10?'Zoom in on a coastline and everything nearby appears here — marinas &amp; anchorages first, then restaurants, hotels and sights as you get closer.':'Nothing charted in this view yet — pan along the coast or zoom to a harbor town.'}</div>`;
}

map.on('moveend zoomend', ()=>{
  clearTimeout(scanTimer);
  scanTimer = setTimeout(scanArea, 900);
});
