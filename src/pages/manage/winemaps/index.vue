<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ManageHeader from '@/components/manage/ManageHeader.vue'
import ManageTabs from '@/components/manage/ManageTabs.vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useWineMapsStore } from '@/stores/wineMaps'

const router = useRouter()
const wineMapsStore = useWineMapsStore()

const maps = computed(() => wineMapsStore.maps)
const loading = computed(() => wineMapsStore.loading)

const creating = ref(false)
const showCreateForm = ref(false)
const createError = ref<string | null>(null)

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)

const form = reactive({
  name: '',
  key: '',
  scope: 'country' as 'country' | 'region' | 'appellation',
  owner_wine_country_id: '',
  owner_wine_region_id: '',
  owner_wine_appellation_id: '',
})

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  selectedFile.value = target.files?.[0] ?? null
}

function clearOwnerFieldsForScope() {
  if (form.scope === 'country') {
    form.owner_wine_region_id = ''
    form.owner_wine_appellation_id = ''
  } else if (form.scope === 'region') {
    form.owner_wine_country_id = ''
    form.owner_wine_appellation_id = ''
  } else {
    form.owner_wine_country_id = ''
    form.owner_wine_region_id = ''
  }
}

watch(
  () => form.scope,
  () => {
    clearOwnerFieldsForScope()
  },
)

function openMap(id: string) {
  router.push({
    name: 'wine-map-manage',
    params: { id },
  })
}

async function createMap() {
  if (!selectedFile.value) {
    createError.value = 'Choose an SVG file for the map.'
    return
  }

  creating.value = true
  createError.value = null

  try {
    const created = await wineMapsStore.addWineMap(
      {
        name: form.name.trim(),
        key: form.key.trim(),
        scope: form.scope,
        owner_wine_country_id: form.owner_wine_country_id || null,
        owner_wine_region_id: form.owner_wine_region_id || null,
        owner_wine_appellation_id: form.owner_wine_appellation_id || null,
      },
      selectedFile.value,
    )

    showCreateForm.value = false
    form.name = ''
    form.key = ''
    form.scope = 'country'
    form.owner_wine_country_id = ''
    form.owner_wine_region_id = ''
    form.owner_wine_appellation_id = ''
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''

    router.push({
      name: 'wine-map-manage',
      params: { id: created.map.id },
    })
  } catch (error: unknown) {
    createError.value = error instanceof Error ? error.message : 'Failed to create wine map'
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  await Promise.all([wineMapsStore.fetchMaps(), wineMapsStore.loadTargetOptions()])
})
</script>

<template>
  <div>
    <ManageHeader
      title="Wine maps"
      note="SVG geography maps and their area mappings. Each map's shapes are linked to countries, regions or appellations."
    >
      <template #actions>
        <Button @click="showCreateForm = !showCreateForm">
          {{ showCreateForm ? 'Cancel' : 'New map' }}
        </Button>
      </template>
    </ManageHeader>

    <ManageTabs />

    <div>
      <div v-if="showCreateForm" class="mb-6 border-y border-border py-4">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-1">
            <label class="text-xs text-foreground/70">Name</label>
            <Input v-model="form.name" placeholder="France" />
          </div>

          <div class="space-y-1">
            <label class="text-xs text-foreground/70">Key</label>
            <Input v-model="form.key" placeholder="france-country" />
          </div>

          <div class="space-y-1">
            <label class="text-xs text-foreground/70">Scope</label>
            <select
              v-model="form.scope"
              class="min-h-9 w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm"
            >
              <option value="country">country</option>
              <option value="region">region</option>
              <option value="appellation">appellation</option>
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-xs text-foreground/70">SVG file</label>
            <input
              ref="fileInput"
              type="file"
              accept=".svg,image/svg+xml"
              class="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
              @change="onFileChange"
            />
          </div>

          <div v-if="form.scope === 'country'" class="space-y-1">
            <label class="text-xs text-foreground/70">Owner country</label>
            <select
              v-model="form.owner_wine_country_id"
              class="min-h-9 w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm"
            >
              <option value="">None</option>
              <option v-for="item in wineMapsStore.countries" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select>
          </div>

          <div v-if="form.scope === 'region'" class="space-y-1">
            <label class="text-xs text-foreground/70">Owner region</label>
            <select
              v-model="form.owner_wine_region_id"
              class="min-h-9 w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm"
            >
              <option value="">None</option>
              <option v-for="item in wineMapsStore.regions" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select>
          </div>

          <div v-if="form.scope === 'appellation'" class="space-y-1">
            <label class="text-xs text-foreground/70">Owner appellation</label>
            <select
              v-model="form.owner_wine_appellation_id"
              class="min-h-9 w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm"
            >
              <option value="">None</option>
              <option v-for="item in wineMapsStore.appellations" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select>
          </div>
        </div>

        <p class="mt-3 text-xs text-muted-foreground">
          The SVG is uploaded to Supabase Storage as version 1. You can replace it with newer
          versions later from the map's page.
        </p>

        <div class="mt-4 flex items-center gap-3">
          <Button :disabled="creating" @click="createMap">
            {{ creating ? 'Creating...' : 'Create map' }}
          </Button>

          <span v-if="createError" class="text-sm text-destructive">
            {{ createError }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="loading" class="border-t border-border">
      <div v-for="row in 4" :key="`map-skeleton-${row}`" class="border-b border-border py-2">
        <span class="block h-4 w-full bg-foreground/[0.06]" />
      </div>
    </div>

    <p v-else-if="!maps.length" class="border-y border-border py-3 text-sm text-foreground/[0.55]">
      No wine maps found.
    </p>

    <Table v-else>
      <TableHeader>
        <TableRow class="hover:bg-transparent">
          <TableHead class="w-[34px] text-right">№</TableHead>
          <TableHead>Name</TableHead>
          <TableHead class="w-[200px]">Key</TableHead>
          <TableHead class="w-[120px]">Scope</TableHead>
          <TableHead class="w-[200px]">Owner</TableHead>
          <TableHead class="w-[90px]">Active</TableHead>
          <TableHead class="w-[100px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="(map, index) in maps" :key="map.id">
          <TableCell class="num text-right text-xs text-foreground/40">{{ index + 1 }}</TableCell>
          <TableCell class="font-semibold">{{ map.name }}</TableCell>
          <TableCell class="font-mono text-xs text-foreground/[0.55]">{{ map.key }}</TableCell>
          <TableCell class="text-[13px] text-foreground/[0.62]">{{ map.scope }}</TableCell>
          <TableCell class="text-[13px] text-foreground/[0.62]">
            {{
              wineMapsStore.countries.find((item) => item.id === map.owner_wine_country_id)?.name ||
              wineMapsStore.regions.find((item) => item.id === map.owner_wine_region_id)?.name ||
              wineMapsStore.appellations.find((item) => item.id === map.owner_wine_appellation_id)
                ?.name ||
              '—'
            }}
          </TableCell>
          <TableCell class="text-[13px]">{{ map.is_active ? 'Yes' : 'No' }}</TableCell>
          <TableCell>
            <span class="flex justify-end">
              <Button variant="ghost" size="sm" @click="openMap(map.id)">Open</Button>
            </span>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
