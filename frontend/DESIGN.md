---
name: THAI TAY
description: Structural material prices now and 1–3 months ahead, in a light, search-first site in the owner's THAI TAY CONSTRUCT colours (v0.10).
colors:
  warm-white: "#f3f0ea"
  surface: "#ffffff"
  warm-50: "#f8f6f1"
  sunken: "#e9e4da"
  line: "#dcd6cb"
  concrete-gray: "#747d80"
  charcoal: "#242a2d"
  ink-2: "#474e51"
  ink-3: "#5a6266"
  brand-orange: "#e8753b"
  orange-hover: "#f08a55"
  orange-tint: "#fbe3d4"
  orange-ring: "rgba(232, 117, 59, .28)"
  forecast-orange: "#a84b1a"
  up-crimson: "#9e1b3c"
  up-tint: "#f7dbe3"
  down-green: "#2f6f55"
  down-tint: "#dcede4"
  stamp-red: "#c0301e"
  print-black: "#000000"
typography:
  display:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "clamp(34px, 6.6vw, 70px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.01em"
  headline:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "clamp(26px, 3.6vw, 40px)"
    fontWeight: 700
    lineHeight: 1.3
  page-title:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "clamp(28px, 4vw, 42px)"
    fontWeight: 700
    lineHeight: 1.25
  material-title:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "clamp(24px, 3.2vw, 34px)"
    fontWeight: 700
    lineHeight: 1.35
  title:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.4
  price-hero:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "clamp(38px, 5vw, 50px)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-.01em"
    fontFeature: "tnum"
  price-total:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "clamp(28px, 3.4vw, 36px)"
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "tnum"
  price-tile:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.3
    fontFeature: "tnum"
  body-lead:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "clamp(16px, 1.7vw, 19px)"
    fontWeight: 400
    lineHeight: 1.7
  body:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
  meta:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
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
  stamp: "6px"
  focus: "8px"
  small: "10px"
  control: "12px"
  button: "14px"
  tile: "16px"
  well: "18px"
  field: "20px"
  card-phone: "22px"
  panel: "24px"
  price-card: "26px"
  stage: "28px"
  pill: "999px"
  round: "50%"
  icon-tile: "22% / 25%"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "40px"
  section-phone: "72px"
  section: "104px"
components:
  button-primary:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.button}"
    padding: "0 22px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.orange-hover}"
  button-primary-lg:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.tile}"
    padding: "0 28px"
    height: "56px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.button}"
    padding: "0 22px"
    height: "48px"
  button-ghost:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.button}"
    height: "48px"
  button-ghost-hover:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.charcoal}"
  search-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.field}"
    padding: "0 8px 0 20px"
    height: "68px"
  search-button:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.button}"
    padding: "0 24px"
    height: "52px"
  search-field-compact:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.tile}"
    padding: "0 6px 0 16px"
    height: "52px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  chip-selected:
    backgroundColor: "{colors.charcoal}"
    textColor: "{colors.surface}"
  category-pill:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink-2}"
    typography: "{typography.meta}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  segmented-option:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.control}"
    height: "44px"
  segmented-option-selected:
    backgroundColor: "{colors.charcoal}"
    textColor: "{colors.surface}"
  price-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.price-card}"
    padding: "24px"
  price-well:
    backgroundColor: "{colors.warm-50}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.well}"
    padding: "16px 18px"
  forecast-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.forecast-orange}"
    typography: "{typography.price-tile}"
    rounded: "{rounded.tile}"
    padding: "12px"
  verdict-up:
    backgroundColor: "{colors.orange-tint}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.tile}"
    padding: "12px 14px"
  verdict-down:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.tile}"
    padding: "12px 14px"
  grand-total:
    backgroundColor: "{colors.orange-tint}"
    textColor: "{colors.charcoal}"
    typography: "{typography.price-total}"
    rounded: "{rounded.well}"
    padding: "18px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.panel}"
    padding: "24px"
  list-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.well}"
    padding: "14px 14px 14px 20px"
    height: "76px"
  step-number:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.round}"
    size: "52px"
  nav-item:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  nav-item-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.charcoal}"
  bottom-nav-fab:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.round}"
    size: "60px"
  bottom-nav-item-active:
    backgroundColor: "{colors.orange-tint}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.pill}"
    width: "56px"
    height: "32px"
  change-chip-up:
    backgroundColor: "{colors.up-tint}"
    textColor: "{colors.up-crimson}"
    rounded: "{rounded.pill}"
    padding: "1px 8px 1px 5px"
  change-chip-down:
    backgroundColor: "{colors.down-tint}"
    textColor: "{colors.down-green}"
    rounded: "{rounded.pill}"
    padding: "1px 8px 1px 5px"
  demo-stamp:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.stamp-red}"
    typography: "{typography.caption}"
    rounded: "{rounded.stamp}"
    padding: "2px 9px"
  count-badge:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.pill}"
    height: "22px"
  watch-toggle:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    typography: "{typography.meta}"
    rounded: "{rounded.pill}"
    padding: "0 12px 0 10px"
    height: "34px"
  watch-toggle-on:
    backgroundColor: "{colors.orange-tint}"
    textColor: "{colors.charcoal}"
  category-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.field}"
    padding: "12px 16px 12px 12px"
  category-card-phone:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.well}"
    padding: "8px 8px 12px"
  category-icon:
    rounded: "{rounded.icon-tile}"
    height: "72px"
  watch-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.well}"
    padding: "14px 16px"
  shared-banner:
    backgroundColor: "{colors.orange-tint}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.well}"
    padding: "16px 18px"
  meta-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.button}"
    padding: "0 14px"
    height: "48px"
---

# Design System: THAI TAY

## Overview

**Creative North Star: "The Site-Office Price Board"**

THAI TAY v0.10 works like the price board at a builder's merchant: one big question answered in one line, one place to type, and the numbers printed large. It follows the owner's own apps, AirClean and KickHub, in the owner's THAI TAY CONSTRUCT colours. A warm-white page carries a big centred Thai headline, with its second line marked by an orange-tint highlighter band. Below it sits a wide white search combobox with the orange button inside, a row of quick-pick chips, and a white price card that overlaps a construction illustration (a photo slot for later). Below the stage come the materials the user has starred (only once something is starred) and a grid of the nine categories, each with the owner's own category icon. Further down come three numbered steps and a "where prices come from" card. The site has three pages: home, search plus a per-material page, and the estimate sheet, which can be shared read-only and printed as a plain paper sheet.

The surfaces are soft and friendly but never cute. White cards with large radii (24–28px) float on warm white under long, low charcoal shadows. Orange marks the action: the search button, primary buttons, step numbers, the raised phone search button and the count badge. A choice the user has made fills charcoal. A fixed data code runs through every price: charcoal for measured prices, dark orange for forecasts, crimson and green only on the small change chips and trend arrows, and stamp red only on the demo-data label.

Prompt is the only typeface, matching the logo's geometric wordmark. Thai text gets generous line-height (body 1.65, display 1.2) so upper and lower vowel marks have room. Motion is limited to short colour and border transitions (.15s), a 1px press, and the toast rising in. Nothing moves on its own.

**Key Characteristics:**
- Light theme only: a warm-white ground, white cards, charcoal ink, no dark pages.
- Search first: a 68px combobox with the orange button inside, with prices shown in the dropdown rows.
- Big tabular prices: the latest price at up to 50px in charcoal, forecasts in dark orange.
- Orange means action and only takes charcoal text; a selected choice is charcoal with white text.
- Large soft radii that grow with the container: 12–14px controls, 16–18px tiles and wells, 24–28px cards.
- A top nav on desktop, and on phones a 3-button bottom nav with a raised orange search button in the centre.
- The building mark sits only on warm white.
- The owner's raster category icons (charcoal rounded tiles) always sit beside the category name and are used small; they are the only dark surfaces besides small controls.

## Colors

The four brand colours from the owner's board, white cards, warm neutrals between them, and a small, strictly semantic data code.

### Primary
- **Brand Orange** (brand-orange): the action colour. It fills the search button, primary buttons, step numbers, the phone FAB, the count badge and the toast check, and it draws the active top-nav underline, the border of a switched-on watch toggle, the steps' vertical rail on narrow screens, text selection, the checkbox accent and the caret. Text and icons on it are always charcoal (4.9:1).
- **Orange Hover** (orange-hover): the hover fill on orange buttons.
- **Orange Tint** (orange-tint): the quieter orange. It is the headline highlighter band, the highlighted search option, the active bottom-nav pill, a switched-on watch toggle, the shared-estimate banner, the grand-total box, warning notes, the empty-state icon tile, the "price rising" verdict box and the halo ring around step numbers.
- **Orange Ring** (orange-ring): the 4px focus halo around a focused search field or quantity input, always paired with a charcoal border.

### Secondary
- **Charcoal** (charcoal): all headings and body text, measured prices, selected chips and segmented options (with white text), focus outlines and the focused-field border. Every shadow is charcoal at reduced alpha.
- **Concrete Gray** (concrete-gray): the 1.5px stroke on the search fields and quantity inputs, the hover border on chips, rows and secondary buttons (as `--line-strong`), and the CONSTRUCT sub-wordmark. It is about 3.7–4.2:1 on light grounds, so it never sets reading text; the logo lockup is the only exception.

### Tertiary
- **Forecast Orange** (forecast-orange): every forecast price (the tile figures), the dashed forecast chart line and its points, and the legend dash. It is the data form of the brand orange (5:1+ on white and on the ground).
- **Up Crimson on Up Tint / Down Green on Down Tint**: price direction, only in the change chips (with an arrow and, outside tiles, a word) and the verdict box's trend icon. Crimson also serves as the destructive role (inline errors, the hover on the remove-line button).
- **Stamp Red** (stamp-red): the "ข้อมูลตัวอย่าง" demo stamp only, as a 1.5px red border and red text on white. On the printed sheet the demo label is black instead.

### Neutral
- **Warm White** (warm-white): the page, the sticky header, the footer and the intro splash. It is the only ground the logo sits on.
- **Surface** (surface): cards, panels, the price card, search fields, list rows, forecast tiles, the bottom nav and the toast. It is also the text colour on charcoal fills.
- **Warm 50** (warm-50): quiet wells inside cards (the latest-price box, cost total, demo note, source links at rest, hint chips).
- **Sunken** (sunken): category pills, the "price falling / flat" verdict box, the flat change chip, and hover on ghost buttons and nav links.
- **Line** (line): hairline borders on rows, tiles, chips, wells and the footer rule, the dashed sum divider, and the chart grid.
- **Ink 2 / Ink 3** (ink-2, ink-3): secondary copy and labels; then meta, units, placeholders, search icons, inactive bottom-nav items and chart ticks.

### Illustration colours
The construction illustration (`SiteArt`) draws in its own warm set: sky #f8f1e8 to #efdccb, a #e6d6c6 grid, ground #e4d8c8, columns #8b9396, slabs in concrete gray, a crane in #c55f2a, rebar in brand and forecast orange. Its frame is filled #f3e6d8. These are illustration-only and never UI colours.

### Paper colours
The printed estimate sheet is ink on white paper. Body text and the demo label are **Print Black** (print-black); the header and grand-total rules are 2px and 1.5px charcoal, secondary text is ink-2, small row detail ink-3, and row rules are line. Print black exists only on paper.

### Category icon tiles
The nine category icons are the owner's raster artwork (`public/icons/categories/STR-01…09.webp`, 220×192), drawn on their own charcoal rounded tile. Their dark ground belongs to the image, not to the UI palette.

### Named Rules
**The No Dark Page Rule.** The site is light only, as the owner requires. Charcoal is ink and small solid controls (a selected chip, a segmented option), never a page, header, nav bar, panel or theme. The only other dark surfaces are the small category icon tiles beside a category name. Black is never used on screen; it appears only on the printed sheet.

**The Charcoal on Orange Rule.** Every text, icon and badge digit on brand orange is charcoal. White never goes on orange (2.98:1).

**The Action Is Orange, Choice Is Charcoal Rule.** Orange fills mean "do this": search, add, open. A pressed quick-pick, a selected category chip and a checked segmented option are charcoal with white text. A highlighted or current item that is not a pressed choice (search option, bottom-nav pill) gets orange tint.

**The Data Code Rule.** Measured prices are charcoal and forecast prices are dark orange, on every surface. In a chart, brand orange appears only as the low–high band at low opacity. Crimson and green mark direction only in change chips and trend arrows, never as a box fill, text block or price colour. That is why the verdict box is orange tint (rising) or sunken (falling or flat), with only its icon coloured.

## Typography

**Display, Body and Numeral Font:** Prompt (with system-ui, sans-serif), weights 400/500/600/700, self-hosted through @fontsource with no runtime font requests.

**Character:** Prompt's round, geometric Thai and Latin forms match the logo's wordmark, so headline, price and body read as one hand. Hierarchy comes from size and weight (700 for headings and prices, 500–600 for labels), never from case or colour tricks.

### Hierarchy
- **Display** (700, clamp(34px, 6.6vw, 70px), 1.2, −.01em): the home headline only, two centred lines. On short desktop screens it drops to clamp(34px, 7vh, 60px), and to 30px on short phones.
- **Headline** (700, clamp(26px, 3.6vw, 40px), 1.3): home section heads ("ใช้งานง่าย 3 ขั้นตอน", "ราคามาจากไหน"). The left-aligned list sections (watch list, category grid) use a smaller head, 700 clamp(22px, 2.6vw, 28px)/1.35, over a 15px ink-2 subline.
- **Page Title** (700, clamp(28px, 4vw, 42px), 1.25): the search and estimate page h1. **Material Title** (700, clamp(24px, 3.2vw, 34px), 1.35) is the material page h1, which can wrap long MOC names.
- **Title** (700, 20px, 1.4): card and panel heads. Step heads use 19px/600, the empty-state head 22px, and the material name on the home price card 18px/600.
- **Price Hero** (700, clamp(38px, 5vw, 50px), 1.15, −.01em, tabular): the latest price. **Price Total** (700, clamp(28px, 3.4vw, 36px)) is the estimate grand total; the cost-box total uses clamp(26px, 3vw, 32px). **Price Tile** (700, 19px; 16px on phones, 18px in detail rows) is the forecast figures. Line totals are 17px/700, search peeks 16px/700, and watch-card prices 18px/700. The per-bar line under the big price is 14px ink-2 with its figure 16px charcoal.
- **Body Lead** (400, clamp(16px, 1.7vw, 19px), 1.7): the hero subline, capped at 36em and balanced. Section sublines use clamp(16px, 1.6vw, 18px).
- **Body** (400, 16px, 1.65): the default. Search input text is 18px (17px on phones, 16px compact).
- **Label** (500–600, 14px): field legends, card labels, chip text and "ลองดู". Nav links are 15px/500, and buttons 16px/600 (17px large).
- **Meta** (13px) and **Caption** (12px): secondary row lines, units, ranges, month labels and the demo stamp. Change chips use 12.5px/600, and bottom-nav labels 12.5px/500.
- **Wordmark** (700, 21px; 19px on phones) over **CONSTRUCT** (500, 9.5px, .42em, concrete gray): the live-text lockup beside the mark.
- **Print** (in points): body 11pt/1.45, the text wordmark 20pt/700 over a 7.5pt .42em CONSTRUCT line, the sheet title 16pt/700, table heads 9.5pt, row detail 8.5pt, the demo label 10pt/700, notes 9pt and the grand total 13pt/700.

Font-size steps in use: 9.5, 11, 12, 12.5, 13, 14, 14.5, 15, 16, 17, 18, 19, 20, 22 and 30px. The fluid steps are clamp(13px, 1.6vw, 15px), clamp(16px, 1.6vw, 18px), clamp(16px, 1.7vw, 19px), clamp(19px, 2.4vw, 24px), clamp(22px, 2.6vw, 28px), clamp(24px, 3.2vw, 34px), clamp(26px, 3vw, 32px), clamp(26px, 3.6vw, 40px), clamp(28px, 3.4vw, 36px), clamp(28px, 4vw, 42px), clamp(38px, 5vw, 50px), clamp(34px, 6.6vw, 70px) and clamp(34px, 7vh, 60px).

### Named Rules
**The Tabular Price Rule.** Every price, quantity, total and count is set in Prompt with tabular numerals (the `.num` style), and every price carries its unit ("ต่อ ตัน") beside it in smaller ink-3 text.

**The Vowel Room Rule.** Thai body copy never goes below 1.5 line-height, and display never below 1.2. Headlines and paragraphs use balanced or pretty wrapping. Emphasis in the headline is a flat orange-tint band behind the text (58–94% of the line box), never gradient or clipped text.

## Layout

The site is one centred column on a 1160px measure (`min(1160px, 100% − 32px)`). The hero narrows to 900px and the search box to 720px, the steps and trust card sit at 1080px, and the search page at 860px. On the home page the "stage" is a two-track grid: the illustration spans the full width (min 460px high), and the price card sits in a 450px right-hand track, inset 36px, so it overlaps the art's right side. The illustration keeps its subject left of x = 690 for this reason. The material page and estimate sheet use a main column plus a 390px sticky side column (the cost box and summary, top 92px). The material grid is laid out as "summary cost / chart cost". The price card itself is a single minmax(0, 1fr) track, so long names and prices never widen it.

Below the stage, the watch list and the category grid sit at 1080px, 72px apart (56px on phones). The category grid is 3 equal columns of horizontal cards (icon left, name and count right) with 12px gaps. The watch list is an auto-fill grid of cards at least 240px wide, 12px apart, and appears only when something is starred.

The header is sticky, 72px high (62px on phones), on warm white with a 7%-charcoal bottom rule. The footer sits 96px below the content. Home sections are 104px apart (72px at 640px and below). Card padding is 24px (18–20px on phones), the trust card's 40px. Gaps step 6 / 8 / 10 / 12 / 16 / 20 / 40px. Every touch target is at least 44px; chips are 38–40px inside larger rows.

### Breakpoints
- **960px**: single column. The category grid drops to 2 columns. The steps lose their cards and become a vertical list joined by a 2px orange-to-tint rail. The stage stacks, with the art at clamp(190px, 40vw, 340px) and the card (max 560px) pulled up 110px over it. The material and estimate grids stack, and their side columns stop being sticky. The trust card stacks.
- **767px**: phone chrome. The top nav hides and the bottom nav appears (78px plus the safe area reserved at the foot). The mark shrinks to 36px, the "how" CTA goes full width, and the toast moves above the bottom nav. From 961px up the toast sits bottom-left (24px in, max 440px wide); between 768px and 960px it is bottom-centre (max 560px).
- **640px**: phone content. The hero search becomes 60px with an icon-only 48px button. Quick-picks and category chips become one horizontally scrolling row with faded edges, bleeding to the screen edge. The art is 140px with the card pulled up 64px. The price card pads 18px with a 22px radius, and the watch toggle becomes a 34px icon-only circle. On the material page the forecast tiles become rows, and estimate lines wrap to two rows. The category grid returns to 3 columns of vertical tiles (icon over name, 8px gaps). The watch list becomes one horizontal snap row of cards min(78%, 280px) wide, bleeding to the screen edge. The estimate project and customer fields stack.
- **400px**: the price card's top row wraps, so the stamp and watch toggle drop below the category pill or heading, pushed to the right.
- **360px**: the forecast tiles stack into rows, the segmented options drop to 14px, and the unit beside the estimate quantity hides.
- **Short screens**: at min-width 961px and max-height 860px (1366×768 laptops) the hero tightens and the h1 drops to clamp(34px, 7vh, 60px), so the price card stays in the first view. At max-width 767px and max-height 720px the hero tightens further, the h1 is 30px, the illustration hides, and the card's detail line hides.
- **Print**: with @page margins of 14mm 12mm, the header, navs, footer, toast and the whole on-screen estimate hide, and the print sheet (hidden on screen) prints alone on white.

## Elevation & Depth

The pages are layered with soft, long, low shadows: warm-white ground, white cards that lift slightly off it, and warm-50 or sunken wells set into cards. Shadows are charcoal at alpha, with large negative spread so they read as a soft pool under the card rather than an outline. The one colour exception is an orange glow under orange actions. Behind the home stage a wide radial orange halo (20% at the centre) warms the ground. It is used once, on the home stage only.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 1px 2px rgba(36, 42, 45, .05), 0 18px 40px -26px rgba(36, 42, 45, .32)`): panels, step cards, the trust card, the illustration frame, the material-page price card, and list rows, category cards and watch cards on hover.
- **Lift** (`box-shadow: 0 1px 2px rgba(36, 42, 45, .06), 0 28px 56px -28px rgba(36, 42, 45, .45)`): the home price card over the art, the search dropdown and the toast.
- **Search Field** (`box-shadow: 0 22px 44px -26px rgba(36, 42, 45, .45)`; −30px spread on the search page): the hero search box. The compact search has no shadow.
- **Orange CTA** (`box-shadow: 0 12px 24px -12px rgba(232, 117, 59, .75)`): primary buttons and the search button.
- **FAB** (`box-shadow: 0 0 0 6px #fff, 0 14px 24px -10px rgba(232, 117, 59, .9)`): the raised phone search button, with a white collar that cuts it out of the nav bar. When the button is the current page, it adds an 8px orange-tint ring.
- **Bottom Bar** (`box-shadow: 0 -8px 24px -18px rgba(36, 42, 45, .35)`): the phone bottom nav.
- **Active Tab** (`box-shadow: 0 1px 2px rgba(36, 42, 45, .08), inset 0 -2px 0 #e8753b`): the current top-nav link, a white pill with an orange underline.
- **Focus Halo** (`box-shadow: 0 0 0 4px rgba(232, 117, 59, .28)`): focused search and quantity fields.

### Named Rules
**The Soft Pool Rule.** Every neutral shadow is charcoal at alpha with a large blur and negative spread. Never black, never a hard offset block, never a border-like ring except the focus halo, the FAB collar and the step-number tint ring.

**The Orange Glow Rule.** Only orange actions (primary buttons, the search button, the FAB) cast an orange shadow. Cards, chips and selected states never glow.

## Shapes

The form language is softly rounded rectangles and pills, and radius grows with the container. Stamps use 6px, the focus outline 8px, small steppers 10px, and nav links, options and segmented options 12px. Buttons and inputs use 14px (16px large), tiles, verdicts and source links 16px, and wells, rows and the dropdown 18px. The search fields and category cards use 20px (category tiles 18px on phones), watch cards and the shared banner 18px, panels and step cards 24px (22px on phones), the price card 26px, and the illustration frame and trust card 28px. Chips, pills and badges are fully round (999px). Step numbers, the FAB and icon buttons (clear, toast check) are circles. The category icon tiles have their own proportional corner (22% / 25%), tightened to 5px at 18px in the category pill and 6px at 24px in chips. The printed demo label uses 4px.

Borders are quiet. Cards carry a 1px border of 7–8% charcoal. Rows, tiles, wells and chips use a 1px line border, and inputs a 1.5px concrete stroke. Dashed borders appear only on the empty-state edge (1.5px line), the estimate sum divider and the 1px rule above the per-bar line.

**The Nested Radius Rule.** Anything inside a card uses a smaller radius than the card: 26px card, then an 18px well, then a 16px tile, then a 999px chip. A card's children never match or exceed its radius.

## Components

### Brand Mark
The lockup pairs the owner's building mark (`public/brand/thai-tay-mark.png`, 42px high; 36px on phones and in the footer; 72px on the splash) with live Prompt text: THAI TAY over CONSTRUCT, 10px apart. The PNG has an opaque warm-white ground that matches its light facade, so the mark sits only on warm white: the header, the footer and the intro splash. The favicon and apple-touch icon are the dark rounded tile from the board, used only as app icons.

### Category Icon
The owner's nine raster icons on charcoal rounded tiles (220×192, kept at that ratio). Each is decorative (alt="") and always sits next to its category name, which carries the meaning. Sizes in use: 18px inside the category pill, 24px in the search-page category chips, 36px in search dropdown rows and estimate lines, 44px in search result rows (32px and 38px on phones), 40px in watch cards, and 72px in the home category grid and the material-page heading (52px on phones).

**The Icon Beside Its Name Rule.** A category icon is always paired with the visible category name and used small: 72px is its ceiling. It is never a hero image, a large dark block or a stand-in for the name.

### Buttons
Buttons are friendly and solid, with no gradients.
- **Shape:** 14px (16px large). Default height 48px with 0 22px padding; large 56px with 0 28px padding. Text is 16px/600 (17px large) with an 8px icon gap.
- **Primary:** brand orange with charcoal text and the orange CTA shadow. Hover goes to orange hover, and pressing nudges the button down 1px. Disabled is 50% opacity with no shadow.
- **Secondary:** a white fill with a 1.5px line border; hover darkens the border to concrete. Used for "load more" and the estimate's share, print and CSV actions.
- **Ghost:** ink-2 text; hover fills sunken with charcoal text. Used for "clear all".
- **Text link:** charcoal with a 1.5px orange underline at a 3px offset.
- **Focus:** a 2px charcoal outline with a 2px offset and 8px radius on every interactive element.

### Search Combobox (signature)
- **Hero:** a 68px white field, 20px radius, 1.5px concrete stroke and the search-field shadow. It holds an ink-3 search icon, 18px input text, a round clear button and, inside on the right, a 52px orange search button (14px radius, CTA shadow). On focus the border turns charcoal and gains the orange-ring halo.
- **Dropdown:** a white sheet 8px below the field (18px radius, lift shadow, max min(62vh, 480px)) listing up to six options. Each row shows the short name in 15px/500, the full MOC name or category in 13px ink-3, and the latest price peek right-aligned. The highlighted row is orange tint. A "see all N results" row closes the list. The empty state lists what is in scope and offers hint chips.
- **Compact:** 52px, 16px radius, no shadow, with an icon-only 40px orange button. Used in the material-page bar.
- **Search page list field:** 64px, same stroke and focus treatment, without the inner button.

### Chips
- **Quick-pick and category chips:** fully round, 38–40px high, 0 14–16px padding, 1px line border, a white (80%) or white fill, and ink-2 14px/500 text. Hover darkens the border to concrete and the text to charcoal. **Pressed** is a charcoal fill and border with white text.
- **Category chips** on the search page lead with a 24px category icon.
- **Category pill:** a sunken, round, 13px ink-2 label with an 18px category icon, on the home price card. It is not interactive.
- **Watch toggle:** a 34px round toggle (1.5px line border, white, 13px/600 ink-2) with a 17px star and "ติดตาม", using aria-pressed. Switched on, it fills orange tint with a brand-orange border, a filled star and "ติดตามอยู่". On phones (640px and below) it is a 34px icon-only circle.
- **Change chip:** a round, 12.5px/600 chip with an arrow icon: crimson on up tint, green on down tint, ink-2 on sunken when flat. In forecast tiles the word is screen-reader only; elsewhere it is spoken and shown.
- **Count badge:** a 22px orange pill with 12px/700 charcoal digits, shown on the estimate nav item.

### Price Card (signature)
A white card (26px radius, 24px padding, 7%-charcoal border). It has the lift shadow on home and the card shadow on the material page. It is a single minmax(0, 1fr) track. The top row holds the category pill (or the 20px heading) on the left and, on the right, the demo stamp and the watch toggle; under 400px the row wraps and that pair drops below. Then come the material name, a warm-50 well with the latest price at Price Hero size in charcoal plus its unit (for rebar, a per-bar line follows inside the well under a 1px dashed rule: "≈ ฿… ต่อเส้น" with bar length and weight, 14px), and the label "ราคาคาดการณ์" over three equal forecast tiles (16px radius, line border). Each tile shows the horizon and month label, the price in forecast orange, a change chip and, on the material page, the low–high range. A verdict box (16px radius) closes the card, with a trend icon and a one-line buy-now-or-wait hint: orange tint when rising, sunken when falling or flat. On home a full-width primary button follows.

### Cards / Containers
- **Corner Style:** 24px panels, 26px price card, 28px trust card and illustration frame; 22px on phones.
- **Background:** white on the warm-white ground; warm-50 wells inside.
- **Shadow Strategy:** the card shadow (see Elevation & Depth).
- **Border:** 1px charcoal at 7–8%.
- **Internal Padding:** 24px (20px 18px on phones); 40px for the trust card.
- **List rows:** white rows (18px radius, 1px line border, min 76px) for search results and estimate lines. On hover they gain a concrete border and the card shadow.

### Inputs / Fields
- **Quantity stepper:** 48px square − / + buttons (14px radius, 1.5px line border) around a 48px input with a 1.5px concrete stroke and 20px/600 tabular centred text. The small version is 36px with a 72px input. Focus gives a charcoal border and the orange-ring halo.
- **Segmented choice:** four equal 44px options (12px radius, 1.5px line border, 15px/600). The checked option is charcoal with white text. Used for "when to buy" and contingency %.
- **Segmented choice, 2-way:** the same option style in two equal columns, used for ordering rebar by bar or by tonne in the cost box. When ordering by bar, a 13px ink-3 note under the stepper converts the count to tonnes.
- **Project and customer fields:** two 48px text inputs side by side above the estimate lines (14px radius, 1.5px concrete stroke, 14px/600 ink-2 labels, optional hints in ink-3), with the charcoal border and orange-ring halo on focus. They stack on phones.
- **Checkbox:** 20px with the orange accent colour.

### Navigation
- **Top nav (768px and up):** three 44px links (12px radius, 15px/500 ink-2) on the right of the warm-white header. Hover is sunken. The current page is a white pill with semibold charcoal text and a 2px orange underline (the active-tab shadow).
- **Bottom nav (767px and below):** a fixed white bar with a line top border and the bottom-bar shadow, laid out as three equal columns. The side items are a 22px icon in a 56×32px pill over a 12.5px label in ink-3; the current item becomes charcoal with an orange-tint pill. The centre item is a 60px orange circle raised 30px above the bar, with a white collar and orange glow, labelled "ค้นหาราคา".

### Home Category Grid
Nine white category cards (20px radius, 1px line border, 12px 16px 12px 12px padding) under a "เลือกดูตามหมวด" section head, each linking to search filtered to that category. On desktop each card is horizontal: a 72px icon, then the name (16px/600) over the item count (13px ink-3). On phones the cards become vertical tiles (18px radius, 8px 8px 12px padding): a 52px icon centred over a 13px name and 12px count. Hover darkens the border to concrete and adds the card shadow.

### Watch List
Shown on home only when at least one material is starred, directly below the hero stage. Each watch card is white (18px radius, 1px line border, 14px 16px padding) with a 40px category icon, the name (15px/600, two lines max), the latest price (18px/700) with its unit, and a 3-month change chip. Hover matches the category cards. On phones the list is a horizontal snap row.

### Estimate Sheet
- **Lines:** each line leads with its 36px category icon. In the read-only shared view, lines lose the stepper and remove button, show the quantity as text, and keep 20px right padding.
- **Shared banner:** an orange-tint box (18px radius, 16px 18px padding) above the lines in the read-only view, with a 16px bold title naming the price date, a 14px ink-2 explanation, and a primary "save as mine" button beside a ghost link.
- **Summary actions:** a 2×2 grid of secondary buttons (8px gap, 0 12px padding, 15px text, 17px icons): ส่งทาง LINE, คัดลอกลิงก์, พิมพ์ / PDF and CSV.

### Print Sheet
A paper-only version of the estimate, hidden on screen. It opens with a text wordmark (THAI TAY over CONSTRUCT); the logo image is not used on paper because of its warm-white ground. The title, date and demo label sit right-aligned over a 2px charcoal rule. A meta row gives project and customer, then a full-width table (1.5px charcoal head rule, 1px line row rules, numbers right-aligned), totals in the table foot and the grand total over a 1.5px charcoal rule. The demo label is a black 1.5px bordered box (4px radius, 10pt/700). Page margins are 14mm 12mm.

### Steps
Three numbered steps. Each is a white step card (24px radius, 28px 26px padding) with a 52px orange circle carrying a 22px/700 charcoal number inside a 6px orange-tint ring. Below 960px the cards dissolve into a vertical list, joined number to number by a 2px orange-to-tint rail.

### Demo Stamp and Note
The stamp is a white box with a 1.5px stamp-red border, 6px radius, and 12px/600 red text "ข้อมูลตัวอย่าง". It is upright, never rotated. It appears on every price card and summary while prices are synthetic. The demo note is a warm-50 box (14px radius, line border) that leads with the stamp, at the foot of every page with prices.

### Toast
A white toast (16px radius, line border, lift shadow) with no side stripe. It holds a 34px orange check badge (an 18px charcoal check), a message with an ink-3 detail line, and a link to the estimate. It sits bottom-left (24px in, max 440px) at 961px and up, bottom-centre (max 560px) below that, and above the bottom nav on phones. It rises in over .22s.

### Chart
One chart per material: the 12-month measured line in charcoal (2.5px), then the forecast as a dashed (6 5) forecast-orange line with white-filled points, over a brand-orange low–high band at 20% opacity. The grid is a dashed horizontal line border, and ticks are 12px ink-3. It is 300px high (240px on phones), inside a panel with a legend line above.

## Do's and Don'ts

### Do:
- **Do** keep every page on warm white with white cards; charcoal is only ink and small selected controls.
- **Do** set every text and icon on brand orange in charcoal.
- **Do** use orange fills for actions and charcoal-with-white for a selected choice; use orange tint for a highlighted or current item.
- **Do** print measured prices in charcoal and forecasts in dark orange, and keep brand orange in charts to the 20% range band.
- **Do** confine crimson and green to change chips and trend arrows, and always pair them with an arrow (and a word outside the tiles).
- **Do** label every synthetic price with the red demo stamp, and give every forecast a low–high range where space allows.
- **Do** set every price in Prompt tabular numerals with its unit beside it.
- **Do** keep Thai body at 1.5 line-height or more and display at 1.2 or more.
- **Do** nest radii downward (card, then well, then tile, then chip).
- **Do** place the building mark only on warm white (header, footer, splash); on the printed sheet use the text wordmark.
- **Do** keep every category icon beside its category name, decorative (alt=""), and at 72px or smaller.
- **Do** keep the search box the largest control on the screen, with its orange button inside it.
- **Do** hold touch targets at 44px or more, and keep the bottom nav to three items with search raised in the centre.

### Don't:
- **Don't** ship a dark or black page, header, nav bar or theme, and don't use black anywhere on screen (black is for the printed sheet only).
- **Don't** put white text on brand orange (2.98:1).
- **Don't** place the mark on white cards, orange, charcoal or the printed sheet; its opaque warm-white ground shows as a box on anything else.
- **Don't** use a category icon as a large dark block, a hero image or a replacement for the category name.
- **Don't** set reading text in concrete gray (only the CONSTRUCT line of the lockup).
- **Don't** use crimson or green as a box fill, a price colour or decoration, or forecast orange for anything but forecast figures.
- **Don't** use stamp red for anything but the demo stamp.
- **Don't** fill a selected chip or segmented option with orange; orange fill means action.
- **Don't** give cards, chips or selected states an orange glow; only orange actions cast one.
- **Don't** use gradient or clipped text; the headline emphasis is a flat tint band.
- **Don't** put a kicker or eyebrow line above a heading.
- **Don't** add hard offset or black shadows.
