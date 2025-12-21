import { createRouter, createWebHistory } from 'vue-router'

import DashboardPage from '@/pages/DashboardPage.vue'
import SignUpPage from '@/pages/SignUpPage.vue'
import CountriesPage from '@/pages/countries.vue'
import RegionsPage from '@/pages/regions.vue'
import AppellationsPage from '@/pages/appellations.vue'
import CountryDetailPage from '@/pages/country/[id].vue'
import RegionDetailPage from '@/pages/region/[id].vue'
import AppellationDetailPage from '@/pages/appellation/[id].vue'
import UserManagementPage from '@/pages/manage/UserManagementPage.vue'
import WineAppellationsPage from '@/pages/manage/WineAppellationsPage.vue'
import WineCountriesPage from '@/pages/manage/WineCountriesPage.vue'
import WineRegionsPage from '@/pages/manage/WineRegionsPage.vue'
import GrapeVarietiesPage from '@/pages/manage/GrapeVarietiesPage.vue'
import VintageRatingsManage from '@/pages/manage/VintageRatingsManage.vue'
import VintageRatingBatch from '@/pages/manage/VintageRatingBatch.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardPage,
    },
    {
      path: '/signup',
      name: 'signup',
      component: SignUpPage,
    },
    {
      path: '/countries',
      name: 'countries',
      component: CountriesPage,
    },
    {
      path: '/regions',
      name: 'regions',
      component: RegionsPage,
    },
    {
      path: '/appellations',
      name: 'appellations',
      component: AppellationsPage,
    },
    {
      path: '/country/:id',
      name: 'country-detail',
      component: CountryDetailPage,
      props: true,
    },
    {
      path: '/region/:id',
      name: 'region-detail',
      component: RegionDetailPage,
      props: true,
    },
    {
      path: '/appellation/:id',
      name: 'appellation-detail',
      component: AppellationDetailPage,
      props: true,
    },
    {
      path: '/users',
      name: 'user-management',
      component: UserManagementPage,
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
  ],
})

export default router
