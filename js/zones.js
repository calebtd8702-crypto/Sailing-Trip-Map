'use strict';

/* ================= tropical cyclone season zones ================= */
let cycloneZones = [];
let zoneMonth = new Date().getMonth() + 1;
let zonesOn = false;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

fetch('data/hurricane-zones.json').then(r=>r.json()).then(js=>{
  cycloneZones = js.zones || [];
  drawZones();
}).catch(()=>{ document.getElementById('zonerow').style.display='none'; document.getElementById('zonemonthrow').style.display='none'; });

function pointInPoly(lat, lng, poly){
  // ray cast in [lat,lng]; try both native lng and +360 for antimeridian-spanning polys
  for (const L of [lng, lng+360]){
    let inside = false;
    for (let i=0, j=poly.length-1; i<poly.length; j=i++){
      const [yi, xi] = poly[i], [yj, xj] = poly[j];
      if ((yi>lat)!==(yj>lat) && L < (xj-xi)*(lat-yi)/(yj-yi)+xi) inside = !inside;
    }
    if (inside) return true;
  }
  return false;
}

function zoneAt(lat, lng, month){
  for (const z of cycloneZones){
    if (z.months.includes(month) && pointInPoly(lat, lng, z.poly)) return z;
  }
  return null;
}

function drawZones(){
  if (!mapReady){ whenMapReady(drawZones); return; }
  const feats = !zonesOn ? [] : cycloneZones.filter(z=>z.months.includes(zoneMonth)).map(z=>({
    type:'Feature',
    properties:{name:z.name, season:z.season, peak:(z.peak||[]).includes(zoneMonth)},
    geometry:{type:'Polygon', coordinates:[z.poly.map(([la,ln])=>[ln,la]).concat([[z.poly[0][1], z.poly[0][0]]])]}
  }));
  map.getSource('zones').setData({type:'FeatureCollection', features:feats});
  document.getElementById('zonemonthlabel').textContent = MONTHS[zoneMonth-1];
}
whenMapReady(()=>{
  map.on('click','zones-fill', e=>{
    if (plotting) return;
    const f = e.features && e.features[0];
    if (!f) return;
    new maplibregl.Popup({offset:6, maxWidth:'260px'}).setLngLat(e.lngLat)
      .setHTML(`<b>${f.properties.name}</b><br>${f.properties.season}${f.properties.peak?'<br><i>peak month</i>':''}`)
      .addTo(map);
  });
});

document.getElementById('ov-zones').onchange = e=>{
  zonesOn = e.target.checked;
  document.getElementById('zonemonthrow').style.display = zonesOn ? 'flex' : 'none';
  drawZones();
};
document.getElementById('zonemonth').value = zoneMonth;
document.getElementById('zonemonthlabel').textContent = MONTHS[zoneMonth-1];
document.getElementById('zonemonth').oninput = e=>{
  zoneMonth = +e.target.value;
  drawZones();
  if (typeof scheduleRouteWx === 'function') scheduleRouteWx();
};
