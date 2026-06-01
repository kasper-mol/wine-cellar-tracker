# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev          # start dev server (Vite, hot reload)
npm run build        # type-check + production build
npm run type-check   # vue-tsc type checking only
npm run lint         # ESLint with auto-fix
npm run format       # Prettier on src/
```

No test suite is configured.

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
- `/manage/*` — admin CRUD pages (countries, regions, appellations, grape varieties, vintage ratings, flavor descriptors, wine maps)

**Wine maps subsystem** (`src/services/wineMaps.ts`, `src/types/wineMaps.ts`, `src/stores/wineMaps.ts`):
SVG-based interactive maps stored in `public/maps/`. A `WineMapDefinition` owns versioned SVG assets (`WineMapAssetVersion`) and a set of `WineMapAreaMapping` rows that link SVG element IDs (parsed via `inkscape:label` or `id`) to wine countries/regions/appellations. `importWineMapAreas()` fetches the SVG at runtime, extracts shape IDs, and upserts new rows. The legacy `src/config/countryMapConfig.ts` approach (hardcoded SVG import + fill config) is superseded by this DB-driven system.

**UI components:** shadcn-style primitives under `src/components/ui/` built on `reka-ui`. Shared components are in `src/components/`. The `cn()` utility (`src/lib/utils.ts`) merges Tailwind classes.

**Path alias:** `@/` maps to `src/`.
