import type { FoodTagCategory } from '@/types/foodPairings'

/** Tags in these categories name the dish's main parts — the thing a wine style is chosen for. */
export const MAIN_INGREDIENT_CATEGORIES: readonly FoodTagCategory[] = ['protein', 'seafood']

/** Lesser anchors, used only when a dish names no main ingredient ("aged Gruyère", "tarte tatin"). */
export const SECONDARY_ANCHOR_CATEGORIES: readonly FoodTagCategory[] = [
  'cheese_dairy',
  'vegetable_produce',
  'dessert_sweet',
  'cuisine',
]
