<script setup lang="ts">
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '@/components/ui/menubar'

import { RouterLink } from 'vue-router'
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
      <MenubarTrigger class="rounded-md px-3 py-1.5 transition hover:bg-muted">
        Manage
      </MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          <RouterLink
            v-slot="{ isActive }"
            to="/signup"
            class="rounded-md px-3 py-1.5 transition hover:bg-muted"
          >
            <span :class="isActive ? 'text-foreground' : 'text-muted-foreground'">Sign up</span>
          </RouterLink>
        </MenubarItem>
        <MenubarItem>
          <RouterLink
            v-slot="{ isActive }"
            to="/users"
            class="rounded-md px-3 py-1.5 transition hover:bg-muted"
          >
            <span :class="isActive ? 'text-foreground' : 'text-muted-foreground'"
              >Manage users</span
            >
          </RouterLink>
        </MenubarItem>
        <MenubarItem>
          <RouterLink
            v-slot="{ isActive }"
            to="/manage/wine-countries"
            class="rounded-md px-3 py-1.5 transition hover:bg-muted"
          >
            <span :class="isActive ? 'text-foreground' : 'text-muted-foreground'">
              Wine countries
            </span>
          </RouterLink>
        </MenubarItem>
        <MenubarItem>
          <RouterLink
            v-slot="{ isActive }"
            to="/manage/wine-regions"
            class="rounded-md px-3 py-1.5 transition hover:bg-muted"
          >
            <span :class="isActive ? 'text-foreground' : 'text-muted-foreground'">
              Wine regions
            </span>
          </RouterLink>
        </MenubarItem>
        <MenubarItem>
          <RouterLink
            v-slot="{ isActive }"
            to="/manage/wine-appellations"
            class="rounded-md px-3 py-1.5 transition hover:bg-muted"
          >
            <span :class="isActive ? 'text-foreground' : 'text-muted-foreground'">
              Appellations
            </span>
          </RouterLink>
        </MenubarItem>
        <MenubarItem>
          <RouterLink
            v-slot="{ isActive }"
            to="/manage/grape-varieties"
            class="rounded-md px-3 py-1.5 transition hover:bg-muted"
          >
            <span :class="isActive ? 'text-foreground' : 'text-muted-foreground'">
              Grape varieties
            </span>
          </RouterLink>
        </MenubarItem>
        <MenubarItem>
          <RouterLink
            v-slot="{ isActive }"
            to="/manage/wine-definitions"
            class="rounded-md px-3 py-1.5 transition hover:bg-muted"
          >
            <span :class="isActive ? 'text-foreground' : 'text-muted-foreground'">
              Wine definitions
            </span>
          </RouterLink>
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  </Menubar>

  <nav class="flex flex-wrap items-center gap-2 text-sm font-medium"></nav>
</template>
s
