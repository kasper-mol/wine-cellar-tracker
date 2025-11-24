import { createRouter, createWebHistory } from 'vue-router'

import DashboardPage from '@/pages/DashboardPage.vue'
import SignUpPage from '@/pages/SignUpPage.vue'
import UserManagementPage from '@/pages/manage/UserManagementPage.vue'
import WineAppellationsPage from '@/pages/manage/WineAppellationsPage.vue'
import WineCountriesPage from '@/pages/manage/WineCountriesPage.vue'
import WineRegionsPage from '@/pages/manage/WineRegionsPage.vue'
import GrapeVarietiesPage from '@/pages/manage/GrapeVarietiesPage.vue'
import WineDefinitionsPage from '@/pages/manage/WineDefinitions/index.vue'
import WineDefinitionDetailPage from '@/pages/manage/WineDefinitions/[id].vue'

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
      path: '/manage/wine-definitions',
      name: 'WineDefinitionsList',
      component: WineDefinitionsPage,
    },
    {
      path: '/manage/wine-definitions/:id',
      name: 'WineDefinitionDetail',
      component: WineDefinitionDetailPage,
      props: true,
    },
  ],
})

export default router
