<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWineDefinitionStore } from '@/stores/wineDefinitions'
import type { WineDefinitionRecord } from '@/services/wineDefinitions'
import type { WineDefinitionGrapeRecord } from '@/services/wineDefinitionsGrapes'

import WineDefinitionForm from '@/components/wineDefinitions/WineDefinitionForm.vue'

defineOptions({
  name: 'WineDefinitionDetailPage',
})

const route = useRoute()
const router = useRouter()
const store = useWineDefinitionStore()

const definitionId = route.params.id as string

type DetailedWineDefinition = WineDefinitionRecord & { grapes: WineDefinitionGrapeRecord[] }
const definition = ref<DetailedWineDefinition | null>(null)
const isNew = definitionId === 'new'

onMounted(async () => {
  if (definitionId && !isNew) {
    await store.loadOne(definitionId)
    definition.value = store.current as DetailedWineDefinition | null
  }
})

function onSaved() {
  router.push('/admin/wine-definitions')
}
</script>

<template>
  <div>
    <WineDefinitionForm
      v-if="definitionId && (isNew || definition)"
      :definition="isNew ? null : definition"
      @saved="onSaved"
    />
  </div>
</template>
