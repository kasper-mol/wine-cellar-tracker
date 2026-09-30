# Food-to-wine pairing: design

## The approach, in one paragraph

Build a small, hand-curated **food tag vocabulary** (proteins, seafood, cooking methods, flavour profiles, cuisines — a few hundred rows total, the same order of magnitude as the WSET flavour lexicon already in this app). Free text and the "select" UI both resolve to a set of these tags — free text via phrase + fuzzy matching in plain TypeScript, selection directly. Tags connect to wine via **two layers**: a small `wine_style_food_pairings` table (7 wine styles × a curated subset of tags) that gives every appellation *with a populated `wine_styles` array* a sensible recommendation from day one; and an optional, sparse `appellation_food_pairings` table — structurally similar to the existing `appellation_flavors` join table, but style-scoped — for appellation-specific overrides an editor adds over time, the way flavour descriptors get added today. This is the same "controlled vocabulary + join table" shape this codebase already uses for the flavour lexicon, split into a cheap baseline layer and an optional precision layer so the feature doesn't need per-appellation curation to be useful.

## Assumptions

- "Recommended appellations" means appellations the user can then browse to (`/appellation/:id`), not raw wine names.
- "Their own wines" means rows in the `wines` table for the signed-in user, matched by appellation FK when set, falling back to `style` when not. Scoring is done against the raw `WineRecord` shape (via the existing `fetchUserWines()` service), fetched fresh for the pairing search rather than reused from `src/stores/main.ts`'s `UserWine[]` — see §4.3 for why that distinction matters.
- English-only free text for v1 (the rest of the app's copy is English-only; see Edge cases).
- No requirement to retroactively auto-tag existing appellations with food tags — the baseline layer makes the feature work everywhere *that already has `wine_styles` set*; per-appellation tagging is opt-in, same as flavour descriptors are today. Backfilling `wine_styles` itself (where missing) is treated as a separate, small, already-tracked editorial task — see §6, Phase 0.
- "Not require entering every possible food" is read as: the *vocabulary* is finite and hand-curated (that's fine and expected — the flavour lexicon is too), but the *matching* must generalize across free-text phrasing without a row per phrase.

## 1. Data model

Five new tables. Written as schema you'd hand to the Supabase MCP `apply_migration` workflow this project already uses — not a `.sql` file in the repo.

### 1.1 `food_tags` — the controlled vocabulary

```sql
create table food_tags (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'protein', 'seafood', 'vegetable_produce', 'cheese_dairy',
    'preparation', 'flavor_profile', 'cuisine', 'dessert_sweet'
  )),
  name text not null,                    -- canonical display name, e.g. "Salmon"
  slug text not null unique,             -- stable key, e.g. "salmon" — used by the seed fn
  synonyms text[] not null default '{}', -- lowercase, trimmed: {'salmon','ocean trout','steelhead'}
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index food_tags_category_idx on food_tags (category);
```

`category` is a `text` + `check`, matching how `wine_appellations.wine_styles` already stores its lowercase tokens ("a DB CHECK constrains the column to this set") rather than a Postgres `enum` type — adding a ninth category later is one migration either way, but this keeps the two systems consistent for whoever reads the schema next.

Two facets deliberately live in the *same* table as flat categories rather than being split into separate concept tables (e.g. "ingredient" vs "cooking method" vs "cuisine"): `preparation` (grilled, raw, fried, braised, smoked, curried…) and `flavor_profile` (spicy, rich/fatty, acidic, salty, umami, smoky, herbaceous, sweet-savory) sit alongside `protein`/`seafood`/etc. A dish is described by combining tags across categories ("salmon" + "grilled" + "smoky"), which is what lets a bounded set of ~150–220 tags cover an effectively unbounded set of dishes — see §6.

`sort_order` (together with `id` as a final tiebreaker) is also what pins the vocabulary's fetch order for the matcher — see §2's note on determinism.

### 1.2 `wine_style_food_pairings` — the baseline layer (the important one)

```sql
create table wine_style_food_pairings (
  id uuid primary key default gen_random_uuid(),
  wine_style text not null check (wine_style in
    ('red','white','rose','orange','sparkling','sweet','fortified')),
  food_tag_id uuid not null references food_tags(id) on delete cascade,
  affinity smallint not null check (affinity in (-2, -1, 1, 2)),
  -- -2 clashes badly, -1 mild clash, 1 good match, 2 excellent/classic match.
  -- No row = no claim either way (neutral), same convention as appellation_flavors: absence means "not curated", not "bad".
  note text,                             -- optional one-line "why", shown in the admin editor
  created_at timestamptz not null default now(),
  unique (wine_style, food_tag_id)
);
```

`wine_style` reuses the seven-token vocabulary from `wine_appellations.wine_styles` (`src/types/wineAppellations.ts:20`) as the canonical style, not the `wines.style` five-token union — see §4.3 for why, and the one function that bridges them.

This table is what makes the feature work without curating each appellation individually: **for any appellation whose `wine_styles` array is populated**, the baseline pairing score is just "for each of this appellation's styles, sum the affinities of that style's rows against the matched tags, and take the style that scores highest." Seed this table once with standard pairing theory (high acid cuts fat, tannin wants protein/fat, sweetness balances spice/salt/richness, body matches weight) and every such appellation gets a reasonable recommendation immediately.

That qualifier matters and is addressed head-on rather than glossed over: `wine_styles` is nullable, and is genuinely `null` for any appellation still at `copy_status = 'pending'` (`src/types/wineAppellations.ts:17,36` — the type file's own comment says copy "sits at `pending` until a batch lands"). An appellation in that state has no scoreable baseline, full stop — see §6 Phase 0 for how big that gap actually is and how to close it, and §8 for why the scorer excludes rather than guesses for it.

### 1.3 `appellation_food_pairings` — optional, style-scoped overrides

```sql
create table appellation_food_pairings (
  id uuid primary key default gen_random_uuid(),
  appellation_id uuid not null references wine_appellations(id) on delete cascade,
  wine_style text not null check (wine_style in
    ('red','white','rose','orange','sparkling','sweet','fortified')),
  food_tag_id uuid not null references food_tags(id) on delete cascade,
  affinity smallint not null check (affinity in (-2, -1, 1, 2)),
  note text,
  created_at timestamptz not null default now(),
  unique (appellation_id, wine_style, food_tag_id)
);
create index appellation_food_pairings_appellation_idx on appellation_food_pairings (appellation_id);
create index appellation_food_pairings_tag_idx on appellation_food_pairings (food_tag_id);

-- Keep overrides honest: an override can only be written for a style the
-- appellation actually produces, so a curator can't accidentally (or the
-- scorer can't accidentally) apply a white-wine pairing to a red-only appellation.
-- NULL wine_styles (pending-copy appellations) correctly fails this check too —
-- see the admin-UI guard below, which is what a curator actually hits first.
create or replace function appellation_food_pairings_validate_style()
returns trigger as $$
begin
  if not exists (
    select 1 from wine_appellations
    where id = new.appellation_id
      and new.wine_style = any(wine_styles)
  ) then
    raise exception
      'wine_style % is not one of this appellation''s wine_styles (is wine_styles set on this appellation at all?)',
      new.wine_style;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger appellation_food_pairings_validate_style_trg
  before insert or update on appellation_food_pairings
  for each row execute function appellation_food_pairings_validate_style();
```

This table intentionally carries a `wine_style` column and a trigger that ties every row back to that specific appellation's own `wine_styles` array — not a bare, unconstrained `appellation_id` + `food_tag_id` pair. A design that skipped the style column would let one curated pairing silently apply to every style an appellation makes (including styles the curator never meant it for), and would let an admin save a row for a style the appellation doesn't even produce with no error and no visible symptom. Both failure modes are closed here, at the schema level, not just documented as a risk to watch for — and, as of §4.2/§4.3 below, that per-style precision is now actually honored end to end when matching a specific owned bottle, not just at write time.

Same shape as the existing `appellation_flavors` join table (already style-scoped via its own `wine_style` column): a manager component that looks and works like `AppellationFlavorManager.vue` (style picker + toggle grid), a display component that looks like `AppellationFlavorSection.vue`. This is where "Sancerre + goat cheese" (a specific, famous *white*-Sancerre pairing that beats the generic "white wine + cheese" baseline) gets recorded — as `{appellation: Sancerre, wine_style: 'white', food_tag: 'goat-cheese', affinity: 2}` — on top of the baseline. A multi-style appellation can have independent, even opposite, overrides per style — a chocolate dessert might suppress its reds (`affinity: -2`) while a fortified bottling from the same appellation gets boosted (`affinity: 2`) — without one leaking onto the other.

**Admin-UI guard (this is the actual fix for the trigger-vs-pending-appellation interaction):** `AppellationFoodPairingManager.vue` checks `appellation.wine_styles` before rendering the style picker. If it's `null` or empty, the manager shows "Set this appellation's wine styles (Copy tab) before adding food-pairing overrides" in place of the form and disables the add control. A curator editing a pending appellation is told *why* they can't add an override yet, in the same editor, instead of hitting a raw Postgres exception from the DB trigger — which stays in place purely as a server-side safety net (e.g. against a stale client that hasn't re-fetched `wine_styles`), not as the primary UX. The same guard is why an override's `wine_style` can never silently drift from the appellation's real `wine_styles`: the picker only ever offers styles the appellation actually has, the trigger rejects anything else server-side, and there is no code path (admin UI or seed function) that writes an `appellation_food_pairings` row without going through one of those two checks — a mismatched, silently-ignored override the way an unconstrained table would allow simply can't be created.

### 1.4 `dish_presets` / `dish_preset_tags` — quick-pick shortcuts for the "select" path

```sql
create table dish_presets (
  id uuid primary key default gen_random_uuid(),
  label text not null,          -- "Grilled salmon", "Margherita pizza", "Aged cheddar"
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table dish_preset_tags (
  dish_preset_id uuid not null references dish_presets(id) on delete cascade,
  food_tag_id uuid not null references food_tags(id) on delete cascade,
  primary key (dish_preset_id, food_tag_id)
);
```

A `dish_preset` is nothing but a named bundle of `food_tags` (e.g. "Grilled salmon" → `{salmon, grilled}`). It has **no independent matching logic** — it's sugar over the same tag vocabulary the free-text path uses, there purely so the "select something" UI has nice tappable options and free text has autocomplete suggestions. This table is optional set-dressing, not the mechanism: the feature works with zero rows in `dish_presets` (the select path just falls back to the category/tag browser in §3).

### 1.5 `food_search_queries` — the maintenance feedback loop

```sql
create table food_search_queries (
  id uuid primary key default gen_random_uuid(),
  raw_query text not null,
  matched_tag_ids uuid[] not null default '{}',
  matched_count int not null default 0,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index food_search_queries_matched_count_idx on food_search_queries (matched_count);
```

Every free-text search gets logged (fire-and-forget insert, don't block the UI on it). This is the honest answer to "how does the vocabulary grow without guessing": periodically run

```sql
select raw_query, count(*) from food_search_queries
where matched_count = 0
group by raw_query order by count(*) desc limit 50;
```

and you have a prioritized list of exactly what real users typed that the vocabulary doesn't cover yet — add synonyms or tags for the ones that show up repeatedly. Growth is driven by observed usage, not speculative pre-authoring of every dish on Earth.

### 1.6 RLS

`food_tags`, `wine_style_food_pairings`, `appellation_food_pairings`, `dish_presets`, `dish_preset_tags` are reference/catalog data, same category as `wine_appellations` and `flavor_clusters`: public `select`, admin-only write. The admin check is **not** a new mechanism — this codebase already gates `/manage/*` write access via a `profiles.is_admin` boolean, read into `useAuthStore.isAdmin` in `fetchProfile()` (`src/stores/auth.ts:9,26,29`: `.select('is_admin, can_scan_labels')` → `isAdmin.value = data?.is_admin ?? false`). Every policy below reuses that exact column via the standard `exists (select 1 from profiles ...)` RLS idiom, so a developer has real DDL to paste into the `apply_migration` call, not a "same as elsewhere" pointer to go verify by hand:

```sql
alter table food_tags enable row level security;
alter table wine_style_food_pairings enable row level security;
alter table appellation_food_pairings enable row level security;
alter table dish_presets enable row level security;
alter table dish_preset_tags enable row level security;

create policy food_tags_read on food_tags for select using (true);
create policy food_tags_admin_write on food_tags for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

create policy wine_style_food_pairings_read on wine_style_food_pairings for select using (true);
create policy wine_style_food_pairings_admin_write on wine_style_food_pairings for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

create policy appellation_food_pairings_read on appellation_food_pairings for select using (true);
create policy appellation_food_pairings_admin_write on appellation_food_pairings for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

create policy dish_presets_read on dish_presets for select using (true);
create policy dish_presets_admin_write on dish_presets for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

create policy dish_preset_tags_read on dish_preset_tags for select using (true);
create policy dish_preset_tags_admin_write on dish_preset_tags for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
```

(A `for all` write policy also technically covers `select`, but since it's a *permissive* policy, Postgres OR's it with the public-read policy above — the net effect is exactly "anyone can read, only an admin can write," not a narrowing of the public read. This is a standard, low-risk pattern, not a subtlety a developer has to reason through per table.)

`food_search_queries` is per-user usage data, not catalog data, so it gets its own two policies — an insert rule for the user writing their own search, and a select rule for admin review of the unmatched-query backlog:

```sql
alter table food_search_queries enable row level security;

create policy food_search_queries_insert on food_search_queries
  for insert
  with check (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and user_id is null)
  );

create policy food_search_queries_admin_select on food_search_queries for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
```

An authenticated insert must carry its own `auth.uid()` (never someone else's, never null); an anonymous insert (if the app allows browsing signed-out) may only carry `user_id = null`, never an arbitrary id. Only an admin can read the table back — this is developer analytics for the §6 vocabulary-growth loop, not something any signed-in user should be able to query for other users' searches.

### 1.7 Relationship to the existing `wine_appellations.food_pairings` free text

Leave it exactly as-is: unmodified column, unmodified `AppellationCopySection.vue` display, unmodified admin textarea. It's editorial prose ("seared foie gras, Roquefort, tarte Tatin") written in the same batch-authored voice as `style_summary` and `fun_fact` — collapsing it into structured tags automatically would require parsing free text with something well beyond a synonym dictionary, and would produce bad data on anything but the simplest phrases. Don't attempt that.

Instead, relabel it in the UI as **"Classic pairings"** (editorial, human-written, shown as prose) sitting next to a new **"Pairs well with"** section (the structured tag chips from §1.2/§1.3, shown as clickable pills that link into the new pairing search). Two sections, two purposes, no silent duplication: one is a sommelier's note, the other is queryable data. As a curation *aid*, not automation, the appellation admin editor can show the existing `food_pairings` text next to the new tag picker as a hint for what to tag — a human still decides.

## 2. Free-text matching

**No AI, no LLM, no embeddings.** Matching is a pure, synchronous, unit-testable TypeScript function that runs against the small in-memory tag vocabulary (a few hundred rows, loaded once and cached — see §4). No network round trip per keystroke, no Postgres function to keep in sync with the matching logic living somewhere else. `pg_trgm` fuzzy matching *inside* Postgres would work too, but it would split the pairing logic across two places (a stored procedure and app code) that have to be reasoned about together and can drift apart. Since the vocabulary is bounded by design (see §6 — it never needs to be "every dish", only "every generalizable concept"), client-side matching is both sufficient and easier to test, read, and change. If the vocabulary ever grew into the tens of thousands of rows (it structurally can't — see §6), `pg_trgm` is a drop-in escape hatch behind the same function signature.

### 2.1 Algorithm

1. **Normalize**: lowercase, strip punctuation, collapse whitespace, split into words. Stopwords are **not** removed at this stage — the array produced here (`words`) is the full, order-preserving tokenization of exactly what the user typed, and it is what step 2's sliding window runs over. This matters: if stopwords were stripped before phrase-matching, two words that are not adjacent in the real sentence (separated by a removed "with"/"a"/"the") would become adjacent in the filtered array and could be matched as a phantom two-word phrase that was never actually typed. This design avoids that class of bug by construction — phrase adjacency is always checked against the true, unfiltered input, and stopwords are only ever consulted later, per single leftover word, in step 3.
2. **Phrase match, longest first**: every tag's `name` + `synonyms` is itself a word sequence — of whatever length it actually is: one word ("salmon"), two ("goat cheese"), three or more ("fish and chips" is a perfectly valid synonym on a tag, not a special case). Build a lookup of phrase → tag once per vocabulary load, sorted by word count descending. Slide a window over the *unfiltered* input (from step 1) from the longest known phrase length down to 1 — a genuine variable-width sliding window over real, adjacent words, not a fixed unigram/bigram cap and not a window over a stopword-stripped array — so a 3-word synonym like `"fish and chips"` is matched by its own 3-word window at any position in a longer sentence such as "having fish and chips tonight", not only when the entire input is that phrase verbatim, and two unrelated words separated by a stopword (e.g. "salmon" ... "with a" ... "lemon") can never be mistaken for a synonym phrase they were never part of. On a hit, record an exact match (confidence `1.0`) and consume those words so they can't also match a shorter phrase or get fuzzy-matched individually.
3. **Fuzzy fallback on leftover words**: any input word ≥ 3 characters that wasn't consumed and isn't in a small stopword list (`with, and, the, a, an, of, in, on, for, some, my, our, i'm, im, eating, having, tonight, dinner`) is compared against every single-word synonym/name using a bigram (Dice coefficient) similarity — cheap, dependency-free, tolerant of typos and simple pluralization ("salmons", "grilld"). A hit above a `0.72` similarity threshold is recorded at that confidence. **This runs independently per leftover word and is never gated by whether other words in the same query already matched exactly** — step 3 iterates every word for which `consumed[i]` is still `false` after step 2, full stop. For example, "spicy grillled chicken" phrase-matches "spicy" and "chicken" exactly in step 2 (consuming those two words) and *still* fuzzy-matches the misspelled "grillled" against the "grilled" synonym in the very same call to `matchFoodTags`, because step 3 has no "did anything already match" precondition — only "is this specific word still unconsumed."
4. **Dedup**: if the same tag was matched more than once (e.g. via both a synonym phrase and a fuzzy single word), keep the highest-confidence match.
5. Return matches sorted by confidence, descending.

**Determinism depends on a pinned vocabulary order, made explicit here:** `fetchFoodTags()` (§5) fetches with `.order('sort_order').order('id')`, so the array passed into `buildPhraseIndex` has a stable, reproducible order for a given data snapshot — not whatever order Postgres happens to return without an `ORDER BY`. `buildPhraseIndex`'s `.sort((a, b) => b.words.length - a.words.length)` relies on `Array.prototype.sort` being a **stable** sort (guaranteed by the ECMAScript spec since ES2019), so entries with equal word-length keep their original (now-pinned) relative order. The fuzzy-match tie-break in step 3 (`score > best.score`, strict) therefore always resolves a same-score tie in favor of the tag that sorts first by `sort_order, id` — a fixed, inspectable rule, not incidental database row order.

```ts
// src/lib/foodTagMatcher.ts — pure, no Supabase import, fully unit-testable
import type { FoodTagRecord } from '@/types/foodPairings'

export interface FoodTagMatch {
  tag: FoodTagRecord
  matchedPhrase: string
  confidence: number // 1 = exact phrase, else fuzzy similarity
}

const STOPWORDS = new Set([
  'with', 'and', 'the', 'a', 'an', 'of', 'in', 'on', 'for', 'some',
  'my', 'our', 'im', "i'm", 'eating', 'having', 'tonight', 'dinner',
])

function normalize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function bigrams(word: string): Set<string> {
  const padded = `_${word}_`
  const set = new Set<string>()
  for (let i = 0; i < padded.length - 1; i++) set.add(padded.slice(i, i + 2))
  return set
}

function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const A = bigrams(a)
  const B = bigrams(b)
  let overlap = 0
  for (const g of A) if (B.has(g)) overlap++
  return (2 * overlap) / (A.size + B.size)
}

interface PhraseEntry {
  words: string[]
  tag: FoodTagRecord
}

/** Build once per vocabulary load (memoize on the `tags` array reference in the store).
 *  `tags` must already be in a stable, pinned order (see fetchFoodTags's ORDER BY) —
 *  this function relies on Array.sort's stability to keep determinism end to end.
 *  Phrase length is whatever each tag's name/synonym actually is — 1, 2, 3+ words —
 *  there is no cap; a longer phrase just sorts earlier and gets its own window width. */
export function buildPhraseIndex(tags: FoodTagRecord[]): PhraseEntry[] {
  const entries: PhraseEntry[] = []
  for (const tag of tags) {
    for (const phrase of [tag.name, ...tag.synonyms]) {
      entries.push({ words: normalize(phrase), tag })
    }
  }
  return entries.sort((a, b) => b.words.length - a.words.length)
}

export function matchFoodTags(input: string, tags: FoodTagRecord[], index?: PhraseEntry[]): FoodTagMatch[] {
  const phraseIndex = index ?? buildPhraseIndex(tags)
  // `words` is the full, unfiltered tokenization of the raw input — no stopwords removed.
  // Phrase matching below therefore only ever recognizes words that are truly adjacent
  // in what the user typed; it can't synthesize a phrase from words a removed stopword
  // used to separate.
  const words = normalize(input)
  const consumed = new Array(words.length).fill(false)
  const matches = new Map<string, FoodTagMatch>()

  // Step 2: phrase matching, longest window first, over the unfiltered `words` array.
  // No early return here or below — this loop runs to completion regardless of how
  // many phrases it finds.
  const maxLen = phraseIndex[0]?.words.length ?? 1
  for (let len = maxLen; len >= 1; len--) {
    for (const entry of phraseIndex) {
      if (entry.words.length !== len) continue
      for (let start = 0; start <= words.length - len; start++) {
        if (consumed.slice(start, start + len).some(Boolean)) continue
        let hit = true
        for (let i = 0; i < len; i++) if (words[start + i] !== entry.words[i]) { hit = false; break }
        if (!hit) continue
        for (let i = 0; i < len; i++) consumed[start + i] = true
        const existing = matches.get(entry.tag.id)
        if (!existing || existing.confidence < 1) {
          matches.set(entry.tag.id, { tag: entry.tag, matchedPhrase: entry.words.join(' '), confidence: 1 })
        }
      }
    }
  }

  // Step 3: fuzzy fallback. Iterates every word unconditionally — there is no
  // "skip this whole step if step 2 found anything" gate. Each leftover word is
  // judged purely on its own `consumed[i]` flag. Stopwords are filtered out only
  // here, per single word — never before step 2's phrase adjacency check.
  const singleWordEntries = phraseIndex.filter((e) => e.words.length === 1)
  words.forEach((word, i) => {
    if (consumed[i] || word.length < 3 || STOPWORDS.has(word)) return
    let best: { entry: PhraseEntry; score: number } | null = null
    for (const entry of singleWordEntries) {
      const score = diceSimilarity(word, entry.words[0])
      // Strict `>` is intentional: combined with singleWordEntries' now-pinned,
      // stable order (see determinism note above), ties always resolve to the
      // same tag for the same vocabulary snapshot.
      if (score >= 0.72 && (!best || score > best.score)) best = { entry, score }
    }
    if (best) {
      const existing = matches.get(best.entry.tag.id)
      if (!existing || existing.confidence < best.score) {
        matches.set(best.entry.tag.id, { tag: best.entry.tag, matchedPhrase: word, confidence: best.score })
      }
    }
  })

  return [...matches.values()].sort((a, b) => b.confidence - a.confidence)
}
```

This is deterministic and inspectable end to end: given the same vocabulary snapshot and the same input string, it always returns the same matches, and you can step through exactly why any given word matched or didn't in a debugger or a unit test — the explicit design goal behind "no AI."

## 3. The "select" path

Two tiers, both feeding the same matched-tag set as free text does (a selection is just a match with confidence `1.0` and no parsing needed):

1. **Quick picks**: a grid of `dish_presets` chips ("Steak", "Grilled salmon", "Roast chicken", "Spicy Thai", "Aged cheddar", "Pizza", "Sushi", "Chocolate dessert" …), tap one, done. This is the 80% case — "I don't want to type, just show me something."
2. **Build your own**, a disclosure/accordion below the quick picks: the eight `food_tag` categories as tabs or a segmented control, each showing its tags as toggleable chips (reusing the `Select`/toggle-grid pattern already built for `AppellationFlavorManager.vue`). Multi-select across categories — e.g. tap "Chicken" (protein) + "Curry" (preparation) + "Spicy" (flavor_profile) — and search immediately reflects the combined set, same as typing "spicy chicken curry" would.

Both write into the same `selectedTags: FoodTagMatch[]` the free-text box produces, so the recommendation engine (§4) never needs to know which path produced the tags.

## 4. From matched tags to recommendations

### 4.1 Vocabulary and appellation-catalogue loading

`src/stores/foodPairings.ts` loads `food_tags` (ordered `sort_order, id` — see §2's determinism note), all of `wine_style_food_pairings` (small, load in full), and `dish_presets` (+ their tags) once, lazily, the first time the pairing UI is used, and keeps them in memory for the session — a few hundred rows, well under 100KB, no reason to refetch per search.

**The appellation catalogue the scorer runs against must also be loaded before a search runs — and, critically, a search must actually *wait* for that load rather than racing it.** `useWineAppellationsStore().appellations` is populated only by an explicit `loadAll()` call, which today only happens from `DashboardPage.vue`. `PairingPage.vue` cannot assume a user arrived via the dashboard — a bookmark, a shared link, or a page refresh all land directly on `/pairing`. A naive fire-and-forget `loadAll()` inside `onMounted`, with nothing gating the search action on its completion, is not enough: a user who submits a search before that fetch resolves would run the scorer against an empty appellation array and see a silent, false "no matches" — indistinguishable from a genuine no-match. So the food-pairings store owns a single shared, awaitable load, and `search()`/`searchByTags()` always await it before scoring, regardless of whether a prefetch is also in flight:

```ts
// src/stores/foodPairings.ts (excerpt)
const isSearching = ref(false)
let appellationsReadyPromise: Promise<unknown> | null = null

/** Shared by the page's eager prefetch and every search call, so concurrent
 *  callers never trigger a duplicate fetch, and a search always awaits the
 *  SAME promise a prefetch may have already started. */
function ensureAppellationsLoaded() {
  const wineAppellationsStore = useWineAppellationsStore()
  if (wineAppellationsStore.appellations.length > 0) return Promise.resolve()
  if (!appellationsReadyPromise) {
    appellationsReadyPromise = wineAppellationsStore.loadAll().finally(() => {
      appellationsReadyPromise = null
    })
  }
  return appellationsReadyPromise
}

async function search(input: string) {
  isSearching.value = true
  try {
    await ensureAppellationsLoaded() // never proceeds against an empty/partial catalogue
    currentMatches.value = matchFoodTags(input, tags.value)
    // ... fetch overrides + user's wines, call scoreAppellations / scoreCellarWines (§4.2–4.3)
  } finally {
    isSearching.value = false
  }
}
```

```ts
// src/pages/PairingPage.vue (excerpt)
const foodPairingsStore = useFoodPairingsStore()

onMounted(() => {
  // Eager prefetch only — a UX optimization so the catalogue is often already
  // warm by the time the user finishes typing. Correctness does NOT depend on
  // this finishing before search() runs, because search() awaits the same
  // ensureAppellationsLoaded() promise itself (see the store excerpt above).
  foodPairingsStore.ensureAppellationsLoaded()
  foodPairingsStore.loadVocabulary()
})
```

`FoodPairingSearch.vue`'s submit control is disabled while `foodPairingsStore.isSearching` is true, with a short loading label ("Loading the wine catalogue…" on the first, cold-start call) — so the direct-link case is a visible loading state, never a silent false negative. This is a store the pairing feature reads but doesn't own, so the guard lives at the call site rather than inside `useWineAppellationsStore` itself — no change to that store's existing behavior for its existing callers (the dashboard, the browse pages).

### 4.2 Appellation scoring

Scoring is style-scoped throughout: for each appellation, each of its `wine_styles` is scored independently (baseline affinity **plus** any style-matching override, combined *within* that one style before anything is summed across tags). Unlike a design that only kept the single best-scoring style, **every style's score is retained**, not just the winner — `scoreCellarWines` (§4.3) needs to look up an owned bottle's own specific style, not the appellation's best one, and collapsing to a single number here is exactly what breaks that (see the rejected alternative in §9). The best-scoring style is still surfaced too, as `score`/`drivingStyle`, purely for the appellation-level "Appellations to try" list and its "why" label.

This function does not filter, sort, or truncate its results: it returns exactly one entry per appellation that has a populated `wine_styles`, in input order, whatever the score. An appellation whose best style nets to zero or negative (e.g. every matched tag clashes, or a curator wrote a suppressing override) is still returned, just with a low/negative `score`. There is no `.slice(...)` anywhere in this function and no cap on how many results it hands back — filtering to "worth showing" happens only at the call site that builds the user-facing list (§4.4), against a full copy of this array, never against a version already cut down to some display-sized N.

```ts
// src/lib/foodPairingScorer.ts
import type { WineAppellationRecord, WineStyle } from '@/types/wineAppellations'
import type { FoodTagMatch } from '@/lib/foodTagMatcher'
import type { WineStyleFoodPairingRecord, AppellationFoodPairingRecord } from '@/types/foodPairings'

export interface StyleScore {
  score: number
  matchedTagIds: string[]
}

export interface AppellationPairingResult {
  appellation: WineAppellationRecord
  score: number                  // best single style's score — drives "Appellations to try" ranking/filtering
  drivingStyle: WineStyle | null // the style that produced `score` — the appellation-level "why" label
  matchedTagIds: string[]        // tags matched under drivingStyle
  styleScores: Partial<Record<WineStyle, StyleScore>>
  // One entry per style this appellation actually produces (appellation.wine_styles),
  // computed independently — INCLUDING styles that score <= 0, e.g. a suppressed one.
  // scoreCellarWines (§4.3) reads a SPECIFIC entry keyed by the owned wine's own
  // `style`; it never substitutes `score`/`drivingStyle` above for an individual
  // bottle. This map is what makes a per-style suppression actually reach cellar
  // matching correctly — see §9.
}

export function scoreAppellations(
  appellations: WineAppellationRecord[],
  matches: FoodTagMatch[],
  baseline: WineStyleFoodPairingRecord[],
  overrides: AppellationFoodPairingRecord[], // pre-filtered to the matched tag ids; carries wine_style
): AppellationPairingResult[] {
  const confidenceByTag = new Map(matches.map((m) => [m.tag.id, m.confidence]))
  const baselineByStyleTag = new Map(baseline.map((b) => [`${b.wine_style}:${b.food_tag_id}`, b.affinity]))
  const overrideByAppStyleTag = new Map(
    overrides.map((o) => [`${o.appellation_id}:${o.wine_style}:${o.food_tag_id}`, o.affinity]),
  )

  const results: AppellationPairingResult[] = []
  for (const appellation of appellations) {
    const styles = appellation.wine_styles ?? []
    if (styles.length === 0) continue // no wine_styles set yet (e.g. copy_status 'pending') — see §6 Phase 0 and §8; never guess a score

    const styleScores: Partial<Record<WineStyle, StyleScore>> = {}
    let best: { score: number; style: WineStyle; matchedTagIds: string[] } | null = null

    for (const style of styles) {
      let styleScore = 0
      const matchedTagIds: string[] = []
      for (const [tagId, confidence] of confidenceByTag) {
        const baseAffinity = baselineByStyleTag.get(`${style}:${tagId}`) ?? 0
        // Overrides are scoped to (appellation, style, tag) — a style-specific
        // curation can never leak onto a sibling style of the same appellation.
        const overrideAffinity = overrideByAppStyleTag.get(`${appellation.id}:${style}:${tagId}`) ?? 0
        const combined = baseAffinity + overrideAffinity
        if (combined !== 0) {
          styleScore += combined * confidence
          matchedTagIds.push(tagId)
        }
      }
      // Every style gets its own persisted entry — unconditionally, even when
      // styleScore <= 0. This is the source of truth scoreCellarWines reads.
      styleScores[style] = { score: styleScore, matchedTagIds }
      if (best === null || styleScore > best.score) best = { score: styleScore, style, matchedTagIds }
    }

    results.push({
      appellation,
      score: best!.score,
      drivingStyle: best!.style,
      matchedTagIds: best!.matchedTagIds,
      styleScores,
    })
  }
  return results // no filter, no sort, no slice — every scored appellation, every one of its styles, comes back
}
```

`appellations` comes from `useWineAppellationsStore().appellations` once §4.1's `ensureAppellationsLoaded()` has resolved. `overrides` is a *targeted* fetch — `appellation_food_pairings` rows `where food_tag_id in (<matched tag ids>)` — not the whole table, so this stays cheap even once editors have curated hundreds of appellations.

Note on naming: `WineStyle` here is imported directly from `@/types/wineAppellations`, the module that actually exports it (`src/types/wineAppellations.ts:20`) — this scorer never invents or re-imports an alias for it. The only alias in this design lives locally inside `src/lib/wineStyles.ts` (§4.3), used exclusively within that one file's own bridging function and never referenced by that alias name from anywhere else.

### 4.3 Cellar wine scoring, sourced from `WineRecord` (not `UserWine`) — matched by the bottle's *own* style, never an appellation's collapsed best

**Why `WineRecord`, not the `UserWine[]` already sitting in `src/stores/main.ts`:** `UserWine.style` is typed as the non-nullable `WineStyle` (`src/types/wines.ts:90`), and the mapper that produces it, `wineRecordToUserWine`, defaults a missing style: `style: r.style ?? 'red'` (`src/types/wines.ts:154`). That default exists for the main cellar list UI, where every wine needs *some* style label to render a badge — a reasonable choice there. But it means a cellared wine with no `style` set and no `appellation` picked would silently arrive at the pairing scorer disguised as a red wine, which is precisely the "silently making something up" failure this design is built to avoid. Rather than touching `wineRecordToUserWine` (shared code with its own reasons for that default, used elsewhere in the app) to weaken it for this one caller, the pairing store fetches its own copy of the user's wines via the existing `fetchUserWines()` service (`src/services/wines.ts`, already RLS-scoped — it does a plain `select` with no explicit `user_id` filter, relying on the same RLS policy the main cellar list relies on) and scores against the raw `WineRecord[]`, whose `style` column is genuinely `string | null`. The small cost is a second fetch of the `wines` table independent of the main store's cache; the benefit is that a pairing search always reflects the true DB state (including a bottle added seconds ago) and the null-style exclusion is real, not theoretical. `WineRecord` also carries `appellation: string | null` directly (the FK id) and `appellation_info?: AppellationRef | null` for display, so no separate lookup or type is needed for the "From your cellar" list. There is no `useCellarHoldings`/`UserWine` in this code path at all — scoring reads `wine.style` straight off the fetched `WineRecord` and treats `null` as "cannot be scored," never as an implicit `'red'`.

`wines.style` (`'red' | 'white' | 'rosé' | 'sparkling' | 'dessert'`, `src/types/wines.ts:3`) and `wine_appellations.wine_styles` (`'red' | 'white' | 'rose' | 'orange' | 'sparkling' | 'sweet' | 'fortified'`, `src/types/wineAppellations.ts:20`) are different unions — accented `rosé` vs `rose`, `dessert` vs `sweet`, no `orange`/`fortified` on the wine side. `wine_style_food_pairings.wine_style` uses the appellation-side (larger, canonical) union, so wines need one explicit translation, done in exactly one place — the same pattern this codebase already uses for `wineStyleLabel()` in `src/lib/wineStyles.ts`:

```ts
// src/lib/wineStyles.ts — add alongside the existing wineStyleLabel()
import type { WineStyle as AppellationWineStyle } from '@/types/wineAppellations'
import type { WineStyle as WineRecordStyle } from '@/types/wines'

/** The one place the two WineStyle unions get reconciled. wines.style has no
 *  orange/fortified equivalent — those wines simply don't get a style-baseline
 *  match and fall back to appellation-only scoring (see scoreCellarWines).
 *  `AppellationWineStyle`/`WineRecordStyle` are local import aliases, scoped to
 *  this file only — nothing outside src/lib/wineStyles.ts ever imports a type by
 *  either of these alias names; every other file imports the real exported
 *  `WineStyle` from whichever of the two type modules it needs. */
const TO_APPELLATION_STYLE: Record<WineRecordStyle, AppellationWineStyle> = {
  red: 'red',
  white: 'white',
  rosé: 'rose',
  sparkling: 'sparkling',
  dessert: 'sweet',
}

export function toAppellationStyle(style: WineRecordStyle): AppellationWineStyle {
  return TO_APPELLATION_STYLE[style]
}
```

`toAppellationStyle` is deliberately typed to take the **non-nullable** `WineRecordStyle` — it's only ever called after a caller has already ruled out `null`, so the lookup table itself never has to account for a null key.

**The core fix in this revision:** an owned bottle with an `appellation` FK set must be scored against *that appellation's score for the bottle's own style* — never the appellation's collapsed "best style" figure. A prior version of this design looked up `byAppellationId.get(wine.appellation)` and reused its single `score`/`drivingStyle` for any bottle from that appellation, which meant a bottle in a style a curator had explicitly *suppressed* (e.g. reds, `affinity: -2`) could still be recommended whenever a sibling style (e.g. whites, `affinity: +2`) scored better for the same appellation — the suppression would never reach that specific bottle. `scoreCellarWines` now reads `styleScores[mappedStyle]` for the wine's own, specific style instead:

```ts
import type { WineRecord } from '@/types/wines'
import type { AppellationPairingResult } from '@/lib/foodPairingScorer'

export interface CellarWineMatch { wine: WineRecord; score: number; drivingStyle: WineStyle | null }

export function scoreCellarWines(
  wines: WineRecord[], // fetched fresh via fetchUserWines() — see the note above on why not UserWine[]
  matches: FoodTagMatch[],
  appellationResults: AppellationPairingResult[], // the FULL, UNFILTERED, UNTRUNCATED output of scoreAppellations —
                                                    // do not pre-filter to score > 0 and do not slice to a display-sized
                                                    // top-N before passing this in; every appellation must be lookup-able
  baseline: WineStyleFoodPairingRecord[],
): CellarWineMatch[] {
  // byAppellationId covers every appellation scoreAppellations returned — nothing upstream
  // of this map has filtered or truncated it, so a wine's appellation is always found here
  // regardless of where that appellation would rank in the UI's displayed list.
  const byAppellationId = new Map(appellationResults.map((r) => [r.appellation.id, r]))
  const confidenceByTag = new Map(matches.map((m) => [m.tag.id, m.confidence]))
  const baselineByStyleTag = new Map(baseline.map((b) => [`${b.wine_style}:${b.food_tag_id}`, b.affinity]))

  const results: CellarWineMatch[] = []
  for (const wine of wines) {
    if (wine.appellation && byAppellationId.has(wine.appellation)) {
      const r = byAppellationId.get(wine.appellation)!
      const producedStyles = r.appellation.wine_styles ?? []

      if (wine.style) {
        // The owned bottle's OWN style — never the appellation's collapsed best.
        // A style-specific suppression (affinity < 0 recorded on exactly this
        // style) can now never be masked by a better-scoring sibling style the
        // bottle isn't even made in.
        const mapped = toAppellationStyle(wine.style)
        const styleEntry = r.styleScores[mapped]
        // Undefined when `mapped` isn't actually one of this appellation's real
        // wine_styles (e.g. stale data after a retag) — treated as unscoreable,
        // never silently substituted with the appellation's best style.
        if (styleEntry && styleEntry.score > 0) {
          results.push({ wine, score: styleEntry.score, drivingStyle: mapped })
        }
        continue
      }

      // wine.style is null: which of this appellation's styles the bottle
      // actually is cannot be known, so a style-specific score can't safely be
      // looked up. The only case where that ambiguity doesn't matter is a
      // single-style appellation — there is nothing else the bottle could be.
      // Anything with more than one produced style is excluded rather than
      // guessed at (see §8).
      if (producedStyles.length === 1) {
        const only = producedStyles[0]
        const styleEntry = r.styleScores[only]
        if (styleEntry && styleEntry.score > 0) {
          results.push({ wine, score: styleEntry.score, drivingStyle: only })
        }
      }
      continue
    }
    if (!wine.style) continue // no appellation and no style set on the DB row: genuinely nothing to score against
    const style = toAppellationStyle(wine.style)
    let score = 0
    for (const [tagId, confidence] of confidenceByTag) {
      const affinity = baselineByStyleTag.get(`${style}:${tagId}`)
      if (affinity) score += affinity * confidence
    }
    if (score > 0) results.push({ wine, score, drivingStyle: style })
  }
  return results.sort((a, b) => b.score - a.score)
}
```

A cellared wine with a known `appellation` and a known `style` inherits exactly that style's own score (baseline + any override curation scoped to that style, including a suppression) computed in §4.2 — never a different, better-scoring sibling style's number. A wine with an appellation but no `style` set is only scored when the appellation is single-style (no ambiguity possible); otherwise it's excluded, with an edge case describing the UI nudge to fix that (§8). A wine with a `style` but no `appellation` gets the cheaper style-only baseline. A wine with neither is excluded entirely.

### 4.4 Building the user-facing appellation list

The store calls `scoreAppellations()` **once** per search and keeps the full, unfiltered array for `scoreCellarWines()` to consume. The "Appellations to try" UI list is a derived view over that same array, filtered and sorted at render/selector time — never the array itself mutated or replaced:

```ts
const appellationsToShow = computed(() =>
  appellationResults.value
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score),
)
```

If the UI later wants to cap how many rows render (e.g. "show top 12, with a 'see more' toggle"), that cap is applied to `appellationsToShow` for display only — `appellationResults` (the input to `scoreCellarWines`, §4.3) is never touched by it, so a user's cellared bottle from an appellation ranked 13th is still correctly matched even on a page that only *displays* 12 appellation cards. This keeps "what the user sees" and "what cellar-matching is computed against" backed by one full source of truth instead of two independently-filtered (and potentially independently-truncated) lists that can drift apart.

## 5. Layer implementation (this repo's three-layer convention)

- `src/types/foodPairings.ts` — `FoodTagRecord`, `FoodTagCategory`, `WineStyleFoodPairingRecord`, `AppellationFoodPairingRecord` (including `wine_style: WineStyle`, imported directly from `@/types/wineAppellations`), `DishPresetRecord` (with hydrated `foodTagIds: string[]`), plus create/delete payload types for the two join tables (mirroring `AppellationFlavorCreatePayload`, already style-scoped the same way).
- `src/services/foodPairings.ts` — `fetchFoodTags()` (ordered `.order('sort_order').order('id')` — see §2), `fetchWineStyleFoodPairings()`, `fetchDishPresets()` (with a joined `dish_preset_tags`), `fetchAppellationFoodPairingsForTags(tagIds: string[])`, `createAppellationFoodPairing(payload)` (payload now includes `wine_style`), `deleteAppellationFoodPairing(id)`, `logFoodSearchQuery(payload)` (fire-and-forget, swallow errors — never block the UI on analytics). All thin, all `throwIfError`, same as `services/appellationFlavors.ts`. No new wine-fetching service is needed — cellar scoring reuses the existing `fetchUserWines()` from `src/services/wines.ts` (§4.3).
- `src/lib/foodTagMatcher.ts` (§2) and `src/lib/foodPairingScorer.ts` (§4) — pure functions, framework- and Supabase-free, unit-testable in isolation.
- `src/stores/foodPairings.ts` — Pinia store: `tags`, `wineStyleFoodPairings`, `dishPresets` (loaded once via `loadVocabulary()`), `isSearching` and `ensureAppellationsLoaded()` (§4.1), plus `search(input: string)` / `searchByTags(tagIds: string[])` that (a) await `ensureAppellationsLoaded()`, (b) fetch the user's wines fresh via `fetchUserWines()`, and (c) call the matcher + scorer, populating `currentMatches`, `appellationResults` (the unfiltered §4.2 output, including each entry's `styleScores`), `cellarResults` (§4.3), and the derived `appellationsToShow` (§4.4). Also owns `byAppellation: Record<string, AppellationFoodPairingRecord[]>` for the admin editor, loaded per-appellation on demand — same shape as `useAppellationFlavorsStore`.
- `src/components/foodPairings/FoodPairingSearch.vue` — the text input + quick-pick chips + category browser (§3), disabled/showing a loading label while `isSearching`.
- `src/components/foodPairings/PairingResults.vue` — grouped results (§4, §8), reading `appellationsToShow` and `cellarResults`.
- `src/components/WineAppellations/AppellationFoodPairingManager.vue` — admin editor, modeled directly on `AppellationFlavorManager.vue`: a style picker plus a toggle grid of `food_tags`, writing `appellation_food_pairings` rows scoped to the selected style, with the pending-appellation guard from §1.3.
- `src/components/WineAppellations/AppellationFoodPairingSection.vue` — read-only "Pairs well with" chip list on the appellation page, grouped by style, modeled on `AppellationFlavorSection.vue`.

## 6. Where the vocabulary comes from, and the real maintenance cost

Be concrete about the numbers rather than asserting "low effort" — and honest about the uncertainty in any such estimate, since affinity judgment calls (does grilled lamb really rate `+2` against this style, or `+1`?) are the kind of work that reliably takes longer than it looks, and there's no documented time-spent for this app's own comparable precedent (the flavour lexicon) to calibrate against.

**Phase 0 (prerequisite, likely already mostly satisfied): confirm `wine_styles` coverage.** The baseline layer (§1.2) scores by an appellation's `wine_styles` array, which the existing editorial copy pipeline populates and which is `null` until an appellation's copy batch lands (`copy_status: 'pending'`). Before shipping, run one query via the Supabase MCP to know the actual size of the gap:

```sql
select count(*) from wine_appellations where wine_styles is null;
```

Two honest facts about this, rather than pretending the gap doesn't exist: (1) it isn't a new problem the pairing feature invents — an appellation still at `copy_status = 'pending'` already renders a degraded page today (missing `style_summary`, `climate_soil`, etc.), so a null `wine_styles` is very likely an already-known, already-tracked gap in the existing copy backlog, not a surprise this design introduces. (2) `wine_styles` alone — a short tagged array, not free-text prose — is far cheaper to backfill than writing full editorial copy, and can be done ahead of or independently from the tag/affinity curation estimated below; it's a strict, small subset of work the copy pipeline already does. Appellations still missing `wine_styles` after that are correctly excluded from both scoring layers (§4.2, §8) rather than guessed at — the remediation is "finish an existing, already-tracked field," not a new curation burden.

**Phase 1 (MVP tag vocabulary, ships the feature end to end):** ~60–80 `food_tags` covering the most common proteins, seafood, a handful of cheeses, the dozen most common preparations, and the half-dozen most common flavor profiles — enough to catch the majority of everyday inputs ("chicken", "steak", "salmon", "grilled", "spicy", "cheese"). Paired with ~60–100 `wine_style_food_pairings` rows covering the highest-confidence, textbook pairings for that smaller tag set. Realistically 6–10 hours total across a few focused sessions, not a single weekend crunch, because writing a synonym list or an affinity value well takes longer per row than it looks like it should.

**Phase 2 (expand toward the full ~150–220 tag vocabulary described in §1.1):** done incrementally, over subsequent weeks, driven by (1) manually filling in the categories not covered in Phase 1 (cuisines, desserts, more produce), and (2) the `food_search_queries` feedback loop below. Budget another 10–15 hours spread over a few weeks rather than trying to front-load it — there's no requirement to finish this before the feature is useful, since Phase 1 already covers most real searches.

**Total, honestly: roughly 15–25 hours of tag/affinity curation work, spread over several weeks, plus whatever Phase 0 backfill turns out to be needed (bounded by the count query above, and cheap per row) — not "one weekend."** The feature is usable and valuable after Phase 0 + Phase 1; Phase 2 is quality-of-coverage improvement that never has a hard finish line, the same way the flavour lexicon itself is presumably still being extended.

**Ongoing:**
- `appellation_food_pairings` overrides: purely opportunistic, a few minutes each, done whenever an editor happens to be in the appellation editor anyway — never a blocker, since baseline coverage already exists for any appellation with `wine_styles` set.
- Vocabulary growth: driven by `food_search_queries` (§1.5) — review unmatched top queries periodically (monthly is plenty at hobby-project scale) and add a synonym or a tag in minutes. This turns real usage into the curation backlog instead of requiring anyone to guess every phrase in advance up front, and is the mechanism that actually keeps ongoing cost low, rather than a one-time estimate doing that work.
- A seed/upsert function, `public.seed_food_tags(jsonb)` and `public.seed_wine_style_food_pairings(jsonb)`, mirrors the existing `public.seed_appellation_flavors(jsonb)` convention: upsert by `slug` (tags) / by `(wine_style, tag slug)` (pairings), so the starter vocabulary and ruleset can be authored as a JSON file, fed through once via MCP, and re-run idempotently as it grows. Example shape:

```jsonc
// seed_food_tags payload (excerpt)
[
  { "slug": "salmon", "category": "seafood", "name": "Salmon", "synonyms": ["salmon", "ocean trout", "steelhead"] },
  { "slug": "grilled", "category": "preparation", "name": "Grilled", "synonyms": ["grilled", "chargrilled", "bbq", "barbecue"] },
  { "slug": "spicy", "category": "flavor_profile", "name": "Spicy", "synonyms": ["spicy", "hot", "chili", "chilli"] },
  { "slug": "goat-cheese", "category": "cheese_dairy", "name": "Goat cheese", "synonyms": ["goat cheese", "chèvre"] },
  { "slug": "fish-and-chips", "category": "cuisine", "name": "Fish and chips", "synonyms": ["fish and chips"] }
]
```

```jsonc
// seed_wine_style_food_pairings payload (excerpt)
[
  { "wine_style": "white", "tag_slug": "salmon", "affinity": 1, "note": "acid cuts the oil" },
  { "wine_style": "sparkling", "tag_slug": "salmon", "affinity": 2, "note": "classic — smoked salmon and Champagne" },
  { "wine_style": "red", "tag_slug": "spicy", "affinity": -1, "note": "tannin amplifies heat" },
  { "wine_style": "sweet", "tag_slug": "spicy", "affinity": 2, "note": "residual sugar tames heat" },
  { "wine_style": "white", "tag_slug": "goat-cheese", "affinity": 2, "note": "classic Loire pairing" }
]
```

This is the honest crux of the whole design: the vocabulary is finite *by construction* (it describes reusable concepts — proteins, methods, flavours — not dishes), so it never needs "one row per dish." A user typing "pan-seared salmon with a lemon-butter sauce" and one typing "salmon teriyaki" both resolve to the tag `salmon` (plus whatever else matches — "spicy"/"soy" for teriyaki) without either phrase ever having been anticipated or entered — and note that "salmon" and "lemon" in that first sentence are separated by the stopwords "with a," so §2's word-adjacency rule correctly matches each on its own rather than inventing a nonexistent "salmon lemon" phrase. What isn't finite, and what this section says plainly, is the *time* to curate good affinity judgments and to backfill `wine_styles` where it's missing — that scales with care taken and with the size of an existing, pre-dating gap, not with a fixed weekend.

## 7. UI placement

- **New route `/pairing`** (`src/pages/PairingPage.vue`, registered in `src/router/index.ts` next to the other top-level routes like `/flavors`), `meta: { public: true }` to match the other browse pages. On mount, eagerly kicks off `foodPairingsStore.ensureAppellationsLoaded()` and `loadVocabulary()` (§4.1) as a prefetch — the page must work correctly whether the user arrived via the dashboard or a direct link, and correctness here comes from `search()` itself awaiting the same shared load, not from the timing of this prefetch. Contains `FoodPairingSearch.vue` (free text + quick picks + category browser, disabled with a loading label while `isSearching`) and `PairingResults.vue`, split into two sections: "Appellations to try" (top-scoring appellations from `appellationsToShow`, §4.4, each linking to `/appellation/:id`, with a small "why" — which tags/style drove the score) and "From your cellar" (top-scoring wines from `cellarResults`, or an empty state — see Edge cases).
- **Dashboard teaser**: a compact card ("What are you drinking with dinner?" + the same text input, or just a link) added to `DashboardPage.vue` near the top, in the same visual language as `ReadyThisSeason.vue` — a small entry point, not a duplicate of the full page. Submitting routes to `/pairing?q=...` and runs the search there.
- **Appellation detail page** (`src/pages/appellation/[id].vue`): add `AppellationFoodPairingSection.vue` right after the existing `AppellationCopySection` (which keeps showing the free-text "Classic pairings"), so a visitor reading about an appellation also sees its structured, style-grouped "Pairs well with" tags — the same tag vocabulary, queried in the reverse direction (appellation → tags, instead of tags → appellation), for free, because it's the same underlying data.
- **Admin**: `AppellationFoodPairingManager.vue` wired into the appellation editor in `src/pages/manage/WineAppellationsPage.vue`, next to where the flavour manager presumably already lives, with the pending-appellation guard from §1.3.

## 8. Edge cases

- **No tags matched at all**: don't show an empty results page. Show "We couldn't pick out any ingredients from that — try mentioning a protein, a cooking style, or a cuisine (e.g. 'grilled', 'spicy', 'Thai')" and surface the quick-pick chips and category browser as a fallback so the user isn't stuck. Log the query in `food_search_queries` with `matched_count = 0` regardless — this is exactly the signal the vocabulary-growth loop needs.
- **Matches span unrelated categories** (e.g. "surf and turf" → `steak` + `shrimp`): don't silently blend into one flat list. Group results by which matched tag(s) drove each score — "Best with the steak", "Best with the shrimp" (or, if one appellation scores well against both, "Great with both") — so the user sees *why* something is recommended instead of a mysterious ranked list.
- **Zero cellared wines match a strong appellation hit**: still show the appellation recommendation (it's still useful — "here's what style to look for") but render the "From your cellar" section with an explicit empty state ("None of your bottles match this yet — look for a {style} from {appellation}") rather than hiding the section, so the feature doesn't look broken when the cellar just doesn't have a hit.
- **A curator suppresses one style of a multi-style appellation, and the user owns exactly that style's bottle**: correctly dropped. §4.3 looks up `styleScores[mappedStyle]` for the wine's own style, not the appellation's collapsed best — so a suppressed red is excluded from "From your cellar" even when the same appellation's white scores well enough to show up under "Appellations to try." The appellation can legitimately still appear in "Appellations to try" (driven by its better style) while that specific owned bottle correctly does not appear in "From your cellar" — these are allowed to disagree, because they're now answering two different, correctly-scoped questions ("what style should I look for from this appellation" vs. "does the exact bottle I own work").
- **A positively-scoring appellation that wouldn't crack a display-sized "top N" list**: still correctly matched against the user's cellar. §4.3's `byAppellationId` is built from the full `appellationResults` array, not from whatever subset `appellationsToShow` (§4.4) renders — a UI-level display cap, if one is ever added, only trims what's shown, never what cellar-matching can see.
- **An appellation with no `wine_styles` set (pending editorial copy)**: excluded from "Appellations to try" — `scoreAppellations` skips it (`styles.length === 0`), and any cellared wine whose `appellation` FK points at it falls through to style-only scoring (or is excluded too, if that wine also has no `style`). This is a real, current gap for however many appellations §6 Phase 0's count query turns up, not a hypothetical — it's called out explicitly rather than hidden, and the remediation (backfill `wine_styles`) is a one-time, boundable, already-partially-tracked task, independent of the tag/affinity curation.
- **A cellared wine has an `appellation` set but no `style`, and that appellation produces more than one style**: excluded from cellar matching, deliberately — with only the appellation FK known, which of e.g. a red/white appellation's two styles the actual bottle is cannot be determined, and guessing risks exactly the Attack-1 failure mode this design closes elsewhere. "From your cellar" shows a subtle prompt on wines in this state ("Add a style to this bottle to include it in pairing results") rather than silently omitting them with no explanation. When the appellation is single-style, there's no ambiguity, so the bottle is still scored normally (§4.3).
- **A cellared wine's own `style` isn't one of its appellation's current `wine_styles`** (stale data — e.g. the appellation's `wine_styles` was edited after the bottle's style was recorded): `styleScores[mappedStyle]` is `undefined` in this case, and the wine is excluded rather than falling back to the appellation's best style. Rare, but explicitly handled rather than left to produce a `Map.get` mismatch.
- **An editor tries to add an override for a pending appellation, or for a style the appellation doesn't make**: `AppellationFoodPairingManager.vue` only ever offers styles from that appellation's own `wine_styles` (and shows "Set this appellation's wine styles first" if it's null/empty — §1.3); the DB trigger rejects any mismatched write server-side regardless. Both paths make a mismatched override structurally impossible, not just discouraged, so curation effort is never silently wasted.
- **A cellared wine with neither `appellation` nor `style` set**: excluded from cellar results. Because scoring runs against `WineRecord` fetched fresh via `fetchUserWines()` rather than the `UserWine[]` used by the main cellar list (which defaults a missing style to `'red'` for display purposes), this exclusion reflects the wine's true DB state rather than a display default masquerading as data (§4.3).
- **Short/ambiguous input** ("chicken" alone): matches the broad `chicken` protein tag, which legitimately has decent baseline affinity against several styles (light reds, fuller whites) — that's correct, not a failure; chicken really does go with several styles depending on preparation. Show all of them, grouped/labelled by driving style, and lean on the quick-pick/category chips as a way to narrow ("+ grilled", "+ curry", "+ roasted") rather than trying to force a single "correct" answer out of one ambiguous word. (A "suggested refinements" row built from tags that frequently co-occur in `dish_preset_tags` is a natural v1.1 addition, not required for launch.)
- **Non-English input**: out of scope for v1, same as the rest of this English-only app; documented as a known limitation. It degrades gracefully to "no match" (the empty-state path above), not an error. If multilingual support is wanted later, it's additive, not a redesign — `synonyms` already just holds a bag of alternate phrases, so non-English synonyms can be appended to the same rows.
- **Typos / minor misspellings, in isolation or mixed with correctly-spelled words in the same query**: handled by the Dice-coefficient fuzzy fallback (§2.1, step 3) at the single-word level — "salmom", "grilld" still match, and a query like "spicy grillled chicken" resolves all three tags in one pass (the exact matches on "spicy"/"chicken" do not suppress the fuzzy pass on "grillled" — see the worked example in §2.1). Multi-word phrase synonyms are matched exactly (not fuzzily) against the input's true word order (never a stopword-stripped one — see §2.1 step 1), which is an intentional precision/recall trade-off: fuzzy-matching whole phrases risks false positives across unrelated multi-word synonyms; fuzzy-matching single leftover words is safer and still catches the common case. Ties in fuzzy scoring are resolved deterministically — see §2's determinism note.
- **A direct/bookmarked visit to `/pairing`**: `PairingPage.vue`'s mount eagerly kicks off the appellation prefetch, but `search()` itself independently awaits the same shared `ensureAppellationsLoaded()` promise (§4.1) before ever calling the scorer — so results are correct regardless of navigation path *and* regardless of whether the user submits before the prefetch finishes; the worst case is a brief, visible loading state (`isSearching`), never a false "no matches."

## 9. What this rejects, briefly

- **LLM/embeddings-based matching or an "ask an AI" step** — explicitly disallowed by the task, and unnecessary: the phrase+fuzzy matcher in §2 handles open-ended phrasing over a bounded vocabulary without one, deterministically.
- **A single flat `appellation_food_pairings`-only design** (skip the baseline layer, tag appellations directly, one row per appellation × tag, no `wine_style_food_pairings`) — this is the more literal copy of the `appellation_flavors` precedent, but it fails the "won't require weeks of manual authoring before it's usable" bar: nothing would be recommendable until someone had tagged a meaningful fraction of appellations by hand. The two-layer design keeps the appellation-level table (for precision, added over time) but adds the style-level baseline underneath it specifically so day-one coverage doesn't depend on that curation, for every appellation whose `wine_styles` is already set.
- **An appellation-only override table with no style column, and no trigger tying an override's style to the appellation's real `wine_styles`** — a tempting simplification, rejected once a multi-style appellation is considered: without a style dimension, one curated pairing silently applies to every style the appellation makes, including ones it was never meant for; without the validating trigger and the admin-UI guard that only offers real styles, a curator could also save an override for a style the appellation doesn't even produce, with no error and no visible effect on results. §1.3's actual table has the style column, the trigger, and the guard from the start specifically to close both of those failure modes at the schema level, not as an afterthought.
- **Collapsing each appellation's per-style scores into a single best-style number for cellar-wine matching** — the shape of an earlier version of this design, and wrong: an appellation-wide "best" score cannot tell you whether the *specific bottle a user owns* is the style that earned it. A red bottle from an appellation whose white scores well would be recommended under the white's score even when the red was explicitly suppressed. §4.2 now returns a full `styleScores` map (every style, independently), and §4.3 always keys off the owned wine's own mapped style — the collapsed `score`/`drivingStyle` fields still exist, but only for the appellation-level display list, never as a stand-in for an individual bottle's score.
- **Scoring cellar wines from the already-loaded `UserWine[]` in `src/stores/main.ts`** — tempting, since it avoids a second fetch, but `UserWine.style` is a display-oriented, non-nullable field that defaults a missing DB value to `'red'`. Reusing it would silently misclassify styleless, appellation-less wines. §4.3's design fetches fresh via the existing `fetchUserWines()` service instead, at the cost of one extra query per search, to keep that null real rather than papered over.
- **Prose-only RLS descriptions ("same as elsewhere") instead of concrete policy DDL** — an earlier version of this design asserted admin-write RLS without ever showing the policy or naming the admin check. §1.6 now gives every `create policy` statement explicitly, reusing this codebase's actual, already-live `profiles.is_admin` mechanism (`src/stores/auth.ts:9,26,29`) rather than inventing a new one or leaving it for a developer to go verify by hand.
- **A fire-and-forget `loadAll()` in `onMounted` with nothing gating the search on it** — looked sufficient at a glance ("it loads the catalogue on mount") but doesn't actually guarantee the catalogue is populated by the time a fast or cold-start user submits a search, which is precisely the direct-link scenario the guard exists for. §4.1 fixes this by moving the await into `search()` itself via a shared `ensureAppellationsLoaded()` promise, with the mount-time call kept only as a non-blocking prefetch.
- **Stripping stopwords before phrase-matching** — a natural-looking optimization (fewer words to slide the window over) that was deliberately not taken: doing so would make two words that are not adjacent in the real sentence appear adjacent once the stopword between them is removed, risking a phantom multi-word-synonym match that was never actually typed. §2.1 step 1 keeps the full, unfiltered word sequence for phrase matching and only ever consults the stopword list later, per single leftover word, in step 3 — where it can't manufacture a false adjacency because it never looks at word pairs at all.
- **Fuzzy matching entirely inside Postgres (`pg_trgm`)** — viable, and worth revisiting only if the vocabulary somehow grew far beyond what §6 describes, but splitting matching logic between a stored procedure and app code is a worse long-term maintenance shape than one pure, tested TypeScript function for a dataset this size.
- **Auto-parsing the existing `food_pairings` free text into tags** — the source text is dish-specific editorial prose, not a controlled vocabulary; auto-tagging it would produce unreliable data. Kept as a human curation aid (shown alongside the new tag picker) instead.
- **Truncating `scoreAppellations`' output to a fixed top-N before handing it to cellar-wine scoring** — tempting as a cheap "only look at the best matches" optimization, but it would silently couple two independent concerns (how many rows a page displays vs. which appellations a user's own cellar can be matched against). Kept strictly separate: `scoreAppellations` returns everything, `appellationsToShow` (§4.4) is the only place a display cut would ever be applied, and `scoreCellarWines` always reads the untruncated array.

## 10. Build order

Ships incrementally; each step is independently useful:

1. Run the Phase 0 count query (§6) to size the `wine_styles is null` gap; backfill what's cheap to backfill immediately, track the rest alongside the existing copy backlog.
2. Migrate the five tables (§1) + RLS (the concrete policies in §1.6, including the admin-write policies for all five reference tables and both `food_search_queries` policies) + the override-style validation trigger via MCP. Seed `food_tags` and `wine_style_food_pairings` with the Phase 1 MVP set (§6) via the two seed functions.
3. `src/types/foodPairings.ts`, `src/services/foodPairings.ts` (including the `ORDER BY` on `fetchFoodTags`), `src/lib/foodTagMatcher.ts` + unit tests — including a tie-break test, a mixed exact-and-typo test ("spicy grillled chicken" resolving all three tags in one call, verifying the fuzzy pass is never suppressed by an earlier exact match in the same query), a 3-word-synonym-inside-a-longer-sentence test ("fish and chips" matched out of "having fish and chips tonight"), and a stopword-adjacency test ("pan seared salmon with a lemon butter sauce" must match `salmon` and `lemon`/`butter` as separate tags, never a phantom "salmon lemon" phrase); `src/lib/foodPairingScorer.ts` + unit tests — including a suppression-propagates-to-the-correct-bottle-only test (an appellation with a suppressed red and a better-scoring white: a cellared *red* from that appellation must never be recommended, while a cellared *white* from the same appellation correctly can be — this is the direct regression test for the per-style cellar-matching fix), a null-style-wine test using a `WineRecord` fixture with `style: null` on a multi-style appellation (asserting exclusion, never a fallback guess), a single-style-appellation null-style-wine test (asserting it *is* still scored, since there's no ambiguity), a stale-style test (wine's `style` maps to a style no longer in the appellation's `wine_styles`, asserting exclusion), a test that an appellation scoring positively but ranked outside any UI display cap is still returned by `scoreCellarWines`-reachable lookups (i.e. `scoreAppellations`'s output is never pre-truncated), a test that a mismatched-style override write is rejected by the DB trigger, and a test that an appellation with a baseline-only style A and an override-only style B never produces a combined score exceeding either single style's own total; `src/lib/wineStyles.ts` addition.
4. `src/stores/foodPairings.ts` (including `ensureAppellationsLoaded()`, `isSearching`, and the fresh `fetchUserWines()` call), `PairingPage.vue`, `FoodPairingSearch.vue`, `PairingResults.vue`, route registration — plus a race test: calling `search()` immediately after mount, before the prefetch's `loadAll()` has resolved, must still score against the full appellation catalogue (via the shared awaited promise), not an empty array. This step alone already delivers the whole user-facing feature end to end, running purely on the baseline layer and correct on a direct visit.
5. Dashboard teaser card.
6. `AppellationFoodPairingManager.vue` (with the pending-appellation guard) + `AppellationFoodPairingSection.vue`, wired into the appellation admin page and detail page, for the optional per-appellation, per-style precision layer.
7. `dish_presets` seed rows for the quick-pick chips (can happen any time after step 2; purely additive UI sugar).
8. Phase 2 vocabulary expansion (§6), driven by `food_search_queries` review, ongoing.
