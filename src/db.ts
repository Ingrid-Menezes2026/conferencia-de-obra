import Dexie, { type EntityTable } from 'dexie'

export type Status = 'ok' | 'nc' | 'na' | null

export interface Obra {
  id: string
  nome: string
  endereco: string
  cliente: string
  responsavel: string
  criadaEm: number
}

export interface Item {
  id: string
  secao: string
  texto: string
  tipo: 'check' | 'medicao'
  status: Status
  obs: string
  fotos: string[]
  unidade?: string
  projetado?: number | null
  medido?: number | null
  tolerancia?: number | null
}

export interface Vistoria {
  id: string
  obraId: string
  titulo: string
  modelos: string[]
  data: number
  vistoriador: string
  itens: Item[]
  assinatura?: string
  finalizada: boolean
}

export interface Foto {
  id: string
  blob: Blob
  criadaEm: number
  lat?: number
  lng?: number
}

export interface Pendencia {
  id: string
  obraId: string
  vistoriaId?: string
  itemId?: string
  descricao: string
  responsavel: string
  prazo: string
  status: 'aberta' | 'resolvida'
  criadaEm: number
}

export const db = new Dexie('conferencia-de-obra') as Dexie & {
  obras: EntityTable<Obra, 'id'>
  vistorias: EntityTable<Vistoria, 'id'>
  fotos: EntityTable<Foto, 'id'>
  pendencias: EntityTable<Pendencia, 'id'>
}

db.version(1).stores({
  obras: 'id, criadaEm',
  vistorias: 'id, obraId, data',
  fotos: 'id',
  pendencias: 'id, obraId, vistoriaId, status'
})

export const novoId = () => crypto.randomUUID()

// Medição está conforme quando |medido - projetado| <= tolerância
export function conformidadeMedicao(item: Item): Status {
  if (item.medido == null || item.projetado == null) return null
  const tol = item.tolerancia ?? 0
  return Math.abs(item.medido - item.projetado) <= tol ? 'ok' : 'nc'
}

export async function excluirObra(obraId: string) {
  await db.transaction('rw', db.obras, db.vistorias, db.fotos, db.pendencias, async () => {
    const vistorias = await db.vistorias.where('obraId').equals(obraId).toArray()
    const fotoIds = vistorias.flatMap(v => v.itens.flatMap(i => i.fotos))
    await db.fotos.bulkDelete(fotoIds)
    await db.vistorias.where('obraId').equals(obraId).delete()
    await db.pendencias.where('obraId').equals(obraId).delete()
    await db.obras.delete(obraId)
  })
}

export async function excluirVistoria(v: Vistoria) {
  await db.transaction('rw', db.vistorias, db.fotos, db.pendencias, async () => {
    await db.fotos.bulkDelete(v.itens.flatMap(i => i.fotos))
    await db.pendencias.where('vistoriaId').equals(v.id).delete()
    await db.vistorias.delete(v.id)
  })
}
