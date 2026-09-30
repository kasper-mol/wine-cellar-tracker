<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const router = useRouter()
const query = ref('')

/** A small entry point, not a second search page: hand the text to /pairing and let it run there. */
function submit() {
  const q = query.value.trim()
  void router.push(q ? { name: 'pairing', query: { q } } : { name: 'pairing' })
}
</script>

<template>
  <section
    class="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border pb-6"
    aria-label="Food and wine pairing"
  >
    <h2 class="font-heading text-[24px] font-normal">What are you drinking with dinner?</h2>
    <form class="flex min-w-0 flex-1 basis-[320px] gap-2" role="search" @submit.prevent="submit">
      <Input
        v-model="query"
        type="search"
        maxlength="200"
        placeholder="e.g. roast lamb with rosemary"
        aria-label="Describe your dish"
      />
      <Button type="submit" variant="secondary">Find a pairing</Button>
    </form>
  </section>
</template>
