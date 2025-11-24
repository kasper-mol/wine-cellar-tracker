<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

import { useWineDefinitionStore } from '@/stores/wineDefinitions'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineAppellationsStore } from '@/stores/wineAppellations'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'

const router = useRouter()

const wineStore = useWineDefinitionStore()
const countriesStore = useWineCountriesStore()
const regionsStore = useWineRegionsStore()
const appellationsStore = useWineAppellationsStore()

onMounted(async () => {
  await Promise.all([
    countriesStore.loadAll(),
    regionsStore.loadAll(),
    appellationsStore.loadAll(),
    wineStore.loadDefinitions(),
  ])
})

const wines = computed(() => wineStore.definitions)

const getCountryName = (id: string | null) =>
  countriesStore.countries.find((c) => c.id === id)?.name ?? '-'

const getRegionName = (id: string | null) =>
  regionsStore.regions.find((r) => r.id === id)?.name ?? '-'

const getAppellationName = (id: string | null) =>
  appellationsStore.appellations.find((a) => a.id === id)?.name ?? '-'

const editWine = (id: string) => router.push({ name: 'WineDefinitionEdit', params: { id } })
const createWine = () => router.push({ name: 'WineDefinitionCreate' })
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">Wine Definitions</h1>
      <Button @click="createWine">+ Create Wine</Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>All Wines</CardTitle>
      </CardHeader>
      <CardContent>
        <Table v-if="wines.length">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Appellation</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="wine in wines" :key="wine.id">
              <TableCell>{{ wine.name }}</TableCell>
              <TableCell>{{ getCountryName(wine.country_id) }}</TableCell>
              <TableCell>{{ getRegionName(wine.region_id) }}</TableCell>
              <TableCell>{{ getAppellationName(wine.appellation_id) }}</TableCell>
              <TableCell>{{ wine.version }}</TableCell>
              <TableCell>
                <Button size="sm" @click="editWine(wine.id)">Edit</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p v-else>No wines found.</p>
      </CardContent>
    </Card>
  </div>
</template>
