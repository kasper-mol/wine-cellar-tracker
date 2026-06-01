<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWineMapsStore } from '@/stores/wineMaps'

const route = useRoute()
const wineMapsStore = useWineMapsStore()

const mapContainer = ref<HTMLElement | null>(null)
const svgMarkup = ref('')
const saving = ref(false)
const savingMap = ref(false)
const importing = ref(false)
const saveMessage = ref<string | null>(null)
const mapSaveMessage = ref<string | null>(null)
const importMessage = ref<string | null>(null)
const hoveredSvgAreaId = ref<string | null>(null)

const mapForm = reactive({
  name: '',
  key: '',
  scope: 'country' as 'country' | 'region' | 'appellation',
  is_active: true,
  owner_wine_country_id: '',
  owner_wine_region_id: '',
  owner_wine_appellation_id: '',
})

const form = reactive({
  label: '' as string,
  is_clickable: false,
  is_decorative: false,
  is_visible: true,
  target_wine_country_id: '' as string,
  target_wine_region_id: '' as string,
  target_wine_appellation_id: '' as string,
})

const mapId = computed(() => String(route.params.id ?? ''))
const adminMap = computed(() => wineMapsStore.adminMap)
const selectedArea = computed(() => wineMapsStore.selectedArea)

const selectedSvgAreaId = computed(() => selectedArea.value?.svg_area_id ?? null)
const visibleAreas = computed(() => adminMap.value?.areas ?? [])
const interactiveAreas = computed(() => visibleAreas.value.filter((area) => !area.is_decorative))

function normalizeSvgKey(value: string) {
  return value.trim().toLowerCase()
}

function resetMapForm() {
  mapForm.name = adminMap.value?.name ?? ''
  mapForm.key = adminMap.value?.key ?? ''
  mapForm.scope = adminMap.value?.scope ?? 'country'
  mapForm.is_active = adminMap.value?.is_active ?? true
  mapForm.owner_wine_country_id = adminMap.value?.owner_wine_country_id ?? ''
  mapForm.owner_wine_region_id = adminMap.value?.owner_wine_region_id ?? ''
  mapForm.owner_wine_appellation_id = adminMap.value?.owner_wine_appellation_id ?? ''
}

function clearMapOwnersForScope() {
  if (mapForm.scope === 'country') {
    mapForm.owner_wine_region_id = ''
    mapForm.owner_wine_appellation_id = ''
  } else if (mapForm.scope === 'region') {
    mapForm.owner_wine_country_id = ''
    mapForm.owner_wine_appellation_id = ''
  } else {
    mapForm.owner_wine_country_id = ''
    mapForm.owner_wine_region_id = ''
  }
}

function resetFormFromSelectedArea() {
  const area = selectedArea.value

  form.label = area?.label ?? ''
  form.is_clickable = area?.is_clickable ?? false
  form.is_decorative = area?.is_decorative ?? false
  form.is_visible = area?.is_visible ?? true
  form.target_wine_country_id = area?.target_wine_country_id ?? ''
  form.target_wine_region_id = area?.target_wine_region_id ?? ''
  form.target_wine_appellation_id = area?.target_wine_appellation_id ?? ''
}

function clearOtherTargets(type: 'country' | 'region' | 'appellation') {
  if (type !== 'country') form.target_wine_country_id = ''
  if (type !== 'region') form.target_wine_region_id = ''
  if (type !== 'appellation') form.target_wine_appellation_id = ''
}

function onCountryChange(value: string) {
  form.target_wine_country_id = value
  if (value) clearOtherTargets('country')
}

function onRegionChange(value: string) {
  form.target_wine_region_id = value
  if (value) clearOtherTargets('region')
}

function onAppellationChange(value: string) {
  form.target_wine_appellation_id = value
  if (value) clearOtherTargets('appellation')
}

watch(
  () => mapForm.scope,
  () => {
    clearMapOwnersForScope()
  },
)

watch(
  () => form.is_decorative,
  (isDecorative) => {
    if (isDecorative) {
      form.is_clickable = false
      form.target_wine_country_id = ''
      form.target_wine_region_id = ''
      form.target_wine_appellation_id = ''
    }
  },
)

async function fetchSvg(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to load SVG: ${url}`)
  svgMarkup.value = await response.text()
}

function getSvgElementByAreaId(svgAreaId: string): HTMLElement | null {
  if (!mapContainer.value) return null

  const byId = mapContainer.value.querySelector(`#${CSS.escape(svgAreaId)}`) as HTMLElement | null
  if (byId) return byId

  const allElements = Array.from(
    mapContainer.value.querySelectorAll<HTMLElement>('g, path, polygon, rect, circle, ellipse'),
  )

  return (
    allElements.find((el) => {
      const label = el.getAttribute('inkscape:label') || el.getAttribute('label')
      return label ? normalizeSvgKey(label) === normalizeSvgKey(svgAreaId) : false
    }) ?? null
  )
}

function getShapeElements(root: HTMLElement): HTMLElement[] {
  const tagName = root.tagName.toLowerCase()

  if (['path', 'polygon', 'rect', 'circle', 'ellipse'].includes(tagName)) {
    return [root]
  }

  return Array.from(root.querySelectorAll<HTMLElement>('path, polygon, rect, circle, ellipse'))
}

function applyAreaVisualState(svgAreaId: string) {
  const el = getSvgElementByAreaId(svgAreaId)
  if (!el) return

  const area = adminMap.value?.areas.find(
    (item) => normalizeSvgKey(item.svg_area_id) === normalizeSvgKey(svgAreaId),
  )
  if (!area) return

  const shapes = getShapeElements(el)

  const isSelected =
    selectedSvgAreaId.value &&
    normalizeSvgKey(selectedSvgAreaId.value) === normalizeSvgKey(svgAreaId)

  const isHovered =
    hoveredSvgAreaId.value && normalizeSvgKey(hoveredSvgAreaId.value) === normalizeSvgKey(svgAreaId)

  const isActive = Boolean(isSelected || isHovered)

  for (const shape of shapes) {
    shape.style.cursor = area.is_decorative ? 'default' : 'pointer'
    shape.style.opacity = area.is_decorative ? '0.45' : isActive ? '0.8' : '1'
    shape.style.filter = area.is_decorative
      ? 'grayscale(0.3)'
      : isActive
        ? 'brightness(1.08)'
        : 'none'
    shape.style.stroke = isSelected ? '#111' : ''
    shape.style.strokeWidth = isSelected ? '1.5' : ''
  }
}

function applyAllAreaVisualStates() {
  for (const area of adminMap.value?.areas ?? []) {
    applyAreaVisualState(area.svg_area_id)
  }
}

function applySvgBindings() {
  if (!mapContainer.value || !adminMap.value) return

  const svg = mapContainer.value.querySelector('svg')
  if (!svg) return

  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', `${adminMap.value.name} admin wine map`)
  svg.style.width = '100%'
  svg.style.height = 'auto'
  svg.style.display = 'block'

  for (const area of adminMap.value.areas) {
    const el = getSvgElementByAreaId(area.svg_area_id)
    if (!el) continue

    const shapes = getShapeElements(el)

    for (const shape of shapes) {
      shape.style.transition = 'opacity 150ms ease, filter 150ms ease, stroke 150ms ease'
    }

    if (el.dataset.bound !== 'true') {
      el.dataset.bound = 'true'

      el.addEventListener('mouseenter', () => {
        hoveredSvgAreaId.value = area.svg_area_id
        applyAllAreaVisualStates()
      })

      el.addEventListener('mouseleave', () => {
        hoveredSvgAreaId.value = null
        applyAllAreaVisualStates()
      })

      el.addEventListener('click', () => {
        wineMapsStore.selectAreaBySvgAreaId(area.svg_area_id)
      })
    }
  }

  applyAllAreaVisualStates()
}

async function loadPage() {
  saveMessage.value = null
  mapSaveMessage.value = null
  importMessage.value = null

  await Promise.all([wineMapsStore.loadAdminMap(mapId.value), wineMapsStore.loadTargetOptions()])

  resetMapForm()

  if (adminMap.value?.svgAssetPath) {
    await fetchSvg(adminMap.value.svgAssetPath)
    await nextTick()
    applySvgBindings()
  }
}

async function saveMapDefinition() {
  if (!adminMap.value) return

  savingMap.value = true
  mapSaveMessage.value = null

  try {
    await wineMapsStore.saveMapDefinition(adminMap.value.id, {
      name: mapForm.name.trim(),
      key: mapForm.key.trim(),
      scope: mapForm.scope,
      is_active: mapForm.is_active,
      owner_wine_country_id: mapForm.owner_wine_country_id || null,
      owner_wine_region_id: mapForm.owner_wine_region_id || null,
      owner_wine_appellation_id: mapForm.owner_wine_appellation_id || null,
    })

    mapSaveMessage.value = 'Map saved'
  } finally {
    savingMap.value = false
  }
}

async function importAreas() {
  if (!adminMap.value) return

  importing.value = true
  importMessage.value = null

  try {
    const result = await wineMapsStore.importAreasForAdminMap()
    importMessage.value = `Imported ${result.totalCount} keys (${result.createdCount} new, ${result.existingCount} existing)`
    await nextTick()
    applySvgBindings()
  } finally {
    importing.value = false
  }
}

async function saveSelectedArea() {
  if (!selectedArea.value) return

  saving.value = true
  saveMessage.value = null

  try {
    await wineMapsStore.saveArea(selectedArea.value.id, {
      label: form.label || null,
      is_clickable: form.is_clickable,
      is_decorative: form.is_decorative,
      is_visible: form.is_visible,
      target_wine_country_id: form.target_wine_country_id || null,
      target_wine_region_id: form.target_wine_region_id || null,
      target_wine_appellation_id: form.target_wine_appellation_id || null,
    })

    saveMessage.value = 'Saved'
    await nextTick()
    applyAllAreaVisualStates()
  } finally {
    saving.value = false
  }
}

onMounted(loadPage)

watch(
  () => route.params.id,
  async () => {
    svgMarkup.value = ''
    await loadPage()
  },
)

watch(
  () => wineMapsStore.selectedAreaId,
  () => {
    resetFormFromSelectedArea()
    nextTick(() => applyAllAreaVisualStates())
  },
)

watch(
  () => adminMap.value,
  () => {
    resetMapForm()
  },
)

watch(
  () => adminMap.value?.areas,
  async () => {
    await nextTick()
    applySvgBindings()
  },
  { deep: true },
)
</script>

<template>
  <div class="space-y-6 p-6">
    <div class="rounded-xl border border-border bg-card p-6">
      <div class="space-y-4">
        <div>
          <h1 class="font-serif text-3xl font-semibold text-foreground">Wine Map Admin</h1>

          <div v-if="adminMap" class="mt-3 text-sm text-muted-foreground">
            <div>
              <span class="font-medium text-foreground">SVG:</span>
              {{ adminMap.svgAssetPath || 'No active SVG' }}
            </div>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div class="space-y-1">
            <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >Name</label
            >
            <Input v-model="mapForm.name" />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >Key</label
            >
            <Input v-model="mapForm.key" />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >Scope</label
            >
            <select
              v-model="mapForm.scope"
              class="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="country">country</option>
              <option value="region">region</option>
              <option value="appellation">appellation</option>
            </select>
          </div>

          <div v-if="mapForm.scope === 'country'" class="space-y-1">
            <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >Owner country</label
            >
            <select
              v-model="mapForm.owner_wine_country_id"
              class="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">None</option>
              <option v-for="item in wineMapsStore.countries" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select>
          </div>

          <div v-if="mapForm.scope === 'region'" class="space-y-1">
            <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >Owner region</label
            >
            <select
              v-model="mapForm.owner_wine_region_id"
              class="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">None</option>
              <option v-for="item in wineMapsStore.regions" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select>
          </div>

          <div v-if="mapForm.scope === 'appellation'" class="space-y-1">
            <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >Owner appellation</label
            >
            <select
              v-model="mapForm.owner_wine_appellation_id"
              class="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">None</option>
              <option v-for="item in wineMapsStore.appellations" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select>
          </div>

          <div class="flex items-end">
            <label class="flex items-center gap-2 text-sm">
              <input v-model="mapForm.is_active" type="checkbox" />
              <span>Active</span>
            </label>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <Button :disabled="savingMap" @click="saveMapDefinition">
            {{ savingMap ? 'Saving map...' : 'Save map' }}
          </Button>

          <Button :disabled="importing || !adminMap?.svgAssetPath" @click="importAreas">
            {{ importing ? 'Importing...' : 'Import SVG areas' }}
          </Button>

          <span v-if="mapSaveMessage" class="text-sm text-muted-foreground">{{
            mapSaveMessage
          }}</span>
          <span v-if="importMessage" class="text-sm text-muted-foreground">{{
            importMessage
          }}</span>
        </div>
      </div>
    </div>

    <div v-if="adminMap" class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_420px]">
      <div class="rounded-xl border border-border bg-card p-4">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-foreground">SVG Preview</h2>
          <p class="text-sm text-muted-foreground">
            Click an area in the SVG or in the table below.
          </p>
        </div>

        <div
          ref="mapContainer"
          class="min-h-[500px] rounded-lg border bg-muted/20 p-4"
          v-html="svgMarkup"
        />
      </div>

      <div class="rounded-xl border border-border bg-card p-4">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-foreground">Area Editor</h2>
        </div>

        <div v-if="selectedArea" class="space-y-4">
          <div class="space-y-1">
            <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >SVG Area Key</label
            >
            <div class="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              {{ selectedArea.svg_area_id }}
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >Label</label
            >
            <Input v-model="form.label" placeholder="Display label" />
          </div>

          <div class="grid grid-cols-1 gap-3">
            <label class="flex items-center gap-2 text-sm">
              <input v-model="form.is_clickable" type="checkbox" :disabled="form.is_decorative" />
              <span>Clickable</span>
            </label>

            <label class="flex items-center gap-2 text-sm">
              <input v-model="form.is_decorative" type="checkbox" />
              <span>Decorative</span>
            </label>

            <label class="flex items-center gap-2 text-sm">
              <input v-model="form.is_visible" type="checkbox" />
              <span>Visible</span>
            </label>
          </div>

          <div class="space-y-3">
            <div>
              <label
                class="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >Country target</label
              >
              <select
                class="w-full rounded-md border bg-background px-3 py-2 text-sm"
                :disabled="form.is_decorative"
                :value="form.target_wine_country_id"
                @change="onCountryChange(($event.target as HTMLSelectElement).value)"
              >
                <option value="">None</option>
                <option v-for="item in wineMapsStore.countries" :key="item.id" :value="item.id">
                  {{ item.name }}
                </option>
              </select>
            </div>

            <div>
              <label
                class="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >Region target</label
              >
              <select
                class="w-full rounded-md border bg-background px-3 py-2 text-sm"
                :disabled="form.is_decorative"
                :value="form.target_wine_region_id"
                @change="onRegionChange(($event.target as HTMLSelectElement).value)"
              >
                <option value="">None</option>
                <option v-for="item in wineMapsStore.regions" :key="item.id" :value="item.id">
                  {{ item.name }}
                </option>
              </select>
            </div>

            <div>
              <label
                class="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >Appellation target</label
              >
              <select
                class="w-full rounded-md border bg-background px-3 py-2 text-sm"
                :disabled="form.is_decorative"
                :value="form.target_wine_appellation_id"
                @change="onAppellationChange(($event.target as HTMLSelectElement).value)"
              >
                <option value="">None</option>
                <option v-for="item in wineMapsStore.appellations" :key="item.id" :value="item.id">
                  {{ item.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <Button :disabled="saving" @click="saveSelectedArea">
              {{ saving ? 'Saving...' : 'Save area' }}
            </Button>

            <span v-if="saveMessage" class="text-sm text-muted-foreground">
              {{ saveMessage }}
            </span>
          </div>
        </div>

        <div v-else class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Select an area from the SVG or the list below.
        </div>
      </div>
    </div>

    <div v-if="adminMap" class="rounded-xl border border-border bg-card p-4">
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-foreground">Areas</h2>
        <p class="text-sm text-muted-foreground">
          {{ interactiveAreas.length }} non-decorative areas, {{ visibleAreas.length }} total.
        </p>
      </div>

      <div
        v-if="!visibleAreas.length"
        class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
      >
        No areas imported yet. Click “Import SVG areas”.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr class="border-b text-left">
              <th class="px-3 py-2 font-medium">SVG Key</th>
              <th class="px-3 py-2 font-medium">Label</th>
              <th class="px-3 py-2 font-medium">Clickable</th>
              <th class="px-3 py-2 font-medium">Decorative</th>
              <th class="px-3 py-2 font-medium">Country</th>
              <th class="px-3 py-2 font-medium">Region</th>
              <th class="px-3 py-2 font-medium">Appellation</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="area in visibleAreas"
              :key="area.id"
              class="cursor-pointer border-b transition hover:bg-muted/30"
              :class="{ 'bg-muted/40': selectedArea?.id === area.id }"
              @click="wineMapsStore.selectAreaByRowId(area.id)"
            >
              <td class="px-3 py-2 font-mono text-xs">{{ area.svg_area_id }}</td>
              <td class="px-3 py-2">{{ area.label || '—' }}</td>
              <td class="px-3 py-2">{{ area.is_clickable ? 'Yes' : 'No' }}</td>
              <td class="px-3 py-2">{{ area.is_decorative ? 'Yes' : 'No' }}</td>
              <td class="px-3 py-2">
                {{
                  wineMapsStore.countries.find((item) => item.id === area.target_wine_country_id)
                    ?.name || '—'
                }}
              </td>
              <td class="px-3 py-2">
                {{
                  wineMapsStore.regions.find((item) => item.id === area.target_wine_region_id)
                    ?.name || '—'
                }}
              </td>
              <td class="px-3 py-2">
                {{
                  wineMapsStore.appellations.find(
                    (item) => item.id === area.target_wine_appellation_id,
                  )?.name || '—'
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
