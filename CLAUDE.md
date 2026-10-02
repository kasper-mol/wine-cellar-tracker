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

**Wine maps subsystem** (`src/services/wineMaps.ts`, `src/types/wineMaps.ts`, `src/stores/wineMaps.ts`):
SVG-based interactive maps stored in `public/maps/`. A `WineMapDefinition` owns versioned SVG assets (`WineMapAssetVersion`) and a set of `WineMapAreaMapping` rows that link SVG element IDs (parsed via `inkscape:label` or `id`) to wine countries/regions/appellations. `importWineMapAreas()` fetches the SVG at runtime, extracts shape IDs, and upserts new rows. The legacy `src/config/countryMapConfig.ts` approach (hardcoded SVG import + fill config) is superseded by this DB-driven system.

**Flavour lexicon** (`src/types/flavorDescriptors.ts`, `src/services/flavorDescriptors.ts`, `src/stores/flavorDescriptors.ts`, `src/content/flavorLevels.ts`):
Follows the WSET Level 3 Wine-Lexicon: `flavor_level` enum (primary/secondary/tertiary) → `flavor_clusters` (e.g. "Stone fruit", "Oak"; tertiary clusters carry a `colour` white/red variant) → `flavor_descriptors` (unique per cluster, optional `note` like "juice or zest?"). Level copy (subtitle, key questions) lives in code, not DB. `appellation_flavors` links appellation × `wine_style` × descriptor (typical profile, shown on the appellation page, edited via `AppellationFlavorManager`). Seed data lives only in the live DB; `public.seed_appellation_flavors(jsonb)` upserts profiles by appellation/descriptor name.

**Food-to-wine pairing** (`src/types/foodPairings.ts`, `src/services/foodPairings.ts`, `src/stores/foodPairings.ts`, `src/lib/foodTagMatcher.ts`, `src/lib/foodPairingScorer.ts`, `src/lib/foodPairingProfile.ts`; design in `docs/food-pairing-plan.md`):
Controlled vocabulary `food_tags` (category + synonyms) ← free text via a pure phrase + Dice-coefficient matcher (no AI), or picked directly / via `dish_presets`. Two scoring layers: `wine_style_food_pairings` (style × tag baseline, works for every appellation with `wine_styles`) and sparse `appellation_food_pairings` overrides (style-scoped; a DB trigger rejects a style the appellation doesn't make; edited via `AppellationFoodPairingManager`). Each result carries a 0–10 `match` (style fit averaged over the tags the style rates, capped at 8, plus up to +2 appellation evidence: a curated override, or the appellation's own `food_pairings` prose read by the same matcher via `foodPairingEditorial.ts`, where a dish only counts for the wine styles that rate its main ingredient — a white's grilled river fish can't lift the red; the appellation page splits dishes per style the same way) — lists sort on it, ties fall to raw score, fewer styles, then name (cellar: your rating). `scoreAppellations` keeps every style's score in `styleScores`; `scoreCellarWines` looks up the bottle's OWN style there and scores raw `WineRecord`s from a fresh `fetchUserWines()` — never `UserWine` (its `style` defaults to `'red'`). `search()` awaits shared load promises (vocabulary + appellation catalogue) so a direct visit to `/pairing` can't score an empty catalogue. Free-text queries are logged to `food_search_queries` (admin-readable) — unmatched ones drive vocabulary growth. Admins manage it at `/manage/food-pairing` (tags + live matcher tester, style baseline, quick picks, unmatched-search backlog; admin actions live in the same store so edits show on `/pairing` immediately). Seed data lives only in the live DB; `public.seed_food_tags`, `seed_wine_style_food_pairings`, `seed_dish_presets` (jsonb, idempotent, not callable via the Data API) upsert it.

**Per-style appellation text** (`src/types/appellationStyleProfiles.ts`, `src/services/…`, `src/stores/…`, `src/lib/appellationStyleView.ts`):
A white and a red from one appellation are different wines, but `wine_appellations` holds one `style_summary` / `drinking_window` / `signature_grapes`. For appellations with several `wine_styles` (130 of 212), `appellation_style_profiles` holds the per-style version (unique per appellation + style; a trigger rejects a style the appellation doesn't make and grapes outside its own `signature_grapes`; RLS public-read/admin-write). The appellation page shows a style switcher (`?style=` in the URL) for these and falls back field by field to the whole-appellation text, labelled as such; single-style appellations are unchanged. Edited per style in `AppellationStyleProfileManager` (saving marks a row `reviewed`); `public.seed_appellation_style_profiles(jsonb)` bulk-loads batch-written rows as `generated` and never overwrites `reviewed` ones. The drinking-window engine does not read any of this (it reads only `dw_*` tables and the wine's own fields).

**UI components:** shadcn-style primitives under `src/components/ui/` built on `reka-ui`. Shared components are in `src/components/`. The `cn()` utility (`src/lib/utils.ts`) merges Tailwind classes.

**Path alias:** `@/` maps to `src/`.
