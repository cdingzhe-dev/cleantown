---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# CleanTown app shell (index.html)

Mode: Operate. Mobile-first resident app with a manager view, for hackathon judges and residents on phones.

Job: report a waste problem in under 30 seconds, follow its status, find the right bin or drop-off for an item, and see the next truck. Managers triage reports and maintain facilities and routes. Constraints: static HTML/CSS/vanilla JS, schematic SVG map kept, concept-township data flagged once as a demo.

## Direction contract

THESIS: CleanTown is sorted the way the street is sorted. Every waste category wears its Malaysian separation-at-source bin colour, and the guide answers by dropping an item into its bin. It rejects the generic white-card civic app with one accent colour.

OWN-WORLD: The shell is deep bin-green with a rounded lower edge. The ground is pale green-grey. Bin colours are category tokens only: blue paper, orange plastic and metal, brown glass, green general, lime organic, purple special, grey bulky. Moulded forms appear as lid-topped category tiles. Rubik is the type throughout. Icons are authored line SVGs. State pills are slate, amber and green.

STORY: Residents see what is open, report in one tap, watch the status move, sort an item and get sent to a matching facility. Managers sign in and get a Manage tab.

FIRST VIEWPORT: A green header with logo, Concept demo chip, greeting and open/in-progress/resolved counts. Four bin tiles overlap the header edge. Below them, a full-width dark Report a problem button, then recent reports. A five-tab bar sits at the bottom. On desktop, a left rail replaces the tab bar.

FORM: Separation-at-Source Bins, position 1 on my grounded list (pick card, round 0, chosen by user). seed: seed:d27c7f1a90a4c754. Signature move: the lid drop. When an item or photo resolves to a category, that bin's lid swings open, the item falls in, and the guidance rises.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
