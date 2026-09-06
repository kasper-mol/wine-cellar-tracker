<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/components/ui/menubar'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

/** A route is active for its whole subtree — Countries stays marked on
 * /country/:id, The Cellar on the add-wine route. */
const links = [
  { label: 'The Cellar', to: '/', prefixes: ['/cellar'], exact: true },
  { label: 'Countries', to: '/countries', prefixes: ['/countries', '/country/'] },
  { label: 'Regions', to: '/regions', prefixes: ['/regions', '/region/'] },
  { label: 'Appellations', to: '/appellations', prefixes: ['/appellations', '/appellation/'] },
  { label: 'Flavours', to: '/flavors', prefixes: ['/flavors'] },
]

const manageLinks = [
  { label: 'Wine countries', to: '/manage/wine-countries' },
  { label: 'Wine regions', to: '/manage/wine-regions' },
  { label: 'Appellations', to: '/manage/wine-appellations' },
  { label: 'Grape varieties', to: '/manage/grape-varieties' },
  { label: 'Vintage ratings', to: '/manage/vintage-ratings' },
  { label: 'Flavor descriptors', to: '/manage/flavor-descriptors' },
  { label: 'Wine maps', to: '/manage/wine-maps' },
  { label: 'Drinking window', to: '/manage/drinking-window' },
]

const linkClass = 'text-[13px] uppercase tracking-[0.06em] pb-0.5 border-b transition-colors'

function isActive(link: (typeof links)[number]) {
  const path = route.path
  if (link.exact && path === link.to) return true
  return link.prefixes.some((prefix) => path === prefix || path.startsWith(prefix))
}

const manageActive = computed(() => route.path.startsWith('/manage'))

async function handleSignOut() {
  await authStore.signOut()
  router.push({ name: 'login' })
}
</script>

<template>
  <nav class="flex items-baseline gap-4">
    <RouterLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      :class="[
        linkClass,
        isActive(link) ? 'border-primary text-primary' : 'border-transparent text-foreground/70',
      ]"
    >
      {{ link.label }}
    </RouterLink>

    <Menubar
      v-if="authStore.isAdmin || authStore.isLoggedIn"
      class="h-auto items-baseline gap-4 space-x-0 rounded-none border-0 bg-transparent p-0 shadow-none"
    >
      <MenubarMenu v-if="authStore.isAdmin">
        <MenubarTrigger
          :class="[
            linkClass,
            'cursor-pointer rounded-none px-0 font-normal data-[state=open]:bg-transparent focus:bg-transparent',
            manageActive
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground/70 data-[state=open]:text-primary',
          ]"
        >
          Manage
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem v-for="item in manageLinks" :key="item.to" as-child>
            <RouterLink :to="item.to" class="w-full">{{ item.label }}</RouterLink>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu v-if="authStore.isLoggedIn">
        <MenubarTrigger
          class="cursor-pointer rounded-none border-b border-transparent px-0 pb-0.5 text-xs font-normal tracking-[0.04em] text-foreground/50 data-[state=open]:bg-transparent focus:bg-transparent"
        >
          {{ authStore.displayName ?? 'Account' }}
        </MenubarTrigger>
        <MenubarContent align="end">
          <MenubarItem disabled class="text-xs text-muted-foreground">
            {{ authStore.user?.email }}
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem @click="handleSignOut">Sign out</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>

    <RouterLink
      v-if="!authStore.isLoggedIn"
      to="/login"
      :class="[linkClass, 'border-transparent text-foreground/70']"
    >
      Sign in
    </RouterLink>
  </nav>
</template>
