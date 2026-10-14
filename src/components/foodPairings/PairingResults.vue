<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Button } from '@/components/ui/button'
import MatchScore from '@/components/foodPairings/MatchScore.vue'
import { mainIngredientMatches } from '@/lib/foodPairingScorer'
import type { AppellationPairingResult, TagGroup } from '@/lib/foodPairingScorer'
import { wineStyleLabel } from '@/lib/wineStyles'
import { useEntryVisibility } from '@/composables/useEntryVisibility'
import { useAuthStore } from '@/stores/auth'
import { useFoodPairingsStore } from '@/stores/foodPairings'

const PAGE_SIZE = 12

const foodPairingsStore = useFoodPairingsStore()
const authStore = useAuthStore()
const { isAppellationShown } = useEntryVisibility()
const {
  tags,
  isSearching,
  hasSearched,
  lastQuery,
  searchError,
  currentMatches,
  appellationsToShow,
  appellationGroups,
  cellarResults,
  cellarGroups,
  cellarNeedingStyle,
} = storeToRefs(foodPairingsStore)

const tagNameById = computed(() => new Map(tags.value.map((tag) => [tag.id, tag.name])))

function namesFor(tagIds: string[]) {
  return tagIds.map((id) => tagNameById.value.get(id)).filter((name): name is string => !!name)
}

const mainIngredientCount = computed(() => mainIngredientMatches(currentMatches.value).length)

/** "Best with the steak" / "Great with both" — only when the dish has several main parts. */
function groupLabel(group: TagGroup<unknown>) {
  if (mainIngredientCount.value < 2 || !group.tagIds.length) return null
  if (group.coversAll)
    return mainIngredientCount.value === 2 ? 'Great with both' : 'Great with all of it'
  return `Best with the ${namesFor(group.tagIds).join(' & ').toLowerCase()}`
}

/** Display-only cap, applied per group so no group is pushed off the page by another.
 *  It trims what renders, never what cellar matching can see. */
const visibleLimit = ref(PAGE_SIZE)
watch(currentMatches, () => {
  visibleLimit.value = PAGE_SIZE
})

const visibleAppellationGroups = computed(() =>
  appellationGroups.value.map(
    (group): TagGroup<AppellationPairingResult> => ({
      ...group,
      items: group.items.slice(0, visibleLimit.value),
    }),
  ),
)

const hasMoreAppellations = computed(() =>
  appellationGroups.value.some((group) => group.items.length > visibleLimit.value),
)

const nothingUnderstood = computed(
  () => hasSearched.value && !!lastQuery.value && currentMatches.value.length === 0,
)

const topAppellation = computed(() => appellationsToShow.value[0] ?? null)

function regionLine(result: AppellationPairingResult) {
  const region = result.appellation.region
  return [region?.name, region?.country?.name].filter(Boolean).join(' · ')
}

function whyLine(tagIds: string[]) {
  const names = namesFor(tagIds)
  return names.length ? `Pairs with ${names.join(', ').toLowerCase()}` : ''
}

/** A white and a red from one appellation are different wines: say how its other styles fare. */
function alsoLine(result: AppellationPairingResult) {
  const others = Object.entries(result.styleScores)
    .filter(([style, entry]) => style !== result.drivingStyle && entry && entry.score > 0)
    .sort(([, a], [, b]) => (b?.match ?? 0) - (a?.match ?? 0))
    .slice(0, 2)
    .map(
      ([style, entry]) =>
        `${wineStyleLabel(style).toLowerCase()} ${Math.round(entry?.match ?? 0)}/10`,
    )
  return others.length ? `Also as ${others.join(', ')}` : ''
}

/** Opens the appellation page on the style that matched, so a red hit doesn't land on the white. */
function appellationLink(id: string, style: string | null) {
  return { name: 'appellation-detail', params: { id }, query: style ? { style } : {} }
}

/** The appellation's own classic pairings that back the match up, if any. */
function classicLine(confirmedBy: string[]) {
  return confirmedBy.length ? `A classic here: ${confirmedBy.slice(0, 2).join(', ')}` : ''
}
</script>

<template>
  <div>
    <p v-if="searchError" class="border-y border-border py-3 text-sm text-destructive" role="alert">
      {{ searchError }}
    </p>

    <div v-else-if="isSearching && !hasSearched" class="border-t border-border" aria-busy="true">
      <div v-for="row in 4" :key="`pairing-skeleton-${row}`" class="border-b border-border py-3">
        <span class="block h-4 w-2/3 bg-foreground/[0.06]" />
      </div>
    </div>

    <p
      v-else-if="nothingUnderstood"
      class="border-y border-border py-4 text-sm leading-[1.7] text-foreground/[0.7]"
    >
      We couldn’t pick out any ingredients from that — try mentioning a protein, a cooking style, or
      a cuisine (e.g. “grilled”, “spicy”, “Thai”), or use the quick picks and category browser
      above.
    </p>

    <template v-else-if="hasSearched">
      <!-- Appellations to try -->
      <section class="mb-10">
        <div class="mb-4 flex flex-wrap items-baseline gap-3">
          <span class="num font-heading text-[13px] tracking-[0.16em] text-primary">I.</span>
          <h2 class="font-heading text-[34px] font-normal">Appellations to try</h2>
        </div>
        <p class="mb-2 max-w-[62ch] text-xs leading-[1.6] text-foreground/[0.55]">
          Best match first. The score is out of 10: how well the wine style suits your dish, higher
          still when the appellation is known for it.
        </p>

        <p
          v-if="!appellationsToShow.length"
          class="border-y border-border py-3 text-sm text-foreground/[0.55]"
        >
          Nothing in the catalogue pairs well with that combination.
        </p>

        <div
          v-for="group in visibleAppellationGroups"
          :key="group.coversAll ? '*' : group.tagIds.join(',')"
        >
          <p
            v-if="groupLabel(group)"
            class="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-700"
          >
            {{ groupLabel(group) }}
          </p>
          <ul class="m-0 list-none border-t border-border p-0">
            <li
              v-for="result in group.items"
              :key="result.appellation.id"
              class="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4 gap-y-0.5 border-b border-border py-3"
            >
              <MatchScore :match="result.match" class="row-span-2 self-center" />
              <RouterLink
                :to="appellationLink(result.appellation.id, result.drivingStyle)"
                class="font-heading text-[22px] leading-[1.2] transition-colors hover:text-accent-700"
              >
                {{ result.appellation.name }}
              </RouterLink>
              <span class="text-[10px] uppercase tracking-[0.12em] text-foreground/[0.52]">
                {{ result.drivingStyle ? wineStyleLabel(result.drivingStyle) : '' }}
              </span>
              <p class="col-span-2 text-xs text-foreground/[0.55]">
                {{ regionLine(result) }}<template v-if="regionLine(result)"> · </template
                >{{ whyLine(result.positiveTagIds) }}
                <template v-if="classicLine(result.confirmedBy)">
                  · {{ classicLine(result.confirmedBy) }}
                </template>
                <template v-if="alsoLine(result)"> · {{ alsoLine(result) }} </template>
              </p>
            </li>
          </ul>
        </div>

        <Button
          v-if="hasMoreAppellations"
          variant="secondary"
          class="mt-4"
          @click="visibleLimit += PAGE_SIZE"
        >
          Show more
        </Button>
      </section>

      <!-- From your cellar -->
      <section>
        <div class="mb-4 flex flex-wrap items-baseline gap-3">
          <span class="num font-heading text-[13px] tracking-[0.16em] text-primary">II.</span>
          <h2 class="font-heading text-[34px] font-normal">From your cellar</h2>
        </div>

        <p
          v-if="!authStore.isLoggedIn"
          class="border-y border-border py-3 text-sm text-foreground/[0.55]"
        >
          <RouterLink to="/login" class="text-primary">Sign in</RouterLink> to see which of your
          bottles match.
        </p>

        <template v-else>
          <div v-for="group in cellarGroups" :key="group.coversAll ? '*' : group.tagIds.join(',')">
            <p
              v-if="groupLabel(group)"
              class="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-700"
            >
              {{ groupLabel(group) }}
            </p>
            <ul class="m-0 list-none border-t border-border p-0">
              <li
                v-for="item in group.items"
                :key="item.wine.id"
                class="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4 gap-y-0.5 border-b border-border py-3"
              >
                <MatchScore :match="item.match" class="row-span-2 self-center" />
                <span class="text-[17px] font-semibold leading-[1.2]">
                  {{ item.wine.vintage || 'NV' }} {{ item.wine.name }}
                </span>
                <span class="text-[10px] uppercase tracking-[0.12em] text-foreground/[0.52]">
                  {{ item.drivingStyle ? wineStyleLabel(item.drivingStyle) : '' }}
                </span>
                <p class="col-span-2 text-xs text-foreground/[0.55]">
                  <span v-if="item.wine.producer" class="italic">{{ item.wine.producer }} · </span>
                  <RouterLink
                    v-if="
                      item.wine.appellation_info &&
                      isAppellationShown(item.wine.appellation_info.id)
                    "
                    :to="appellationLink(item.wine.appellation_info.id, item.drivingStyle)"
                    class="hover:text-accent-700"
                  >
                    {{ item.wine.appellation_info.name }}
                  </RouterLink>
                  <template v-else-if="item.wine.appellation_info">
                    {{ item.wine.appellation_info.name }}
                  </template>
                  <template v-if="item.wine.appellation_info"> · </template>
                  {{ item.wine.quantity }} bottle{{ item.wine.quantity === 1 ? '' : 's' }}
                  <template v-if="whyLine(item.positiveTagIds)">
                    · {{ whyLine(item.positiveTagIds) }}
                  </template>
                  <template v-if="classicLine(item.confirmedBy)">
                    · {{ classicLine(item.confirmedBy) }}
                  </template>
                </p>
              </li>
            </ul>
          </div>

          <p
            v-if="!cellarResults.length"
            class="border-y border-border py-3 text-sm text-foreground/[0.55]"
          >
            None of your bottles match this yet<template
              v-if="topAppellation && topAppellation.drivingStyle"
            >
              — look for a {{ wineStyleLabel(topAppellation.drivingStyle).toLowerCase() }} from
              {{ topAppellation.appellation.name }}</template
            >.
          </p>

          <ul v-if="cellarNeedingStyle.length" class="m-0 mt-4 list-none p-0">
            <li
              v-for="wine in cellarNeedingStyle"
              :key="wine.id"
              class="border-b border-border py-2 text-xs text-foreground/[0.55]"
            >
              <span class="text-foreground/80">{{ wine.vintage || 'NV' }} {{ wine.name }}</span>
              —
              <RouterLink :to="`/cellar/${wine.id}/edit`" class="text-primary">
                Add a style to this bottle
              </RouterLink>
              to include it in pairing results.
            </li>
          </ul>
        </template>
      </section>
    </template>
  </div>
</template>
