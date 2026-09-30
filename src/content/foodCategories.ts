import type { FoodTagCategory } from '@/types/foodPairings'

/** Display order and copy for the food-tag categories (the DB stores only the token). */
export const FOOD_CATEGORIES: { id: FoodTagCategory; label: string }[] = [
  { id: 'protein', label: 'Meat & protein' },
  { id: 'seafood', label: 'Seafood' },
  { id: 'vegetable_produce', label: 'Vegetables & fruit' },
  { id: 'cheese_dairy', label: 'Cheese & dairy' },
  { id: 'preparation', label: 'Cooking style' },
  { id: 'flavor_profile', label: 'Flavour' },
  { id: 'cuisine', label: 'Cuisine' },
  { id: 'dessert_sweet', label: 'Sweet' },
]

export function foodCategoryLabel(category: FoodTagCategory): string {
  return FOOD_CATEGORIES.find((entry) => entry.id === category)?.label ?? category
}
