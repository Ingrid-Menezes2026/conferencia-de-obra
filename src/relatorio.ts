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
  doc.setFillColor(...GRAFITE).rect(0, 0, 210, 28, 'F')
  doc.setFillColor(...COBRE).rect(0, 28, 210, 1.5, 'F')
  doc.setTextColor(255).setFont('helvetica', 'bold').setFontSize(16).text('Relatório de Vistoria', L, 12)
  doc.setFont('helvetica', 'normal').setFontSize(10).text(v.titulo, L, 20)
  doc.text(new Date(v.data).toLocaleString('pt-BR'), 195, 20, { align: 'right' })
  doc.setTextColor(0)
  y = 36

  // Dados da obra
  const dados: [string, string][] = [
    ['Obra', obra?.nome ?? '—'],
    ['Endereço', obra?.endereco || '—'],
    ['Cliente', obra?.cliente || '—'],
    ['Responsável técnico', obra?.responsavel || '—'],
    ['Vistoriador', v.vistoriador || '—'],
    ['Iniciada', `${dataHora(v.data)} por ${v.criadaPor || v.vistoriador || '—'}`],
    ['Finalizada', v.finalizadaEm ? `${dataHora(v.finalizadaEm)} por ${v.finalizadaPor || '—'}` : 'em andamento']
  ]
  for (const [k, val] of dados) {
    doc.setFont('helvetica', 'bold').setFontSize(10).text(`${k}:`, L, y)
    doc.setFont('helvetica', 'normal').text(val, L + 42, y)
    y += 5.5
  }

  // Resumo
  const r = resumo(v.itens)
  y += 3
  const caixas: [string, number, readonly number[]][] = [
    ['Conformes', r.ok, COR.ok], ['Não conformes', r.nc, COR.nc], ['N/A', r.na, COR.na], ['A conferir', r.pendentes, COR.pendente]
  ]
  caixas.forEach(([rot, n, cor], i) => {
    const x = L + i * 46
    doc.setDrawColor(cor[0], cor[1], cor[2]).setLineWidth(0.6).roundedRect(x, y, 42, 16, 2, 2)
    doc.setTextColor(cor[0], cor[1], cor[2]).setFont('helvetica', 'bold').setFontSize(15).text(String(n), x + 21, y + 8, { align: 'center' })
    doc.setFontSize(8).setFont('helvetica', 'normal').text(rot, x + 21, y + 13, { align: 'center' })
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
