/* drinkingWindow — pure drinking-window engine (no I/O).
 *
 * Config (archetype baselines, coefficients, producer/cuvée tiers, hot vintages,
 * absolute overrides, condition flags) is injected via EngineConfig rather than
 * read at module level, so the engine is trivially unit-testable.
 *
 * Modules:
 *   constants.ts    — non-DB fallbacks (default archetypes, risk scaling)
 *   normalize.ts    — norm(): producer name matching (mirrors SQL dw_norm)
 *   vintageScore.ts — parseVintageScore() + computeQ(): critic score -> modifier
 *   archetype.ts    — refineArchetype() style upgrades (GC / prädikat / sweetness)
 *   adjustments.ts  — tier / hot-vintage / hard-cap / premox / release pipeline
 *   finalize.ts     — peak plateau, risk stance, rounding, phase classification
 *   estimate.ts     — estimateDrinkingWindow(): the orchestrator
 *
 * This barrel preserves the original `@/lib/drinkingWindow` import surface.
 */
export { norm } from './normalize'
export { parseVintageScore } from './vintageScore'
export { estimateDrinkingWindow } from './estimate'
