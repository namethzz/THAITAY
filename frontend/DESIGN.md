---
name: THAI TAY
description: Structural material prices and 1–3 month forecasts, stamped on an orange rebar mill tag under the THAI TAY CONSTRUCT brand.
colors:
  warm-white: "#f3f0ea"
  panel: "#fcfbf8"
  warm-50: "#f8f6f1"
  field-white: "#ffffff"
  sunken: "#e9e4da"
  line: "#dcd6cb"
  concrete-gray: "#747d80"
  charcoal: "#242a2d"
  ink-2: "#474e51"
  ink-3: "#5a6266"
  brand-orange: "#e8753b"
  orange-hover: "#f08a55"
  orange-tint: "#fbe3d4"
  forecast-orange: "#a84b1a"
  forecast-band: "rgba(232, 117, 59, .18)"
  focus-tint: "rgba(232, 117, 59, .22)"
  up-crimson: "#9e1b3c"
  up-tint: "#f7dbe3"
  down-green: "#2f6f55"
  down-tint: "#dcede4"
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
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "clamp(34px, 4.7vw, 66px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.005em"
  headline:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "clamp(28px, 3.3vw, 44px)"
    fontWeight: 700
    lineHeight: 1.2
  page-title:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.35
  title:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.5
  stamped:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: ".02em"
    fontFeature: "tnum"
  body:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  body-lead:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.6
  wordmark:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: ".01em"
  wordmark-sub:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "9.5px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: ".42em"
rounded:
  hairline: "2px"
  code: "6px"
  stamp: "8px"
  nav-button: "9px"
  control: "10px"
  inner-field: "11px"
  panel: "12px"
  field-grid: "13px"
  popover: "14px"
  sheet: "16px"
  closing-band: "20px"
  big-tag: "22px"
  chip: "999px"
spacing:
  xs: "8px"
  sm: "14px"
  md: "20px"
  lg: "24px"
  xl: "32px"
  section: "88px"
components:
  button-primary:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.orange-hover}"
  button-on-tag:
    backgroundColor: "{colors.charcoal}"
    textColor: "{colors.field-white}"
    rounded: "{rounded.panel}"
    padding: "0 24px"
    height: "54px"
  button-outline:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  button-ghost:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    height: "40px"
  chip-category:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.chip}"
    padding: "0 14px 0 10px"
    height: "40px"
  chip-category-selected:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.charcoal}"
  segmented-active:
    backgroundColor: "{colors.charcoal}"
    textColor: "{colors.field-white}"
    rounded: "{rounded.stamp}"
    height: "36px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.panel}"
    padding: "24px"
  horizon-tag:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.forecast-orange}"
    rounded: "{rounded.panel}"
    padding: "18px 20px 20px"
  horizon-tag-active:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.charcoal}"
  input-field:
    backgroundColor: "{colors.field-white}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "46px"
  nav-item:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "44px"
  nav-item-active:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.charcoal}"
  demo-stamp:
    textColor: "{colors.stamp-red}"
    rounded: "{rounded.code}"
    padding: "3px 10px 2px"
  demo-stamp-on-tag:
    textColor: "{colors.charcoal}"
    rounded: "{rounded.stamp}"
    padding: "1px 12px 0"
---

# Design System: THAI TAY

## Overview

**Creative North Star: "The Rebar Mill Tag"**

THAI TAY reads like the tag wired to a bundle of rebar at the mill. In the owner's THAI TAY CONSTRUCT colors it is an orange field with stamped boxes for material, code, unit and price, hung on a steel wire through a punched grommet over a warm-white yard. The landing shows that tag up close and at full commitment. One orange tag, up to 1200px wide, holds the working material picker, the latest measured price and three stamped forecast months, and it turns over to show where the numbers come from. The workspace keeps the same world in a quieter register: warm-white ground, near-white panels, orange for whatever is selected or pressed, and stamped Prompt numerals for every figure. Nothing in the workspace performs.

The palette comes from the owner's brand board, and every color has a job. Charcoal is the ink and the small solid controls; it is never a page. Concrete gray belongs to the logo, strong rules, the flow rail and control edges. Brand orange is the tag, the primary action and the selection, and only charcoal text sits on it. A fixed data code runs across every surface: charcoal for measured prices, dark orange for forecasts, crimson and green for up and down, and stamp red for demo data. Nine bar-end paint codes tell the structural categories apart, and each one always sits beside the category's name.

The pages are dense enough for a quantity surveyor and plain enough for a homeowner. Thai text gets generous line-height (1.6 to 1.75 in body copy) so upper and lower vowel marks have room. Motion is limited to the tag flip, a short settle on stamped numbers when the material changes, and hover feedback. Nothing moves on its own.

**Key Characteristics:**
- Light theme only: warm-white ground, charcoal ink, no dark pages.
- Brand orange means the tag, the primary action and the selection, and it carries charcoal text only.
- A fixed data code: measured prices in charcoal, forecasts in dark orange, brand orange only on the range band.
- Prompt for display, numerals and body, matching the logo's geometric wordmark.
- The owner's building mark sits only on warm white.
- Punched holes only on real tags; one container level in the workspace.
- Signature: the landing tag on its wire, with stamped field boxes, an inspector stamp and a 3D flip to its provenance face.

## Colors

The four brand colors from the owner's board do the work, with warm neutrals stepped between them and a small, strictly semantic data code.

### Primary
- **Brand Orange** (brand-orange): the landing tag face, the closing band, the default button, the active sidebar item, selected chips, selected horizon tags and when-options, the grand-total row, the flow-rail step tiles, text selection, checkbox accent and caret. Text on it is always charcoal (4.9:1). White on orange fails at 2.98:1, and secondary inks are remapped to charcoal on the tag, so hierarchy there comes from size and weight.
- **Orange Hover** (orange-hover): hover on orange buttons, and the border of a selected catalog row.
- **Orange Tint** (orange-tint): background of a selected catalog row or picker item, and of warning hints. It is the quieter form of selection.

### Secondary
- **Charcoal** (charcoal): all headings and body text, measured prices (on the tag, in stats, and as the actual line on charts), the primary action when it sits on orange, active segmented tabs and quantity chips, numbered step tiles, focus outlines, and the 1.5px edge on selected orange elements. Shadows and scrims are charcoal at reduced alpha.
- **Concrete Gray** (concrete-gray): the logo's gray, the CONSTRUCT sub-wordmark, strong rules, hover borders, the landing flow rail, scrollbars, input strokes (the `--input` role) and every control edge. It reaches 4.07:1 on panels and about 3.7:1 on the ground, so it never carries small text. The CONSTRUCT line is the one exception, because it is part of the logo lockup.

### Tertiary
- **Forecast Orange** (forecast-orange): every forecast figure, the forecast chart line and points, and the legend dash (5.5:1). It is the data form of the brand orange.
- **Forecast Band** (forecast-band): the low–high range band on charts. This is the only place brand orange appears inside a chart.
- **Focus Tint** (focus-tint): the 3px halo around a focused input or open picker, paired with a charcoal border.
- **Up Crimson / Down Green** (up-crimson on up-tint, down-green on down-tint): price direction in delta chips and trend text. Crimson is kept well apart from the forecast's dark orange, and it also serves as the destructive role.
- **Stamp Red** (stamp-red): the demo-data stamp on light surfaces and the demo status dot only. Where the stamp sits on the orange tag, it switches to charcoal ink.

### Neutral
- **Warm White** (warm-white): the brand ground. It is the page, sidebar, topbar (at 90% with blur), landing footer and splash, the fill of punched holes, the tonal well behind grouped numbers, the latest-price field on the tag, and the label the logo sits on inside the tag.
- **Panel** (panel): cards, the material tag, horizon tags, chips at rest, popovers and chart tooltips.
- **Warm 50** (warm-50): the accent hover role (outline and ghost buttons, quantity steppers).
- **Field White** (field-white): input wells, the picker trigger, catalog rows, when-options and hover on panel surfaces. It is one step brighter than panel.
- **Sunken** (sunken): segmented-control tracks, subtle tags, code chips and sidebar hover.
- **Line** (line): hairline dividers, panel borders and chart grid.
- **Ink 2 / Ink 3** (ink-2, ink-3): secondary copy and labels; tertiary meta, units, placeholders and chart ticks.

### Paint Codes
Nine bar-end paint colors (paint-str-01 to paint-str-09) mark the categories STR-01 to STR-09. They appear only inside the PaintDot glyph and the bundle-dot clusters, always beside the category name. Unknown codes fall back to #9aa6b0.

### Drawn Steel
The landing grommet and wire are drawn in cool steel grays (#c9d1d7, #8d99a4, #5f6c77 on the grommet; #6c7984 and #a9b3bb on the two wire strands). The PaintDot rib is #8a8f90. These are illustration colors for metal objects only and are never used as UI colors.

### Named Rules
**The No Dark Page Rule.** The site is light only, as the owner requires. Charcoal is ink and small solid controls (a button, a tab, a step tile), and never a page, panel or theme. Black is never used.

**The Charcoal on Orange Rule.** Every piece of text, every icon and every stamp on brand orange is charcoal. Secondary and tertiary inks collapse to charcoal on the tag. White text never goes on orange.

**The Data Code Rule.** Measured prices are charcoal and forecasts are dark orange, on every surface. Brand orange in a chart means the range band and nothing else. On the orange tag, forecast figures are charcoal and are told apart by field position, not by color. Never use crimson or green for anything but direction.

**The Concrete Edge Rule.** Concrete gray draws edges, rules and the rail, and it never sets reading text.

## Typography

**Display, Body and Numeral Font:** Prompt (with system-ui, sans-serif), weights 400/500/600/700, self-hosted through @fontsource with no runtime font requests.

**Character:** Prompt's geometric, round-shouldered letterforms match the logo's wordmark. Prompt carries the stamped headline, the tabular numerals and the Thai body copy, so the brand reads as one hand from logo to price.

### Hierarchy
- **Display** (700, clamp(34px, 4.7vw, 66px), 1.2, −.005em): the landing tag headline only, set in two stamped lines; it drops to clamp(27px, 8.4vw, 34px) on phones.
- **Headline** (700, clamp(28px, 3.3vw, 44px), 1.2): landing section heads. The tag's back-face heading uses clamp(26px, 3.2vw, 42px) at 1.25, and the closing band uses clamp(20px, 2.3vw, 28px) at 1.35.
- **Page Title** (600, 30px, 1.35): workspace page h1; 25px on phones.
- **Title** (600, 17–23px, 1.35–1.5): panel and section headings in the workspace (19px panels, 21px section heads, 17–18px step and group heads), and landing flow (22px) and audience (23px) heads.
- **Stamped** (700, 22px, 1.3, .02em, tabular): numbers and codes on the tag. Big prices use clamp(24px, 2.6vw, 34px), and MOC codes 19px with .07em tracking. Workspace figures (24–34px, 600–700) use the same tabular numerals.
- **Body** (400, 15px, 1.6): the default. Long workspace copy runs at 1.75 with a 72ch cap.
- **Body Lead** (400, 17px, 1.7): landing intros and section ledes, capped at 52–62ch.
- **Label** (500, 13px): field labels, stat captions and units, with 12px meta below. Sentence case and never uppercase; Thai has no case.
- **Wordmark** (700, 21px, .01em) over **CONSTRUCT** (500, 9.5px, .42em, concrete gray): the live-text lockup beside the mark.

Font-size steps in use: 9.5, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 30 and 34px, plus the fluid steps clamp(13px, 1.6vw, 15px), clamp(19px, 2.4vw, 24px), clamp(20px, 2.3vw, 28px), clamp(24px, 2.6vw, 34px), clamp(26px, 3.2vw, 42px), clamp(27px, 8.4vw, 34px), clamp(28px, 3.3vw, 44px) and clamp(34px, 4.7vw, 66px).

### Named Rules
**The Stamped Numeral Rule.** Every price, quantity, code and count is set with tabular numerals (the `.num` and stamped styles). Body text never carries a number the user is meant to compare.

**The Vowel Room Rule.** Thai body copy never goes below 1.5 line-height, and display type never below 1.2. Don't use clipped or gradient text.

## Layout

The landing is a centered stage. The tag fills up to 1200px of width (`min(1200px, 100%)`) and hangs 64px below the top edge on a wire that runs off the viewport into a grommet at the header's left. Sections below the tag share the same 1200px measure, 88px apart (64px on phones). Landing section heads are a two-column grid, with the heading on the left and the lede bottom-aligned on the right; they stack below 1000px. The tag's field grid has 12 columns: material 6, code 4, unit 2, then four prices of 3 each. It collapses to 6 columns at 1000px and stacks on phones (560px), where the wire shortens and the grommet shrinks.

The workspace is a fixed 248px warm-white sidebar beside a main column. The main column has a 64px sticky blurred topbar and content capped at 1320px (padding 28px 32px). Pages are a single grid with 20px gaps. The catalog uses a 1fr column plus a 300px sticky selection rail, and the cost calculator uses two near-equal columns. Breakpoints are 1100px (the sidebar becomes a drawer and the cost columns stack), 1000px, 800px, 760px, 620px (phone padding 16–20px, with safe-area insets), 560px and 520px.

The spacing rhythm is 8 / 14 / 20 / 24 / 32, with 88px between landing sections. Touch targets are at least 44px on coarse pointers.

## Elevation & Depth

The system is mostly flat, with tonal layering: warm-white ground, then panel, then field white, with sunken wells below. Shadows are soft, charcoal-tinted and few. The only strong shadow is the landing tag's hanging drop, which sells a physical object on a wire. In the workspace, depth means one shallow panel shadow, and a deeper lift appears only on what is selected or primary.

### Shadow Vocabulary
- **Panel** (`box-shadow: 0 1px 2px rgba(36, 42, 45, .06), 0 2px 8px -4px rgba(36, 42, 45, .08)`): cards, the material tag, horizon tags, source links.
- **Lift** (`box-shadow: 0 14px 32px -16px rgba(36, 42, 45, .35)`): the active horizon tag and the landing closing band.
- **Hanging Tag** (`box-shadow: 0 34px 60px -34px rgba(36, 42, 45, .6), 0 10px 22px -14px rgba(36, 42, 45, .35)`): the landing tag faces only.
- **Ink Press** (`box-shadow: 0 12px 22px -14px rgba(36, 42, 45, .8)`): the charcoal primary button on the tag.
- **Popover** (`box-shadow: 0 24px 60px -18px rgba(36, 42, 45, .45)`): the material picker popover.
- **Hairline Drop** (`box-shadow: 0 1px 0 rgba(36, 42, 45, .14–.3)`): a 1px seat under the orange button, the active nav item and the logo label on the tag.
- **Drawer** (`box-shadow: 18px 0 50px rgba(36, 42, 45, .18)`): the mobile sidebar.

### Named Rules
**The One Container Rule.** The workspace has one container level. Panels never nest inside panels. Inside a panel, grouping uses hairline rules, dashed rules or a tonal well (warm white behind the numbers).

**The Charcoal Shadow Rule.** Every shadow and scrim is charcoal at alpha. Never use black and never use a hard offset block shadow.

## Shapes

Shapes are softly rounded rectangles, like stamped steel tags. Controls use 10px corners, panels and horizon tags 12px, the landing field grid 13px, the picker popover 14px, the bundle grid and phone sheets 16px, the closing band 20px, and the big tag 22px (16px on phones). Chips and pills are fully round (999px), stamps and step tiles use 6–8px, and punched holes, dots and select indicators are circles (50%). The full radius steps in use are 2, 6, 8, 9, 10, 11, 12, 13, 14, 16, 20 and 22px, plus 50% and 999px.

Fields on the tag are separated by 1.5px charcoal-alpha rules (rgba(36, 42, 45, .6)) drawn as inset shadows, so the boxes read as printed on the tag. Dashed borders mean three things only: the flip control, the edge of empty states, and the provenance trace rules.

**The Punched Hole Rule.** Only real tags get a hole: the landing tag (a drawn steel grommet with its wire), the selected-material tag and the forecast horizon tags (an 11px hole at the top-right corner, filled with warm white and ringed in concrete gray). Plain panels never get one, so a static panel never looks like a selectable tag.

## Components

### Brand Mark
The lockup pairs the owner's building mark (`public/brand/thai-tay-mark.png`, 40px high, 28px on phones, 72px on the splash) with the wordmark set as live Prompt text: THAI TAY over CONSTRUCT. The mark's light facade is the same warm white as its opaque ground, so the mark sits only on warm white: the page ground, sidebar, footer and splash, or a warm-white label (10px corners, hairline drop) set into the orange tag. The favicons and apple-touch icon are the dark rounded tile from the board, used only as app icons.

### Buttons
Buttons are firm and plain, with no gradients.
- **Shape:** gently rounded (10px; 12px for the large tag buttons).
- **Primary (workspace):** brand orange with semibold charcoal text, 40px high, with a 1px charcoal hairline drop. Hover goes to orange-hover.
- **Primary on orange:** charcoal with white text, 54px high, 0 24px padding, ink-press shadow. Hover lightens to #3a4246 and lifts by 1px. Use it wherever the primary action sits on orange (the landing tag and the closing band).
- **Flip / secondary on tag:** transparent with a 1.5px dashed charcoal border, 50px high. Hover is an 8% charcoal wash.
- **Workspace link on tag:** 1.5px solid charcoal outline. Hover inverts to a charcoal fill with orange text.
- **Outline:** panel fill with a concrete-gray edge. Hover shows a warm-50 fill.
- **Ghost:** ink-2 text, with a warm-50 fill on hover.
- **Text link:** charcoal text with a 1.5px orange underline at a 3–5px offset; on hover the underline thickens to 3px.
- **Focus:** a 2px charcoal outline with a 2px offset on every interactive element.

### Chips
- **Category chip:** panel fill, 1px line border, fully round, 40px high, with bundle dots and a tabular count. **Selected** gets a brand-orange fill and a charcoal border.
- **Quantity / adjustment chips:** white, round, 36px. **Active** is a charcoal fill with white text, the segmented-choice language shared with the month tabs.
- **Delta chip:** a crimson or green tint with text in the matching color.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** panel on warm-white ground.
- **Shadow Strategy:** panel shadow (see Elevation & Depth).
- **Border:** 1px line.
- **Internal Padding:** 24px (18px 16px on phones).

### Inputs / Fields
- **Style:** a field-white well with a 1px concrete-gray stroke, 10px corners, 46–50px high. Quantities are entered in 24px tabular Prompt, right-aligned.
- **Focus:** the border turns charcoal and gets a 3px focus-tint halo.
- **Material picker:** a 74px trigger with an orange icon tile, the name in two lines, and the code, category and unit as meta. Its popover is a 14px-radius panel sheet with a concrete edge and the popover shadow; the selected item is orange tint. Set into the landing tag, the trigger becomes a white write-in box with a 1.5px charcoal border, and its icon tile turns charcoal with an orange glyph.

### Navigation
- **Sidebar:** warm white, 248px, with the lockup at the top. Items are 44px with 10px corners and ink-2 text. Hover is sunken; active is a brand-orange fill with semibold charcoal text. Below 1100px the sidebar becomes an off-canvas drawer with a charcoal-alpha scrim.
- **Topbar:** 64px, warm white at 90% with a 12px backdrop blur, a breadcrumb, and a search trigger shaped like a field.
- **Landing:** the tag's own header strip holds the logo label, the anchor links and an outlined workspace button, above a stamped 1.5px rule.

### Landing Tag (signature)
An orange tag (22px corners, hanging shadow) hangs on a two-tone steel wire through a drawn grommet at its upper left. Its header strip sits above a printed 12-column field grid. The latest price prints in charcoal on a warm-white field; forecast prices print in charcoal on the orange with their low–high ranges. A charcoal inspector stamp, rotated −6° with multiply blending, marks demo data. The tag flips over 0.8s with `cubic-bezier(.2, .75, .2, 1)` to the provenance face (data → model → range). It is 3D only while turning or turned, so at rest the front face stays flat and the picker's popover anchors correctly. With reduced motion, the faces crossfade over 0.2s. Stamped prices settle in over 0.28s (fading up from 4px above) when the material changes.

### Flow Rail
The landing's three steps sit on a 2px concrete-gray rail (vertical below 800px). Each step is numbered on a 40px orange tile with a 1.5px charcoal border and 10px corners, and links out with an orange-underlined text action.

### Forecast Horizon Tags
Horizon tags are panel cards with a punched hole, showing the forecast price at 34px in forecast orange plus its range note. The active tag turns brand orange with a charcoal border and the lift shadow, its figure and notes become charcoal, and the hole's ring adjusts to the orange.

### Demo Stamp
On light surfaces the stamp is a stamp-red box (2px border, 6px corners) with red 700-weight text, rotated −3°. On the orange tag it is a charcoal box (3px border, 8px corners), rotated −6°. It appears wherever prices are synthetic.

### Paint Dot
The paint dot is the cut end of a painted bar: a disc in the category's paint code with a pale inner ring and a charcoal-alpha edge, crossed by a gray rib. It is always decorative, with the category name beside it. Bundle dots group three to nine of these into a small cluster.

## Do's and Don'ts

### Do:
- **Do** keep every page on warm white, and use charcoal only as ink and small solid controls.
- **Do** set every text, icon and stamp on brand orange in charcoal, stepping hierarchy by size and weight.
- **Do** keep brand orange for the tag, the primary action and the current selection.
- **Do** show measured prices in charcoal and forecasts in dark orange, and keep brand orange in charts for the range band only.
- **Do** give every forecast its low–high range, and stamp synthetic prices with the demo stamp (red on light surfaces, charcoal on the tag).
- **Do** draw rules, the rail and control edges in concrete gray, and keep it off reading text.
- **Do** place the building mark only on warm white, or on a warm-white label set into the tag.
- **Do** set numbers and codes with Prompt's tabular numerals, and give Thai copy at least 1.5 line-height.
- **Do** put a punched hole on real tags (the landing tag's grommet, the material tag, forecast horizon tags) and keep plain panels unpunched.
- **Do** show a paint code only beside its category name.
- **Do** keep the landing flip 3D only while turning, and crossfade under reduced motion.

### Don't:
- **Don't** ship a dark or black page, panel or theme, and don't use black anywhere.
- **Don't** put white text on brand orange (2.98:1).
- **Don't** place the mark on orange, white panels or charcoal; its facade disappears into anything but warm white.
- **Don't** set small text in concrete gray (only the CONSTRUCT line of the logo lockup).
- **Don't** nest a card inside a card in the workspace; group with rules or a tonal well instead.
- **Don't** put a kicker or eyebrow line above a heading.
- **Don't** punch a hole in a plain panel or a static container.
- **Don't** use forecast orange, crimson or green decoratively, or swap their meanings.
- **Don't** use stamp red for anything except the demo stamp and the demo status dot.
- **Don't** fall back to the category defaults the world refused: skyscraper-photo heroes, navy-and-orange feature cards, hazard stripes.
