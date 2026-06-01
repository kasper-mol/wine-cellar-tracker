import { getSupabaseClient } from '@/lib/supabase'

export function entityImagePath(folder: string, id: string, filename: string): string {
  const ext = filename.split('.').pop() || 'jpg'
  return `${folder}/${id}.${ext}`
}

export async function uploadEntityImage(bucket: string, path: string, file: File): Promise<string> {
  const db = getSupabaseClient()
  const { error } = await db.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw error
  const {
    data: { publicUrl },
  } = db.storage.from(bucket).getPublicUrl(path)
  return publicUrl
}
