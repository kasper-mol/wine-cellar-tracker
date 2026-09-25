<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu, X } from 'lucide-vue-next'
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
  { label: 'Users', to: '/manage/users' },
  { label: 'Wine countries', to: '/manage/wine-countries' },
  { label: 'Wine regions', to: '/manage/wine-regions' },
  { label: 'Appellations', to: '/manage/wine-appellations' },
  { label: 'Grape varieties', to: '/manage/grape-varieties' },
  { label: 'Vintage ratings', to: '/manage/vintage-ratings' },
  { label: 'Flavor descriptors', to: '/manage/flavor-descriptors' },
  { label: 'Wine maps', to: '/manage/wine-maps' },
  { label: 'Drinking window', to: '/manage/drinking-window' },
]

const linkClass =
  'whitespace-nowrap text-[13px] uppercase tracking-[0.06em] pb-0.5 border-b transition-colors'

function isActive(link: (typeof links)[number]) {
  const path = route.path
  if (link.exact && path === link.to) return true
  return link.prefixes.some((prefix) => path === prefix || path.startsWith(prefix))
}

const manageActive = computed(() => route.path.startsWith('/manage'))

/* ------------------------------ mobile menu ------------------------------ */

const mobileOpen = ref(false)

/** Navigating anywhere closes the sheet; so does resizing past the breakpoint
 * (the sheet is display:none there, but the scroll lock must be released). */
watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  },
)

watch(mobileOpen, (open) => {
  document.documentElement.classList.toggle('overflow-hidden', open)
})

async function handleSignOut() {
  mobileOpen.value = false
  await authStore.signOut()
  router.push({ name: 'login' })
}
</script>

<template>
  <!-- Desktop: the inline text nav. -->
  <nav class="hidden items-baseline gap-4 lg:flex">
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

  <!-- Mobile: a single toggle; the sheet lives in a portal so the header's
       baseline flex never has to contain it. -->
  <button
    type="button"
    class="-mr-2 inline-flex h-11 w-11 items-center justify-center self-center text-foreground/80 lg:hidden"
    :aria-expanded="mobileOpen"
    aria-controls="mobile-menu"
    @click="mobileOpen = !mobileOpen"
  >
    <Menu class="h-5 w-5" :stroke-width="1.5" />
    <span class="sr-only">Open menu</span>
  </button>

  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="mobileOpen"
        id="mobile-menu"
        class="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background text-foreground lg:hidden"
      >
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <RouterLink class="font-heading text-[23px] tracking-[0.02em]" to="/">
            Cellar&nbsp;Tracker
          </RouterLink>
          <button
            type="button"
            class="-mr-2 inline-flex h-11 w-11 items-center justify-center text-foreground/80"
            @click="mobileOpen = false"
          >
            <X class="h-5 w-5" :stroke-width="1.5" />
            <span class="sr-only">Close menu</span>
          </button>
        </div>

        <nav class="flex flex-1 flex-col px-4 pb-8 pt-2">
          <RouterLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="flex items-baseline justify-between border-b border-border py-3.5 font-heading text-[28px] leading-none transition-colors"
            :class="isActive(link) ? 'text-primary' : 'text-foreground'"
          >
            {{ link.label }}
            <span
              v-if="isActive(link)"
              class="num text-[10px] uppercase tracking-[0.16em] text-primary"
            >
              Here
            </span>
          </RouterLink>

          <template v-if="authStore.isAdmin">
            <p
              class="num mb-1 mt-8 text-[11px] uppercase tracking-[0.18em]"
              :class="manageActive ? 'text-primary' : 'text-accent-700'"
            >
              Manage
            </p>
            <RouterLink
              v-for="item in manageLinks"
              :key="item.to"
              :to="item.to"
              class="border-b border-border py-2.5 text-[15px] transition-colors"
              :class="route.path.startsWith(item.to) ? 'text-primary' : 'text-foreground/80'"
            >
              {{ item.label }}
            </RouterLink>
          </template>

          <div class="mt-auto pt-8">
            <template v-if="authStore.isLoggedIn">
              <p class="text-[13px] text-foreground/80">
                {{ authStore.displayName ?? 'Account' }}
              </p>
              <p class="mb-3 text-xs text-foreground/50">{{ authStore.user?.email }}</p>
              <button
                type="button"
                class="text-[13px] uppercase tracking-[0.06em] text-primary"
                @click="handleSignOut"
              >
                Sign out
              </button>
            </template>
            <RouterLink
              v-else
              to="/login"
              class="text-[13px] uppercase tracking-[0.06em] text-primary"
            >
              Sign in
            </RouterLink>
          </div>
        </nav>
      </div>
    </Transition>
  </Teleport>
</template>
