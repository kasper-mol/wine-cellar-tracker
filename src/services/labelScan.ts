import { getSupabaseClient } from '@/lib/supabase'
import type { ScanResult } from '@/types/labelScan'
import type { WineStyle } from '@/types/wines'

const STYLES: readonly WineStyle[] = ['red', 'white', 'rosé', 'sparkling', 'dessert']

/** Downscale before sending — vision API cost scales with image size, and a
 *  full-res phone photo buys no extraction accuracy over ~1024px. */
const MAX_DIMENSION = 1024
const JPEG_QUALITY = 0.85

async function resizeToBase64(image: File | Blob): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(image)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))

  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width * scale
  canvas.height = bitmap.height * scale

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return { base64, mediaType: 'image/jpeg' }
}

function asStyle(value: unknown): WineStyle | null {
  return typeof value === 'string' && (STYLES as string[]).includes(value) ? (value as WineStyle) : null
}

/** Send a label photo to the scan-label Edge Function, which calls a
 *  vision-LLM (Claude) to read it and, best-effort via one web search, find
 *  a link to the wine on the producer's own site. Costs a small amount of
 *  API credit per scan — the image is downscaled first to keep that low. */
export async function scanLabel(image: File | Blob): Promise<ScanResult> {
  const { base64, mediaType } = await resizeToBase64(image)

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('scan-label', {
    body: { image: base64, mediaType },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)

  return {
    producer: data.producer ?? null,
    name: data.name ?? null,
    vintage: typeof data.vintage === 'number' ? data.vintage : null,
    appellationText: data.appellationText ?? null,
    grapesText: Array.isArray(data.grapesText) ? data.grapesText : [],
    styleGuess: asStyle(data.styleGuess),
    producerLink: typeof data.producerLink === 'string' ? data.producerLink : null,
  }
}
