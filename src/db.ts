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
  marcadoPor?: string
  marcadoEm?: number
}

export interface Registro {
  em: number
  por: string
  acao: string
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
  criadaPor?: string
  finalizadaEm?: number
  finalizadaPor?: string
  historico?: Registro[]
}

export interface Foto {
  id: string
  blob: Blob
  criadaEm: number
  autor?: string
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
  criadaPor?: string
  resolvidaEm?: number
  resolvidaPor?: string
}

export const DISCIPLINAS = ['Arquitetônico', 'Estrutural', 'Fundação', 'Elétrico', 'Hidrossanitário', 'Outro'] as const

export interface Projeto {
  id: string
  obraId: string
  nome: string
  disciplina: string
  revisao: string
  formato: 'pdf' | 'dwg'
  nomeArquivo: string
  arquivo: Blob
  tamanho: number
  criadoEm: number
  enviadoPor: string
}

// Marcações feitas sobre uma página de projeto durante uma vistoria.
// Coordenadas em pontos da página do PDF (escala 1), independentes do zoom.
export interface Ponto {
  n: number
  x: number
  y: number
  descricao: string
  criadoPor: string
  criadoEm: number
  // Fotos do problema (prova) e da correção (contraprova), ids da tabela fotos
  provas?: string[]
  contraprovas?: string[]
  resolvidoEm?: number
  resolvidoPor?: string
}

export interface Traco {
  cor: string
  largura: number
  pontos: [number, number][]
}

export interface Marcacao {
  id: string
  vistoriaId: string
  projetoId: string
  pagina: number
  pontos: Ponto[]
  tracos: Traco[]
  imagem?: Blob
  atualizadoEm: number
  atualizadoPor: string
}

export const db = new Dexie('conferencia-de-obra') as Dexie & {
  obras: EntityTable<Obra, 'id'>
  vistorias: EntityTable<Vistoria, 'id'>
  fotos: EntityTable<Foto, 'id'>
  pendencias: EntityTable<Pendencia, 'id'>
  projetos: EntityTable<Projeto, 'id'>
  marcacoes: EntityTable<Marcacao, 'id'>
}

db.version(1).stores({
  obras: 'id, criadaEm',
  vistorias: 'id, obraId, data',
  fotos: 'id',
  pendencias: 'id, obraId, vistoriaId, status'
})

db.version(2).stores({
  projetos: 'id, obraId, criadoEm'
})

db.version(3).stores({
  marcacoes: 'id, vistoriaId, projetoId'
})

export const novoId = () => crypto.randomUUID()

// Medição está conforme quando |medido - projetado| <= tolerância
export function conformidadeMedicao(item: Item): Status {
  if (item.medido == null || item.projetado == null) return null
  const tol = item.tolerancia ?? 0
  return Math.abs(item.medido - item.projetado) <= tol ? 'ok' : 'nc'
}

export async function excluirObra(obraId: string) {
  await db.transaction('rw', [db.obras, db.vistorias, db.fotos, db.pendencias, db.projetos, db.marcacoes], async () => {
    const vistorias = await db.vistorias.where('obraId').equals(obraId).toArray()
    await db.marcacoes.where('vistoriaId').anyOf(vistorias.map(v => v.id)).delete()
    const fotoIds = vistorias.flatMap(v => v.itens.flatMap(i => i.fotos))
    await db.fotos.bulkDelete(fotoIds)
    await db.vistorias.where('obraId').equals(obraId).delete()
    await db.pendencias.where('obraId').equals(obraId).delete()
    await db.projetos.where('obraId').equals(obraId).delete()
    await db.obras.delete(obraId)
  })
}

export async function excluirVistoria(v: Vistoria) {
  await db.transaction('rw', [db.vistorias, db.fotos, db.pendencias, db.marcacoes], async () => {
    await db.fotos.bulkDelete(v.itens.flatMap(i => i.fotos))
    await db.marcacoes.where('vistoriaId').equals(v.id).delete()
    await db.pendencias.where('vistoriaId').equals(v.id).delete()
    await db.vistorias.delete(v.id)
  })
}
