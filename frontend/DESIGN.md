---
name: THAI TAY
description: Structural material prices and 1–3 month forecasts, stamped on a rebar mill tag.
colors:
  zinc-50: "#f3f5f7"
  zinc-ground: "#e7ebee"
  tag-stock: "#fbfcfc"
  zinc-sunken: "#dce2e6"
  line: "#c8d0d6"
  line-strong: "#9aa6b0"
  input-edge: "#a9b4bd"
  field-white: "#ffffff"
  mill-scale-ink: "#1b2c3e"
  ink-2: "#425466"
  ink-3: "#56687a"
  tag-yellow: "#f2c200"
  tag-yellow-hover: "#e2b400"
  tag-tint: "#fbefbf"
  write-in-box: "#fffbe6"
  temper-blue: "#245594"
  temper-blue-tint: "#dde7f3"
  temper-bronze: "#9a5716"
  temper-bronze-band: "rgba(154, 87, 22, .16)"
  bronze-on-tag: "#6e380a"
  rust-up: "#a8341f"
  rust-up-tint: "#f6e0da"
  verdigris-down: "#22705f"
  verdigris-down-tint: "#d9ece6"
  stamp-red: "#c0301e"
  paint-str-01: "#e0a100"
  paint-str-02: "#245594"
  paint-str-03: "#2f8a55"
  paint-str-04: "#7b52b8"
  paint-str-05: "#c0392b"
  paint-str-06: "#5d6b78"
  paint-str-07: "#a8957a"
  paint-str-08: "#16809a"
  paint-str-09: "#9a5a24"
typography:
  display:
    fontFamily: "Chakra Petch, Bai Jamjuree, sans-serif"
    fontSize: "clamp(34px, 4.7vw, 66px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.005em"
  headline:
    fontFamily: "Chakra Petch, Bai Jamjuree, sans-serif"
    fontSize: "clamp(28px, 3.3vw, 44px)"
    fontWeight: 700
    lineHeight: 1.2
  page-title:
    fontFamily: "Chakra Petch, Bai Jamjuree, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.35
  title:
    fontFamily: "Chakra Petch, Bai Jamjuree, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.5
  stamped:
    fontFamily: "Chakra Petch, Bai Jamjuree, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: ".02em"
    fontFeature: "tnum"
  body:
    fontFamily: "Bai Jamjuree, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  body-lead:
    fontFamily: "Bai Jamjuree, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Bai Jamjuree, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.6
rounded:
  chip: "999px"
  stamp: "8px"
  control: "10px"
  panel: "12px"
  field-grid: "13px"
  closing-band: "20px"
  big-tag: "22px"
spacing:
  xs: "8px"
  sm: "14px"
  md: "20px"
  lg: "24px"
  xl: "32px"
  section: "88px"
components:
  button-primary:
    backgroundColor: "{colors.tag-yellow}"
    textColor: "{colors.mill-scale-ink}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.tag-yellow-hover}"
  button-on-tag:
    backgroundColor: "{colors.mill-scale-ink}"
    textColor: "{colors.field-white}"
    rounded: "{rounded.panel}"
    padding: "0 24px"
    height: "54px"
  button-outline:
    backgroundColor: "{colors.tag-stock}"
    textColor: "{colors.mill-scale-ink}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  button-ghost:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    height: "40px"
  chip-category:
    backgroundColor: "{colors.tag-stock}"
    textColor: "{colors.mill-scale-ink}"
    rounded: "{rounded.chip}"
    padding: "0 14px 0 10px"
    height: "40px"
  chip-category-selected:
    backgroundColor: "{colors.tag-yellow}"
    textColor: "{colors.mill-scale-ink}"
  panel:
    backgroundColor: "{colors.tag-stock}"
    textColor: "{colors.mill-scale-ink}"
    rounded: "{rounded.panel}"
    padding: "24px"
  horizon-tag:
    backgroundColor: "{colors.tag-stock}"
    textColor: "{colors.temper-bronze}"
    rounded: "{rounded.panel}"
    padding: "18px 20px 20px"
  horizon-tag-active:
    backgroundColor: "{colors.tag-yellow}"
    textColor: "{colors.mill-scale-ink}"
  input-field:
    backgroundColor: "{colors.field-white}"
    textColor: "{colors.mill-scale-ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "46px"
  nav-item:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "44px"
  nav-item-active:
    backgroundColor: "{colors.tag-yellow}"
    textColor: "{colors.mill-scale-ink}"
  demo-stamp:
    textColor: "{colors.stamp-red}"
    rounded: "{rounded.stamp}"
    padding: "1px 12px 0"
---

# Design System: THAI TAY

## Overview

**Creative North Star: "The Rebar Mill Tag"**

THAI TAY reads like the steel tag wired to a bundle of rebar at the mill: a yellow field with stamped boxes for material, code, unit and price, hung on a wire through a punched grommet, standing on a galvanized-zinc yard. The landing is that tag seen up close, at full commitment: one yellow tag up to 1200px wide whose fields hold the working material picker, the latest measured price and three stamped forecast months. It turns over to show where the numbers come from. The workspace keeps the same world in a quieter register. Zinc ground, white tag-stock panels, tag-yellow for whatever is selected, stamped numerals for every figure. Nothing in the workspace performs.

Color carries meaning, not decoration. Mill-scale blue is the only ink; black never appears. Tag yellow is the brand field, the primary action and the selection state. Temper blue always means a measured price, and temper bronze always means a forecast or a range. Rust and verdigris mean up and down. Stamp red appears only on the demo-data stamp. Nine bar-end paint codes tell the structural categories apart, and each code always sits next to the category's name.

The pages are dense enough for a quantity surveyor and plain enough for a homeowner. Thai text gets generous line-height (1.6 to 1.75 for body text) so upper and lower vowel marks have room. Motion is limited to three things: the tag flip, a short settle on stamped numbers when the material changes, and hover feedback. Nothing moves on its own.

**Key Characteristics:**
- Galvanized-zinc ground, white tag-stock panels, mill-scale blue ink; never black.
- Tag yellow means brand, primary action and selection, and nothing else.
- Blue for measured, bronze for forecast: a fixed data code across every surface.
- Chakra Petch for display and all numerals (tabular); Bai Jamjuree for Thai body text.
- Punched holes only on real tags; one container level in the workspace.
- Signature: the landing tag on its wire, with stamped field boxes, a red inspector stamp and a 3D flip to its provenance face.

## Colors

Cool zinc neutrals under one committed yellow, with blue-ink text and a small, strictly semantic set of temper colors.

### Primary
- **Tag Yellow** (tag-yellow): the landing tag face, the closing band, the default button, the active sidebar item, selected chips, selected horizon tags and when-options, the grand total row, text selection. Text on it is always mill-scale ink.
- **Tag Yellow Pressed** (tag-yellow-hover): hover on yellow buttons; border of a selected catalog row.
- **Tag Tint** (tag-tint): background of a selected catalog row and of warning hints. This is a softer form of selection, used where full yellow would be too loud.
- **Write-in Box** (write-in-box): the material picker's trigger when it is set into the landing tag. It reads as a pale box to write in on the yellow stock.

### Secondary
- **Temper Blue** (temper-blue): measured prices (latest price on the tag, measured stats, the actual line on charts), links, focus rings, caret and checkbox accent. Also paint code STR-02.
- **Temper Blue Tint** (temper-blue-tint): the 3px focus halo around inputs.

### Tertiary
- **Temper Bronze** (temper-bronze): forecast numbers and the dashed forecast line in the workspace.
- **Bronze Band** (temper-bronze-band): the forecast low–high range band on charts.
- **Bronze on Tag** (bronze-on-tag): the same forecast code darkened to read on tag yellow (5.6:1). Use it for forecast figures and ranges on any yellow surface.
- **Rust Up / Verdigris Down** (rust-up, verdigris-down, with their tints): price direction in delta chips and trend text. Rust also serves as the destructive role.
- **Stamp Red** (stamp-red): the demo-data stamp and the demo status dot only.

### Neutral
- **Zinc Ground** (zinc-ground): the page ground everywhere, and the fill of punched holes.
- **Zinc Sunken** (zinc-sunken): sidebar, landing footer, segmented-control tracks, subtle tags.
- **Zinc 50** (zinc-50): the accent hover role and the splash gradient center.
- **Tag Stock** (tag-stock): panels, cards, the material tag, horizon tags, chips at rest.
- **Field White** (field-white): input wells, catalog rows, when-options and hover on stock surfaces. It is the one step brighter than tag stock.
- **Line / Line Strong / Input Edge** (line, line-strong, input-edge): dividers and panel borders; hover borders and scrollbars; input strokes.
- **Mill-scale Ink** (mill-scale-ink): all headings and body text, the primary action on the yellow tag, active segmented tabs and active quantity chips.
- **Ink 2 / Ink 3** (ink-2, ink-3): secondary copy and labels; tertiary meta, units and placeholders.

### Paint Codes
Nine bar-end paint colors (paint-str-01 to paint-str-09) mark the categories STR-01 to STR-09. They appear only inside the PaintDot glyph and the bundle-dot clusters, always beside the category name.

### Named Rules
**The Mill-Scale Ink Rule.** Black is never used: no text, fill, overlay or theme. The darkest value anywhere is mill-scale ink, and shadows and scrims are ink at reduced alpha.

**The Temper Code Rule.** Blue means measured and bronze means forecast, on every surface. On tag yellow, forecasts switch to bronze-on-tag, never to plain bronze. Never swap the two colors, and never use either one for decoration.

**The One Yellow Rule.** Tag yellow is the brand field, the primary action and the selection, and nothing else. A yellow element is either the tag, the thing to press or the thing chosen.

## Typography

**Display Font:** Chakra Petch (with Bai Jamjuree, sans-serif), weights 500/600/700
**Body Font:** Bai Jamjuree (with system-ui, sans-serif), weights 400/500/600
Both are self-hosted through @fontsource, with no runtime font requests.

**Character:** Chakra Petch's squared, cut-steel letterforms read as stamped metal and carry every heading and number. Bai Jamjuree is a calm Thai-first sans for reading.

### Hierarchy
- **Display** (700, clamp(34px, 4.7vw, 66px), 1.2): the landing tag headline only, set in two stamped lines; it drops to clamp(27px, 8.4vw, 34px) on phones.
- **Headline** (700, clamp(28px, 3.3vw, 44px), 1.2): landing section heads and the tag's back-face heading.
- **Page Title** (600, 30px, 1.35): workspace page h1; 25px on phones.
- **Title** (600, 17–21px, 1.45–1.5): panel and section headings in the workspace.
- **Stamped** (700, 22px, 1.3, .02em, tabular): numbers and codes on the tag. Big prices use clamp(24px, 2.6vw, 34px), and MOC codes use 19px with .07em tracking. Workspace figures (26–34px, 600–700) use the same family with tabular numerals.
- **Body** (400, 15px, 1.6): the default; long workspace copy runs at 1.75 with a 72ch cap.
- **Body Lead** (400, 17px, 1.7): landing intros and section ledes, capped at 52–62ch.
- **Label** (500, 13px): field labels, stat captions, units. Sentence case and never uppercase; Thai has no case.

### Named Rules
**The Stamped Numeral Rule.** Every price, quantity, code and count is set in Chakra Petch with tabular numerals. Body text never carries a number the user is meant to compare.

**The Vowel Room Rule.** Thai body copy never goes below 1.5 line-height, and display type never below 1.2. Don't use clipped or gradient text.

## Layout

The landing is a centered stage: the tag fills up to 1200px of width (`min(1200px, 100%)`) and hangs 64px below the top edge on a wire that runs off the viewport. Sections below the tag share the same 1200px measure, separated by 88px (64px on phones). Landing section heads are a two-column grid, with the heading on the left and the lede bottom-aligned on the right; they stack below 1000px. The tag's field grid has 12 columns: material 6, code 4, unit 2, then four prices of 3 each. It collapses to 6 columns at 1000px and stacks on phones (560px), where the wire shortens and the grommet shrinks.

The workspace is a fixed 248px sidebar plus a main column with a 64px sticky blurred topbar and content capped at 1320px (padding 28px 32px). Pages are a single grid with 20px gaps. The catalog uses a 1fr + 300px sticky selection rail, and the cost calculator two near-equal columns. Breakpoints: 1100px (sidebar becomes a drawer, cost columns stack), 1000px, 800px, 760px, 620px (phone padding 16–20px, safe-area insets), 520px.

Spacing rhythm is 8 / 14 / 20 / 24 / 32, with 88px between landing sections. Touch targets are at least 44px on coarse pointers.

## Elevation & Depth

Mostly flat, with tonal layering: zinc ground, then sunken zinc, then tag stock, then field white. Shadows are soft, ink-tinted and few. The only strong shadow is the landing tag's hanging drop, which sells a physical object on a wire. In the workspace, depth means one shallow panel shadow, and a deeper lift appears only on what is selected or primary.

### Shadow Vocabulary
- **Panel** (`box-shadow: 0 1px 2px rgba(27, 44, 62, .06), 0 2px 8px -4px rgba(27, 44, 62, .08)`): cards, the material tag, horizon tags, source links.
- **Lift** (`box-shadow: 0 14px 32px -16px rgba(27, 44, 62, .35)`): the active horizon tag and the landing closing band.
- **Hanging Tag** (`box-shadow: 0 34px 60px -34px rgba(27, 44, 62, .6), 0 10px 22px -14px rgba(27, 44, 62, .35)`): the landing tag faces only.
- **Ink Press** (`box-shadow: 0 12px 22px -14px rgba(27, 44, 62, .8)`): the ink primary button on the tag.
- **Popover** (`box-shadow: 0 24px 60px -18px rgba(27, 44, 62, .45)`): the material picker popover.

### Named Rules
**The One Container Rule.** The workspace has one container level. Panels never nest inside panels; inside a panel, grouping uses hairline rules, dashed rules or a tonal well (zinc ground behind the numbers).

**The Ink Shadow Rule.** Every shadow and scrim is mill-scale ink at alpha. Never use black and never use a hard offset.

## Shapes

Shapes are softly rounded rectangles, like stamped steel tags. Controls use 10px corners, panels and horizon tags 12px, the landing field grid 13px, the closing band 20px and the big tag 22px (16px on phones). Chips and pills are fully round (999px), and stamp boxes use 6–8px. Fields on the tag are separated by 1.5px ink-alpha rules (rgba(27, 44, 62, .55)) drawn as inset shadows, so the boxes read as printed on the tag. Dashed borders mean two things only: the flip control, and the edge of empty or provenance areas. Real tags carry a punched hole. On the landing tag it is a drawn steel grommet with a wire. On workspace tags (the material tag and the forecast horizon tags) it is an 11px hole at the top-right corner, filled with zinc ground and ringed in line-strong.

**The Punched Hole Rule.** Only real tags get a hole: the landing tag, the selected-material tag and the forecast horizon tags. Plain panels never get one, so a static panel never looks like a selectable tag.

## Components

### Buttons
Buttons are firm and plain, with no gradients.
- **Shape:** gently rounded (10px; 12px for the large tag buttons).
- **Primary (workspace):** tag yellow with ink text, semibold, 40px high, with a 1px ink hairline drop. Hover goes to tag-yellow-hover.
- **Primary on tag:** mill-scale ink with white text, 54px high, 0 24px padding, ink-press shadow. Hover lightens to #26405a and lifts by 1px. Use it wherever the primary action sits on yellow (the landing tag and the closing band).
- **Flip / secondary on tag:** transparent with a 1.5px dashed ink border, 50px high. Hover is an 8% ink wash.
- **Workspace link on tag:** 1.5px solid ink outline. Hover inverts to an ink fill with yellow text.
- **Outline:** tag stock with an input-edge border. Hover shows a zinc-50 fill and a line-strong border.
- **Ghost:** ink-2 text, with a zinc-50 fill on hover.
- **Focus:** 2px temper-blue outline with a 2px offset, on every interactive element.

### Chips
- **Category chip:** tag stock, 1px line border, fully round, 40px high, with bundle dots and a Chakra Petch count. **Selected** gets a tag-yellow fill and an ink border.
- **Quantity / adjustment chips:** white, round, 36px. **Active** is an ink fill with white text, the segmented-choice language shared with the month tabs.
- **Delta chip:** a rust or verdigris tint with text in the matching color.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** tag stock on zinc ground.
- **Shadow Strategy:** panel shadow (see Elevation & Depth).
- **Border:** 1px line.
- **Internal Padding:** 24px (18px 16px on phones).

### Inputs / Fields
- **Style:** field-white well, 1px input-edge stroke, 10px corners, 46–50px high. Quantities are entered in 24px Chakra Petch, right-aligned.
- **Focus:** the border turns temper blue and gets a 3px temper-blue-tint halo.
- **Material picker:** a 74px trigger with a yellow icon tile, the name in two lines and the code, category and unit as meta. Its popover is a 14px-radius tag-stock sheet with an ink-tinted popover shadow. Set into the landing tag, the trigger becomes a write-in box with a 1.5px ink border and an ink icon tile showing a yellow glyph.

### Navigation
- **Sidebar:** sunken zinc, 248px. Items are 44px with 10px corners and ink-2 text. Hover is tag stock; active is a tag-yellow fill with semibold ink text. Below 1100px it becomes an off-canvas drawer with an ink-alpha scrim.
- **Topbar:** 64px, zinc ground at 90% with a 12px backdrop blur, a breadcrumb, and a search trigger shaped like a field.
- **Landing:** the tag's own header strip holds the mark, the anchor links and an outlined workspace button, above a stamped 1.5px rule.

### Landing Tag (signature)
A yellow tag (22px corners, hanging shadow) hangs on a two-tone steel wire through a drawn grommet at its upper left. Its header strip sits above a printed 12-column field grid, with the latest price in temper blue on a 34% white wash and forecasts in bronze-on-tag. A red inspector stamp, rotated −6° with multiply blending, marks demo data. The tag flips over 0.8s with `cubic-bezier(.2, .75, .2, 1)`. It is 3D only while turning or turned, so at rest the front face stays flat and the picker's popover anchors correctly. With reduced motion, the faces crossfade over 0.2s. Stamped prices settle in over 0.28s (fading up from 4px above) when the material changes.

### Forecast Horizon Tags
Horizon tags are tag-stock panels with a punched hole, showing the forecast price at 34px in temper bronze plus its range note. The active tag turns tag yellow with an ink border and the lift shadow, its figure becomes ink, and the hole's ring adjusts to the yellow.

### Demo Stamp
The demo stamp is a stamp-red bordered box (2–3px, 6–8px corners) with red Chakra Petch text, rotated a few degrees. It appears wherever prices are synthetic and marks them as demo data. It is the only use of stamp red besides the status dot.

### Paint Dot
The paint dot is the cut end of a painted bar: a disc in the category's paint code, with a pale inner ring, crossed by a grey rib. It is always decorative, with the category name beside it. Bundle dots group three to nine of these as a small cluster.

### Brand Mark
The brand mark is the THAI TAY wordmark (Chakra Petch 700, 21px, .02em) plus a placeholder tag glyph. The glyph is a stand-in: the owner will replace it in brand-mark.tsx, and nothing else may depend on its shape.

## Do's and Don'ts

### Do:
- **Do** set every text, icon and dark fill in mill-scale ink, and build shadows and scrims from ink at alpha.
- **Do** keep tag yellow for the brand field, the primary action and the current selection.
- **Do** show measured prices in temper blue and forecasts in temper bronze, switching to bronze-on-tag on yellow.
- **Do** give every forecast its low–high range, and stamp synthetic prices with the red demo stamp.
- **Do** set numbers and codes in Chakra Petch with tabular numerals, and give Thai copy at least 1.5 line-height.
- **Do** put a punched hole on real tags (the landing tag's grommet, the material tag, forecast horizon tags) and keep plain panels unpunched.
- **Do** show a paint code only beside its category name.
- **Do** keep the landing flip 3D only while turning, and crossfade under reduced motion.

### Don't:
- **Don't** use black anywhere, and don't ship a black or dark theme.
- **Don't** nest a card inside a card in the workspace; group with rules or a tonal well instead.
- **Don't** put a kicker or eyebrow line above a heading.
- **Don't** punch a hole in a plain panel or a static container.
- **Don't** use temper blue or bronze decoratively, or swap their meanings.
- **Don't** use stamp red for anything except the demo stamp and the demo status dot.
- **Don't** fall back to the category defaults the world refused: skyscraper-photo heroes, navy-and-orange feature cards, hazard stripes.
- **Don't** build anything that depends on the placeholder logo glyph's shape.
