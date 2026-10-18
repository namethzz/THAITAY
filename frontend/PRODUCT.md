# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Contractors and procurement staff**: check a material's price and its trend before ordering, and turn it into a quotation for their client.
- **Engineers and quantity surveyors (QS)**: estimate project cost and build BOQs; they need detailed numbers they can cite (material code, unit, source).
- **Homeowners and self-builders**: not professionals; they want a ballpark price per unit and a sense of whether to buy now or wait.

All three read Thai first and think in baht per the material's own unit (ตัน, ลบ.ม., เส้น, ...).

## Product Purpose

THAI TAY tells people what a structural construction material costs now and what it is likely to cost 1, 2 and 3 months ahead, with a plausible low–high range, and turns that into an order cost. The core action is one search: type a material, see its latest price and forecast immediately. Success: a first-time visitor understands within seconds that the site tells construction material prices now and 3 months ahead, and gets from "which material?" to "what will it cost me?" without help or extra choices.

## Positioning

Forecasts are per specific material item, keyed to the Ministry of Commerce 16-digit commodity code (MAT-…), not an industry-wide index, and each forecast carries a low–high range instead of a single number. The forecast flows straight into a cost estimate (quantity, VAT 7%, contingency, CSV/print) in the same session.

## Operating Context

- Thai market, Thai language, Thai Buddhist-era month labels (e.g. ม.ค. 70).
- Source data: monthly material prices from MOC Open Data (กระทรวงพาณิชย์) and the TPSO construction material price index (สนค.), configured in `src/config/sources.ts`.
- The decision the product supports is timing and budgeting an order: buy now or in 1–3 months, and how much to set aside.
- Outputs leave the product as CSV or printed estimates for quotations.

## Capabilities and Constraints

- Catalog: 287 structural materials in 9 categories (`src/data/structural-materials.json`): rebar, structural steel, wire mesh, tie wire, prestressing wire, ready-mix concrete, lean concrete, piles and precast parts, aggregates. Architecture, masonry, sanitary and electrical are out of scope.
- Pages (three): home (headline, search, live price card, how it works, sources), search (full list with prices, category filter) with a per-material page (latest price, 1–3 month forecast with ranges, buy-now-or-wait hint, 12-month chart, cost box), and the estimate sheet (quantities, contingency, VAT 7%, CSV, print; saved in the browser). Phones get a 3-button bottom nav with search in the centre.
- Prices shown today are **synthetic demo data** generated in `src/services/priceService.ts`, labelled "ข้อมูลตัวอย่าง" on every price card and in a note at the foot of each page. Backend and ML are not built yet; training data is prepared and the owner plans to use Vertex AI. The API contract is defined (`/prices/{id}/history`, `/prices/{id}/forecast`) and switches on with `VITE_API_BASE`.
- Frontend only: React 18, Vite, TypeScript, Tailwind CSS 4, shadcn/ui; hash routing; deployed to Vercel and GitHub Pages; no runtime requests to external services except source links the user clicks.

## Brand Commitments

- Name: **THAI TAY**, logo lockup **THAI TAY / CONSTRUCT** (the owner's brand board, supplied in chat).
- Logo and icon: the owner's building mark (charcoal, concrete gray and orange on warm white) and the dark rounded app tile. Shipped as `public/brand/thai-tay-mark.png` (mark, on warm white) and the favicon / apple-touch icons cut from the board; the wordmark is set as live text in Prompt.
- Brand palette (binding): Charcoal `#242A2D` (primary), Concrete Gray `#747D80` (secondary), Orange `#E8753B` (accent, energy), Warm White `#F3F0EA` (ground). The mark's light facade shares the ground colour, so the mark only sits on warm white.
- Owner's explicit constraint: no black theme. The site stays light (warm white ground); charcoal is the ink and small solid controls, never a dark page.

## Evidence on Hand

- Real: the material catalog (names, codes, units, categories), the source list, the API contract.
- Not available and must not be fabricated: real prices, model accuracy or error metrics, customers, testimonials, usage numbers.

## Product Principles

1. **Say it in one line**: the headline states what the site does; nothing on the first screen competes with it.
2. **Search first, price instantly**: one search box is the way in; results and the price card show numbers without another click.
3. **Few choices**: one primary action per screen, one chart, no settings the visitor has to understand before getting an answer.
4. **Honest numbers**: demo data is labelled, forecasts are ranges, and no accuracy claim appears until a real model has earned it.
5. **Plain enough for a homeowner, precise enough for a QS**: every number carries its unit; the material page shows the commodity code and the sources.

## Style References

The owner's own apps set the feel: AirClean (light hero, big centred Thai headline, one primary CTA, numbered steps, big price numbers, bottom nav with a raised centre action) and KickHub (large search bar with the button inside, filter chips). THAI TAY follows that family in its own palette.

## Accessibility & Inclusion

Thai text needs room for upper and lower vowel marks (generous line-height, no clipped gradient text). Respect reduced-motion settings. The search combobox, the buy-when options and the estimate controls all work from the keyboard; "up/down" price changes are stated in words and arrows, never colour alone.
