export interface UserRecord {
  id: string
  email: string
  password_hash: string
  display_name: string | null
  created_at: string
  updated_at: string
}

export interface UserCreatePayload {
  email: string
  password: string
  displayName?: string | null
}

export interface UserUpdatePayload {
  email?: string
  displayName?: string | null
  password?: string
}
