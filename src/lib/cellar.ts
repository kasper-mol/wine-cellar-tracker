import type { DrinkingWindow } from '@/types/drinkingWindow'
import type { UserWine } from '@/types/wines'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatPrice(value: number) {
  return currencyFormatter.format(value)
}

/** The ledger reconciles against line totals, not per-bottle prices. */
export function lineValue(wine: UserWine) {
  return wine.purchasePrice * wine.quantity
}

export function formatWindow(window: DrinkingWindow | null) {
  return window ? `${window.enter}–${window.drinkBy}` : '—'
}

/** A wine paired with its computed window (null when no archetype is mapped). */
export interface CellarEntry {
  wine: UserWine
  window: DrinkingWindow | null
}
