import type { Item } from './db'

export function resumo(itens: Item[]) {
  const ok = itens.filter(i => i.status === 'ok').length
  const nc = itens.filter(i => i.status === 'nc').length
  const na = itens.filter(i => i.status === 'na').length
  return { ok, nc, na, pendentes: itens.length - ok - nc - na, total: itens.length }
}
