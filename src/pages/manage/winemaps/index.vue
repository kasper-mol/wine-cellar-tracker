<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWineMapsStore } from '@/stores/wineMaps'

const router = useRouter()
const wineMapsStore = useWineMapsStore()

const maps = computed(() => wineMapsStore.maps)
const loading = computed(() => wineMapsStore.loading)

const creating = ref(false)
const showCreateForm = ref(false)
const createError = ref<string | null>(null)

const form = reactive({
  name: '',
  key: '',
  scope: 'country' as 'country' | 'region' | 'appellation',
  svgAssetPath: '/maps/',
  owner_wine_country_id: '',
  owner_wine_region_id: '',
  owner_wine_appellation_id: '',
})

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
    name: 'admin-wine-map-detail',
    params: { id },
  })
}

async function createMap() {
  creating.value = true
  createError.value = null

  try {
    const created = await wineMapsStore.addWineMap({
      name: form.name.trim(),
      key: form.key.trim(),
      scope: form.scope,
      svgAssetPath: form.svgAssetPath.trim(),
      owner_wine_country_id: form.owner_wine_country_id || null,
      owner_wine_region_id: form.owner_wine_region_id || null,
      owner_wine_appellation_id: form.owner_wine_appellation_id || null,
    })

    showCreateForm.value = false
    form.name = ''
    form.key = ''
    form.scope = 'country'
    form.svgAssetPath = '/maps/'
    form.owner_wine_country_id = ''
    form.owner_wine_region_id = ''
    form.owner_wine_appellation_id = ''

    router.push({
      name: 'admin-wine-map-detail',
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
  <div class="space-y-6 p-6">
    <div class="rounded-xl border border-border bg-card p-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="font-serif text-3xl font-semibold text-foreground">Wine Maps</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Manage SVG-based wine geography maps and their area mappings.
          </p>
        </div>

        <Button @click="showCreateForm = !showCreateForm">
          {{ showCreateForm ? 'Cancel' : 'New map' }}
        </Button>
      </div>

      <div v-if="showCreateForm" class="mt-6 rounded-lg border bg-muted/20 p-4">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-1">
            <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >Name</label
            >
            <Input v-model="form.name" placeholder="France" />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >Key</label
            >
            <Input v-model="form.key" placeholder="france-country" />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >Scope</label
            >
            <select
              v-model="form.scope"
              class="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="country">country</option>
              <option value="region">region</option>
              <option value="appellation">appellation</option>
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >SVG path</label
            >
            <Input v-model="form.svgAssetPath" placeholder="/maps/france.svg" />
          </div>

          <div v-if="form.scope === 'country'" class="space-y-1">
            <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >Owner country</label
            >
            <select
              v-model="form.owner_wine_country_id"
              class="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">None</option>
              <option v-for="item in wineMapsStore.countries" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select>
          </div>

          <div v-if="form.scope === 'region'" class="space-y-1">
            <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >Owner region</label
            >
            <select
              v-model="form.owner_wine_region_id"
              class="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">None</option>
              <option v-for="item in wineMapsStore.regions" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select>
          </div>

          <div v-if="form.scope === 'appellation'" class="space-y-1">
            <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >Owner appellation</label
            >
            <select
              v-model="form.owner_wine_appellation_id"
              class="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">None</option>
              <option v-for="item in wineMapsStore.appellations" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select>
          </div>
        </div>

        <p class="mt-3 text-xs text-muted-foreground">
          The SVG file should already exist in your public maps folder.
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

    <div class="rounded-xl border border-border bg-card p-4">
      <div v-if="loading" class="py-10 text-sm text-muted-foreground">Loading maps...</div>

      <div
        v-else-if="!maps.length"
        class="rounded-lg border border-dashed border-muted p-6 text-sm text-muted-foreground"
      >
        No wine maps found.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr class="border-b text-left">
              <th class="px-3 py-2 font-medium">Name</th>
              <th class="px-3 py-2 font-medium">Key</th>
              <th class="px-3 py-2 font-medium">Scope</th>
              <th class="px-3 py-2 font-medium">Owner</th>
              <th class="px-3 py-2 font-medium">Active</th>
              <th class="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="map in maps" :key="map.id" class="border-b transition hover:bg-muted/30">
              <td class="px-3 py-2 font-medium text-foreground">{{ map.name }}</td>
              <td class="px-3 py-2 font-mono text-xs text-muted-foreground">{{ map.key }}</td>
              <td class="px-3 py-2">{{ map.scope }}</td>
              <td class="px-3 py-2">
                {{
                  wineMapsStore.countries.find((item) => item.id === map.owner_wine_country_id)
                    ?.name ||
                  wineMapsStore.regions.find((item) => item.id === map.owner_wine_region_id)
                    ?.name ||
                  wineMapsStore.appellations.find(
                    (item) => item.id === map.owner_wine_appellation_id,
                  )?.name ||
                  '—'
                }}
              </td>
              <td class="px-3 py-2">{{ map.is_active ? 'Yes' : 'No' }}</td>
              <td class="px-3 py-2">
                <Button size="sm" @click="openMap(map.id)">Open</Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
