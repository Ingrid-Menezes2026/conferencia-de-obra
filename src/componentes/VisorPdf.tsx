import { useEffect, useRef, useState } from 'react'
import {
  ChevronLeft, ChevronRight, Download, Hand, List, MapPin, PenLine, Save, Trash2, Undo2, X, ZoomIn, ZoomOut, ClipboardList
} from 'lucide-react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { db, novoId, type Marcacao, type Ponto, type Projeto, type Traco } from '../db'
import { baixar } from '../arquivos'
import { dataHora, usuarioAtual } from '../usuario'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const CORES = ['#d32f2f', '#1565c0', '#272b2b', '#e69100']
const SUGESTOES = ['Bicheira', 'Armação exposta', 'Fissura', 'Desaprumo', 'Falta de cobrimento', 'Desnível', 'Infiltração', 'Divergência com projeto']

type Modo = 'ver' | 'ponto' | 'caneta'
type Acao = { tipo: 'ponto' | 'traco' }

interface Props {
  projeto: Projeto
  onFechar: () => void
  // Quando abre de dentro de uma vistoria, as marcações ficam ligadas a ela
  vistoriaId?: string
  obraId?: string
  editavel?: boolean
}

// Mostra o PDF página por página, com zoom. Dentro de uma vistoria permite
// marcar pontos numerados e desenhar com caneta por cima da prancha.
export default function VisorPdf({ projeto, onFechar, vistoriaId, obraId, editavel = false }: Props) {
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy | null>(null)
  const [pagina, setPagina] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [erro, setErro] = useState('')
  const [base, setBase] = useState<{ w: number; h: number } | null>(null)
  const [tela, setTela] = useState<{ w: number; h: number } | null>(null)

  const [modo, setModo] = useState<Modo>('ver')
  const [cor, setCor] = useState(CORES[0])
  const [pontos, setPontos] = useState<Ponto[]>([])
  const [tracos, setTracos] = useState<Traco[]>([])
  const [acoes, setAcoes] = useState<Acao[]>([])
  const [alterado, setAlterado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvoEm, setSalvoEm] = useState<number | null>(null)
  const [maxOutras, setMaxOutras] = useState(0)
  const [novo, setNovo] = useState<{ x: number; y: number } | null>(null)
  const [descricao, setDescricao] = useState('')
  const [lista, setLista] = useState(false)
  const [registro, setRegistro] = useState<Marcacao | null>(null)

  const canvas = useRef<HTMLCanvasElement>(null)
  const area = useRef<HTMLDivElement>(null)
  const desenhando = useRef<Traco | null>(null)
  const [tracoAtual, setTracoAtual] = useState<Traco | null>(null)

  const comMarcacao = !!vistoriaId

  // Abre o PDF
  useEffect(() => {
    let cancelado = false
    let tarefa: pdfjs.PDFDocumentLoadingTask | null = null
    projeto.arquivo.arrayBuffer().then(buf => {
      tarefa = pdfjs.getDocument({ data: new Uint8Array(buf) })
      return tarefa.promise
    }).then(d => { if (!cancelado) setDoc(d) }, () => !cancelado && setErro('Não foi possível abrir este PDF.'))
    return () => { cancelado = true; tarefa?.destroy() }
  }, [projeto])

  // Desenha a página
  useEffect(() => {
    if (!doc || !canvas.current || !area.current) return
    let render: pdfjs.RenderTask | null = null
    doc.getPage(pagina).then(p => {
      const b = p.getViewport({ scale: 1 })
      setBase({ w: b.width, h: b.height })
      const largura = area.current!.clientWidth - 24
      const escala = (largura / b.width) * zoom
      const vp = p.getViewport({ scale: escala * devicePixelRatio })
      const c = canvas.current!
      c.width = vp.width
      c.height = vp.height
      setTela({ w: vp.width / devicePixelRatio, h: vp.height / devicePixelRatio })
      render = p.render({ canvas: c, viewport: vp })
      render.promise.catch(() => {})
    })
    return () => render?.cancel()
  }, [doc, pagina, zoom])

  // Carrega as marcações desta página nesta vistoria
  useEffect(() => {
    if (!vistoriaId) return
    let ativo = true
    db.marcacoes.where('vistoriaId').equals(vistoriaId).toArray().then(todas => {
      if (!ativo) return
      const desta = todas.find(m => m.projetoId === projeto.id && m.pagina === pagina) ?? null
      setRegistro(desta)
      setPontos(desta?.pontos ?? [])
      setTracos(desta?.tracos ?? [])
      setAcoes([])
      setAlterado(false)
      setSalvoEm(desta?.atualizadoEm ?? null)
      setMaxOutras(Math.max(0, ...todas.filter(m => m !== desta).flatMap(m => m.pontos.map(p => p.n))))
    })
    return () => { ativo = false }
  }, [vistoriaId, projeto.id, pagina])

  const proximoNumero = Math.max(maxOutras, 0, ...pontos.map(p => p.n)) + 1

  function coordenada(e: React.PointerEvent): [number, number] {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * base!.w, ((e.clientY - r.top) / r.height) * base!.h]
  }

  function inicio(e: React.PointerEvent<SVGSVGElement>) {
    if (!base) return
    const [x, y] = coordenada(e)
    if (modo === 'ponto') { setNovo({ x, y }); setDescricao(''); return }
    if (modo === 'caneta') {
      e.currentTarget.setPointerCapture(e.pointerId)
      desenhando.current = { cor, largura: 3, pontos: [[x, y]] }
      setTracoAtual(desenhando.current)
    }
  }
  function mover(e: React.PointerEvent<SVGSVGElement>) {
    if (!desenhando.current) return
    desenhando.current = { ...desenhando.current, pontos: [...desenhando.current.pontos, coordenada(e)] }
    setTracoAtual(desenhando.current)
  }
  function fim() {
    const t = desenhando.current
    desenhando.current = null
    setTracoAtual(null)
    if (t && t.pontos.length > 1) {
      setTracos(ts => [...ts, t])
      setAcoes(a => [...a, { tipo: 'traco' }])
      setAlterado(true)
    }
  }

  function confirmarPonto(texto: string) {
    if (!novo || !texto.trim()) return
    setPontos(ps => [...ps, { n: proximoNumero, x: novo.x, y: novo.y, descricao: texto.trim(), criadoPor: usuarioAtual(), criadoEm: Date.now() }])
    setAcoes(a => [...a, { tipo: 'ponto' }])
    setAlterado(true)
    setNovo(null)
  }

  function desfazer() {
    const ultima = acoes[acoes.length - 1]
    if (!ultima) return
    if (ultima.tipo === 'ponto') setPontos(ps => ps.slice(0, -1))
    else setTracos(ts => ts.slice(0, -1))
    setAcoes(a => a.slice(0, -1))
    setAlterado(true)
  }

  function excluirPonto(n: number) {
    if (!confirm(`Excluir o ponto ${n}?`)) return
    setPontos(ps => ps.filter(p => p.n !== n))
    setAcoes([])
    setAlterado(true)
  }

  async function salvar() {
    if (!vistoriaId || !doc || !base) return
    setSalvando(true)
    try {
      if (pontos.length === 0 && tracos.length === 0) {
        if (registro) await db.marcacoes.delete(registro.id)
        setRegistro(null)
      } else {
        const imagem = await gerarImagem(doc, pagina, base, pontos, tracos)
        const m: Marcacao = {
          id: registro?.id ?? novoId(), vistoriaId, projetoId: projeto.id, pagina,
          pontos, tracos, imagem, atualizadoEm: Date.now(), atualizadoPor: usuarioAtual()
        }
        await db.marcacoes.put(m)
        setRegistro(m)
      }
      await db.vistorias.where('id').equals(vistoriaId).modify(v => {
        v.historico = [...(v.historico ?? []), {
          em: Date.now(), por: usuarioAtual(),
          acao: `Marcações salvas em ${projeto.nome} (pág. ${pagina}): ${pontos.length} ponto${pontos.length === 1 ? '' : 's'}`
        }]
      })
      setAlterado(false)
      setSalvoEm(Date.now())
    } finally {
      setSalvando(false)
    }
  }

  async function trocarPagina(nova: number) {
    if (alterado) await salvar()
    setPagina(nova)
  }

  async function fechar() {
    if (alterado) {
      if (confirm('Salvar as marcações antes de fechar?')) await salvar()
      else if (!confirm('Fechar sem salvar? As marcações novas serão perdidas.')) return
    }
    onFechar()
  }

  async function criarPendencia(p: Ponto) {
    if (!obraId || !vistoriaId) return
    const responsavel = prompt(`Pendência do ponto ${p.n} — ${p.descricao}\nResponsável (opcional):`) ?? null
    if (responsavel === null) return
    await db.pendencias.add({
      id: novoId(), obraId, vistoriaId, descricao: `Ponto ${p.n} — ${p.descricao} (${projeto.nome}, pág. ${pagina})`,
      responsavel, prazo: '', status: 'aberta', criadaEm: Date.now(), criadaPor: usuarioAtual()
    })
    alert('Pendência criada.')
  }

  const total = doc?.numPages ?? 0
  const caminho = (t: Traco) => t.pontos.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')

  return (
    <div className="visor visor-pdf">
      <div className="visor-barra">
        <strong>{projeto.nome}{projeto.revisao && ` · Rev. ${projeto.revisao}`}</strong>
        {comMarcacao && editavel && (
          <button className={alterado ? 'destaque' : ''} disabled={salvando || !alterado} onClick={salvar}>
            <Save size={17} />{salvando ? 'Salvando…' : alterado ? 'Salvar' : 'Salvo'}
          </button>
        )}
        <button onClick={fechar}><X size={17} />Fechar</button>
      </div>

      {comMarcacao && editavel && (
        <div className="ferramentas">
          <button className={modo === 'ver' ? 'ativo' : ''} onClick={() => setModo('ver')}><Hand size={17} />Mover</button>
          <button className={modo === 'ponto' ? 'ativo' : ''} onClick={() => setModo('ponto')}><MapPin size={17} />Ponto</button>
          <button className={modo === 'caneta' ? 'ativo' : ''} onClick={() => setModo('caneta')}><PenLine size={17} />Caneta</button>
          {modo === 'caneta' && CORES.map(c => (
            <button key={c} className={`cor ${cor === c ? 'ativo' : ''}`} style={{ background: c }} onClick={() => setCor(c)} aria-label="Cor da caneta" />
          ))}
          <button disabled={!acoes.length} onClick={desfazer} aria-label="Desfazer"><Undo2 size={17} /></button>
          <button className={lista ? 'ativo' : ''} onClick={() => setLista(l => !l)}><List size={17} />{pontos.length}</button>
        </div>
      )}
      {comMarcacao && editavel && modo !== 'ver' && (
        <p className="dica">{modo === 'ponto' ? `Toque no local do problema para marcar o ponto ${proximoNumero}.` : 'Desenhe com o dedo por cima do projeto.'}</p>
      )}

      <div className="visor-area" ref={area}>
        {erro ? <p className="visor-info">{erro}</p> : !doc ? <p className="visor-info">Abrindo…</p> : null}
        <div className="pagina" style={tela ? { width: tela.w, height: tela.h } : undefined}>
          <canvas ref={canvas} style={tela ? { width: tela.w, height: tela.h } : undefined} />
          {base && comMarcacao && (
            <svg
              className={`camada ${modo}`}
              viewBox={`0 0 ${base.w} ${base.h}`}
              preserveAspectRatio="none"
              onPointerDown={editavel ? inicio : undefined}
              onPointerMove={editavel ? mover : undefined}
              onPointerUp={editavel ? fim : undefined}
              onPointerCancel={editavel ? fim : undefined}
            >
              {[...tracos, ...(tracoAtual ? [tracoAtual] : [])].map((t, i) => (
                <path key={i} d={caminho(t)} stroke={t.cor} strokeWidth={t.largura} vectorEffect="non-scaling-stroke"
                  fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </svg>
          )}
          {base && pontos.map(p => (
            <span key={p.n} className="pino" style={{ left: `${(p.x / base.w) * 100}%`, top: `${(p.y / base.h) * 100}%` }} title={p.descricao}>
              {p.n}
            </span>
          ))}
          {base && novo && <span className="pino novo" style={{ left: `${(novo.x / base.w) * 100}%`, top: `${(novo.y / base.h) * 100}%` }}>{proximoNumero}</span>}
        </div>
      </div>

      {novo && (
        <div className="cartao-ponto" onClick={e => e.stopPropagation()}>
          <strong>Ponto {proximoNumero} — qual o problema?</strong>
          <div className="sugestoes">
            {SUGESTOES.map(s => <button key={s} onClick={() => confirmarPonto(s)}>{s}</button>)}
          </div>
          <form onSubmit={e => { e.preventDefault(); confirmarPonto(descricao) }} className="linha-form">
            <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ou escreva o problema" autoFocus />
            <button className="primario" disabled={!descricao.trim()}>Marcar</button>
          </form>
          <button className="link" onClick={() => setNovo(null)}>Cancelar</button>
        </div>
      )}

      {lista && comMarcacao && (
        <div className="lista-pontos">
          <div className="titulo-linha"><h3>Pontos nesta página</h3><button className="link" onClick={() => setLista(false)}><X size={17} /></button></div>
          {pontos.length === 0 && <p className="sub">Nenhum ponto marcado. Use a ferramenta Ponto.</p>}
          <ol>
            {pontos.map(p => (
              <li key={p.n}>
                <span className="pino estatico">{p.n}</span>
                <span className="desc"><b>{p.descricao}</b><span className="sub">{p.criadoPor} · {dataHora(p.criadoEm)}</span></span>
                {editavel && obraId && <button className="link" title="Criar pendência" onClick={() => criarPendencia(p)}><ClipboardList size={17} /></button>}
                {editavel && <button className="link perigo" title="Excluir ponto" onClick={() => excluirPonto(p.n)}><Trash2 size={17} /></button>}
              </li>
            ))}
          </ol>
          {salvoEm && !alterado && <p className="sub">Salvo em {dataHora(salvoEm)}{registro?.atualizadoPor && ` por ${registro.atualizadoPor}`}</p>}
        </div>
      )}

      <div className="visor-barra">
        <button disabled={pagina <= 1} onClick={() => trocarPagina(pagina - 1)} aria-label="Página anterior"><ChevronLeft size={18} /></button>
        <span>{total ? `Página ${pagina} de ${total}` : ''}</span>
        <button disabled={pagina >= total} onClick={() => trocarPagina(pagina + 1)} aria-label="Próxima página"><ChevronRight size={18} /></button>
        <button onClick={() => setZoom(z => Math.max(0.5, z / 1.5))} aria-label="Diminuir zoom"><ZoomOut size={18} /></button>
        <button onClick={() => setZoom(z => Math.min(8, z * 1.5))} aria-label="Aumentar zoom"><ZoomIn size={18} /></button>
        <button onClick={() => baixar(projeto)} aria-label="Baixar"><Download size={18} /></button>
      </div>
    </div>
  )
}

// Imagem da página com as marcações, usada no relatório PDF
async function gerarImagem(doc: pdfjs.PDFDocumentProxy, pagina: number, base: { w: number; h: number }, pontos: Ponto[], tracos: Traco[]) {
  const p = await doc.getPage(pagina)
  const escala = Math.min(4, 1800 / base.w)
  const vp = p.getViewport({ scale: escala })
  const c = document.createElement('canvas')
  c.width = vp.width
  c.height = vp.height
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, c.width, c.height)
  await p.render({ canvas: c, viewport: vp }).promise
  const unidade = c.width / 600
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const t of tracos) {
    ctx.strokeStyle = t.cor
    ctx.lineWidth = Math.max(2, unidade * 1.6)
    ctx.beginPath()
    t.pontos.forEach(([x, y], i) => (i ? ctx.lineTo(x * escala, y * escala) : ctx.moveTo(x * escala, y * escala)))
    ctx.stroke()
  }
  const r = Math.max(12, unidade * 9)
  for (const pt of pontos) {
    const x = pt.x * escala, y = pt.y * escala
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = '#d32f2f'
    ctx.fill()
    ctx.lineWidth = r * 0.18
    ctx.strokeStyle = '#fff'
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${r * 1.1}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(pt.n), x, y + r * 0.05)
  }
  return new Promise<Blob>(res => c.toBlob(b => res(b!), 'image/jpeg', 0.85))
}
