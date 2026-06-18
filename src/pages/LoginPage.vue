<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const isLoading = ref(false)
const error = ref<string | null>(null)

async function handleGoogleSignIn() {
  isLoading.value = true
  error.value = null
  try {
    await authStore.signInWithGoogle()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Sign in failed. Please try again.'
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <Card class="w-full max-w-sm">
      <CardHeader class="text-center">
        <CardTitle class="text-2xl">Welcome to Cellar Tracker</CardTitle>
        <CardDescription>Sign in to manage your personal wine cellar.</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <Button
          class="flex w-full items-center justify-center gap-2"
          :disabled="isLoading"
          @click="handleGoogleSignIn"
        >
          <svg
            class="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 488 512"
            fill="currentColor"
          >
            <path
              d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
            />
          </svg>
          {{ isLoading ? 'Redirecting...' : 'Sign in with Google' }}
        </Button>
        <p v-if="error" class="text-center text-sm text-destructive">{{ error }}</p>
        <p class="text-center text-xs text-muted-foreground">
          A Google account is all you need. No password required.
        </p>
      </CardContent>
    </Card>
  </div>
</template>
