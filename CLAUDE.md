# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev          # start dev server (Vite, hot reload)
npm run build        # type-check + production build
npm run type-check   # vue-tsc type checking only
npm run test         # Vitest unit tests (food-pairing matcher, scorer, store)
npm run lint         # ESLint with auto-fix
npm run format       # Prettier on src/
```

Tests live in `__tests__/` folders next to the code (`src/lib/__tests__`, `src/stores/__tests__`); only the food-pairing feature has them so far. `npm run test:dw` is a separate acceptance script for the drinking-window engine.

## Environment

Copy `env.example` to `.env` and fill in:

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_KEY` — Supabase anonymous key

The Supabase client is lazily initialized via `initializeSupabase()` in `src/lib/supabase.ts`. All service functions call `getSupabaseClient()`, which throws if credentials are missing.

## Architecture

**Stack:** Vue 3 (Composition API + `<script setup>`) · TypeScript · Vite · Pinia · Vue Router · Tailwind CSS · Supabase (Postgres backend)

**Layer separation:** every domain follows the same three-layer pattern:

1. `src/types/<domain>.ts` — TypeScript interfaces (DB records, DTOs, payloads)
2. `src/services/<domain>.ts` — thin async functions that call Supabase directly; throw on `PostgrestError`
3. `src/stores/<domain>.ts` — Pinia stores that own reactive state and call services

Pages in `src/pages/` consume stores. The `src/stores/main.ts` store holds the user's personal wine cellar (currently seeded with dummy data).

**Route structure:**

- `/` dashboard, `/signup`
- `/countries`, `/regions`, `/appellations`, `/flavors` — browse views
- `/country/:id`, `/region/:id`, `/appellation/:id` — detail views
- `/manage/*` — admin-only (guarded in `src/router/guards.ts`: waits for auth + profile, non-admins go to the dashboard; RLS still enforces the data) CRUD pages (countries, regions, appellations, grape varieties, vintage ratings, flavor descriptors, wine maps, drinking-window engine, food pairing)

**Wine maps subsystem** (`src/services/wineMaps.ts`, `src/types/wineMaps.ts`, `src/stores/wineMaps.ts`, `src/content/wineMapLayers.ts`, `src/lib/svgUtils.ts`, `src/lib/wineMapOverlay.ts`, `src/lib/svgPlacePairing.ts`, `src/composables/useWineMapOverlayEditor.ts`):
SVG-based interactive maps, **one SVG file per map**. SVGs live in the public Supabase Storage bucket `wine-maps` (writes admin-only); the tables are in the `maps` schema (`map_definitions`, `map_asset_versions`, `map_area_mappings`, `map_layers`, `map_layer_elements`) and the app reads and writes them through the `public.wine_map_*` security_invoker views (public read, `is_admin()` write). A `WineMapDefinition` owns versioned SVG assets (`WineMapAssetVersion`) and a set of `WineMapAreaMapping` rows that link SVG element ids (key = `inkscape:label`, else `id`) to wine countries/regions/appellations. The SVG must be saved as **Inkscape SVG**: Plain SVG drops the layer names, and then no area or overlay can be identified.
**Overlay layers:** an Inkscape layer named `water` (rivers, lakes, seas, plus small river-name texts) or `places` (dots plus names), in any letter case, is not a map area but an overlay; every other layer is an area. `splitOverlayLayers()` pulls those layers out of the one file at load time (each keeps the file's page size, definitions and layer transforms, so overlays line up by construction) and `extractSvgAreaKeys()` skips them and `<defs>` content. `map_layers` holds each overlay's settings (`is_enabled` / `default_visible` / `stack` / `opacity`), created automatically; `map_layer_elements` holds optional per-element overrides keyed by `svg_element_id` (display text, subtype, size `sm|md|lg`, visibility). Elements and layers without a row render with defaults. In the places layer a place is the row of its name; `dot_svg_element_id` points at its dot, and the manage portal pairs dots with names by distance (`pairDotsWithTexts`, confirmed by the admin). Only small shapes count as dots; larger shapes in `places` are ignored. The manage page's "Import from SVG" (`importWineMapSvg()`) reads the file once: area rows, each overlay's settings row and its element rows. `WineMapCanvas.vue` stacks the base and overlays as separate inline SVGs in one grid cell (the base keeps its own container so its id lookups never see an overlay); all injected SVG goes through `sanitizeSvg`, and overlays through `prepareOverlayMarkup` (which also prefixes ids). `styleOverlay()` recolours overlays with the `--water-*` / accent / neutral tokens and applies the row settings; positions, stroke widths and font sizes stay as drawn. The public `wineMapDisplay.vue` draws area highlights on a click-through layer above the map (areas overlap, so recolouring the lower one would leave it covered) and adds Water / Places toggles. On the country and region pages it is a full-width stage under the hero (map left, capped by height via the SVG's aspect ratio; panel right, same height, stacked below `lg`): the panel lists the areas, and a selected area shows `MapAreaDetail.vue`, which reads the area's `target` (appellation / region / country) from the wineAppellations / wineRegions / wineCountries stores the page already loaded. The country and region detail pages find their map by owner (`owner_wine_country_id` / `owner_wine_region_id`, via `fetchMapsForCountry` / `fetchMapsForRegion`); the manage page `/manage/winemaps/:id` edits areas and, in Water / Places mode, overlay elements (`src/components/manage/winemaps/`). `jsdom` is a dev dependency only for the SVG tests (`// @vitest-environment jsdom`).

**Flavour lexicon** (`src/types/flavorDescriptors.ts`, `src/services/flavorDescriptors.ts`, `src/stores/flavorDescriptors.ts`, `src/content/flavorLevels.ts`):
Follows the WSET Level 3 Wine-Lexicon: `flavor_level` enum (primary/secondary/tertiary) → `flavor_clusters` (e.g. "Stone fruit", "Oak"; tertiary clusters carry a `colour` white/red variant) → `flavor_descriptors` (unique per cluster, optional `note` like "juice or zest?"). Level copy (subtitle, key questions) lives in code, not DB. `appellation_flavors` links appellation × `wine_style` × descriptor (typical profile, shown on the appellation page, edited via `AppellationFlavorManager`). Seed data lives only in the live DB; `public.seed_appellation_flavors(jsonb)` upserts profiles by appellation/descriptor name.

**Food-to-wine pairing** (`src/types/foodPairings.ts`, `src/services/foodPairings.ts`, `src/stores/foodPairings.ts`, `src/lib/foodTagMatcher.ts`, `src/lib/foodPairingScorer.ts`, `src/lib/foodPairingProfile.ts`; design in `docs/food-pairing-plan.md`):
Controlled vocabulary `food_tags` (category + synonyms) ← free text via a pure phrase + Dice-coefficient matcher (no AI), or picked directly / via `dish_presets`. Two scoring layers: `wine_style_food_pairings` (style × tag baseline, works for every appellation with `wine_styles`) and sparse `appellation_food_pairings` overrides (style-scoped; a DB trigger rejects a style the appellation doesn't make; edited via `AppellationFoodPairingManager`). Each result carries a 0–10 `match` (style fit averaged over the tags the style rates, capped at 8, plus up to +2 appellation evidence: a curated override, or the appellation's own `food_pairings` prose read by the same matcher via `foodPairingEditorial.ts`, where a dish only counts for the wine styles that rate its main ingredient — a white's grilled river fish can't lift the red; the appellation page splits dishes per style the same way) — lists sort on it, ties fall to raw score, fewer styles, then name (cellar: your rating). `scoreAppellations` keeps every style's score in `styleScores`; `scoreCellarWines` looks up the bottle's OWN style there and scores raw `WineRecord`s from a fresh `fetchUserWines()` — never `UserWine` (its `style` defaults to `'red'`). `search()` awaits shared load promises (vocabulary + appellation catalogue) so a direct visit to `/pairing` can't score an empty catalogue. Free-text queries are logged to `food_search_queries` (admin-readable) — unmatched ones drive vocabulary growth. Admins manage it at `/manage/food-pairing` (tags + live matcher tester, style baseline, quick picks, unmatched-search backlog; admin actions live in the same store so edits show on `/pairing` immediately). Seed data lives only in the live DB; `public.seed_food_tags`, `seed_wine_style_food_pairings`, `seed_dish_presets` (jsonb, idempotent, not callable via the Data API) upsert it.

**Per-style appellation text** (`src/types/appellationStyleProfiles.ts`, `src/services/…`, `src/stores/…`, `src/lib/appellationStyleView.ts`):
A white and a red from one appellation are different wines, but `wine_appellations` holds one `style_summary` / `drinking_window` / `signature_grapes`. For appellations with several `wine_styles` (121 of 212), `appellation_style_profiles` holds the per-style version (unique per appellation + style; a trigger rejects a style the appellation doesn't make and grapes outside its own `signature_grapes`; RLS public-read/admin-write). The appellation page shows a style switcher (`?style=` in the URL) for these and falls back field by field to the whole-appellation text, labelled as such; single-style appellations are unchanged. Edited per style in `AppellationStyleProfileManager` (saving marks a row `reviewed`); `public.seed_appellation_style_profiles(jsonb)` bulk-loads batch-written rows as `generated` and never overwrites `reviewed` ones (279 fact-checked rows were loaded this way on 2026-10-04). Flavour rows of a style an appellation no longer lists are hidden on its page (`flavorRowsForPage`). The drinking-window engine does not read any of this (it reads only `dw_*` tables and the wine's own fields).

**UI components:** shadcn-style primitives under `src/components/ui/` built on `reka-ui`. Shared components are in `src/components/`. The `cn()` utility (`src/lib/utils.ts`) merges Tailwind classes.

**Path alias:** `@/` maps to `src/`.
