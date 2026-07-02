# Helm — Sailing Trip Map

An interactive passage planner for charting sailing routes anywhere in the world. Single-file web app — no build, no install, no API keys.

**Open it:** double-click `index.html`, or serve it locally:

```bash
python3 -m http.server 8742 --directory .
# then open http://localhost:8742
```

## Features

- **Course plotting** — click the water to drop waypoints; dashed rhumb-line course with per-leg distance (nm) and true bearing labels. Drag marks to adjust, right-click to remove, double-click a waypoint in the sidebar to name it.
- **Passage math** — coordinates in degrees/decimal-minutes, leg + cumulative distance, boat speed and departure time inputs → time underway and ETA at every waypoint.
- **Ashore scanner** — zoom in on any coastline and the app queries OpenStreetMap (Overpass API) live: marinas, anchorages, and fuel docks first, then restaurants, hotels, and sights as you zoom closer. Click any pin for contact info and an "add to course" shortcut.
- **Live conditions** — wind speed/direction/gusts (knots) and wave height/period for the map center, via Open-Meteo.
- **Nautical overlay** — OpenSeaMap seamarks: buoys, lights with sector arcs, channel markers.
- **Three basemaps** — nautical chart (Esri Ocean blending into street detail as you zoom), OpenStreetMap, and satellite imagery.
- **Search** — fly to any place name (Nominatim geocoding).
- **GPX export** — download your course for a chartplotter or OpenCPN.
- **Auto-save** — the course persists in browser localStorage.

## Keyboard

| Key | Action |
|-----|--------|
| `P` | Toggle plotting on/off |
| `Cmd/Ctrl+Z` | Undo last waypoint |

## Data sources

All free, public APIs — no keys required:
[OpenStreetMap](https://www.openstreetmap.org) · [OpenSeaMap](https://www.openseamap.org) · [Overpass API](https://overpass-api.de) (with mirror failover) · [Open-Meteo](https://open-meteo.com) · [Nominatim](https://nominatim.org) · [Esri basemaps](https://www.arcgis.com) · [Leaflet](https://leafletjs.com)

> Planning aid only — not for navigation. Always use official charts and publications underway.
