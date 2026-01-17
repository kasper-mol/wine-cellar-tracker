<script setup lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  <Card>
    <CardHeader>
      <CardTitle>Flavor groups</CardTitle>
      <CardDescription>Organize descriptors by level and category.</CardDescription>
    </CardHeader>
    <CardContent class="p-0">
      <div class="max-h-[520px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[30%]">Level</TableHead>
              <TableHead class="w-[45%]">Category</TableHead>
              <TableHead class="w-[15%]">Count</TableHead>
              <TableHead class="w-[10%]" />
            </TableRow>
          </TableHeader>
          <TableBody v-if="hasGroups">
            <TableRow v-for="group in groups" :key="`${group.level}-${group.category ?? ''}`">
              <TableCell class="font-medium">{{ group.level }}</TableCell>
              <TableCell>{{ group.category || 'Uncategorized' }}</TableCell>
              <TableCell>{{ group.count }}</TableCell>
              <TableCell class="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  class="text-muted-foreground"
                  @click.stop="emit('editGroup', { level: group.level, category: group.category })"
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
          <TableBody v-else>
            <TableRow>
              <TableCell colspan="4">
                <div class="p-6 text-center text-sm text-muted-foreground">
                  No flavor groups yet. Add your first descriptor.
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </CardContent>
    <CardFooter>
      <p class="text-sm text-muted-foreground">
        Showing {{ groups.length }} group{{ groups.length === 1 ? '' : 's' }}.
      </p>
    </CardFooter>
  </Card>
</template>
