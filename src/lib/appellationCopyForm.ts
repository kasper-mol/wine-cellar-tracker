import type {
  AppellationCopyStatus,
  WineAppellationCopyInput,
  WineAppellationRecord,
  WineStyle,
} from '@/types/wineAppellations'

/** Arrays are edited as comma-separated text; everything else maps straight across. */
export interface AppellationCopyForm {
  short_description: string
  description: string
  pronunciation: string
  classification: string
  established_year: string
  signature_grapes: string
  wine_styles: WineStyle[]
  style_summary: string
  climate_soil: string
  food_pairings: string
  drinking_window: string
  fun_fact: string
  copy_status: AppellationCopyStatus
}

export const COPY_STATUSES: AppellationCopyStatus[] = ['pending', 'generated', 'reviewed']

/** Order matches the display order on the appellation page. */
export const WINE_STYLE_TOKENS: WineStyle[] = [
  'red',
  'white',
  'rose',
  'orange',
  'sparkling',
  'sweet',
  'fortified',
]

export function emptyCopyForm(): AppellationCopyForm {
  return {
    short_description: '',
    description: '',
    pronunciation: '',
    classification: '',
    established_year: '',
    signature_grapes: '',
    wine_styles: [],
    style_summary: '',
    climate_soil: '',
    food_pairings: '',
    drinking_window: '',
    fun_fact: '',
    copy_status: 'pending',
  }
}

export function copyFormFromRecord(record: WineAppellationRecord | null): AppellationCopyForm {
  if (!record) return emptyCopyForm()
  return {
    short_description: record.short_description ?? '',
    description: record.description ?? '',
    pronunciation: record.pronunciation ?? '',
    classification: record.classification ?? '',
    established_year: record.established_year?.toString() ?? '',
    signature_grapes: (record.signature_grapes ?? []).join(', '),
    wine_styles: [...(record.wine_styles ?? [])],
    style_summary: record.style_summary ?? '',
    climate_soil: record.climate_soil ?? '',
    food_pairings: (record.food_pairings ?? []).join(', '),
    drinking_window: record.drinking_window ?? '',
    fun_fact: record.fun_fact ?? '',
    copy_status: record.copy_status,
  }
}

/** Blank clears the column rather than writing an empty string. */
function textOrNull(value: string): string | null {
  return value.trim() || null
}

function listOrNull(value: string): string[] | null {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return items.length ? items : null
}

export function copyFormToPayload(form: AppellationCopyForm): WineAppellationCopyInput {
  const year = Number.parseInt(form.established_year.trim(), 10)
  return {
    short_description: textOrNull(form.short_description),
    description: textOrNull(form.description),
    pronunciation: textOrNull(form.pronunciation),
    classification: textOrNull(form.classification),
    established_year: Number.isFinite(year) ? year : null,
    signature_grapes: listOrNull(form.signature_grapes),
    wine_styles: form.wine_styles.length ? [...form.wine_styles] : null,
    style_summary: textOrNull(form.style_summary),
    climate_soil: textOrNull(form.climate_soil),
    food_pairings: listOrNull(form.food_pairings),
    drinking_window: textOrNull(form.drinking_window),
    fun_fact: textOrNull(form.fun_fact),
    copy_status: form.copy_status,
  }
}
