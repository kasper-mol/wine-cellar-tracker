<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getSupabaseClient } from '@/lib/supabase'
import { createUser } from '@/services/users'

interface SignupForm {
  email: string
  password: string
  confirmPassword: string
  displayName: string
}

const supabaseReady = ref(false)

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

const form = reactive<SignupForm>({
  email: '',
  password: '',
  confirmPassword: '',
  displayName: '',
})

const isSubmitting = ref(false)
const feedback = ref<{ type: 'error' | 'success'; message: string } | null>(null)

onMounted(() => {
  try {
    getSupabaseClient()
    supabaseReady.value = true
  } catch (error) {
    supabaseReady.value = false
    feedback.value = {
      type: 'error',
      message: getErrorMessage(
        error,
        'Supabase is not configured. Populate your environment variables.',
      ),
    }
  }
})

const passwordsMismatch = computed(
  () => !!form.password && !!form.confirmPassword && form.password !== form.confirmPassword,
)

const isSubmitDisabled = computed(
  () =>
    isSubmitting.value ||
    !form.email ||
    !form.password ||
    !form.confirmPassword ||
    passwordsMismatch.value ||
    !supabaseReady.value,
)

async function handleSubmit() {
  if (!supabaseReady.value) return

  isSubmitting.value = true
  feedback.value = null

  try {
    await createUser({
      email: form.email,
      password: form.password,
      displayName: form.displayName,
    })

    feedback.value = {
      type: 'success',
      message: 'Account created. You can now manage this user in the admin view.',
    }
    form.email = ''
    form.password = ''
    form.confirmPassword = ''
    form.displayName = ''
  } catch (error) {
    feedback.value = {
      type: 'error',
      message: getErrorMessage(error, 'Unable to create user. Please try again.'),
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-6">
    <div>
      <p class="text-sm uppercase tracking-wide text-muted-foreground">Invite collaborators</p>
      <h1 class="text-3xl font-semibold tracking-tight">Create a new cellar account</h1>
      <p class="text-muted-foreground">
        Fill out the form below to create a new record in the `users` table. Passwords are securely
        hashed in the browser using the Web Crypto API.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Sign up</CardTitle>
        <CardDescription>Provide basic account details to add a new user.</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <Label for="email">Email</Label>
            <Input
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              placeholder="alex@vineyard.com"
              required
            />
          </div>
          <div class="space-y-2">
            <Label for="displayName">Display name</Label>
            <Input
              id="displayName"
              v-model="form.displayName"
              type="text"
              placeholder="Alex Vineyard"
            />
          </div>
          <div class="space-y-2">
            <Label for="password">Password</Label>
            <Input
              id="password"
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              required
            />
          </div>
          <div class="space-y-2">
            <Label for="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              v-model="form.confirmPassword"
              type="password"
              autocomplete="new-password"
              required
            />
            <p v-if="passwordsMismatch" class="text-sm text-destructive">Passwords do not match.</p>
          </div>
          <Button class="w-full" type="submit" :disabled="isSubmitDisabled">
            {{ isSubmitting ? 'Creating account...' : 'Create account' }}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p
          v-if="feedback"
          :class="[
            'text-sm',
            feedback.type === 'success'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-destructive',
          ]"
        >
          {{ feedback.message }}
        </p>
        <p v-else class="text-sm text-muted-foreground">
          Need to add multiple users? Submit the form again after each creation.
        </p>
      </CardFooter>
    </Card>
  </div>
</template>
