# Helm tutorial — every feature, stem to stern

The app also has a built-in guided tour: hit the **?** button in the top bar. This is the long-form version.

## 1. Chart a course
- **Click the water** to drop a numbered waypoint. Keep clicking to build the route — the animated gold line connects them, and every leg gets a pill with **distance (nm) and true bearing**.
- **Drag** a mark to move it. **Right-click a mark** to delete it. `Cmd/Ctrl+Z` undoes the last one.
- **Click a mark** for its briefing: coordinates, distance from start, **ETA**, the **forecast wind/waves at the moment you arrive**, and the nearest marina, fuel dock and anchorage from the last scan — plus rename / log / remove.
- **Right-click open water** for the context menu: drop waypoint · log this spot · copy coordinates.
- Press **P** to toggle plotting off when you just want to pan and click pins.

## 2. Speed, departure & ETAs
Set boat speed (kn) and departure time in the Course panel. Totals update live: distance, time underway, arrival. Each waypoint row shows its own ETA.

## 3. Plan each stop
In the waypoint list, give any stop **nights** and choose where you sleep: **at anchor · marina slip · ashore (hotel)**. Double-click a waypoint row to name it ("Staniel Cay").

## 4. The voyage budget
Click **"Estimate voyage cost"** under the speed row. Set crew, boat length, and (optionally) a total budget. Helm detects the country of every stop, applies regional price levels (~90 cruising destinations), and estimates: nightly stays, food (underway vs. at stops vs. ashore), activities, fuel & running from your actual route distance, clearance per country, and a maintenance kitty. **Click any expense line to see the exact math.** The bar shows margin (teal) or overage (red); the summary row in the Course panel flags stale estimates when the route changes.

## 5. Weather along the route
With 2+ waypoints, the **passage strip** appears at the bottom: your route sampled every ~15–20 nm, with wind and waves forecast **for the time you'll be at each point** (16-day wind, 8-day waves). Cells: teal <15 kn · gold 15–22 · orange 22–28 · red 28+ · gray beyond forecast. Hover a cell for details, click to fly there. The route itself tints to match. A warning names the worst spot ("max 28 kn near Highbourne Thu 02:00") and flags **hurricane-basin crossings in season**.

## 6. Multiple voyages
The dropdown atop the Course panel switches voyages. **+** starts a new leg (own color), pencil renames, trash deletes. Inactive voyages draw as **dimmed ghost routes** — click one on the map to open it. **GPX** exports the active voyage for OpenCPN or a chartplotter; the **database icons** export/import everything (voyages + logbook) as one JSON — commit it to this repo and your plans are versioned.

## 7. Logbook
Star-pin the places worth remembering. Add from: the **+** in the Logbook panel (logs map center), the **"log it"** link in any pin's popup, a waypoint briefing, or **right-click → log this spot**. Each entry: date, category (anchorage/dive/surf/fishing/food/repair/note), 1–5 stars, free notes. Entries are gold star pins on the map and a list in the panel — click to fly back.

## 8. The Ashore scanner
Zoom in on any coastline (about the level where a whole island group fills the screen) and Helm queries OpenStreetMap live. **Marinas, anchorages, fuel** appear first; zoom closer for **dive sites, wrecks, surf breaks, reefs, restaurants, hotels, sights**. Toggle the colored chips to filter. Every pin's popup shows everything known — phone, email, website, **VHF channel**, hours, fuel types, berths, wifi — resolves a street address on open, and always offers **"find online"** (a targeted web search) plus "add to course" and "log it". The ↻ button rescans the current view.

## 9. Layers
The stack button (top right): **Chart** (ocean bathymetry zoomed out, themed streets zoomed in) · **Streets** · **Satellite** (hybrid — labels stay on). Overlays: **Seamarks & buoys** (OpenSeaMap), **Depth shading** (GEBCO, with opacity slider — read the drop-offs for fishing, the banks for anchoring), **Cyclone season** (basin polygons shaded by month; slide the month to plan timing).

## 10. Search & identify
Type any place in the search bar and Enter flies you there. Rest your cursor anywhere on the map and the corner chip names what's under it — street level when zoomed in, island/country when zoomed out.

## 11. Country cruising cards
Cross into a country's waters (zoom 7+) and a card slides in: **ports of entry, clearing-in process, permit fees, stay limits, fishing & spearfishing rules, local notes**. Cards live in `data/countries/` (Bahamas and US included) and are added leg by leg. Dismiss with ×; it stays away until you enter a different country.

## 12. Boat book (this repo)
[Gear inventory](gear-inventory.md) · [Maintenance log](maintenance-log.md) · [Provisioning checklists](provisioning-checklist.md) — markdown, versioned, yours.

---
*Planning aid only — not for navigation. Official charts and publications underway.*
