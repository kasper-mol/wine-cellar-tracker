# Cellar Tracker — Project Overview

> A personal wine‑cellar manager backed by a structured encyclopedia of wine regions,
> appellations, and grapes. Track the bottles you own, and explore the reference data
> behind them (origins, permitted grapes, vintage quality, tasting descriptors).

This document describes **what exists today** so it can be used as a baseline for planning
new features. It is written for a product audience — no code required to read it.

---

## 1. What the product is

Cellar Tracker has two halves that reinforce each other:

1. **Your cellar** — a private inventory of the wines you own (bottles, vintages, prices,
   drinking windows, ratings).
2. **A wine reference encyclopedia** — a curated, browsable catalog of **countries → regions →
   appellations → grapes**, plus **vintage quality ratings**, **flavor/aroma descriptors**, and
   **interactive maps**. Every wine in your cellar links into this encyclopedia, so a bottle's
   appellation and region are clickable and lead to rich background pages.

Today it runs as a **single‑user** app (one owner account), but the data model and permissions
are already structured for a multi‑user future.

---

## 2. Technology (one‑liner for context)

Vue 3 single‑page web app (TypeScript, Tailwind UI) backed by **Supabase** (PostgreSQL database,
authentication, and row‑level security). Data is organized in clean domains and served through a
public‑read / admin‑write permission model.

---

## 3. Current functionality

### 3.1 Home / "My Cellar" (dashboard)
- **At‑a‑glance stats:** total bottles, unique labels, and total cellar value.
- **Inventory table** of every wine you own, showing label, producer, appellation, region,
  vintage, drinking‑window status, quantity, and value.
- **Clickable origins:** each wine's appellation and region link to their encyclopedia detail
  pages.
- **Full cellar management:** add a new wine, edit an existing one, and remove bottles — via a
  form with a guided **region → appellation picker**, style, vintage, bottle count, purchase
  price, rating, drinking window, grapes, and a Vivino link.

### 3.2 Wine encyclopedia — browse
Public, navigable catalog:
- **Countries** — top‑level wine‑producing countries.
- **Regions** — wine regions within each country.
- **Appellations** — protected designations (e.g. Barolo, Chablis, Margaux), each tied to a
  region.
- **Flavors** — a catalog of tasting/aroma descriptors organized by level and category
  (aroma‑wheel style).

### 3.3 Wine encyclopedia — detail pages
- **Country detail** — overview of a country and the regions within it.
- **Region detail** — region overview, its appellations, parent country, and vintage ratings.
- **Appellation detail** — overview, **grape composition** (which grapes are permitted/required
  and at what percentages), and **vintage ratings** for that appellation.

### 3.4 Vintage quality ratings
- Per‑vintage quality scores attached to a country, region, or appellation, aggregated **by
  source**, and displayed on the relevant detail pages to help judge how good a given year was.

### 3.5 Interactive wine maps
- **SVG‑based, database‑driven maps**: map shapes (e.g. regions on a country map) are linked to
  the matching country/region/appellation records, making maps an interactive entry point into
  the encyclopedia. Map assets are versioned.

### 3.6 Administration (management area)
Behind an admin‑only section, full create/edit/delete for the reference data:
- Wine **countries**, **regions**, **appellations** (including each appellation's **grape
  rules** — allowed / required / forbidden with min–max %).
- **Grape varieties** (with color).
- **Vintage ratings**, including a **batch entry** screen.
- **Flavor descriptors.**
- **Wine maps** — upload/manage SVGs and link their shapes to encyclopedia records.

### 3.7 Accounts & permissions
- Email/password **authentication**; the cellar is private to the signed‑in owner.
- **Reference data is publicly readable**; **writes to reference data are admin‑only**; personal
  wines are scoped to their owner.

---

## 4. Data currently in the system

| Domain | Count | Notes |
|---|---:|---|
| Countries | 2 | France, Italy |
| Regions | 27 | 15 French, 12 Italian |
| Appellations | 654 | Seeded from the official EU PDO register (IT + FR) |
| Grape varieties | ~590 | With grape color |
| Grape ↔ appellation rules | ~14,700 | Mostly "allowed"; key wines carry "required" + % |
| Vintage ratings | ~450 | Across countries/regions/appellations |
| Owner's wines | 24 (47 bottles) | Imported from the owner's spreadsheet |

The reference catalog is intentionally much larger than the personal cellar — it is the
backdrop the cellar is mapped onto.

---

## 5. Known gaps & opportunities (idea starters for the PM)

These are honest current limitations — useful as a menu of directions, not commitments:

- **Coverage** — only France & Italy are seeded. Spain (e.g. Rioja), Germany, USA, etc. are not
  yet in the reference data, so wines from those countries can't be fully matched. A handful of
  regions (Lazio, Lombardy, Emilia‑Romagna, …) are also not yet present.
- **Cellar depth** — no drink/consume action (decrement a bottle when opened), no purchase
  history, no per‑bottle storage location, and no tasting notes on owned bottles.
- **Personal ratings & windows** — drinking windows are stored as free text; there's no
  reminder/alerting for wines entering or leaving their window, and no personal vs. critic
  rating distinction.
- **Discovery** — no search, filtering, or sorting across the cellar or the encyclopedia; no
  "what should I drink tonight" recommendations.
- **Insights** — the spreadsheet had country/grape/appellation breakdowns; the app shows only
  three headline stats. Richer cellar analytics (by region, grape, value, age) are an
  opportunity.
- **Data quality** — a few grape names carry minor typos inherited from manual data; appellation
  names use the official EU multi‑synonym form (e.g. "Gavi/Cortese di Gavi"), which may want
  friendlier display names.
- **Multi‑user** — the foundation exists (auth + per‑user wines), but there's no sharing,
  social, or collaborative cellar functionality yet.
- **Mobile / capture** — no label‑scan, barcode, or photo‑based wine entry; everything is manual
  or spreadsheet import.

---

*Generated as a snapshot of the current build for feature planning.*
