# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Residents** of Sime Darby Township (a planned, still-conceptual township in Selangor, Malaysia), mostly on phones, out on the street or at home: reporting a waste problem they just saw, checking when the truck comes, or working out where an item should go.
- **Township management** staff: triaging and resolving reports, publishing truck routes, and keeping the bin and recycling-point directory up to date.
- **Hackathon judges** (first stage): trying the app on their own phones during a short demo. They need to grasp the whole loop (report, track, resolve, prevent) in a minute or two.

## Product Purpose

CleanTown connects residents and township management around waste. Residents report issues with an optional GPS pin and photo, follow their progress, get collection reminders, and learn the right disposal route for an item, with optional AI photo recognition. Management moves reports through Submitted → In progress → Resolved and publishes facilities and truck schedules. Success for this stage means a judge can run the full loop on a phone without explanation.

## Positioning

A single township-scoped loop, not a generic city reporting form: reports feed a hotspot map, reports carry a status residents can follow, and the disposal guide routes an item (or a photo of it) to a matching facility on the township map.

## Operating Context

- The app is mainly used on phones in daylight outdoors. It can be installed as a PWA.
- The township is still a concept. There is no real GIS boundary, no real bin positions, and no confirmed truck routes. The app runs as a **polished simulation**: believable fictional township data, clearly flagged once as a concept demo rather than with a disclaimer on every screen.
- Optional Supabase sync shares reports and facilities across devices. Without it, everything works from browser storage.
- Optional Flask + Ultralytics YOLO11n server (`server.py`) classifies waste photos at `/api/classify`.

## Capabilities and Constraints

- Static HTML/CSS/vanilla JS with no build step, because it must be hostable anywhere (user decision).
- The generated schematic SVG map stays. No map-tile library (user decision).
- Login is simulated UI only and is not access control. The Management centre is shown only after a manager sign-in (user decision); residents get a simpler nav.
- Management must be able to add facilities and truck routes in local-only mode, not just when Supabase is connected.
- YOLO is a general COCO detector, so many waste types return "uncertain". Manual category choice must stay available.
- Terminology: report statuses are exactly `Submitted`, `In progress` and `Resolved`. Report IDs look like `CT-###`.

## Brand Commitments

- Name: **CleanTown**, for **Sime Darby Township**. Tagline in use: "Cleaner streets. Smarter communities."
- Existing copy may be tightened (wordy disclaimers can be condensed) but factual guidance must stay accurate.

## Evidence on Hand

- Real: a list of 10 collectors from the Malaysia DOE e-waste directory (`index.html`, e-waste panel) and its source URL.
- Not real: hotspots, facility points, truck schedules and seed reports are all illustrative. Never present them as verified. No usage numbers, partners or endorsements exist, so do not invent any.

## Product Principles

1. The resident's task comes first: one tap to report, and status always visible.
2. Be honest about the simulation, once and clearly, without nagging.
3. Every guide answer ends in an action: where to take the item.
4. It works offline and without a backend; cloud and AI are enhancements.

## Accessibility & Inclusion

Malaysian residents of all ages, many on mid-range Android phones. Target WCAG 2.2 AA: sufficient contrast outdoors, 44px touch targets, keyboard and screen-reader support for map pins, and reduced-motion respected.
