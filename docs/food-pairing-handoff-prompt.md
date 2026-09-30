Implement the food-to-wine pairing feature designed in [docs/food-pairing-plan.md](food-pairing-plan.md). Read that doc in full before touching code — it has the schema DDL, RLS policies, the matcher/scorer TypeScript, edge cases, and a numbered build order (§10). Follow the build order as your task list.

Key points to not miss:
- No AI/LLM anywhere in the matching logic — it's a pure phrase + Dice-coefficient fuzzy matcher (§2), deterministic and unit-testable.
- Schema changes go to the live Supabase project via the Supabase MCP tools (`apply_migration` etc.) — this repo has no `.sql` migration files checked in. Follow CLAUDE.md and the `supabase` / `supabase-postgres-best-practices` skills for that workflow.
- Follow this repo's three-layer convention for every new domain: `src/types/foodPairings.ts` → `src/services/foodPairings.ts` → `src/stores/foodPairings.ts`, same as `flavorDescriptors`/`appellationFlavors`.
- §4.3 is the trickiest part: cellar-wine scoring must read from a fresh `fetchUserWines()` (`WineRecord`, nullable `style`), never `UserWine` from `src/stores/main.ts` (which defaults a missing style to `'red'` for display). Getting this wrong reintroduces a bug the arena run caught and fixed across several rounds.
- Before Phase 1 curation, run the Phase 0 count query (§6) to size the `wine_styles is null` gap on the live DB.
- §10's test list is the acceptance criteria for the matcher/scorer — implement those specific test cases (stopword-adjacency, mixed exact+typo, style-suppression-propagates-to-the-correct-bottle-only, etc.), not just generic coverage.

This design is the output of a 25-agent adversarial arena run (5 rounds of attack/defend/judge against the same task) — it already survived targeted attacks on RLS, null-style handling, style-scoped overrides, and race conditions on direct page loads. Deviating from it needs a real reason, not just a different preference.

Start by reading `docs/food-pairing-plan.md` end to end, then work through the build order.
