'use strict';

/* ================= guided tour ================= */
const TOUR_STEPS = [
  {t:null, title:'Welcome aboard Helm',
   body:'A passage planner for the whole dream: chart courses on a real globe, see the weather you\'ll actually get, find what\'s ashore, and keep the budget honest. This tour takes about a minute — Esc skips it anytime.'},
  {t:'#map', title:'Chart a course',
   body:'Click the water to drop numbered waypoints — drag to adjust, right-click a mark to remove it. Click any mark for its briefing: ETA, the forecast when you arrive, and the nearest marina and fuel. Right-click open water for more: log a spot or copy coordinates.'},
  {t:'#speedrow', title:'Speed & departure',
   body:'Set your boat speed and departure time. Every leg gets distance in nautical miles, true bearing, and an ETA — and the arrival time up top updates live.'},
  {t:'#wplist', title:'Plan each stop',
   body:'Each waypoint here shows coordinates and leg math. Give a stop nights and choose where you\'ll sleep — at anchor, a marina slip, or ashore. Double-click a waypoint to name it.'},
  {t:'#budgetrow', title:'What it all costs',
   body:'Click here for the voyage budget: stays, food, fuel, permits and a maintenance kitty, priced by region for every country on your route. Click any expense line to see the exact math behind it.'},
  {t:'#passage', title:'Weather along the way',
   body:'With a course plotted, this strip shows wind and waves at each point at the time you\'ll actually be there — teal is calm, red is heavy. It also warns if you\'re crossing a hurricane basin in season.'},
  {t:'#voyagerow', title:'Multiple voyages',
   body:'Plan the whole dream as separate legs, each with its own color. Inactive legs show as ghost routes on the map — click one to open it. The database icons export and import everything as one file.'},
  {t:'#loghead', title:'Your logbook',
   body:'Star-pin the places worth remembering — anchorages with good holding, the surf break that works on a NE swell, the guy who fixes outboards. Rate it, note it, and it\'s saved forever.'},
  {t:'#cats', title:'The Ashore scanner',
   body:'Zoom in on any coastline and Helm scans it live: marinas, anchorages, fuel, dive sites, wrecks, surf breaks, restaurants, hotels. Toggle categories here; click any pin for contact details and a one-tap web search.'},
  {t:'#layersbtn', title:'Map layers',
   body:'Switch between nautical chart, streets, and satellite. Toggle seamarks & buoys, GEBCO depth shading for reading drop-offs and banks, and cyclone-season zones by month.'},
  {t:'#searchwrap', title:'Find anywhere',
   body:'Search any harbor, island or town and fly there. And just rest your cursor on the map — the corner chip names whatever is under it.'},
  {t:null, title:'Fair winds',
   body:'One more thing: cross into a new country\'s waters and a cruising card slides in — ports of entry, fees, stay limits, fishing rules. Replay this tour anytime with the ? button up top. Now go plot something worth sailing.'}
];

let tourIdx = -1;

function tourEls(){
  let hl = document.getElementById('tour-hl'), card = document.getElementById('tour-card');
  if (!hl){
    hl = document.createElement('div'); hl.id = 'tour-hl'; document.body.appendChild(hl);
    card = document.createElement('div'); card.id = 'tour-card'; card.className = 'glass'; document.body.appendChild(card);
  }
  return {hl, card};
}

function startTour(){
  tourIdx = -1;
  stepTour(1);
}

function endTour(){
  const hl = document.getElementById('tour-hl'), card = document.getElementById('tour-card');
  if (hl) hl.remove();
  if (card) card.remove();
  tourIdx = -1;
  localStorage.setItem('helm-tour-done','1');
  document.removeEventListener('keydown', tourKeys);
}

function tourKeys(e){
  if (tourIdx < 0) return;
  if (e.key === 'Escape') endTour();
  if (e.key === 'ArrowRight' || e.key === 'Enter') stepTour(1);
  if (e.key === 'ArrowLeft') stepTour(-1);
}

function stepTour(dir){
  tourIdx += dir;
  while (TOUR_STEPS[tourIdx] && TOUR_STEPS[tourIdx].t){
    const el = document.querySelector(TOUR_STEPS[tourIdx].t);
    if (el && (el.offsetParent !== null || TOUR_STEPS[tourIdx].t === '#map')) break;
    tourIdx += dir;
  }
  const s = TOUR_STEPS[tourIdx];
  if (!s){ endTour(); return; }
  const {hl, card} = tourEls();
  document.removeEventListener('keydown', tourKeys);
  document.addEventListener('keydown', tourKeys);

  let rect = null;
  if (s.t){
    const el = document.querySelector(s.t);
    el.scrollIntoView({block:'nearest'});
    rect = el.getBoundingClientRect();
  }
  if (rect && s.t === '#map'){
    rect = {left: rect.left + rect.width*.3, top: rect.top + rect.height*.25, width: rect.width*.45, height: rect.height*.5};
  }
  if (rect){
    hl.style.display = 'block';
    hl.style.left = (rect.left - 7) + 'px';
    hl.style.top = (rect.top - 7) + 'px';
    hl.style.width = (rect.width + 14) + 'px';
    hl.style.height = (rect.height + 14) + 'px';
  } else {
    hl.style.display = 'block';
    hl.style.left = '50%'; hl.style.top = '50%'; hl.style.width = '0px'; hl.style.height = '0px';
  }

  const last = tourIdx === TOUR_STEPS.length - 1;
  card.innerHTML = `
    <div class="tc-head">${s.title}<a class="tc-skip" href="#">skip</a></div>
    <p>${s.body}</p>
    <div class="tc-foot">
      <span class="tc-n">${tourIdx+1} / ${TOUR_STEPS.length}</span>
      <span class="tc-btns">
        ${tourIdx>0 ? '<button class="tc-back">Back</button>' : ''}
        <button class="tc-next">${last ? 'Set sail' : 'Next'}</button>
      </span>
    </div>`;
  card.querySelector('.tc-skip').onclick = e=>{ e.preventDefault(); endTour(); };
  card.querySelector('.tc-next').onclick = ()=> last ? endTour() : stepTour(1);
  const back = card.querySelector('.tc-back');
  if (back) back.onclick = ()=> stepTour(-1);

  card.style.visibility = 'hidden';
  card.style.display = 'block';
  const cw = card.offsetWidth, ch = card.offsetHeight, W = window.innerWidth, H = window.innerHeight;
  let cx, cy;
  if (!rect || rect.width === 0){
    cx = (W - cw)/2; cy = (H - ch)/2;
  } else if (rect.left + rect.width + cw + 30 < W){
    cx = rect.left + rect.width + 18; cy = rect.top;
  } else if (rect.left - cw - 18 > 0){
    cx = rect.left - cw - 18; cy = rect.top;
  } else {
    cx = Math.min(W - cw - 14, Math.max(14, rect.left));
    cy = rect.top + rect.height + 16;
  }
  card.style.left = Math.max(10, Math.min(W - cw - 10, cx)) + 'px';
  card.style.top = Math.max(10, Math.min(H - ch - 10, cy)) + 'px';
  card.style.visibility = 'visible';
}

document.getElementById('helpbtn').onclick = startTour;
if (!localStorage.getItem('helm-tour-done')) setTimeout(startTour, 1800);
