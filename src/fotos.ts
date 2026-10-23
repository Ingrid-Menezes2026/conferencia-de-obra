import { db, novoId } from './db'

// Reduz a foto para no máximo 1600 px e salva no aparelho
export async function salvarFoto(arquivo: File): Promise<string> {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.8))
  const pos = await localizacao()
  const id = novoId()
  await db.fotos.add({ id, blob, criadaEm: Date.now(), lat: pos?.latitude, lng: pos?.longitude })
  return id
}

function localizacao(): Promise<GeolocationCoordinates | null> {
  return new Promise(r => {
    if (!navigator.geolocation) return r(null)
    navigator.geolocation.getCurrentPosition(p => r(p.coords), () => r(null), { timeout: 4000, maximumAge: 60000 })
  })
}

export const blobParaDataURL = (b: Blob) =>
  new Promise<string>(r => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(b) })
