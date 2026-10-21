---
name: CleanTown
description: Separation-at-source bins for Sime Darby Township. Every waste category wears its bin colour.
colors:
  shell: "#0F5132"
  shell-deep: "#0B3F27"
  shell-raised: "#14633F"
  shell-muted: "#C2E2CF"
  ground: "#F4F6F2"
  surface: "#FFFFFF"
  surface-sunk: "#EAEFEA"
  ink: "#14211A"
  ink-soft: "#1F3128"
  ink-caption: "#B9C8BE"
  muted: "#526158"
  line: "#E1E7E1"
  line-strong: "#C7D2C9"
  focus: "#2E9E5B"
  selected-tint: "#EBF6EF"
  nav-tint: "#E2F1E8"
  link: "#1A5BAE"
  action-text: "#17633F"
  bin-paper: "#1F6FD1"
  bin-paper-ink: "#1A5BAE"
  bin-paper-tint: "#E4EEFB"
  bin-plastic: "#F08A24"
  bin-plastic-ink: "#A34B05"
  bin-plastic-tint: "#FDEEDD"
  bin-plastic-on: "#2B1700"
  bin-glass: "#8A5A2B"
  bin-glass-ink: "#74491F"
  bin-glass-tint: "#F1E8DF"
  bin-general: "#1E7B4F"
  bin-general-ink: "#17633F"
  bin-general-tint: "#E0F1E7"
  bin-organic: "#8DB33A"
  bin-organic-ink: "#4A6E12"
  bin-organic-tint: "#EDF4DC"
  bin-special: "#7B3FA0"
  bin-special-ink: "#6A3590"
  bin-special-tint: "#F0E6F6"
  bin-bulky: "#6B7580"
  bin-bulky-ink: "#4B5560"
  bin-bulky-tint: "#ECEEF0"
  status-submitted-bg: "#EAEEEB"
  status-submitted-ink: "#3A4840"
  status-progress: "#D99A1B"
  status-progress-bg: "#FCF0D4"
  status-progress-ink: "#714D00"
  status-resolved: "#23968A"
  status-resolved-bg: "#DBF2EF"
  status-resolved-ink: "#136A61"
  sev-serious: "#D23F3A"
  sev-serious-bg: "#FCE4E2"
  sev-serious-ink: "#A3231F"
  sev-minor: "#7A8494"
  sev-minor-bg: "#ECEEF2"
  sev-minor-ink: "#434B58"
  danger: "#B42318"
  danger-bg: "#FDECEA"
  warn-bg: "#FFF5E1"
  warn-ink: "#5C3D00"
typography:
  display:
    fontFamily: "Rubik, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Rubik, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.1
    fontFeature: "tnum"
  title:
    fontFamily: "Rubik, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title-sm:
    fontFamily: "Rubik, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Rubik, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Rubik, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Rubik, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.15
  label-nav:
    fontFamily: "Rubik, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  lid: "9px"
  control: "12px"
  card: "14px"
  panel: "20px"
  shell-edge: "22px"
  sheet: "26px"
  hero-edge: "30px"
  pill: "999px"
spacing:
  hair: "4px"
  tight: "8px"
  snug: "12px"
  gutter: "16px"
  roomy: "20px"
  gutter-wide: "28px"
  section: "30px"
components:
  button-primary:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.shell-deep}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-sunk}"
  button-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  cta-report:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "16px 18px"
  cta-report-hover:
    backgroundColor: "{colors.ink-soft}"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "38px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
  pill-submitted:
    backgroundColor: "{colors.status-submitted-bg}"
    textColor: "{colors.status-submitted-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  pill-progress:
    backgroundColor: "{colors.status-progress-bg}"
    textColor: "{colors.status-progress-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  pill-resolved:
    backgroundColor: "{colors.status-resolved-bg}"
    textColor: "{colors.status-resolved-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
    height: "48px"
  card-report:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "14px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "18px"
  header-shell:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.surface}"
    padding: "14px 16px 16px"
  bin-tile-paper:
    backgroundColor: "{colors.bin-paper}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    padding: "24px 4px 12px"
  bin-tile-plastic:
    backgroundColor: "{colors.bin-plastic}"
    textColor: "{colors.bin-plastic-on}"
    typography: "{typography.label}"
    padding: "24px 4px 12px"
  bin-chip-special:
    backgroundColor: "{colors.bin-special-tint}"
    textColor: "{colors.bin-special-ink}"
    rounded: "{rounded.pill}"
    padding: "5px 12px 5px 8px"
  nav-item:
    textColor: "{colors.muted}"
    typography: "{typography.label-nav}"
    height: "54px"
  nav-item-active:
    backgroundColor: "{colors.nav-tint}"
    textColor: "{colors.shell}"
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "6px 20px 24px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "12px 16px"
---

# Design System: CleanTown

## Overview

**Creative North Star: "The Sorted Street"**

CleanTown is sorted the way a Malaysian street is sorted. The world is built from separation-at-source bins: each waste category wears its bin colour, containers carry a lid, and the guide answers by dropping an item into its bin. Chrome is a single deep bin-green shell that ends in a rounded lower edge; everything else sits on a pale green-grey ground in white cards. The colour lives in the bins, not in the interface.

Density is phone-first and calm: one column at 16px gutters, generous 44 to 54px touch targets, one heavy dark action per screen, and lists that read as rows rather than tiles. Rubik carries every word, its rounded terminals echoing moulded plastic. Depth is soft and ambient; nothing has a hard edge shadow. Motion is short and physical: lids swing, items fall, guidance rises.

Confirmed rejection: the generic white-card civic app with one accent colour. If a screen could be recoloured to any brand blue without losing meaning, it has left this world.

**Key Characteristics:**
- Deep bin-green shell with a rounded lower edge over a pale green-grey ground.
- Seven bin colours used strictly as category tokens, each with fill, ink and tint.
- Lid-topped forms: a darker, wider strip over a container whose lower corners are rounder.
- One typeface (Rubik) with weight, not family, carrying hierarchy.
- Status pills in slate, amber and teal, deliberately separate from the bins.
- Authored line SVG icons on a 24px grid, stroke 2, round caps and joins.
- Signature motion: the lid drop.

## Colors

A dark green shell, a near-neutral green-grey ground, and seven saturated bin colours that only ever name a category.

### Primary
- **Bin-Green Shell** (#0F5132): headers, the home hero, the login backdrop, the photo-scan panel, primary buttons, active navigation text and the PWA theme colour. It is the only chrome colour.
- **Shell Deep** (#0B3F27): primary button hover and pressed shell surfaces.
- **Shell Raised** (#14633F): a lighter step of the shell for raised elements sitting on it.
- **Shell Mist** (#C2E2CF): secondary text on the shell (subtitles, stat labels, scan hints). Never used on light ground.

### Secondary
- **Night Ink** (#14211A): body text and the one heavy action per screen: the Report a problem button, the next-truck card, selected filter chips and toasts. Hover deepens toward **Ink Soft** (#1F3128); captions on ink use **Ink Caption** (#B9C8BE).

### Tertiary: the bins
Each bin carries three values. The fill paints large shapes (tile body, bin art, lid strip, swatch). The ink is for text, icons and lids on the tint. The tint is the background of chips, icon tiles, step numerals and timetable day badges.
- **Paper Blue** (#1F6FD1 / ink #1A5BAE / tint #E4EEFB): paper and cardboard.
- **Plastic Orange** (#F08A24 / ink #A34B05 / tint #FDEEDD): plastic and metal packaging. Text on the orange fill uses **Plastic Dark** (#2B1700), never white.
- **Glass Brown** (#8A5A2B / ink #74491F / tint #F1E8DF): glass bottles and jars.
- **General Green** (#1E7B4F / ink #17633F / tint #E0F1E7): general waste.
- **Organic Lime** (#8DB33A / ink #4A6E12 / tint #EDF4DC): food and organic waste.
- **Special Purple** (#7B3FA0 / ink #6A3590 / tint #F0E6F6): batteries and e-waste drop-off.
- **Bulky Grey** (#6B7580 / ink #4B5560 / tint #ECEEF0): bulky items.

### Neutral
- **Pale Field** (#F4F6F2): the page ground.
- **Surface White** (#FFFFFF): cards, panels, sheets, inputs, the mobile tab bar (at 95% with blur) and the desktop rail.
- **Sunk Sage** (#EAEFEA): segmented-control tracks, notes, inline code, ghost-button hover.
- **Moss Grey** (#526158): secondary text, meta lines, inactive nav labels.
- **Hairline** (#E1E7E1) and **Hairline Strong** (#C7D2C9): row dividers, and the outlines of inputs, chips, ghost buttons and choice cards.
- **Focus Green** (#2E9E5B): the 3px focus outline, the input focus border and its 18% halo, and the new-report glow.
- **Selected Tint** (#EBF6EF) and **Nav Tint** (#E2F1E8): the selected choice card or map list item, and the sliding nav indicator.
- **Link Blue** (#1A5BAE) for inline links; **Action Green** (#17633F) for text buttons such as See all and Timetable.

### Status and severity
- **Submitted** slate (#EAEEEB on #3A4840), **In progress** amber (#FCF0D4 on #714D00, bar #D99A1B), **Resolved** teal (#DBF2EF on #136A61, bar #23968A). Pills carry a 6px dot in their ink colour.
- Hotspot severity: **Serious** red (#D23F3A, tint #FCE4E2, ink #A3231F), **Moderate** reuses the progress amber, **Minor** slate (#7A8494, tint #ECEEF2, ink #434B58), **Clear** reuses the resolved teal.
- **Danger** (#B42318 on #FDECEA) for validation and destructive actions; **Warn** (#5C3D00 on #FFF5E1) for the concept-demo banner.

### Named Rules
**The Bin Is the Colour Rule.** A bin hue appears only where it names that category: tile, swatch, lid strip, bin art, chip, guide icon, step numeral, timetable day. Never as a button colour, a generic accent, a link or a status.

**The Three Voices Rule.** Every bin speaks in fill, ink and tint. Text on a tint uses the ink, never the fill. Only the paper, glass, general, special and bulky fills take white text; Plastic Orange takes Plastic Dark, and Organic Lime never carries text.

**The Status Is Not a Bin Rule.** Report status is slate, amber and teal. A status must never borrow a bin colour, so "Resolved" never reads as "General waste".

**The One Heavy Action Rule.** Night Ink marks the single heaviest action or fact on a screen. Primary form buttons use the shell green; only one ink block competes for attention at a time.

## Typography

**Display Font:** Rubik (with system-ui, -apple-system, Segoe UI, Roboto, sans-serif)
**Body Font:** Rubik
**Label/Mono Font:** Rubik; ui-monospace only for inline code

**Character:** One soft-cornered geometric sans, loaded at 400 to 800. Its rounded terminals read like moulded bin plastic; heavy weights give the wordmark and hero their stamped, signage-like voice.

### Hierarchy
- **Display** (800, 32px mobile, 44px from 960px, 1.08, -0.03em): the home hero line only.
- **Headline** (700, 28px, 1.1, tabular figures): counts and times that must be read at a glance: hero stats (44px on desktop), KPI strip, next-truck time, success heading.
- **Title** (700, 20px, 1.2, -0.01em): section heads, page bars, panel heads. The wordmark uses the same size at 800.
- **Title Small** (700, 17px, 1.2): card and group heads, info cards, the Report a problem label (at 600), timetable times.
- **Body** (400, 16px, 1.5): running text, inputs. Hero subtitle caps at 36ch.
- **Body Small** (400, 14px, 1.5): locations, details, guidance steps (15px in sheets), notes.
- **Label** (600, 12px, 1.15): status pills, bin tile names (14px on desktop), sync chip, meta lines (at 400). Form labels step up to 15px at 600.
- **Label Nav** (500, 11px): tab bar labels; 600 when active, 15px in the desktop rail.

### Named Rules
**The One Family Rule.** Rubik is the only typeface. Hierarchy comes from weight (800 brand and display, 700 headings and numbers, 600 labels and buttons, 500 list items and nav, 400 body) and size, never from a second family.

**The Tabular Count Rule.** Every count, report ID, time, date and distance uses tabular figures so numbers do not jitter as they update.

## Layout

Mobile first. Content sits in a single column with 16px side gutters and 18px top padding, capped at 1120px (680px for narrow forms such as Report and Account, 1240px for the map). Sections open with a 30px top margin and a head row (title left, text action right). Lists stack with 8 to 10px gaps; form fields stack with 20px between them.

The home screen is a layered stack: a green hero with 68px of bottom padding, then the bin row pulled up 44px so four lid-topped tiles straddle the hero's rounded lower edge, then the full-width ink Report button, then recent reports and the next truck. On wide screens the reports and truck columns split 1.5fr to 1fr.

A five-item tab bar (66px) is fixed to the bottom with safe-area padding; a toast stack floats above it. From 960px a 252px white side rail replaces the tab bar (brand at top, Concept demo chip at the foot), the hero becomes a two-area grid with title left and stats right, gutters widen to 28px and the bin tiles grow. Two-column form grids start at 600px; toolbars, sheets-as-dialogs and two-column guide groups start at 760px. The schematic map holds 4:3 on phones and 5:3 from 760px.

## Elevation & Depth

Soft ambient depth over a pale ground. Shadows are tinted with Night Ink, never pure black, and stay low and diffuse. Cards resting on the ground take the first level; things that float over other things take the second. Flat lists inside a card drop shadows entirely and divide rows with 1px hairlines.

### Shadow Vocabulary
- **Rest** (`box-shadow: 0 1px 2px rgba(20,33,26,.06), 0 3px 10px rgba(20,33,26,.05)`): report cards, panels, map canvas, guide groups, timetable, selected segment.
- **Lift** (`box-shadow: 0 6px 20px rgba(20,33,26,.12)`): bin tiles overlapping the hero, the Report a problem button, toasts. Bin tiles deepen to `0 10px 26px rgba(20,33,26,.16)` on hover.
- **Sheet** (`box-shadow: 0 -12px 40px rgba(0,0,0,.18)`): bottom sheets, over a `rgba(9,24,17,.45)` scrim.
- **Login panel** (`box-shadow: 0 30px 80px rgba(0,0,0,.28)`): the sign-in card floating on the shell.

### Named Rules
**The Soft Sit Rule.** Depth is ambient and tinted. No hard offset shadows, no borders doubling as shadows, no glow except the focus-green flash on a new report.

## Shapes

Gently rounded, moulded forms. Controls use a 12px radius, cards 14px, panels and the Report button 20px, sheets and the login card 26px, chips and pills are fully round. Icon tiles are 42px squares at 12px radius.

The shell's rounded lower edge is structural: page bars end in 22px bottom corners, the home hero in 30px (34px on desktop); the top edge stays straight. On desktop the page bars square off because the rail frames them.

The lid is the recurring silhouette. A lid is a strip slightly wider than its container (3px overhang each side), 15px tall, with 9px top corners and 4px bottom corners, filled in the bin's ink. Containers under a lid have tighter top corners than bottom corners (bin tiles are 8px over 16px). The lid recurs on bin tiles, timetable day badges (a 7px lid), the login screen's row of coloured lids, the 12px bin swatch inside chips (4px over 2px), and as an 8px colour band hanging from the top of each guide group.

### Named Rules
**The Lid Rule.** A container that stands for a bin carries a lid: wider, darker, rounder on top. Hover or focus tips the lid open (rotate -9deg about its left hinge); it never slides or fades.

**The Rounded Lower Edge Rule.** The green shell ends in rounded lower corners and a straight top edge, like the lip of a bin seen from the front.

## Components

### Buttons
Firm, tactile, and shallow; they press in rather than lift.
- **Shape:** gently rounded (12px), 44px tall, 52px for large and 38px for small.
- **Primary:** Bin-Green Shell with white 15px/600 text, 0 16px padding; hover to Shell Deep.
- **Ghost:** white with a Hairline Strong border and ink text; hover to Sunk Sage.
- **Light / On-dark:** white with shell text, or 10% white with a 32% white border, for use on the shell.
- **Danger:** Danger tint with danger text.
- **Press:** scale to 0.97 (`transform .15s cubic-bezier(.16,1,.3,1)`). Disabled at 55% opacity. Busy buttons spin their icon.
- **Report a problem (signature CTA):** full-width Night Ink block at 20px radius with Lift shadow, a 46px white icon square whose plus rotates 90deg on hover, title 17px/600, caption in Ink Caption, trailing arrow.

### Chips
- **Filter chip:** white, Hairline Strong border, fully round, 38px tall, 14px/500. Selected inverts to Night Ink with white text. Bin filters carry a 10px swatch in the bin fill with a white ring.
- **Bin chip:** tint background, ink text, 13px/600, leading lid-shaped swatch in the fill.
- **Sync chip:** on the shell, 30% white border and 10% white fill, amber dot (#F5C451) offline, pulsing mint dot (#7BE3A6) when live.

### Status pills
Fully round, 4px 10px, 12px/600, with a 6px leading dot in currentColor. Submitted slate, In progress amber, Resolved teal. A status change pops the pill (scale 0.6 to 1.12 to 1). Report cards also show a three-step progress track: 4px bars, done steps teal, the current step in its status colour.

### Cards / Containers
- **Corner Style:** 14px for report, info and reminder cards; 20px for panels, the scan panel and the next-truck card.
- **Background:** Surface White on the ground; the scan panel is the shell; the next-truck card is Night Ink.
- **Shadow Strategy:** Rest level (see Elevation & Depth).
- **Border:** none; flat list variants use 1px Hairline row dividers.
- **Internal Padding:** 14px for report cards, 16px for info and reminder cards, 18px for panels.

### Inputs / Fields
- **Style:** white, 1px Hairline Strong stroke, 12px radius, 48px minimum height, 12px 14px padding; textareas start at 110px. Labels sit above at 15px/600 with an optional "(optional)" note in Moss Grey.
- **Focus:** border turns Focus Green with a 4px halo at 18% opacity; no outline.
- **Error:** border and 13px message in Danger; a form-level message sits in a Danger-tint box.
- **Choice cards:** two-up radio cards with a 1.5px border; checked turns the border shell green, the fill Selected Tint, and scales the icon to 1.12.
- **Segmented control:** Sunk Sage track, 4px inset, 36px segments; the pressed segment is white with Rest shadow. On the shell the track is 12% white and the pressed segment white with shell text.

### Navigation
- **Mobile:** fixed bottom bar, white at 95% with a saturating blur, top hairline, five equal items (icon 22px over an 11px label), 54px tall. Inactive Moss Grey; active shell green at 600 with the icon nudged up and scaled 1.08. A Nav Tint pill (16px radius) slides between items.
- **Desktop (960px+):** a 252px white rail with a right hairline, brand block at top, 46px rows with icon and 15px label side by side, the indicator a 12px-radius pill; Concept demo chip pinned to the foot.
- **Manager role:** a Manage tab appears; the Report tab hides on mobile.

### Bin tile (signature)
A moulded, lid-topped tile in the bin fill: 8px top and 16px bottom corners, 24px 4px 12px padding, a 42px icon square in 20% white, and a 12px/600 centred name (white, or Plastic Dark on orange). The lid is the bin ink. Four tiles (paper, plastic and metal, glass, general) sit in an even four-column row overlapping the hero's lower edge with Lift shadow. Hover and focus tip the lid open; press scales the tile to 0.96.

### Guide sheet and the lid drop (signature)
Item guidance opens as a bottom sheet (26px top corners, grab handle, slides up over 0.5s); from 760px it becomes a centred dialog. The head is a 124 by 150 bin illustration in the category fill with white ribs and an ink lid. On open, the lid swings to -62deg about its left hinge, the item's line icon falls 80px into the bin and vanishes, the lid closes (1.15s total), and the destination, numbered steps (28px tint circles with ink numerals) and the shell-green Find the nearest drop-off button rise in at 0.5s, 0.6s and 0.7s.

### Timetable row
Three columns: a 52px day badge in the bin tint with a lid in the bin fill and the date in ink, the route name and bin, and a right-aligned tabular time. Rows divide with hairlines inside one Rest card.

### Map pins
Circular pins in the category or severity colour with a 2.5px white stroke, a white line glyph and a 20% halo. Selected pins scale the halo 1.4x; hover or focus switches the stroke to ink. Light pins (user position, picked point) invert to white with a coloured ring. Pins pop in with a scale-from-0.2 entrance.

## Do's and Don'ts

### Do:
- **Do** route every category colour through its bin's fill, ink and tint trio, and nothing else (The Three Voices Rule).
- **Do** put Plastic Dark (#2B1700) text on the Plastic Orange fill and white only on the paper, glass, general, special and bulky fills; keep text off the Organic Lime fill.
- **Do** give any container that stands for a bin a lid: a wider strip in the bin ink, 9px over 4px corners, hinged at its left.
- **Do** end the green shell in rounded lower corners (22px bars, 30px hero) and keep its top edge straight.
- **Do** keep touch targets at 44px or more (54px tab items, 48px inputs, 38px chips and small buttons only where a row of them sits together).
- **Do** use tabular figures for every count, ID, time and distance.
- **Do** draw icons as 24px line SVGs, stroke 2, round caps and joins, inheriting currentColor.
- **Do** pair motion with the custom easing `cubic-bezier(.16,1,.3,1)` (or `cubic-bezier(.22,1,.36,1)` for lids and icon nudges) and collapse all motion under prefers-reduced-motion.

### Don't:
- **Don't** use a bin colour as a button, link, generic accent or status (The Bin Is the Colour Rule).
- **Don't** colour report status with bin colours; status stays slate, amber and teal.
- **Don't** fall back to a white-card app with one brand accent; the bins carry the colour.
- **Don't** introduce a second typeface; Rubik carries every role.
- **Don't** use hard offset shadows, pure-black shadows, or decorative glows; depth is the Rest and Lift pair.
- **Don't** put more than one Night Ink block in competition on a screen.
- **Don't** use emoji, icon fonts or text glyphs as icons.
