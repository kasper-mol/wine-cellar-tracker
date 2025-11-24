<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMainStore } from '@/stores/main'

const mainStore = useMainStore()
const { userWines } = storeToRefs(mainStore)

const totalBottles = computed(() => mainStore.totalBottleCount)
const uniqueLabels = computed(() => new Set(userWines.value.map((wine) => wine.name)).size)
const cellarValue = computed(() =>
  userWines.value.reduce((sum, wine) => sum + wine.purchasePrice * wine.quantity, 0),
)

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
})

function formatPrice(value: number) {
  return currencyFormatter.format(value)
}
</script>

<template>
  <div class="space-y-8">
    <section class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm uppercase tracking-wide text-muted-foreground">Your digital cellar</p>
        <h1 class="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p class="text-muted-foreground">Monitor your collection at a glance.</p>
      </div>
      <div class="flex items-center gap-3">
        <p class="text-sm text-muted-foreground">
          Tracking {{ userWines.length }} wine{{ userWines.length === 1 ? '' : 's' }}.
        </p>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-3">
      <div class="rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
        <p class="text-sm text-muted-foreground">Total bottles</p>
        <p class="text-3xl font-semibold">{{ totalBottles }}</p>
      </div>
      <div class="rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
        <p class="text-sm text-muted-foreground">Unique labels</p>
        <p class="text-3xl font-semibold">{{ uniqueLabels }}</p>
      </div>
      <div class="rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
        <p class="text-sm text-muted-foreground">Cellar value</p>
        <p class="text-3xl font-semibold">{{ formatPrice(cellarValue) }}</p>
      </div>
    </section>

    <section class="space-y-4 rounded-2xl border bg-card p-4 text-card-foreground shadow-sm">
      <div>
        <h2 class="text-xl font-semibold tracking-tight">User wines</h2>
        <p class="text-sm text-muted-foreground">Shadcn table rendering data from Pinia.</p>
      </div>

      <Table>
        <TableCaption>Updated automatically once Supabase is connected.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[240px]">Label</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>Vintage</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="text-right">Qty</TableHead>
            <TableHead class="text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody v-if="userWines.length">
          <TableRow v-for="wine in userWines" :key="wine.id">
            <TableCell>
              <div class="flex flex-col">
                <span class="font-medium">{{ wine.name }}</span>
                <span class="text-sm text-muted-foreground">{{ wine.producer }}</span>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex flex-col">
                <span>{{ wine.region }}</span>
                <span class="text-sm text-muted-foreground">{{ wine.country }}</span>
              </div>
            </TableCell>
            <TableCell>{{ wine.vintage }}</TableCell>
            <TableCell>
              <span class="text-sm text-muted-foreground">Drink {{ wine.readyToDrink }}</span>
            </TableCell>
            <TableCell class="text-right font-medium">{{ wine.quantity }}</TableCell>
            <TableCell class="text-right font-medium">
              {{ formatPrice(wine.purchasePrice * wine.quantity) }}
            </TableCell>
          </TableRow>
        </TableBody>
        <TableBody v-else>
          <TableRow>
            <TableCell colspan="6">
              <div class="text-center text-muted-foreground">
                No wines yet. Add a few to get started.
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </section>
  </div>
</template>
