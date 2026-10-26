import { jsPDF } from 'jspdf'
import { db, type Item, type Vistoria } from './db'
import { blobParaDataURL } from './fotos'
import { resumo } from './resumo'
import { dataHora } from './usuario'

const GRAFITE: [number, number, number] = [39, 43, 43]
const COBRE: [number, number, number] = [142, 97, 66]
const COR = {
  ok: [74, 124, 89],
  nc: [178, 58, 46],
  na: [138, 129, 120],
  pendente: [192, 138, 46]
} as const
const ROTULO = { ok: 'CONFORME', nc: 'NÃO CONFORME', na: 'N/A', pendente: 'A CONFERIR' }

const fmt = (n: number | null | undefined) => (n == null ? '—' : String(n).replace('.', ','))

export async function gerarRelatorio(v: Vistoria) {
  const obra = await db.obras.get(v.obraId)
  const pendencias = await db.pendencias.where('vistoriaId').equals(v.id).toArray()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const L = 15, W = 180, H = 297, BAIXO = 280
  let y = 0

  const novaPagina = () => { doc.addPage(); y = 18 }
  const espaco = (h: number) => { if (y + h > BAIXO) novaPagina() }
  const texto = (t: string, x: number, larg: number, tam = 10, estilo: 'normal' | 'bold' = 'normal') => {
    doc.setFont('helvetica', estilo).setFontSize(tam)
    const linhas = doc.splitTextToSize(t, larg) as string[]
    const alt = linhas.length * tam * 0.42
    espaco(alt)
    doc.text(linhas, x, y + tam * 0.35)
    y += alt
  }

  // Cabeçalho
  doc.setFillColor(...GRAFITE).rect(0, 0, 210, 34, 'F')
  doc.setFillColor(...COBRE).rect(0, 34, 210, 1.2, 'F')
  // marca: casa com check
  doc.setFillColor(231, 223, 215).roundedRect(L, 8, 18, 18, 3, 3, 'F')
  doc.setFillColor(...GRAFITE).triangle(L + 3, 17, L + 9, 11.5, L + 15, 17, 'F').rect(L + 4.2, 17, 9.6, 6, 'F')
  doc.setDrawColor(...COBRE).setLineWidth(1.1).lines([[2, 2], [4, -4.5]], L + 9.5, 19.5)
  doc.setTextColor(198, 188, 176).setFont('helvetica', 'bold').setFontSize(7.5).text('CONFERÊNCIA DE OBRA', L + 23, 13, { charSpace: 0.6 })
  doc.setTextColor(255).setFontSize(16).text('Relatório de Vistoria', L + 23, 20.5)
  doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(231, 223, 215).text(v.titulo, L + 23, 26.5)
  doc.setFontSize(8).setTextColor(198, 188, 176).text(v.finalizada ? 'ARQUIVADA' : 'EM ANDAMENTO', 195, 13, { align: 'right', charSpace: 0.5 })
  doc.setFontSize(9).setTextColor(255).text(dataHora(v.finalizadaEm ?? v.data), 195, 20.5, { align: 'right' })
  doc.setTextColor(0)
  y = 44

  // Dados da obra, em duas colunas
  doc.setTextColor(...COBRE).setFont('helvetica', 'bold').setFontSize(13).text(obra?.nome ?? '—', L, y)
  y += 3
  const dados: [string, string][] = [
    ['Endereço', obra?.endereco || '—'],
    ['Cliente', obra?.cliente || '—'],
    ['Responsável técnico', obra?.responsavel || '—'],
    ['Vistoriador', v.vistoriador || '—'],
    ['Iniciada', `${dataHora(v.data)} · ${v.criadaPor || v.vistoriador || '—'}`],
    ['Finalizada', v.finalizadaEm ? `${dataHora(v.finalizadaEm)} · ${v.finalizadaPor || '—'}` : 'em andamento']
  ]
  dados.forEach(([k, val], i) => {
    const x = L + (i % 2) * 92, yy = y + 6 + Math.floor(i / 2) * 10
    doc.setTextColor(130, 122, 114).setFont('helvetica', 'normal').setFontSize(7.5).text(k.toUpperCase(), x, yy, { charSpace: 0.3 })
    doc.setTextColor(39, 43, 43).setFontSize(9.5).text(doc.splitTextToSize(val, 88)[0], x, yy + 4.2)
  })
  y += 6 + 3 * 10
  doc.setTextColor(0)

  // Resumo
  const r = resumo(v.itens)
  y += 3
  const caixas: [string, number, readonly number[]][] = [
    ['Conformes', r.ok, COR.ok], ['Não conformes', r.nc, COR.nc], ['N/A', r.na, COR.na], ['A conferir', r.pendentes, COR.pendente]
  ]
  caixas.forEach(([rot, n, cor], i) => {
    const x = L + i * 46
    doc.setFillColor(250, 248, 245).setDrawColor(228, 221, 212).setLineWidth(0.3).roundedRect(x, y, 42, 17, 2, 2, 'FD')
    doc.setFillColor(cor[0], cor[1], cor[2]).rect(x, y + 2, 1.2, 13, 'F')
    doc.setTextColor(cor[0], cor[1], cor[2]).setFont('helvetica', 'bold').setFontSize(15).text(String(n), x + 21, y + 8.5, { align: 'center' })
    doc.setFontSize(7.5).setFont('helvetica', 'normal').setTextColor(115, 107, 99).text(rot, x + 21, y + 13.5, { align: 'center' })
  })
  doc.setTextColor(0)
  y += 24

  // Itens por seção
  const secoes = [...new Set(v.itens.map(i => i.secao))]
  for (const s of secoes) {
    espaco(16)
    doc.setFillColor(231, 223, 215).rect(L, y, W, 8, 'F')
    doc.setTextColor(...COBRE).setFont('helvetica', 'bold').setFontSize(11).text(s, L + 2, y + 5.5)
    doc.setTextColor(0)
    y += 11
    for (const it of v.itens.filter(i => i.secao === s)) await desenharItem(it)
  }

  // Fotos em grade, 2 por linha dentro da largura dada. Devolve o y final.
  async function fotosEmGrade(ids: string[], x: number, larg: number) {
    const fw = (larg - 3) / 2, fh = fw * 0.75
    const fotos = (await Promise.all(ids.map(id => db.fotos.get(id)))).filter(f => f) as { blob: Blob }[]
    for (let i = 0; i < Math.min(fotos.length, 4); i++) {
      const col = i % 2
      const url = await blobParaDataURL(fotos[i].blob)
      const props = doc.getImageProperties(url)
      const esc = Math.min(fw / props.width, fh / props.height)
      const w = props.width * esc, h = props.height * esc
      doc.addImage(url, 'JPEG', x + col * (fw + 3) + (fw - w) / 2, y + (fh - h) / 2, w, h)
      if (col === 1 || i === Math.min(fotos.length, 4) - 1) y += fh + 3
    }
    return y
  }

  async function desenharItem(it: Item) {
    const st = it.status ?? 'pendente'
    espaco(10)
    const cor = COR[st]
    doc.setFillColor(cor[0], cor[1], cor[2]).roundedRect(L, y, 28, 5.5, 1, 1, 'F')
    doc.setTextColor(255).setFont('helvetica', 'bold').setFontSize(7).text(ROTULO[st], L + 14, y + 3.8, { align: 'center' })
    doc.setTextColor(0)
    const y0 = y
    y = y0 + 0.4
    texto(it.texto, L + 31, W - 31, 10)
    if (it.tipo === 'medicao') {
      texto(`Projeto: ${fmt(it.projetado)} ${it.unidade}   Medido: ${fmt(it.medido)} ${it.unidade}   Tolerância: ±${fmt(it.tolerancia)} ${it.unidade}`, L + 31, W - 31, 9)
    }
    if (it.obs) { doc.setTextColor(80); texto(`Obs.: ${it.obs}`, L + 31, W - 31, 9); doc.setTextColor(0) }
    if (it.marcadoEm) { doc.setTextColor(130); texto(`Conferido por ${it.marcadoPor || '—'} em ${dataHora(it.marcadoEm)}`, L + 31, W - 31, 8); doc.setTextColor(0) }
    y = Math.max(y, y0 + 6) + 1.5

    // Fotos: até 3 por linha
    const fw = 56, fh = 42
    for (let i = 0; i < it.fotos.length; i++) {
      const f = await db.fotos.get(it.fotos[i])
      if (!f) continue
      const col = i % 3
      if (col === 0) espaco(fh + 3)
      const url = await blobParaDataURL(f.blob)
      const props = doc.getImageProperties(url)
      const esc = Math.min(fw / props.width, fh / props.height)
      const w = props.width * esc, h = props.height * esc
      doc.addImage(url, 'JPEG', L + 4 + col * (fw + 4) + (fw - w) / 2, y + (fh - h) / 2, w, h)
      if (col === 2 || i === it.fotos.length - 1) y += fh + 3
    }
    doc.setDrawColor(221, 212, 201).setLineWidth(0.2).line(L, y, L + W, y)
    y += 3
  }

  // Marcações nos projetos
  const marcacoes = (await db.marcacoes.where('vistoriaId').equals(v.id).toArray())
    .filter(m => m.imagem)
    .sort((a, b) => Math.min(999, ...a.pontos.map(p => p.n)) - Math.min(999, ...b.pontos.map(p => p.n)))
  if (marcacoes.length) {
    const projetos = await db.projetos.toArray()
    novaPagina()
    texto('Marcações nos projetos', L, W, 13, 'bold')
    y += 3
    for (const m of marcacoes) {
      const nome = projetos.find(p => p.id === m.projetoId)?.nome ?? 'Projeto'
      const url = await blobParaDataURL(m.imagem!)
      const props = doc.getImageProperties(url)
      const esc = Math.min(W / props.width, 165 / props.height)
      const w = props.width * esc, h = props.height * esc
      espaco(h + 22)
      doc.setFillColor(231, 223, 215).rect(L, y, W, 8, 'F')
      doc.setTextColor(...COBRE).setFont('helvetica', 'bold').setFontSize(10.5).text(`${nome} · página ${m.pagina}`, L + 2, y + 5.5)
      doc.setTextColor(130).setFont('helvetica', 'normal').setFontSize(8).text(`Salvo por ${m.atualizadoPor} em ${dataHora(m.atualizadoEm)}`, L + W - 2, y + 5.5, { align: 'right' })
      doc.setTextColor(0)
      y += 11
      doc.setDrawColor(221, 212, 201).setLineWidth(0.3).rect(L + (W - w) / 2, y, w, h)
      doc.addImage(url, 'JPEG', L + (W - w) / 2, y, w, h)
      y += h + 4
      for (const pt of [...m.pontos].sort((a, b) => a.n - b.n)) {
        espaco(7)
        doc.setFillColor(211, 47, 47).circle(L + 3, y + 1.6, 2.6, 'F')
        doc.setTextColor(255).setFont('helvetica', 'bold').setFontSize(7.5).text(String(pt.n), L + 3, y + 2.7, { align: 'center' })
        doc.setTextColor(0)
        const y0 = y
        y -= 0.3
        texto(pt.descricao, L + 8, W - 60, 10, 'bold')
        doc.setTextColor(130).setFont('helvetica', 'normal').setFontSize(8).text(`${pt.criadoPor} · ${dataHora(pt.criadoEm)}`, L + W, y0 + 2.5, { align: 'right' })
        doc.setTextColor(0)
        y = Math.max(y, y0 + 5) + 1.5
        // Prova (antes) e contraprova (depois) lado a lado
        if (pt.provas?.length || pt.resolvidoEm) {
          const meia = (W - 8 - 6) / 2, xa = L + 8, xd = xa + meia + 6
          const linhas = Math.max(1, ...[pt.provas, pt.contraprovas].map(l => Math.ceil(Math.min(l?.length ?? 0, 4) / 2)))
          espaco(9 + linhas * ((meia - 3) / 2 * 0.75 + 3))
          const yt = y
          doc.setFont('helvetica', 'bold').setFontSize(8.5)
          doc.setTextColor(...COBRE).text('PROVA (antes)', xa, y + 3)
          if (pt.resolvidoEm) {
            doc.setTextColor(46, 125, 50).text('CONTRAPROVA (depois)', xd, y + 3)
            doc.setFont('helvetica', 'normal').setFontSize(7.5).text(`Resolvido em ${dataHora(pt.resolvidoEm)} por ${pt.resolvidoPor || '—'}`, xd, y + 7)
          } else {
            doc.setTextColor(198, 40, 40).text('AGUARDANDO CORREÇÃO', xd, y + 3)
          }
          doc.setTextColor(0)
          y = yt + 9
          const ya = await fotosEmGrade(pt.provas ?? [], xa, meia)
          y = yt + 9
          const yd = await fotosEmGrade(pt.contraprovas ?? [], xd, meia)
          y = Math.max(ya, yd, yt + 10)
        }
        y += 1.5
      }
      y += 5
    }
  }

  // Pendências
  if (pendencias.length) {
    espaco(20)
    y += 4
    texto('Pendências geradas', L, W, 13, 'bold')
    y += 2
    for (const p of pendencias) {
      espaco(12)
      texto(`• ${p.descricao}`, L, W, 10, 'bold')
      doc.setTextColor(80)
      texto(`Responsável: ${p.responsavel || '—'}   Prazo: ${p.prazo ? new Date(p.prazo + 'T12:00').toLocaleDateString('pt-BR') : '—'}   Situação: ${p.status}`, L + 4, W - 4, 9)
      doc.setTextColor(0)
      y += 2
    }
  }

  // Assinatura
  if (v.assinatura) {
    espaco(42)
    y += 8
    doc.addImage(v.assinatura, 'PNG', L, y, 70, 25)
    y += 27
    doc.setDrawColor(0).setLineWidth(0.3).line(L, y, L + 80, y)
    doc.setFontSize(9).setFont('helvetica', 'normal').text(v.vistoriador || 'Responsável', L, y + 5)
  }

  // Rodapé com numeração
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(8).setTextColor(130).text(`${obra?.nome ?? ''} · Conferência de Obra`, L, H - 8)
    doc.text(`Página ${i} de ${total}`, 195, H - 8, { align: 'right' })
  }

  const nome = `vistoria-${(obra?.nome ?? 'obra').toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-${new Date(v.data).toISOString().slice(0, 10)}.pdf`
  const blob = doc.output('blob')
  const arquivo = new File([blob], nome, { type: 'application/pdf' })
  // No celular, abre o menu de compartilhar (WhatsApp, e-mail…); no computador, baixa o arquivo
  if (navigator.canShare?.({ files: [arquivo] })) {
    try { await navigator.share({ files: [arquivo], title: v.titulo }); return } catch (e) { if ((e as Error).name === 'AbortError') return }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10000)
}
