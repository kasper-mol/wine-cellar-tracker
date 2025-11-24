<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getSupabaseClient } from '@/lib/supabase'
import type { UserRecord } from '@/services/users'
import { fetchUsers, updateUser } from '@/services/users'

const supabaseReady = ref(false)
const users = ref<UserRecord[]>([])
const selectedUserId = ref<string | null>(null)
const isLoadingUsers = ref(false)
const isSaving = ref(false)
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const form = reactive({
  email: '',
  displayName: '',
  password: '',
})

const selectedUser = computed(
  () => users.value.find((candidate) => candidate.id === selectedUserId.value) ?? null,
)

watch(
  selectedUser,
  (user) => {
    if (!user) {
      form.email = ''
      form.displayName = ''
      form.password = ''
      return
    }

    form.email = user.email
    form.displayName = user.display_name ?? ''
    form.password = ''
    feedback.value = null
  },
  { immediate: true },
)

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

onMounted(() => {
  try {
    getSupabaseClient()
    supabaseReady.value = true
    loadUsers()
  } catch (error) {
    supabaseReady.value = false
    feedback.value = {
      type: 'error',
      message: getErrorMessage(
        error,
        'Supabase is not configured. Set your environment variables.',
      ),
    }
  }
})

async function loadUsers() {
  if (!supabaseReady.value) return
  isLoadingUsers.value = true
  feedback.value = null
  try {
    const data = await fetchUsers()

    users.value = data
    const firstUser = data[0]
    if (firstUser && !selectedUserId.value) {
      selectedUserId.value = firstUser.id
    } else if (!data.find((user) => user.id === selectedUserId.value)) {
      selectedUserId.value = firstUser?.id ?? null
    }
  } catch (error) {
    feedback.value = {
      type: 'error',
      message: getErrorMessage(error, 'Unable to fetch users.'),
    }
  } finally {
    isLoadingUsers.value = false
  }
}

async function handleUpdate() {
  if (!selectedUser.value || !supabaseReady.value) return

  isSaving.value = true
  feedback.value = null

  try {
    const updatedUser = await updateUser(selectedUser.value.id, {
      email: form.email,
      displayName: form.displayName,
      password: form.password || undefined,
    })

    users.value = users.value.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    feedback.value = { type: 'success', message: 'User updated successfully.' }
    form.password = ''
  } catch (error) {
    feedback.value = {
      type: 'error',
      message: getErrorMessage(error, 'Unable to update user.'),
    }
  } finally {
    isSaving.value = false
  }
}

const hasUsers = computed(() => users.value.length > 0)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm uppercase tracking-wide text-muted-foreground">User administration</p>
        <h1 class="text-3xl font-semibold tracking-tight">Select and edit cellar users</h1>
        <p class="text-muted-foreground">
          Choose a user from the list, update their contact info, or rotate their password.
        </p>
      </div>
      <Button variant="outline" :disabled="isLoadingUsers" @click="loadUsers">
        {{ isLoadingUsers ? 'Refreshing...' : 'Refresh list' }}
      </Button>
    </div>

    <div class="grid gap-6 lg:grid-cols-[2fr,3fr]">
      <Card>
        <CardHeader>
          <CardTitle>Registered users</CardTitle>
          <CardDescription>Click a row to load user details.</CardDescription>
        </CardHeader>
        <CardContent class="p-0">
          <div class="max-h-[420px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Display name</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody v-if="hasUsers">
                <TableRow
                  v-for="user in users"
                  :key="user.id"
                  class="cursor-pointer hover:bg-muted/60"
                  :class="user.id === selectedUserId ? 'bg-muted/60' : undefined"
                  @click="selectedUserId = user.id"
                >
                  <TableCell class="font-medium">{{ user.email }}</TableCell>
                  <TableCell>{{ user.display_name || '—' }}</TableCell>
                  <TableCell>{{ new Date(user.created_at).toLocaleDateString() }}</TableCell>
                </TableRow>
              </TableBody>
              <TableBody v-else>
                <TableRow>
                  <TableCell colspan="3">
                    <div class="p-4 text-center text-sm text-muted-foreground">
                      {{
                        isLoadingUsers
                          ? 'Loading users…'
                          : 'No users yet. Create one from the sign-up page.'
                      }}
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter>
          <p class="text-sm text-muted-foreground">
            Showing {{ users.length }} user{{ users.length === 1 ? '' : 's' }} from Supabase.
          </p>
        </CardFooter>
      </Card>

      <Card class="h-full">
        <CardHeader>
          <CardTitle>User details</CardTitle>
          <CardDescription>
            {{
              selectedUser ? 'Update the fields and save changes.' : 'Pick a user to get started.'
            }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form class="space-y-4" @submit.prevent="handleUpdate">
            <div class="space-y-2">
              <Label for="editEmail">Email</Label>
              <Input
                id="editEmail"
                v-model="form.email"
                type="email"
                autocomplete="email"
                :disabled="!selectedUser"
                required
              />
            </div>
            <div class="space-y-2">
              <Label for="editDisplayName">Display name</Label>
              <Input
                id="editDisplayName"
                v-model="form.displayName"
                type="text"
                autocomplete="name"
                :disabled="!selectedUser"
              />
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <Label for="editPassword">Set new password</Label>
                <span class="text-xs text-muted-foreground">(optional)</span>
              </div>
              <Input
                id="editPassword"
                v-model="form.password"
                type="password"
                autocomplete="new-password"
                placeholder="Leave blank to keep current password"
                :disabled="!selectedUser"
              />
            </div>
            <Button type="submit" class="w-full" :disabled="!selectedUser || isSaving">
              {{ isSaving ? 'Saving changes...' : 'Save changes' }}
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
            Password updates will hash the new value client-side before syncing to Supabase.
          </p>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
