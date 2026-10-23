import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, excluirObra, novoId } from '../db'
import { MODELOS, itensDoModelo } from '../modelos'
import { ir } from '../rota'
import ListaPendencias from '../componentes/ListaPendencias'
import { resumo } from '../resumo'

export default function ObraTela({ id }: { id: string }) {
  const obra = useLiveQuery(() => db.obras.get(id), [id])
  const vistorias = useLiveQuery(() => db.vistorias.where('obraId').equals(id).reverse().sortBy('data'), [id])
  const pendencias = useLiveQuery(() => db.pendencias.where('obraId').equals(id).toArray(), [id])
  const [nova, setNova] = useState(false)
  const [editando, setEditando] = useState(false)

  if (obra === undefined) return null
  if (obra === null) return <p>Obra não encontrada.</p>

  async function apagar() {
    if (!confirm(`Excluir a obra "${obra!.nome}" com todas as vistorias, fotos e pendências?`)) return
    await excluirObra(id)
    ir('/')
  }

  return (
    <>
      <a href="#/" className="voltar">‹ Obras</a>
      {editando ? (
        <EditarObra id={id} onFechar={() => setEditando(false)} />
      ) : (
        <section className="painel">
          <h1>{obra.nome}</h1>
          <dl className="dados">
            <dt>Endereço</dt><dd>{obra.endereco || '—'}</dd>
            <dt>Cliente</dt><dd>{obra.cliente || '—'}</dd>
            <dt>Responsável</dt><dd>{obra.responsavel || '—'}</dd>
          </dl>
          <div className="acoes">
            <button onClick={() => setEditando(true)}>Editar</button>
            <button className="perigo" onClick={apagar}>Excluir obra</button>
          </div>
        </section>
      )}

      <div className="titulo-linha">
        <h2>Vistorias</h2>
        <button className="primario" onClick={() => setNova(true)}>+ Nova vistoria</button>
      </div>
      {nova && <NovaVistoria obraId={id} responsavel={obra.responsavel} onFechar={() => setNova(false)} />}
      {vistorias?.length === 0 && !nova && <p className="vazio">Nenhuma vistoria ainda.</p>}
      <ul className="lista">
        {vistorias?.map(v => {
          const r = resumo(v.itens)
          return (
            <li key={v.id}>
              <a href={`#/vistoria/${v.id}`} className="cartao">
                <strong>{v.titulo}</strong>
                <span className="sub">{new Date(v.data).toLocaleDateString('pt-BR')} · {v.vistoriador || 'sem vistoriador'}</span>
                <span className="barra-resumo">
                  <span className="selo ok">{r.ok} ok</span>
                  <span className="selo nc">{r.nc} não conf.</span>
                  <span className="selo">{r.pendentes} a conferir</span>
                  {v.finalizada && <span className="selo fin">Finalizada</span>}
                </span>
              </a>
            </li>
          )
        })}
      </ul>

      <h2>Pendências</h2>
      <ListaPendencias pendencias={pendencias ?? []} obraId={id} />
    </>
  )
}

function EditarObra({ id, onFechar }: { id: string; onFechar: () => void }) {
  const obra = useLiveQuery(() => db.obras.get(id), [id])
  const [f, setF] = useState<Record<string, string> | null>(null)
  if (!obra) return null
  const v = f ?? { nome: obra.nome, endereco: obra.endereco, cliente: obra.cliente, responsavel: obra.responsavel }
  const campo = (k: string, rotulo: string) => (
    <label>{rotulo}<input value={v[k]} onChange={e => setF({ ...v, [k]: e.target.value })} /></label>
  )
  return (
    <form className="painel" onSubmit={async e => { e.preventDefault(); await db.obras.update(id, v); onFechar() }}>
      {campo('nome', 'Nome da obra')}
      {campo('endereco', 'Endereço')}
      {campo('cliente', 'Cliente')}
      {campo('responsavel', 'Responsável técnico')}
      <div className="acoes">
        <button type="button" onClick={onFechar}>Cancelar</button>
        <button className="primario">Salvar</button>
      </div>
    </form>
  )
}

function NovaVistoria({ obraId, responsavel, onFechar }: { obraId: string; responsavel: string; onFechar: () => void }) {
  const [sel, setSel] = useState<string[]>([])
  const [titulo, setTitulo] = useState('')
  const [vistoriador, setVistoriador] = useState(responsavel)

  const alternar = (m: string) => setSel(s => (s.includes(m) ? s.filter(x => x !== m) : [...s, m]))

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    const modelos = MODELOS.filter(m => sel.includes(m.id))
    const id = novoId()
    await db.vistorias.add({
      id,
      obraId,
      titulo: titulo.trim() || `Vistoria ${modelos.map(m => m.nome).join(', ')}`,
      modelos: sel,
      data: Date.now(),
      vistoriador,
      itens: modelos.flatMap(itensDoModelo),
      finalizada: false
    })
    ir(`/vistoria/${id}`)
  }

  return (
    <form className="painel" onSubmit={criar}>
      <h3>O que vai ser conferido?</h3>
      <div className="modelos">
        {MODELOS.map(m => (
          <label key={m.id} className={`modelo ${sel.includes(m.id) ? 'marcado' : ''}`}>
            <input type="checkbox" checked={sel.includes(m.id)} onChange={() => alternar(m.id)} />
            <strong>{m.nome}</strong>
            <span className="sub">{m.descricao}</span>
          </label>
        ))}
      </div>
      <label>Título (opcional)<input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex.: Vistoria semanal 2º pavimento" /></label>
      <label>Vistoriador<input value={vistoriador} onChange={e => setVistoriador(e.target.value)} /></label>
      <div className="acoes">
        <button type="button" onClick={onFechar}>Cancelar</button>
        <button className="primario" disabled={sel.length === 0}>Começar vistoria</button>
      </div>
    </form>
  )
}
