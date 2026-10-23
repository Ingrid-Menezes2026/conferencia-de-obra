import { ChevronLeft, ChevronRight, Download, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { Projeto } from '../db'
import { baixar } from '../arquivos'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

// Mostra o PDF página por página, com zoom, por cima da tela atual
export default function VisorPdf({ projeto, onFechar }: { projeto: Projeto; onFechar: () => void }) {
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy | null>(null)
  const [pagina, setPagina] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [erro, setErro] = useState('')
  const canvas = useRef<HTMLCanvasElement>(null)
  const area = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelado = false
    let tarefa: pdfjs.PDFDocumentLoadingTask | null = null
    projeto.arquivo.arrayBuffer().then(buf => {
      tarefa = pdfjs.getDocument({ data: new Uint8Array(buf) })
      return tarefa.promise
    }).then(d => { if (!cancelado) setDoc(d) }, () => !cancelado && setErro('Não foi possível abrir este PDF.'))
    return () => { cancelado = true; tarefa?.destroy() }
  }, [projeto])

  useEffect(() => {
    if (!doc || !canvas.current || !area.current) return
    let render: pdfjs.RenderTask | null = null
    doc.getPage(pagina).then(p => {
      const base = p.getViewport({ scale: 1 })
      const largura = area.current!.clientWidth - 16
      const escala = (largura / base.width) * zoom
      const vp = p.getViewport({ scale: escala * devicePixelRatio })
      const c = canvas.current!
      c.width = vp.width
      c.height = vp.height
      c.style.width = `${vp.width / devicePixelRatio}px`
      c.style.height = `${vp.height / devicePixelRatio}px`
      render = p.render({ canvas: c, viewport: vp })
      render.promise.catch(() => {})
    })
    return () => render?.cancel()
  }, [doc, pagina, zoom])

  const total = doc?.numPages ?? 0
  return (
    <div className="visor visor-pdf">
      <div className="visor-barra">
        <strong>{projeto.nome}{projeto.revisao && ` · Rev. ${projeto.revisao}`}</strong>
        <button onClick={onFechar}><X size={17} />Fechar</button>
      </div>
      <div className="visor-area" ref={area}>
        {erro ? <p className="visor-info">{erro}</p> : !doc ? <p className="visor-info">Abrindo…</p> : <canvas ref={canvas} />}
      </div>
      <div className="visor-barra">
        <button disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)} aria-label="Página anterior"><ChevronLeft size={18} /></button>
        <span>{total ? `Página ${pagina} de ${total}` : ''}</span>
        <button disabled={pagina >= total} onClick={() => setPagina(p => p + 1)} aria-label="Próxima página"><ChevronRight size={18} /></button>
        <button onClick={() => setZoom(z => Math.max(0.5, z / 1.5))} aria-label="Diminuir zoom"><ZoomOut size={18} /></button>
        <button onClick={() => setZoom(z => Math.min(6, z * 1.5))} aria-label="Aumentar zoom"><ZoomIn size={18} /></button>
        <button onClick={() => baixar(projeto)} aria-label="Baixar"><Download size={18} /></button>
      </div>
    </div>
  )
}
