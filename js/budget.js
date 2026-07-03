'use strict';

/* ================= voyage budget estimator ================= */
/* Regional cost-of-living indices for cruising regions (1.0 = baseline). */
const COST_IDX = {
  bs:1.35, bm:1.6, ky:1.5, tc:1.3, vg:1.4, vi:1.4, ag:1.1, kn:1.0, lc:.95, vc:.9, gd:.9,
  mq:1.15, gp:1.15, bb:1.1, tt:.85, do:.75, jm:.85, cu:.7, pr:1.1, mx:.7, bz:.85, gt:.6,
  hn:.6, ni:.55, cr:.9, pa:.8, co:.6, ec:.6, pe:.6, cl:.9, br:.8, ar:.7, uy:.9,
  us:1.25, ca:1.2, gb:1.25, ie:1.2, fr:1.2, es:1.05, pt:1.0, it:1.15, gr:.95, hr:1.0,
  me:.85, al:.7, tr:.7, mt:1.05, cy:1.0, ma:.6, tn:.55, eg:.5, cv:.7,
  pf:1.5, nc:1.4, fj:.9, to:.8, ws:.8, vu:.9, sb:.85, pg:.9, ck:1.2, au:1.25, nz:1.15,
  id:.5, th:.55, my:.55, ph:.55, vn:.5, lk:.55, in:.5, mv:1.3, sc:1.3, mu:.9, mg:.55,
  za:.65, mz:.6, tz:.6, ke:.65, jp:1.1, kr:.95, tw:.8, cn:.7, ae:1.1, om:.9, qa:1.2
};

/* base rates at index 1.0, USD */
const RATES = {
  anchorNight: 8,          // occasional mooring/park fees
  marinaPerFtNight: 2.2,
  hotelNight: 130,         // per room, crew shares 2/room
  foodAboardDay: 16,       // per person, groceries while underway
  foodStopDay: 28,         // per person, groceries + some meals out at a stop
  foodShoreDay: 50,        // per person, eating out while staying ashore
  funDay: 15,              // per person activities at stops
  fuelPerNm: 0.85,         // diesel + running costs, ~35% motoring assumed
  clearancePerCountry: 120,
  reserveDay: 22           // maintenance / breakage kitty
};

const geoCache = (()=>{ try{ return JSON.parse(localStorage.getItem('helm-geo-cache')||'{}'); }catch(e){ return {}; } })();
async function wpCountry(p){
  const key = p.lat.toFixed(1)+','+p.lng.toFixed(1);
  if (key in geoCache) return geoCache[key];
  try{
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${p.lat.toFixed(3)}&lon=${p.lng.toFixed(3)}&zoom=3&accept-language=en`);
    const js = await r.json();
    geoCache[key] = (js.address && js.address.country_code) ? {cc:js.address.country_code, name:js.address.country} : null;
    localStorage.setItem('helm-geo-cache', JSON.stringify(geoCache));
    await new Promise(res=>setTimeout(res, 1100));
  }catch(err){ return null; }
  return geoCache[key];
}

async function computeBudget(){
  const v = activeVoyage();
  const crew = v.crew || 2, ft = v.boatft || 42;
  const speed = parseFloat(speedEl.value) || 6;
  let dist = 0;
  for (let i=1;i<wps.length;i++) dist += distNm(wps[i-1], wps[i]);
  const seaDays = dist ? dist/speed/24 : 0;

  const stops = [];
  const countries = new Map();
  for (const p of wps){
    const geo = await wpCountry(p);
    if (geo) countries.set(geo.cc, geo.name);
    if ((p.nights||0) > 0){
      const idx = geo ? (COST_IDX[geo.cc] || 1) : 1;
      const n = p.nights, stay = p.stay || 'anchor';
      const stayCost = stay==='marina' ? ft*RATES.marinaPerFtNight*idx*n
                     : stay==='shore'  ? RATES.hotelNight*idx*Math.ceil(crew/2)*n
                     : RATES.anchorNight*n;
      const foodCost = (stay==='shore' ? RATES.foodShoreDay : RATES.foodStopDay)*crew*idx*n;
      const funCost = RATES.funDay*crew*idx*n;
      stops.push({name:p.name||'Waypoint', country:geo?geo.name:'—', idx, n, stay,
                  cost: stayCost+foodCost+funCost, stayCost, foodCost, funCost});
    }
  }

  const nightsSum = stops.reduce((a,s)=>a+s.n, 0);
  const cats = {
    stays: stops.reduce((a,s)=>a+s.stayCost, 0),
    food: stops.reduce((a,s)=>a+s.foodCost, 0) + RATES.foodAboardDay*crew*seaDays,
    fun: stops.reduce((a,s)=>a+s.funCost, 0),
    fuel: dist*RATES.fuelPerNm,
    fees: RATES.clearancePerCountry*countries.size,
    reserve: RATES.reserveDay*(seaDays+nightsSum)
  };
  const total = Object.values(cats).reduce((a,b)=>a+b, 0);
  return {cats, stops, total, dist, seaDays, nightsSum, countries:[...countries.values()], crew, ft, budget:v.budget||0};
}

/* ---------- UI ---------- */
const fmt$ = n => '$' + Math.round(n).toLocaleString();
let budgetBusy = false;

function estKeyNow(){
  const v = activeVoyage();
  let dist = 0;
  for (let i=1;i<wps.length;i++) dist += distNm(wps[i-1], wps[i]);
  return JSON.stringify([wps.map(p=>[p.nights||0, p.stay||'a']), Math.round(dist), v.budget||0, v.crew||2, v.boatft||42]);
}

function budgetRowText(){
  const v = activeVoyage();
  const el = document.getElementById('budgetsum');
  if (v.est == null || v.estKey !== estKeyNow()){ el.innerHTML = 'Estimate voyage cost <i class="ti ti-chevron-right"></i>'; return; }
  let html = `est <b>${fmt$(v.est)}</b>`;
  if (v.budget){
    const pct = v.est/v.budget*100;
    html += ` of ${fmt$(v.budget)} <span class="bpill ${pct>100?'over':pct>85?'near':'ok'}">${Math.round(pct)}%</span>`;
  }
  el.innerHTML = html;
}

async function openBudget(){
  document.getElementById('budgetmodal').hidden = false;
  const v = activeVoyage();
  document.getElementById('b-crew').value = v.crew || 2;
  document.getElementById('b-ft').value = v.boatft || 42;
  document.getElementById('b-budget').value = v.budget || '';
  refreshBudget();
}

async function refreshBudget(){
  if (budgetBusy) return;
  budgetBusy = true;
  const body = document.getElementById('b-body');
  body.innerHTML = '<div class="b-loading"><span class="pulse"></span> Estimating — detecting countries along the route…</div>';
  try{
    const b = await computeBudget();
    const v = activeVoyage();
    v.est = b.total; v.estKey = estKeyNow(); persistVoyages(); budgetRowText();

    const CAT_META = [
      ['stays','ti-anchor','Nights (marina · hotel · anchor)'],
      ['food','ti-tools-kitchen-2','Food & drink'],
      ['fun','ti-camera','Activities ashore'],
      ['fuel','ti-gas-station','Fuel & running'],
      ['fees','ti-file-check','Clearance & permits'],
      ['reserve','ti-tool','Maintenance & misc reserve']
    ];
    let html = '';
    if (b.budget){
      const pct = Math.min(140, b.total/b.budget*100);
      html += `<div class="b-barwrap"><div class="b-bar ${b.total>b.budget?'over':''}" style="width:${Math.min(100,pct)}%"></div></div>
        <div class="b-barlbl">${fmt$(b.total)} estimated of ${fmt$(b.budget)} budget — ${b.total<=b.budget
          ? `<span style="color:var(--teal)">${fmt$(b.budget-b.total)} margin</span>`
          : `<span style="color:var(--danger)">${fmt$(b.total-b.budget)} over</span>`}</div>`;
    } else {
      html += `<div class="b-barlbl">Estimated total: <b style="color:var(--brass);font-size:16px">${fmt$(b.total)}</b> — set a budget above to compare.</div>`;
    }
    html += `<div class="b-meta">${b.dist.toFixed(0)} nm · ${b.seaDays.toFixed(1)} days at sea · ${b.nightsSum} nights at stops · crew of ${b.crew}${b.countries.length?' · '+b.countries.join(', '):''}</div>`;
    html += '<div class="b-cats">';
    CAT_META.forEach(([k,icon,label])=>{
      if (b.cats[k] < 1) return;
      const w = b.total ? (b.cats[k]/b.total*100) : 0;
      html += `<div class="b-cat"><i class="ti ${icon}"></i><span class="b-lbl">${label}</span>
        <span class="b-track"><span style="width:${w.toFixed(0)}%"></span></span>
        <span class="b-amt">${fmt$(b.cats[k])}</span></div>`;
    });
    html += '</div>';
    if (b.stops.length){
      html += '<div class="b-sec">Per stop</div>';
      b.stops.forEach(s=>{
        const stayLbl = s.stay==='marina'?'marina':s.stay==='shore'?'ashore':'at anchor';
        html += `<div class="b-stop"><span class="b-sname">${s.name}</span>
          <span class="b-ssub">${s.country} · ${s.n} night${s.n>1?'s':''} ${stayLbl}${s.idx!==1?` · ${s.idx>1?'+':''}${Math.round((s.idx-1)*100)}% cost level`:''}</span>
          <span class="b-amt">${fmt$(s.cost)}</span></div>`;
      });
    } else {
      html += '<div class="b-sec" style="text-transform:none;letter-spacing:0">No overnight stops yet — set nights on your waypoints in the course list and the stay costs appear here.</div>';
    }
    html += '<p class="cc-foot">Rough planning estimates: regional price levels, marina ≈ $2.20/ft/night, ~35% motoring. Tune nothing — or everything — against reality as you go.</p>';
    body.innerHTML = html;
  }catch(err){
    body.innerHTML = '<div class="b-loading">Could not estimate — check the connection and try again.</div>';
  }
  budgetBusy = false;
}

document.getElementById('budgetrow').onclick = openBudget;
document.getElementById('b-close').onclick = ()=> document.getElementById('budgetmodal').hidden = true;
document.getElementById('budgetmodal').onclick = e=>{ if (e.target.id==='budgetmodal') e.currentTarget.hidden = true; };
['b-crew','b-ft','b-budget'].forEach(id=>{
  document.getElementById(id).onchange = e=>{
    const v = activeVoyage();
    if (id==='b-crew') v.crew = Math.max(1, +e.target.value||2);
    if (id==='b-ft') v.boatft = Math.max(20, +e.target.value||42);
    if (id==='b-budget') v.budget = Math.max(0, +e.target.value||0);
    persistVoyages();
    refreshBudget();
  };
});

budgetRowText();
