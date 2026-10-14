import type { FoodAffinity, FoodTagRecord, WineStyleFoodPairingRecord } from '@/types/foodPairings'
import type { AppellationFoodPairingRecord } from '@/types/foodPairings'
import type { WineAppellationRecord, WineStyle } from '@/types/wineAppellations'
import type { WineRegionRecord } from '@/types/wineRegions'
import type { WineRecord, WineStyle as WineRecordStyle } from '@/types/wines'

export function tag(
  slug: string,
  synonyms: string[] = [slug],
  overrides: Partial<FoodTagRecord> = {},
): FoodTagRecord {
  return {
    id: `tag-${slug}`,
    category: 'protein',
    name: slug,
    slug,
    synonyms,
    sort_order: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

export function region(id: string, overrides: Partial<WineRegionRecord> = {}): WineRegionRecord {
  return {
    id,
    name: id,
    country_id: 'country',
    image_url: null,
    is_active: true,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

export function appellation(
  id: string,
  wineStyles: WineStyle[] | null,
  overrides: Partial<WineAppellationRecord> = {},
): WineAppellationRecord {
  return {
    id,
    name: id,
    region_id: 'region',
    description: null,
    image_url: null,
    established_year: null,
    is_active: true,
    created_at: '',
    updated_at: '',
    short_description: null,
    pronunciation: null,
    classification: null,
    signature_grapes: null,
    wine_styles: wineStyles,
    style_summary: null,
    climate_soil: null,
    food_pairings: null,
    drinking_window: null,
    fun_fact: null,
    copy_status: 'generated',
    copy_updated_at: null,
    ...overrides,
  }
}

export function baseline(
  style: WineStyle,
  tagSlug: string,
  affinity: FoodAffinity,
): WineStyleFoodPairingRecord {
  return {
    id: `base-${style}-${tagSlug}`,
    wine_style: style,
    food_tag_id: `tag-${tagSlug}`,
    affinity,
    note: null,
    created_at: '',
  }
}

export function override(
  appellationId: string,
  style: WineStyle,
  tagSlug: string,
  affinity: FoodAffinity,
): AppellationFoodPairingRecord {
  return {
    id: `ovr-${appellationId}-${style}-${tagSlug}`,
    appellation_id: appellationId,
    wine_style: style,
    food_tag_id: `tag-${tagSlug}`,
    affinity,
    note: null,
    created_at: '',
  }
}

/** A raw DB row: `style` and `appellation` are genuinely nullable, as fetchUserWines returns them. */
export function wine(
  id: string,
  style: WineRecordStyle | null,
  appellationId: string | null,
): WineRecord {
  return {
    id,
    user_id: 'user',
    name: id,
    producer: null,
    varietal: null,
    vintage: null,
    style,
    quantity: 1,
    rating: null,
    ready_to_drink: null,
    purchase_price: null,
    purchase_date: null,
    vivino_link: null,
    producer_link: null,
    critic_window_start: null,
    critic_window_end: null,
    region: null,
    appellation: appellationId,
    archetype_id: null,
    cuvee: null,
    predikat_level: null,
    sweetness: null,
    jura_style: null,
    friuli_style: null,
    champagne_type: null,
    disgorgement_date: null,
    created_at: '',
    updated_at: '',
  }
}
