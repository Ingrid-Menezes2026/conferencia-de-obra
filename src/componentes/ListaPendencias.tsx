import { CircleCheck, Plus, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { db, novoId, type Obra, type Pendencia } from '../db'
import { dataHora, usuarioAtual } from '../usuario'

const hoje = () => new Date().toISOString().slice(0, 10)
export const atrasada = (p: Pendencia) => p.status === 'aberta' && !!p.prazo && p.prazo < hoje()

export default function ListaPendencias({ pendencias, obraId, obras }: {
  pendencias: Pendencia[]
  obraId?: string
  obras?: Obra[]
}) {
  const [nova, setNova] = useState(false)
  const [verResolvidas, setVerResolvidas] = useState(false)
  const lista = pendencias
    .filter(p => verResolvidas || p.status === 'aberta')
    .sort((a, b) => (a.status === b.status ? (a.prazo || '9').localeCompare(b.prazo || '9') : a.status === 'aberta' ? -1 : 1))

  return (
    <>
      <div className="acoes esquerda">
        {obraId && <button onClick={() => setNova(true)}><Plus size={17} />Nova pendência</button>}
        <label className="check">
          <input type="checkbox" checked={verResolvidas} onChange={e => setVerResolvidas(e.target.checked)} /> Mostrar resolvidas
        </label>
      </div>
      {nova && obraId && <FormPendencia obraId={obraId} onFechar={() => setNova(false)} />}
      {lista.length === 0 && <div className="vazio"><CircleCheck size={30} /><p>Nenhuma pendência em aberto.</p></div>}
      <ul className="lista">
        {lista.map(p => (
          <li key={p.id} className={`cartao pend ${p.status} ${atrasada(p) ? 'atrasada' : ''}`}>
            <label className="check">
              <input
                type="checkbox"
                checked={p.status === 'resolvida'}
                onChange={e => db.pendencias.update(p.id, e.target.checked
                  ? { status: 'resolvida', resolvidaEm: Date.now(), resolvidaPor: usuarioAtual() }
                  : { status: 'aberta', resolvidaEm: undefined, resolvidaPor: undefined })}
              />
              <span>
                <strong>{p.descricao}</strong>
                <span className="sub">
                  {obras && <>{obras.find(o => o.id === p.obraId)?.nome} · </>}
                  {p.responsavel || 'Sem responsável'}
                  {p.prazo && <> · prazo {new Date(p.prazo + 'T12:00').toLocaleDateString('pt-BR')}</>}
                </span>
                {atrasada(p) && <span className="selo nc" style={{ marginTop: '.35rem' }}><TriangleAlert size={12} />Atrasada</span>}
                <span className="sub">
                  Registrada por {p.criadaPor || '—'} em {dataHora(p.criadaEm)}
                  {p.resolvidaEm && <> · resolvida por {p.resolvidaPor} em {dataHora(p.resolvidaEm)}</>}
                </span>
              </span>
            </label>
            {p.vistoriaId && <a href={`#/vistoria/${p.vistoriaId}`} className="sub" style={{ whiteSpace: 'nowrap' }}>Ver vistoria</a>}
          </li>
        ))}
      </ul>
    </>
  )
}

export function FormPendencia({ obraId, vistoriaId, itemId, descricao = '', onFechar }: {
  obraId: string
  vistoriaId?: string
  itemId?: string
  descricao?: string
  onFechar: () => void
}) {
  const [f, setF] = useState({ descricao, responsavel: '', prazo: '' })
  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!f.descricao.trim()) return
    await db.pendencias.add({ id: novoId(), obraId, vistoriaId, itemId, ...f, status: 'aberta', criadaEm: Date.now(), criadaPor: usuarioAtual() })
    onFechar()
  }
  return (
    <form className="painel pendencia-form" onSubmit={salvar}>
      <label>O que precisa ser corrigido?<textarea rows={2} value={f.descricao} onChange={e => setF({ ...f, descricao: e.target.value })} /></label>
      <div className="duas">
        <label>Responsável<input value={f.responsavel} onChange={e => setF({ ...f, responsavel: e.target.value })} /></label>
        <label>Prazo<input type="date" value={f.prazo} onChange={e => setF({ ...f, prazo: e.target.value })} /></label>
      </div>
      <div className="acoes">
        <button type="button" onClick={onFechar}>Cancelar</button>
        <button className="primario">Salvar pendência</button>
      </div>
    </form>
  )
}
