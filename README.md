# CleanTown — Sime Darby Township

Hackathon prototype of a mobile-first, installable web app (PWA) for township waste: residents report problems and follow them to resolved, sort items into the right bin, find drop-off points and check truck times; managers triage reports and maintain routes and places.

Sime Darby Township is still a concept, so the map, bins, hotspots, sample reports and truck routes are **illustrative**. The app says so once (a dismissible banner on Home and the account sheet) rather than on every screen.

## Project layout

| File | What it is |
|---|---|
| `index.html` | App shell and markup (plain HTML, no build step) |
| `app.css` | Styles: bin-colour design system, mobile tab bar, desktop side rail, motion |
| `app.js` | All app logic (reports, schematic maps, sort guide, trucks, management, simulated login) |
| `sw.js` | Service worker: network-first for app files, offline fallback, cached fonts |
| `manifest.webmanifest`, `icons/` | PWA manifest and icons (`tools/make_icons.py` regenerates the PNGs from the same geometry as `icons/icon.svg`) |
| `server.py` | Optional Flask server: serves the app and the YOLO photo-recognition API |
| `supabase-config.js`, `supabase-setup.sql` | Optional shared database |
| `ai-config.js` | Photo-recognition endpoint (defaults to `/api/classify` on `server.py`) |

## Run it
- **Quick demo (no AI):** serve the folder over localhost, for example `python -m http.server 8790`, then open http://127.0.0.1:8790. Opening `index.html` directly from disk also works, but the service worker, location and notifications need `http://localhost` or HTTPS.
- **With photo recognition:** run `python server.py` (see below) and open http://127.0.0.1:8787.
- On the sign-in screen, use **As resident** or **As manager** to jump straight in. Sign-in is simulated: any valid email and a 4+ character password works, and it is not an access-control boundary.

## Suggested demo for judges
1. Sign in **as resident**. Home shows open/in-progress/resolved counts, bin shortcuts, recent reports and the next truck.
2. **Report**: pick a problem type, tap the schematic map to drop a pin, describe it, submit. You get a tracking number (`CT-###`).
3. **Track it** from the success screen; tap **Show on map** to jump to its pin on the hotspot map.
4. **Sort it**: tap an item (e.g. *Plastic bottle*) and watch it drop into its bin, then **Find the nearest drop-off**.
5. **Trucks**: next collection with a countdown; turn on reminders.
6. Sign out (account button) and sign in **as manager**: advance a report (Start work → Mark resolved), add a route, and add a bin by tapping the map. It appears immediately in residents' *Bins & centres* search.
7. Export reports as CSV.

## Shared live database (Supabase, optional)
Without configuration the app runs in **local-only mode**: everything is saved in that browser.

1. Create a project at [Supabase](https://supabase.com/).
2. In the SQL Editor, run the whole of `supabase-setup.sql`.
3. Copy the **Project URL** and the **publishable/anon key** into `supabase-config.js`. Never use the `service_role` key in a browser app.
4. Serve the folder over HTTPS or localhost. The header chip switches to **Live sync**.
5. Open CleanTown on a second device. New reports, status changes and place edits appear through Supabase Realtime.

What syncs: resident reports (create, status updates) and the bins & recycling-points directory. The truck timetable is still stored per browser; sharing it needs a new table.

Tracking numbers stay in the `CT-###` format in cloud mode. If two devices pick the same number at once, the database rejects the duplicate and the app retries with the next free number.

### Security warning — hackathon only
The included SQL deliberately lets anyone with the public anon key read and write demo reports and places so the prototype can be tested across devices. Login is simulated. Before any real launch, add Supabase Auth, role-based row-level-security policies for residents vs management, server-side validation, rate limiting, backups and audit logging.

## Photo recognition (Ultralytics YOLO11n, optional)

`server.py` serves the app and `/api/classify`, backed by a pretrained **Ultralytics YOLO11n** detector. The app shrinks photos to 1280 px before upload. Recognised objects map to a bin and open that item's disposal guide; anything it can't place opens a "pick the closest bin" sheet.

`server.py` only serves the app's own files (`index.html`, `app.css`, `app.js`, `sw.js`, the manifest, the two config files and `icons/`). It deliberately does not serve the whole folder, so the source code, model weights and `.git` are never exposed, for example when you run it on `0.0.0.0` to test from a phone.

### Run the detector on Windows
1. Install **Python 3.12 (64-bit)** from https://www.python.org/downloads/release/python-31210/ and enable **Add Python to PATH**.
2. In this folder, install the dependencies:

   ```powershell
   py -3.12 -m pip install --upgrade pip
   py -3.12 -m pip install -r requirements-vision.txt
   ```
3. Start it with `py -3.12 server.py`, or double-click `START_CLEANTOWN_AI.bat`, and keep the window open. The first run downloads model weights.
4. Open **http://127.0.0.1:8787**. **http://127.0.0.1:8787/api/health** should return `"ok": true`.

### Model limitations
- It's a general COCO object detector, **not a waste-specific model**. It recognises bottles, cups, phones, laptops, TVs, books, some foods and furniture, but has no classes for batteries, cardboard, tissues and many waste materials. For real accuracy, fine-tune on a labelled waste dataset.
- A detected object doesn't prove a facility accepts it. Residents should always check the guidance.
- Ultralytics YOLO is AGPL-3.0 or commercially licensed. Review the obligations before redistributing or running it as a closed-source service: https://docs.ultralytics.com/
- There's no authentication or rate limiting on the API. Add them before exposing it publicly.

## Maps
- Hotspots and **Bins & centres** use a locally generated SVG schematic. It is not a street map, GIS layer or official boundary, and it needs no tiles or map provider.
- Sample hotspots and sample facility spots are fictional and labelled **Sample**. Places a manager adds are labelled **Verified** or **Not verified**.
- "Nearest" uses straight-line distance. **Directions** opens Google Maps for the route.
- If your GPS position is more than 5 km from the concept township, distances start from the township centre instead.

## Truck timetable and reminders
- Residents see the next collection with a countdown and the weekly routes. Default routes are illustrative.
- **Turn on** requests notification permission. While CleanTown is open, the device gets one reminder within 24 hours of each collection. It is a local demo reminder, not background push.
- `sw.js` already handles incoming Web Push. Delivering reminders while the app is closed needs HTTPS, a server-side Web Push sender (VAPID keys), a subscription store and a scheduled job. See MDN's [Push API guide](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).

## E-waste directory
Ten entries from the Malaysia Department of Environment (DOE) [official e-waste collector directory](https://ewaste.doe.gov.my/index.php/about/list-of-collectors/) appear in the e-waste items' guide. Entries without a full address are map searches, not verified pins. Residents should call ahead.
