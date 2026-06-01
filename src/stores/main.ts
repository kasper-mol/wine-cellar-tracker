import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserWine } from '@/types/wines'

const dummyWines: UserWine[] = [
  {
    id: 'wine-001',
    name: 'Château Margaux',
    producer: 'Château Margaux',
    varietal: 'Cabernet Sauvignon',
    region: 'Bordeaux',
    country: 'France',
    vintage: 2015,
    style: 'red',
    quantity: 3,
    rating: 98,
    readyToDrink: '2024-2035',
    purchasePrice: 799,
  },
  {
    id: 'wine-002',
    name: 'Kistler Chardonnay',
    producer: 'Kistler Vineyards',
    varietal: 'Chardonnay',
    region: 'Sonoma Coast',
    country: 'United States',
    vintage: 2020,
    style: 'white',
    quantity: 6,
    rating: 95,
    readyToDrink: '2024-2028',
    purchasePrice: 85,
  },
  {
    id: 'wine-003',
    name: 'Dom Pérignon',
    producer: 'Moët & Chandon',
    varietal: 'Champagne Blend',
    region: 'Champagne',
    country: 'France',
    vintage: 2013,
    style: 'sparkling',
    quantity: 2,
    rating: 97,
    readyToDrink: 'Now-2030',
    purchasePrice: 220,
  },
  {
    id: 'wine-004',
    name: 'Vega Sicilia Único',
    producer: 'Bodegas Vega Sicilia',
    varietal: 'Tempranillo',
    region: 'Ribera del Duero',
    country: 'Spain',
    vintage: 2010,
    style: 'red',
    quantity: 1,
    rating: 99,
    readyToDrink: '2025-2040',
    purchasePrice: 350,
  },
  {
    id: 'wine-005',
    name: 'Tokaji Aszú 6 Puttonyos',
    producer: 'Royal Tokaji',
    varietal: 'Furmint',
    region: 'Tokaj',
    country: 'Hungary',
    vintage: 2016,
    style: 'dessert',
    quantity: 4,
    rating: 96,
    readyToDrink: '2024-2045',
    purchasePrice: 65,
  },
]

export const useMainStore = defineStore('main', () => {
  const userWines = ref<UserWine[]>(dummyWines)

  const totalBottleCount = computed(() =>
    userWines.value.reduce((total, wine) => total + wine.quantity, 0),
  )

  function setUserWines(wines: UserWine[]) {
    userWines.value = wines
  }

  return { userWines, totalBottleCount, setUserWines }
})
