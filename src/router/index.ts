import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import DashboardPage from '@/pages/DashboardPage.vue'
import LoginPage from '@/pages/LoginPage.vue'
import CountriesPage from '@/pages/countries.vue'
import RegionsPage from '@/pages/regions.vue'
import AppellationsPage from '@/pages/appellations.vue'
import FlavorsPage from '@/pages/flavors.vue'
import CountryDetailPage from '@/pages/country/[id].vue'
import RegionDetailPage from '@/pages/region/[id].vue'
import AppellationDetailPage from '@/pages/appellation/[id].vue'
import WineAppellationsPage from '@/pages/manage/WineAppellationsPage.vue'
import WineCountriesPage from '@/pages/manage/WineCountriesPage.vue'
import WineRegionsPage from '@/pages/manage/WineRegionsPage.vue'
import GrapeVarietiesPage from '@/pages/manage/GrapeVarietiesPage.vue'
import VintageRatingsManage from '@/pages/manage/VintageRatingsManage.vue'
import VintageRatingBatch from '@/pages/manage/VintageRatingBatch.vue'
import FlavorDescriptorsPage from '@/pages/manage/FlavorDescriptorsPage.vue'
import WineMapManagePage from '@/pages/manage/winemaps/[id].vue'
import WineMapsPage from '@/pages/manage/winemaps/index.vue'
import DrinkingWindowIndex from '@/pages/manage/drinking-window/index.vue'
import DrinkingWindowArchetypes from '@/pages/manage/drinking-window/archetypes.vue'
import DrinkingWindowMappings from '@/pages/manage/drinking-window/mappings.vue'
import DrinkingWindowProducers from '@/pages/manage/drinking-window/producers.vue'
import DrinkingWindowHotVintages from '@/pages/manage/drinking-window/hot-vintages.vue'
import DrinkingWindowSettings from '@/pages/manage/drinking-window/settings.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { public: true },
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardPage,
    },
    {
      path: '/countries',
      name: 'countries',
      component: CountriesPage,
      meta: { public: true },
    },
    {
      path: '/regions',
      name: 'regions',
      component: RegionsPage,
      meta: { public: true },
    },
    {
      path: '/appellations',
      name: 'appellations',
      component: AppellationsPage,
      meta: { public: true },
    },
    {
      path: '/flavors',
      name: 'flavors',
      component: FlavorsPage,
      meta: { public: true },
    },
    {
      path: '/country/:id',
      name: 'country-detail',
      component: CountryDetailPage,
      props: true,
      meta: { public: true },
    },
    {
      path: '/region/:id',
      name: 'region-detail',
      component: RegionDetailPage,
      props: true,
      meta: { public: true },
    },
    {
      path: '/appellation/:id',
      name: 'appellation-detail',
      component: AppellationDetailPage,
      props: true,
      meta: { public: true },
    },
    {
      path: '/manage/wine-countries',
      name: 'wine-countries',
      component: WineCountriesPage,
    },
    {
      path: '/manage/wine-regions',
      name: 'wine-regions',
      component: WineRegionsPage,
    },
    {
      path: '/manage/grape-varieties',
      name: 'grape-varieties',
      component: GrapeVarietiesPage,
    },
    {
      path: '/manage/wine-appellations',
      name: 'wine-appellations',
      component: WineAppellationsPage,
    },
    {
      path: '/manage/vintage-ratings',
      component: VintageRatingsManage,
    },
    {
      path: '/manage/vintage-ratings/batch',
      component: VintageRatingBatch,
    },
    {
      path: '/manage/flavor-descriptors',
      name: 'flavor-descriptors',
      component: FlavorDescriptorsPage,
    },
    {
      path: '/manage/wine-maps',
      name: 'wine-maps',
      component: WineMapsPage,
    },
    {
      path: '/manage/drinking-window',
      name: 'drinking-window',
      component: DrinkingWindowIndex,
    },
    {
      path: '/manage/drinking-window/archetypes',
      name: 'dw-archetypes',
      component: DrinkingWindowArchetypes,
    },
    {
      path: '/manage/drinking-window/mappings',
      name: 'dw-mappings',
      component: DrinkingWindowMappings,
    },
    {
      path: '/manage/drinking-window/producers',
      name: 'dw-producers',
      component: DrinkingWindowProducers,
    },
    {
      path: '/manage/drinking-window/hot-vintages',
      name: 'dw-hot-vintages',
      component: DrinkingWindowHotVintages,
    },
    {
      path: '/manage/drinking-window/settings',
      name: 'dw-settings',
      component: DrinkingWindowSettings,
    },
    {
      path: '/manage/wine-maps/:id',
      name: 'wine-map-manage',
      component: WineMapManagePage,
      props: true,
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  // Wait until auth is resolved before making decisions
  if (authStore.isLoading) return true

  const isPublic = to.meta.public === true
  if (!isPublic && !authStore.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Already logged in and trying to visit login page
  if (to.name === 'login' && authStore.isLoggedIn) {
    return { name: 'dashboard' }
  }
})

export default router
