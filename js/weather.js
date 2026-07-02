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
