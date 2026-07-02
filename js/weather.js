'use strict';

/* ================= current conditions (Open-Meteo) ================= */
let wxTimer = null;

async function updateWx(){
  const c = map.getCenter();
  const el = document.getElementById('wx');
  try{
    const [wr, mr] = await Promise.allSettled([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat.toFixed(3)}&longitude=${c.lng.toFixed(3)}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn`).then(r=>r.json()),
      fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${c.lat.toFixed(3)}&longitude=${c.lng.toFixed(3)}&current=wave_height,wave_period`).then(r=>r.json())
    ]);
    let html = '';
    if (wr.status==='fulfilled' && wr.value.current){
      const w = wr.value.current;
      const dirs=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
      html += `<span class="arrow" style="transform:rotate(${w.wind_direction_10m+180}deg)">➤</span> <b>${Math.round(w.wind_speed_10m)} kn</b> ${dirs[Math.round(w.wind_direction_10m/22.5)%16]} · gust ${Math.round(w.wind_gusts_10m)}`;
    }
    if (mr.status==='fulfilled' && mr.value.current && mr.value.current.wave_height!=null){
      html += ` &nbsp;<i class="ti ti-ripple" style="color:var(--teal)"></i> <b>${mr.value.current.wave_height.toFixed(1)} m</b> @ ${Math.round(mr.value.current.wave_period||0)}s`;
    }
    if (html){ el.innerHTML = html; el.style.display='flex'; }
  }catch(err){}
}

map.on('moveend zoomend', ()=>{
  clearTimeout(wxTimer);
  if (map.getZoom()>=6) wxTimer = setTimeout(updateWx, 1400);
});

updateWx();

/* ================= route forecast (wind & waves at transit time) ================= */
const routeWxLayer = L.layerGroup().addTo(map);
let rwxTimer = null, rwxKey = '';

function windColor(kn){
  if (kn == null) return 'rgba(110,135,155,.35)';
  if (kn < 15) return '#54e0c0';
  if (kn < 22) return '#ecc06a';
  if (kn < 28) return '#ef9f27';
  return '#ff7a76';
}

function sampleRoute(){
  if (wps.length < 2) return null;
  const speed = parseFloat(speedEl.value) || 6;
  const dep = departEl.value ? new Date(departEl.value) : new Date();
  if (isNaN(dep)) return null;
  let total = 0;
  for (let i=1;i<wps.length;i++) total += distNm(wps[i-1], wps[i]);
  if (total < 1) return null;
  const step = Math.max(15, total/38);
  const samples = [];
  let cum = 0;
  samples.push({...wps[0], cum:0});
  for (let i=1;i<wps.length;i++){
    const d = distNm(wps[i-1], wps[i]);
    let covered = step - (cum % step);
    while (covered < d){
      samples.push({...interpolate(wps[i-1], wps[i], covered/d), cum: cum+covered});
      covered += step;
    }
    cum += d;
    samples.push({lat:wps[i].lat, lng:wps[i].lng, name:wps[i].name, cum});
  }
  samples.forEach(s => s.eta = new Date(dep.getTime() + s.cum/speed*3600e3));
  return {samples, total, dep, speed};
}

function nearestName(cum){
  let best = null, bd = Infinity, acc = 0;
  wps.forEach((p,i)=>{
    if (i>0) acc += distNm(wps[i-1], wps[i]);
    const d = Math.abs(acc - cum);
    if (d < bd){ bd = d; best = p.name || 'WP '+(i+1); }
  });
  return best;
}

async function updateRouteWx(){
  const plan = sampleRoute();
  const box = document.getElementById('passage');
  routeWxLayer.clearLayers();
  if (!plan){ box.hidden = true; rwxKey=''; return; }
  const key = JSON.stringify([plan.samples.map(s=>[s.lat.toFixed(2),s.lng.toFixed(2)]), plan.dep.getTime(), plan.speed]);
  if (key === rwxKey && !box.hidden) return;

  const lats = plan.samples.map(s=>s.lat.toFixed(3)).join(',');
  const lngs = plan.samples.map(s=>s.lng.toFixed(3)).join(',');
  let winds, waves;
  try{
    const [wr, mr] = await Promise.allSettled([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&hourly=wind_speed_10m,wind_gusts_10m&wind_speed_unit=kn&forecast_days=16&timeformat=unixtime`).then(r=>r.json()),
      fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lats}&longitude=${lngs}&hourly=wave_height&forecast_days=8&timeformat=unixtime`).then(r=>r.json())
    ]);
    winds = wr.status==='fulfilled' ? [].concat(wr.value) : null;
    waves = mr.status==='fulfilled' ? [].concat(mr.value) : null;
  }catch(err){ box.hidden = true; return; }
  if (!winds || !winds[0] || !winds[0].hourly){ box.hidden = true; return; }
  rwxKey = key;

  const at = (loc, field, t) => {
    if (!loc || !loc.hourly || !loc.hourly.time) return null;
    const ts = t.getTime()/1000;
    if (ts < loc.hourly.time[0] - 1800 || ts > loc.hourly.time[loc.hourly.time.length-1] + 1800) return null;
    let idx = Math.round((ts - loc.hourly.time[0]) / 3600);
    idx = Math.max(0, Math.min(loc.hourly.time.length-1, idx));
    return loc.hourly[field] ? loc.hourly[field][idx] : null;
  };

  let maxW = -1, maxWs = null, maxH = -1, maxHs = null;
  plan.samples.forEach((s,i)=>{
    s.wind = at(winds[i], 'wind_speed_10m', s.eta);
    s.gust = at(winds[i], 'wind_gusts_10m', s.eta);
    s.wave = waves ? at(waves[i], 'wave_height', s.eta) : null;
    if (s.wind != null && s.wind > maxW){ maxW = s.wind; maxWs = s; }
    if (s.wave != null && s.wave > maxH){ maxH = s.wave; maxHs = s; }
  });

  for (let i=1;i<plan.samples.length;i++){
    const a = plan.samples[i-1], b = plan.samples[i];
    const w = Math.max(a.wind ?? -1, b.wind ?? -1);
    L.polyline([a,b], {color: windColor(w<0?null:w), weight:9, opacity:.5, className:'wxline', interactive:false}).addTo(routeWxLayer);
  }
  if (routeLine) routeLine.bringToFront();

  const bar = document.getElementById('passbar');
  bar.innerHTML = '';
  plan.samples.forEach(s=>{
    const cell = document.createElement('div');
    cell.className = 'seg';
    cell.style.background = windColor(s.wind);
    cell.title = `${s.eta.toLocaleString([],{weekday:'short',hour:'numeric'})} · ${s.cum.toFixed(0)} nm` +
      (s.wind!=null ? ` · ${Math.round(s.wind)} kn (g${Math.round(s.gust||0)})` : ' · beyond forecast') +
      (s.wave!=null ? ` · ${s.wave.toFixed(1)} m` : '');
    cell.onclick = ()=> map.flyTo([s.lat,s.lng], Math.max(map.getZoom(),10));
    bar.appendChild(cell);
  });
  const fmt = d => d.toLocaleString([],{weekday:'short',hour:'numeric'});
  document.getElementById('pass-t0').textContent = fmt(plan.samples[0].eta);
  document.getElementById('pass-t1').textContent = fmt(plan.samples[plan.samples.length-1].eta) + ' · ' + plan.total.toFixed(0) + ' nm';

  const info = document.getElementById('passinfo');
  let txt = '';
  if (maxW >= 0) txt += `max ${Math.round(maxW)} kn near ${nearestName(maxWs.cum)} ${maxWs.eta.toLocaleString([],{weekday:'short',hour:'numeric'})}`;
  if (maxH >= 0) txt += ` · seas to ${maxH.toFixed(1)} m`;
  if (plan.samples.some(s=>s.wind==null)) txt += ' · gray = beyond forecast';
  const rough = maxW >= 25 || maxH >= 2.5;
  info.innerHTML = (rough ? '<span class="warn"><i class="ti ti-alert-triangle"></i> ' : '') + (txt || 'Passage forecast') + (rough ? '</span>' : '');
  box.hidden = false;
}

function scheduleRouteWx(){
  clearTimeout(rwxTimer);
  rwxTimer = setTimeout(updateRouteWx, 1600);
}

scheduleRouteWx();
