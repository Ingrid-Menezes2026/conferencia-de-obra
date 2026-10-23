import type { Projeto } from './db'

export function baixar(p: Projeto) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(p.arquivo)
  a.download = p.nomeArquivo
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10000)
}
