# CleanTown — Sime Darby Township

Interactive hackathon prototype designed for mobile browsers and installable PWA use.

## Run it
- For the website-only demo, a modern browser can open `index.html`; however, **AI photo recognition will not work this way**.
- To use AI photo recognition, start the Flask backend with `python server.py` and open **http://127.0.0.1:8787** in your browser. Do not double-click `index.html` for AI testing: the configured `/api/classify` endpoint is served by this same Flask server.
- For geolocation and installable PWA behaviour, serve over HTTPS or localhost.
- The hotspot and **Find facilities** menus use a locally generated SVG schematic map. No Leaflet library, OpenStreetMap tiles, or map-tile network request is used.
- Facility search combines management-entered shared directory records with clearly labelled fictional demo points. It does not discover real-world facilities automatically. Residents can use device GPS or tap the generated map to set a starting point, filter results, sort by straight-line distance, and open directions in Google Maps. City/township dropdowns have been removed; the app uses a fixed illustrative default centre unless GPS or a map tap is used.
- Reports with coordinates appear on the hotspot map. The map also displays shared CleanTown facility records after a facility search.

## Enable shared live database (Supabase)
The app now has Supabase integration for shared resident reports and a shared facility directory. **It will stay in local-only mode until you configure a Supabase project.** No database credentials are included in this ZIP.

1. Create a project at [Supabase](https://supabase.com/).
2. Open the project's SQL Editor and run the full `supabase-setup.sql` file from this folder.
3. In the Supabase project settings, copy the **Project URL** and the **publishable/anon key**. Never use the `service_role` key in a browser app.
4. Edit `supabase-config.js` and set `url` and `anonKey`.
5. Host the folder over HTTPS or localhost and open `index.html`. The header should show **Shared live database** when the connection succeeds.
6. Open CleanTown in a second browser/device using the same configured deployment. Report submissions, report status changes, and facility additions/edits/removals should appear through Supabase Realtime.

### What syncs
- Resident reports: create, track, and update status; records are fetched from the shared database when the app starts and refreshed by Realtime events.
- Facility directory: management can add, edit, and remove shared recycling points and public bins with coordinates, address, and notes. These are merged into resident facility results alongside fictional demo points.
- Local fallback: when no Supabase config is provided or the connection fails, the app remains usable with browser-local storage and labels itself **Local demo · not synced**.

### Security warning — hackathon only
The included SQL deliberately allows anonymous visitors with the public anon key to read and write demo reports and facility records so a prototype can be tested across devices. The current login screen is simulated UI, **not real authentication**; anyone with access to the app could change reports or delete facility entries under these demo policies. Do not expose this setup as a public production service or store sensitive personal data. Before launch, implement Supabase Auth, role-based policies for residents vs management, server-side validation, rate limiting, backups, and audit logging; restrict facility writes and report status updates to authorised staff.

## Facility navigation limitations
- The generated map is a stylised illustration, not a real street map, GIS layer, or official township boundary. It works without map tiles or map-provider data.
- Fictional demo facilities are shown for the hackathon interaction only and must not be used for real-world navigation. Add verified facility names and coordinates in Management before residents rely on this feature.
- “Nearest” is ranked by straight-line distance using saved coordinates. Google Maps calculates the route after a resident chooses Navigate; opening directions requires internet access.
- Location access requires browser permission and normally HTTPS or localhost. If permission is denied, tap the generated map or enter coordinates manually. Map tap coordinates are approximate because the schematic is not to scale.

## Map data and demo limitations
- The city/township selector has been removed. The app retains one fixed illustrative default map centre internally; it is not an official township boundary or reliable starting point for navigation.
- The generated streets, blocks, parks, river/drain corridor, sample hotspots, and demo facilities are illustrative only. They are not actual geographic features or incidents.
- Resident GPS coordinates are displayed approximately relative to the selected township centre; the schematic is not suitable for accurate positioning, measuring routes, or dispatching crews.
- GPS coordinates are optional. Verify map pin accuracy before acting on a report. The prototype does not notify authorities or provide push notifications.

## Electrical and electronic waste (e-waste) directory
- Added ten entries drawn from the Malaysia Department of Environment (DOE) official collector directory, including A Five Stars Metals (Shah Alam), Acson Malaysia Sales & Service (Petaling Jaya), 3CAT (Plaza Low Yat), and several named Senheng / community collection points in Selangor.
- Full addresses and accepted item types are shown only where available in the DOE listing. Entries without confirmed address/type details use a map search and explicitly tell residents to call ahead. Do not treat those as verified GPS pins.
- Source: [DOE official e-waste collector directory](https://ewaste.doe.gov.my/index.php/about/list-of-collectors/).

## Login UI
- Includes Resident and Management tabs, email/password fields, password visibility toggle, and sign-out control.
- Without a real identity provider, the login UI only simulates sign-in and is not an access-control boundary.

## Suggested hackathon demo
1. Create a Supabase project, run `supabase-setup.sql`, configure `supabase-config.js`, and host the folder.
2. Open CleanTown on two devices. Submit a resident report on one and confirm it appears on the other.
3. Update the report status in Management and observe the status and map marker refresh on both devices.
4. Add a verified recycling point or public bin in Management; search facilities on the resident device and open directions.
5. Export report records as CSV.


## YOLO waste-photo recognition (Ultralytics + OpenCV/Pillow)

The Recycling tab's camera/upload workflow is connected to the included Flask endpoint and a pretrained **Ultralytics YOLO11n** object detector. On first start, the model weights are downloaded automatically. The server returns a mapped waste category, estimated detection confidence, object label, and disposal advice. The UI links the result to the matching Find Facilities map filter.

### Run the detector on Windows

1. Install **Python 3.12 (64-bit)** from https://www.python.org/downloads/release/python-31210/ and enable **Add Python to PATH**. Python 3.15 may not yet be compatible with all PyTorch/Ultralytics dependencies.
2. Open PowerShell in this project folder (the same folder that contains `server.py` and `requirements-vision.txt`).
3. Install the vision dependencies:

   ```powershell
   py -3.12 -m pip install --upgrade pip
   py -3.12 -m pip install -r requirements-vision.txt
   ```

4. Start CleanTown:

   ```powershell
   py -3.12 server.py
   ```

   Keep this terminal window open. On the first run, YOLO downloads its model weights, so it needs internet access and may take a few minutes.
5. Open **http://127.0.0.1:8787** (not the file `index.html`) in your browser.
6. Check **http://127.0.0.1:8787/api/health**. A healthy response contains `"ok": true`. If it returns an error or does not load, copy the full terminal error and the health-page response for troubleshooting.

### Important model limitations

- This is a general-purpose pretrained COCO object detector, **not a waste-specific model**. It can recognise some common objects (for example bottles, cups, phones, laptops, TVs, books and food objects), but it does not have dedicated classes for batteries, cardboard boxes, used tissue or many waste materials. Those should return an uncertain result and be selected manually. For stronger recycling accuracy, train/fine-tune on a labelled waste dataset.
- A detected object is not proof that a local facility accepts it or that it is recyclable. Always check the guidance and collection provider.
- First startup downloads model weights and dependencies; CPU inference may be slow. Model weights are not included in this ZIP.
- Ultralytics YOLO is distributed under AGPL-3.0 or a commercial Enterprise license. Review the current license and obligations before redistributing or deploying it as a closed-source commercial service: https://docs.ultralytics.com/ .
- This bridge is a hackathon prototype with no authentication or rate limiting. Add those controls before exposing it to the public internet.
- Manual category selection remains available if recognition fails or the model cannot identify the item.


## Garbage truck timetable and reminders (added)

- Residents can open **Truck timetable** to view collection routes, days, and planned arrival times.
- The management demo can add/remove routes under **Management centre → Garbage truck timetable management**.
- The timetable currently saves to that browser's `localStorage`; it is not yet shared across resident devices. Default routes and times are illustrative and must be confirmed by township management before public use.
- Residents can click **Enable reminders**. Browser permission is requested, and the prototype can show a reminder when the app is open around the 24-hour-before window. This is a local demo reminder, not guaranteed background delivery.
- The service worker now has a handler for incoming Web Push notifications, but **broadcast notifications to all residents are not active yet**. To deliver reliably while the website is closed, the deployment needs HTTPS, a server-side Web Push sender (VAPID keys), a secure subscription store, and a scheduled server job that sends one notification per subscribed device 24 hours before each collection. Push notifications require each resident to opt in; browsers do not permit silently enabling them for every user. See MDN's [Push API guide](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).
