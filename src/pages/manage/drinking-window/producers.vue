<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Trash2 } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { useFeedback } from '@/composables/useFeedback'
import { useDrinkingWindowStore } from '@/stores/drinkingWindow'

const dwStore = useDrinkingWindowStore()
const confirmRef = ref<InstanceType<typeof ConfirmDialog> | null>(null)
const { producerTiers } = storeToRefs(dwStore)
const { feedback, setSuccess, setError } = useFeedback()

const newProducer = reactive({ name: '', tier: '4' })
const searchQuery = ref('')

onMounted(async () => {
  try {
    await dwStore.loadConfig()
  } catch (e) {
    setError(e, 'Failed to load producer tiers.')
  }
})

async function addProducer() {
  const name = newProducer.name.trim()
  if (!name) return
  try {
    await dwStore.addProducerTier({ name, tier: Number(newProducer.tier) })
    newProducer.name = ''
    setSuccess(`Added "${name}".`)
  } catch (e) {
    setError(e, 'Failed to add producer.')
  }
}

async function changeProducerTier(id: string, value: string) {
  try {
    await dwStore.saveProducerTier(id, { tier: Number(value) })
  } catch (e) {
    setError(e, 'Failed to update tier.')
  }
}

async function removeProducer(id: string, name: string) {
  const confirmed = await confirmRef.value?.confirm({
    title: 'Remove producer tier',
    body: `“${name}” will lose its tier, and its wines will no longer be extended. This cannot be undone.`,
  })
  if (!confirmed) return
  try {
    await dwStore.removeProducerTier(id)
    setSuccess(`Removed "${name}".`)
  } catch (e) {
    setError(e, 'Failed to remove producer.')
  }
}

import { computed } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const filteredProducers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return q
    ? producerTiers.value.filter((p) => p.name.toLowerCase().includes(q))
    : producerTiers.value
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <RouterLink
        to="/manage/drinking-window"
        class="text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft class="inline h-4 w-4" /> Drinking-window engine
      </RouterLink>
    </div>

    <div>
      <h1 class="text-3xl font-semibold tracking-tight">Producer tiers</h1>
      <p class="mt-1 text-muted-foreground">
        Top producers consistently age longer than the regional average. The engine extends the
        <strong>back-end</strong> of the computed window (drink-by date) by a percentage based on
        tier:
      </p>
      <ul class="mt-2 space-y-0.5 text-sm text-muted-foreground">
        <li><strong>Tier 5</strong> — +12% (e.g. DRC, Pétrus, Screaming Eagle)</li>
        <li><strong>Tier 4.5</strong> — +8% (e.g. Pichon Baron, Giacomo Conterno)</li>
        <li><strong>Tier 4</strong> — +5% (e.g. Cos d'Estournel, Marchesi di Barolo)</li>
      </ul>
      <p class="mt-2 text-sm text-muted-foreground">
        Producer names are matched by a normalised form (lowercase, stripped of Château/Domaine/
        Weingut/Tenuta prefixes and non-alphanumeric characters). Only the 30–40 top producers per
        region need entries here.
      </p>
    </div>

    <FeedbackBanner :feedback="feedback" />

    <!-- Add form -->
    <Card>
      <CardHeader>
        <CardTitle>Add producer</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap items-end gap-3">
          <div class="space-y-2">
            <Label>Producer name</Label>
            <Input
              v-model="newProducer.name"
              placeholder="e.g. Pichon Baron"
              class="w-64"
              @keyup.enter="addProducer"
            />
          </div>
          <div class="space-y-2">
            <Label>Tier</Label>
            <Select v-model="newProducer.tier">
              <SelectTrigger class="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 (+5%)</SelectItem>
                <SelectItem value="4.5">4.5 (+8%)</SelectItem>
                <SelectItem value="5">5 (+12%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button @click="addProducer">Add</Button>
        </div>
      </CardContent>
    </Card>

    <!-- List -->
    <Card>
      <CardHeader>
        <CardTitle
          >All producers
          <span class="text-base font-normal text-muted-foreground"
            >({{ producerTiers.length }})</span
          ></CardTitle
        >
      </CardHeader>
      <CardContent class="space-y-3">
        <Input v-model="searchQuery" placeholder="Filter by name…" class="max-w-sm" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producer</TableHead>
              <TableHead class="w-32">Tier</TableHead>
              <TableHead class="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="p in filteredProducers" :key="p.id">
              <TableCell class="font-medium">{{ p.name }}</TableCell>
              <TableCell>
                <Select
                  :model-value="String(p.tier)"
                  @update:model-value="changeProducerTier(p.id, $event as string)"
                >
                  <SelectTrigger class="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 (+5%)</SelectItem>
                    <SelectItem value="4.5">4.5 (+8%)</SelectItem>
                    <SelectItem value="5">5 (+12%)</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="ghost"
                  class="text-destructive hover:text-destructive"
                  @click="removeProducer(p.id, p.name)"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
            <TableRow v-if="filteredProducers.length === 0">
              <TableCell colspan="3" class="text-center text-muted-foreground">
                {{ searchQuery ? 'No producers match the filter.' : 'No producers yet.' }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
  <ConfirmDialog ref="confirmRef" />
</template>
