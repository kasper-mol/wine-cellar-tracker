<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useFlavorDescriptorsStore } from '@/stores/flavorDescriptors'

const emit = defineEmits<{
  (e: 'editGroup', payload: { level: string; category: string | null }): void
}>()

const flavorDescriptorsStore = useFlavorDescriptorsStore()
const { descriptors } = storeToRefs(flavorDescriptorsStore)

const groups = computed(() => {
  const map = new Map<string, { level: string; category: string | null; count: number }>()

  for (const descriptor of descriptors.value) {
    const level = descriptor.level
    const category = descriptor.category ?? null
    const key = `${level}__${category ?? ''}`

    if (!map.has(key)) {
      map.set(key, { level, category, count: 0 })
    }

    map.get(key)!.count += 1
  }

  return Array.from(map.values()).sort((a, b) => {
    const levelCompare = a.level.localeCompare(b.level)
    if (levelCompare !== 0) return levelCompare
    return (a.category ?? '').localeCompare(b.category ?? '')
  })
})

const hasGroups = computed(() => groups.value.length > 0)
</script>

<template>
  <Table>
    <TableHeader>
      <TableRow class="hover:bg-transparent">
        <TableHead class="w-[34px] text-right">№</TableHead>
        <TableHead class="w-[220px]">Level</TableHead>
        <TableHead>Category</TableHead>
        <TableHead class="w-[110px] text-right">Descriptors</TableHead>
        <TableHead class="w-[150px]" />
      </TableRow>
    </TableHeader>
    <TableBody v-if="hasGroups">
      <TableRow v-for="(group, index) in groups" :key="`${group.level}-${group.category ?? ''}`">
        <TableCell class="num text-right text-xs text-foreground/40">{{ index + 1 }}</TableCell>
        <TableCell class="font-semibold">{{ group.level }}</TableCell>
        <TableCell class="text-[13px] text-foreground/[0.74]">
          {{ group.category || 'Uncategorized' }}
        </TableCell>
        <TableCell class="num text-right">{{ group.count }}</TableCell>
        <TableCell>
          <span class="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              @click.stop="emit('editGroup', { level: group.level, category: group.category })"
            >
              Edit
            </Button>
          </span>
        </TableCell>
      </TableRow>
    </TableBody>
    <TableBody v-else>
      <TableRow class="hover:bg-transparent">
        <TableCell colspan="5" class="py-3 text-sm text-foreground/[0.55]">
          No flavour groups yet. Add your first descriptor.
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
