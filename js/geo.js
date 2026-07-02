'use strict';

const R_NM = 3440.065;
const rad = d => d*Math.PI/180;

function distNm(a,b){
  const dLat = rad(b.lat-a.lat), dLon = rad(b.lng-a.lng);
  const h = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
  return 2*R_NM*Math.asin(Math.sqrt(h));
}

function bearing(a,b){
  const y = Math.sin(rad(b.lng-a.lng))*Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat))*Math.sin(rad(b.lat)) - Math.sin(rad(a.lat))*Math.cos(rad(b.lat))*Math.cos(rad(b.lng-a.lng));
  return (Math.atan2(y,x)*180/Math.PI + 360) % 360;
}

function fmtCoord(lat,lng){
  const f = (v,pos,neg) => {
    const h = v>=0?pos:neg, av=Math.abs(v), d=Math.floor(av), m=(av-d)*60;
    return `${d}°${m.toFixed(2).padStart(5,'0')}′ ${h}`;
  };
  return `${f(lat,'N','S')}  ${f(lng,'E','W')}`;
}

function fmtDur(hours){
  if (!isFinite(hours)) return '—';
  const m = Math.round(hours*60), d = Math.floor(m/1440), h = Math.floor((m%1440)/60), mm = m%60;
  return (d?d+'d ':'') + (h?h+'h ':'') + (d?'' : mm+'m');
}

function interpolate(a, b, t){
  return {lat: a.lat + (b.lat-a.lat)*t, lng: a.lng + (b.lng-a.lng)*t};
}
