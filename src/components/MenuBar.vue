<script setup lang="ts">
import { useRouter } from 'vue-router'
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
const router = useRouter()

async function handleSignOut() {
  await authStore.signOut()
  router.push({ name: 'login' })
}
</script>

<template>
  <Menubar>
    <MenubarMenu>
      <RouterLink
        v-slot="{ isActive }"
        to="/countries"
        class="rounded-md px-3 py-1.5 transition hover:bg-muted"
      >
        <span :class="isActive ? 'text-foreground' : 'text-muted-foreground'">Countries</span>
      </RouterLink>
      <RouterLink
        v-slot="{ isActive }"
        to="/regions"
        class="rounded-md px-3 py-1.5 transition hover:bg-muted"
      >
        <span :class="isActive ? 'text-foreground' : 'text-muted-foreground'">Regions</span>
      </RouterLink>
      <RouterLink
        v-slot="{ isActive }"
        to="/appellations"
        class="rounded-md px-3 py-1.5 transition hover:bg-muted"
      >
        <span :class="isActive ? 'text-foreground' : 'text-muted-foreground'">Appellations</span>
      </RouterLink>
      <RouterLink
        v-slot="{ isActive }"
        to="/flavors"
        class="rounded-md px-3 py-1.5 transition hover:bg-muted"
      >
        <span :class="isActive ? 'text-foreground' : 'text-muted-foreground'">Flavors</span>
      </RouterLink>
      <MenubarMenu v-if="authStore.isAdmin">
        <MenubarTrigger class="rounded-md px-3 py-1.5 transition hover:bg-muted">
          Manage
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <RouterLink to="/manage/wine-countries" class="w-full">Wine countries</RouterLink>
          </MenubarItem>
          <MenubarItem>
            <RouterLink to="/manage/wine-regions" class="w-full">Wine regions</RouterLink>
          </MenubarItem>
          <MenubarItem>
            <RouterLink to="/manage/wine-appellations" class="w-full">Appellations</RouterLink>
          </MenubarItem>
          <MenubarItem>
            <RouterLink to="/manage/grape-varieties" class="w-full">Grape varieties</RouterLink>
          </MenubarItem>
          <MenubarItem>
            <RouterLink to="/manage/vintage-ratings" class="w-full">Vintage ratings</RouterLink>
          </MenubarItem>
          <MenubarItem>
            <RouterLink to="/manage/flavor-descriptors" class="w-full"
              >Flavor descriptors</RouterLink
            >
          </MenubarItem>
          <MenubarItem>
            <RouterLink to="/manage/wine-maps" class="w-full">Wine maps</RouterLink>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu v-if="authStore.isLoggedIn">
        <MenubarTrigger class="rounded-md px-3 py-1.5 transition hover:bg-muted">
          {{ authStore.displayName ?? 'Account' }}
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem disabled class="text-xs text-muted-foreground">
            {{ authStore.user?.email }}
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem @click="handleSignOut">Sign out</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <RouterLink
        v-else
        to="/login"
        class="rounded-md px-3 py-1.5 text-sm transition hover:bg-muted"
      >
        Sign in
      </RouterLink>
    </MenubarMenu>
  </Menubar>
</template>
