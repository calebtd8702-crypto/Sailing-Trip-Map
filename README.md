# Helm — Sailing Trip Map

A liquid-glass passage planner for charting a life at sea: plot courses anywhere on Earth, see the weather you'll actually get along the way, find the marinas, wrecks, surf breaks and dive sites when you zoom in, and keep a versioned logbook of everywhere you've been.

Single-page web app. No build, no install, no API keys.

**Run it:**

```bash
python3 -m http.server 8742 --directory .
# open http://localhost:8742
```

(Opening `index.html` directly also works for course plotting; the data-driven extras — country cards, hurricane zones, shared voyages — need the little server because browsers block `fetch` on `file://`.)

## What it does

### Passage planning
- Click the water to drop waypoints — animated course line with per-leg distance (nm) and true bearing; drag to adjust, right-click to remove, double-click in the sidebar to name.
- Degrees/decimal-minutes coordinates, cumulative distance, boat speed + departure time → ETA at every waypoint.
- **Route weather**: the course is sampled every ~15–20 nm and Open-Meteo is queried for the wind and waves *at each point at the time you'll be there* (16-day wind, 8-day waves). The route tints teal → amber → red by forecast wind, and a passage strip shows the timeline with a warning callout ("max 28 kn near Highbourne Thu 02:00").
- **Cyclone season zones**: 8 basin polygons (NOAA climatology) with a month slider; the passage strip warns if your route crosses a basin in season at transit time.
- **Multiple voyages**: separate legs with their own colors; inactive voyages show as dimmed ghost routes (click to open). GPX export per voyage for OpenCPN or a chartplotter.

### Zoom in anywhere
- Live OpenStreetMap scan of whatever coast you're looking at: **marinas, anchorages, fuel docks** first, then **dive sites, wrecks, surf breaks, reefs & tackle shops**, then **restaurants, hotels, sights** as you get closer. Every pin: contact info, "add to course", "log it".
- **Country cards**: cross into a new country's waters and a card slides in — ports of entry, clearing-in process, permit fees, stay limits, fishing & spearfishing rules. Data lives in `data/countries/*.json` (Bahamas included, Apr 2026 fee schedule).
- **Depth shading** (GEBCO bathymetry) with opacity control — read the drop-offs for fishing and the banks for anchoring.
- **OpenSeaMap seamarks**: buoys, lights and their sector arcs.

### Living aboard
- **Logbook**: star-pin any spot with date, category, 1–5 rating and notes ("good holding in sand at 3 m", "surf works on NE swell"). Export everything to JSON and commit it — a versioned cruising journal.
- Live wind/gusts/waves chip for wherever the map is centered.
- Boat book in [docs/](docs/): [gear inventory](docs/gear-inventory.md), [maintenance log](docs/maintenance-log.md), [provisioning checklists](docs/provisioning-checklist.md) scaled from day-hop to ocean crossing.

## Keys & controls
| Control | Action |
|---------|--------|
| `P` | Toggle plotting on/off |
| `Cmd/Ctrl+Z` | Undo last waypoint |
| Layers button (top right) | Basemap, seamarks, depth, cyclone zones |
| Database icons (course panel) | Export / import all voyages + logbook |

## Data sources
All free public services: [OpenStreetMap](https://www.openstreetmap.org) · [OpenSeaMap](https://www.openseamap.org) · [Overpass API](https://overpass-api.de) (mirror failover) · [Open-Meteo](https://open-meteo.com) forecast + marine · [GEBCO](https://www.gebco.net) bathymetry · [Nominatim](https://nominatim.org) · [Esri basemaps](https://www.arcgis.com) · [Leaflet](https://leafletjs.com)

> **Planning aid only — not for navigation.** Use official charts and publications underway, and verify entry requirements on arrival; fees and rules drift.
