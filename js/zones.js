'use strict';

/* ================= tropical cyclone season zones ================= */
const zoneLayer = L.layerGroup();
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
  zoneLayer.clearLayers();
  if (!zonesOn) return;
  cycloneZones.forEach(z=>{
    if (!z.months.includes(zoneMonth)) return;
    const peak = (z.peak||[]).includes(zoneMonth);
    L.polygon(z.poly, {
      color:'#ff7a76', weight:1.5, dashArray:'6 6', opacity: peak? .8 : .5,
      fillColor:'#ff5a56', fillOpacity: peak? .22 : .12, interactive:true
    }).bindTooltip(`<b>${z.name}</b><br>${z.season}${peak?'<br><i>peak month</i>':''}`, {sticky:true, className:'leglabel'})
      .addTo(zoneLayer);
  });
  document.getElementById('zonemonthlabel').textContent = MONTHS[zoneMonth-1];
}

document.getElementById('ov-zones').onchange = e=>{
  zonesOn = e.target.checked;
  zonesOn ? zoneLayer.addTo(map) : map.removeLayer(zoneLayer);
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
