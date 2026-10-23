import { useSyncExternalStore } from 'react'

// Quem está usando o app neste aparelho. Quando o login existir, o nome virá da conta.
const CHAVE = 'conferencia-usuario'
const ouvintes = new Set<() => void>()

function ler(): string {
  try { return localStorage.getItem(CHAVE) ?? '' } catch { return '' }
}

export function definirUsuario(nome: string) {
  try { localStorage.setItem(CHAVE, nome.trim()) } catch { /* sem armazenamento */ }
  ouvintes.forEach(f => f())
}

export const usuarioAtual = ler

export function useUsuario() {
  return useSyncExternalStore(f => { ouvintes.add(f); return () => ouvintes.delete(f) }, ler)
}

export const dataHora = (t: number) =>
  new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
