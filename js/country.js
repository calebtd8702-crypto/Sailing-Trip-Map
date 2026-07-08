'use strict';

/* ================= country intel cards ================= */
const ccCache = {};      // "lat,lng" -> country_code | null
const cardCache = {};    // cc -> data | null (null = no card file)
let shownCC = null, dismissedCC = null, ccTimer = null;

async function checkCountry(){
  const card = document.getElementById('countrycard');
  if (map.getZoom() < 7){ card.hidden = true; shownCC = null; return; }
  const c = map.getCenter();
  const key = c.lat.toFixed(1) + ',' + c.lng.toFixed(1);
  try{
    if (!(key in ccCache)){
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${c.lat.toFixed(4)}&lon=${c.lng.toFixed(4)}&zoom=3&accept-language=en`);
      const js = await r.json();
      ccCache[key] = js.address ? {cc: js.address.country_code, name: js.address.country} : null;
    }
  }catch(err){ return; }
  const hit = ccCache[key];
  if (!hit || !hit.cc){ card.hidden = true; shownCC = null; return; }
  if (hit.cc === dismissedCC) return;
  if (hit.cc === shownCC) return;

  if (!(hit.cc in cardCache)){
    try{
      const r = await fetch(`data/countries/${hit.cc}.json`);
      cardCache[hit.cc] = r.ok ? await r.json() : null;
    }catch(err){ cardCache[hit.cc] = null; }
  }
  renderCountryCard(hit, cardCache[hit.cc]);
  shownCC = hit.cc;
}

function renderCountryCard(hit, d){
  const card = document.getElementById('countrycard');
  if (!d){
    card.innerHTML = `<button class="cc-close" onclick="dismissCountry('${hit.cc}')"><i class="ti ti-x"></i></button>
      <div class="cc-head"><span class="cc-flag">${flagEmoji(hit.cc)}</span><div><h2>${hit.name}</h2><p>No cruising guide yet</p></div></div>
      <div class="cc-body"><p class="cc-note">Guides cover ports of entry, clearing-in fees, stay limits and fishing rules — they're added leg by leg. The Ashore scanner and search work here all the same.</p></div>`;
    card.hidden = false;
    return;
  }
  const li = arr => arr.map(x=>`<li>${x}</li>`).join('');
  card.innerHTML = `<button class="cc-close" onclick="dismissCountry('${hit.cc}')"><i class="ti ti-x"></i></button>
    <div class="cc-head"><span class="cc-flag">${d.flag || flagEmoji(hit.cc)}</span><div><h2>${d.country}</h2><p>${d.language} · ${d.money.split('—')[0].trim()}</p></div></div>
    <div class="cc-body">
      <div class="cc-sec"><i class="ti ti-anchor"></i><div><b>Ports of entry</b><div class="cc-ports">${(d.entry.ports||[]).map(p=>`<span>${p}</span>`).join('')}</div></div></div>
      <div class="cc-sec"><i class="ti ti-file-check"></i><div><b>Clearing in</b><p>${d.entry.process}</p><p>${d.entry.permit}</p></div></div>
      <div class="cc-sec"><i class="ti ti-clock"></i><div><b>Stay</b><p>${d.entry.max_stay}</p></div></div>
      <div class="cc-sec"><i class="ti ti-fish-hook"></i><div><b>Fishing & spearing</b><p>${d.fishing}</p></div></div>
      ${d.notes && d.notes.length ? `<div class="cc-sec"><i class="ti ti-bulb"></i><div><b>Good to know</b><ul>${li(d.notes)}</ul></div></div>` : ''}
      <p class="cc-foot">Updated ${d.updated} · ${d.sources || ''} · planning aid — verify on arrival</p>
    </div>`;
  card.hidden = false;
}

window.dismissCountry = cc => {
  dismissedCC = cc;
  document.getElementById('countrycard').hidden = true;
};

function flagEmoji(cc){
  return cc.toUpperCase().replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

map.on('moveend', ()=>{
  clearTimeout(ccTimer);
  ccTimer = setTimeout(checkCountry, 2500);
});
