import { useEffect, useRef } from 'react'

export default function Assinatura({ onSalvar, onCancelar }: { onSalvar: (dataURL: string) => void; onCancelar: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const desenhou = useRef(false)

  useEffect(() => {
    const c = ref.current!
    const r = c.getBoundingClientRect()
    c.width = r.width * devicePixelRatio
    c.height = r.height * devicePixelRatio
    const ctx = c.getContext('2d')!
    ctx.scale(devicePixelRatio, devicePixelRatio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#272b2b'
    let ativo = false
    const pos = (e: PointerEvent) => { const b = c.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top] }
    const down = (e: PointerEvent) => { ativo = true; c.setPointerCapture(e.pointerId); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y) }
    const move = (e: PointerEvent) => { if (!ativo) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); desenhou.current = true }
    const up = () => { ativo = false }
    c.addEventListener('pointerdown', down)
    c.addEventListener('pointermove', move)
    c.addEventListener('pointerup', up)
    return () => { c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up) }
  }, [])

  const limpar = () => {
    const c = ref.current!
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    desenhou.current = false
  }

  return (
    <div className="painel">
      <h3>Assinatura do responsável</h3>
      <canvas ref={ref} className="assinatura" />
      <div className="acoes">
        <button type="button" onClick={onCancelar}>Cancelar</button>
        <button type="button" onClick={limpar}>Limpar</button>
        <button type="button" className="primario" onClick={() => onSalvar(desenhou.current ? ref.current!.toDataURL('image/png') : '')}>
          Finalizar e gerar relatório
        </button>
      </div>
    </div>
  )
}
