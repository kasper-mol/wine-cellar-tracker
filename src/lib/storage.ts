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

export const WINE_MAPS_BUCKET = 'wine-maps'

/** Upload an SVG map asset to the wine-maps bucket and return its public URL. */
export async function uploadWineMapSvg(path: string, file: File): Promise<string> {
  const db = getSupabaseClient()
  const { error } = await db.storage
    .from(WINE_MAPS_BUCKET)
    .upload(path, file, { upsert: true, contentType: 'image/svg+xml' })
  if (error) throw error
  const {
    data: { publicUrl },
  } = db.storage.from(WINE_MAPS_BUCKET).getPublicUrl(path)
  return publicUrl
}

/** Lowercase, hyphenated, filesystem-safe version of a filename. */
export function safeAssetName(filename: string): string {
  return filename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** SHA-256 hex digest of a file's bytes (for the asset version checksum). */
export async function fileChecksum(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
