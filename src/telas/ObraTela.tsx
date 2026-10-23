import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Briefcase, Building2, CalendarClock, Check, ChevronLeft, ClipboardCheck, ClipboardList, HardHat, Layers, Lock, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { db, excluirObra, novoId, type Vistoria } from '../db'
import { MODELOS, itensDoModelo } from '../modelos'
import { ir } from '../rota'
import ListaPendencias from '../componentes/ListaPendencias'
import { resumo } from '../resumo'
import Projetos from '../componentes/Projetos'
import { dataHora, usuarioAtual } from '../usuario'

export default function ObraTela({ id }: { id: string }) {
  const obra = useLiveQuery(() => db.obras.get(id), [id])
  const vistorias = useLiveQuery(() => db.vistorias.where('obraId').equals(id).reverse().sortBy('data'), [id])
  const pendencias = useLiveQuery(() => db.pendencias.where('obraId').equals(id).toArray(), [id])
  const nProjetos = useLiveQuery(() => db.projetos.where('obraId').equals(id).count(), [id])
  const [nova, setNova] = useState(false)
  const [editando, setEditando] = useState(false)

  if (obra === undefined) return null
  if (obra === null) return <p>Obra não encontrada.</p>
  const abertas = pendencias?.filter(p => p.status === 'aberta').length ?? 0

  async function apagar() {
    if (!confirm(`Excluir a obra "${obra!.nome}" com todas as vistorias, projetos, fotos e pendências? Isso não pode ser desfeito.`)) return
    await excluirObra(id)
    ir('/')
  }

  return (
    <div className="estreito">
      <a href="#/" className="voltar"><ChevronLeft size={18} />Obras</a>
      {editando ? (
        <EditarObra id={id} onFechar={() => setEditando(false)} />
      ) : (
        <section className="painel">
          <div className="cartao-topo">
            <span className="cartao-icone"><Building2 size={20} /></span>
            <div>
              <p className="eyebrow">Obra</p>
              <h1>{obra.nome}</h1>
            </div>
          </div>
          <dl className="dados">
            <dt><MapPin size={15} />Endereço</dt><dd>{obra.endereco || '—'}</dd>
            <dt><Briefcase size={15} />Cliente</dt><dd>{obra.cliente || '—'}</dd>
            <dt><HardHat size={15} />Responsável</dt><dd>{obra.responsavel || '—'}</dd>
          </dl>
          <div className="acoes">
            <button className="perigo" onClick={apagar}><Trash2 size={16} />Excluir</button>
            <button onClick={() => setEditando(true)}><Pencil size={16} />Editar dados</button>
          </div>
        </section>
      )}

      <div className="titulo-linha">
        <h2><Layers size={19} />Projetos <span className="contador">{nProjetos ?? 0}</span></h2>
      </div>
      <Projetos obraId={id} />

      <div className="titulo-linha">
        <h2><ClipboardCheck size={19} />Vistorias <span className="contador">{vistorias?.length ?? 0}</span></h2>
        <button className="primario" onClick={() => setNova(true)}><Plus size={18} />Nova vistoria</button>
      </div>
      {nova && <NovaVistoria obraId={id} responsavel={obra.responsavel} onFechar={() => setNova(false)} />}
      {vistorias?.length === 0 && !nova && (
        <div className="vazio"><ClipboardCheck size={32} /><p>Nenhuma vistoria nesta obra ainda.</p></div>
      )}
      <ul className="lista">
        {vistorias?.map(v => <CartaoVistoria key={v.id} v={v} />)}
      </ul>

      <div className="titulo-linha">
        <h2><ClipboardList size={19} />Pendências <span className="contador">{abertas}</span></h2>
      </div>
      <ListaPendencias pendencias={pendencias ?? []} obraId={id} />
    </div>
  )
}

export function CartaoVistoria({ v, obraNome }: { v: Vistoria; obraNome?: string }) {
  const r = resumo(v.itens)
  return (
    <li>
      <a href={`#/vistoria/${v.id}`} className="cartao">
        <div className="cartao-topo">
          <span className={`cartao-icone ${v.finalizada ? 'escuro' : ''}`}>{v.finalizada ? <Lock size={18} /> : <ClipboardCheck size={20} />}</span>
          <div>
            <strong>{v.titulo}</strong>
            {obraNome && <span className="sub">{obraNome}</span>}
            <span className="linha-info"><CalendarClock size={13} />Iniciada {dataHora(v.data)} · {v.criadaPor || v.vistoriador || '—'}</span>
            {v.finalizadaEm && <span className="linha-info"><Lock size={13} />Arquivada {dataHora(v.finalizadaEm)} · {v.finalizadaPor}</span>}
          </div>
        </div>
        <div className="cartao-rodape">
          <span className="selo ok">{r.ok} conformes</span>
          <span className="selo nc">{r.nc} não conformes</span>
          {r.pendentes > 0 && <span className="selo pend">{r.pendentes} a conferir</span>}
          {v.finalizada ? <span className="selo fin" style={{ marginLeft: 'auto' }}>Arquivada</span> : <span className="selo" style={{ marginLeft: 'auto' }}>Em andamento</span>}
        </div>
      </a>
    </li>
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
      <div className="painel-titulo"><h2>Editar obra</h2></div>
      {campo('nome', 'Nome da obra')}
      {campo('endereco', 'Endereço')}
      {campo('cliente', 'Cliente')}
      {campo('responsavel', 'Responsável técnico')}
      <div className="acoes">
        <button type="button" onClick={onFechar}>Cancelar</button>
        <button className="primario">Salvar alterações</button>
      </div>
    </form>
  )
}

function NovaVistoria({ obraId, responsavel, onFechar }: { obraId: string; responsavel: string; onFechar: () => void }) {
  const [sel, setSel] = useState<string[]>([])
  const [titulo, setTitulo] = useState('')
  const [vistoriador, setVistoriador] = useState(usuarioAtual() || responsavel)

  const alternar = (m: string) => setSel(s => (s.includes(m) ? s.filter(x => x !== m) : [...s, m]))

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    const modelos = MODELOS.filter(m => sel.includes(m.id))
    const id = novoId()
    const agora = Date.now()
    const por = usuarioAtual()
    await db.vistorias.add({
      id,
      obraId,
      titulo: titulo.trim() || `Vistoria ${modelos.map(m => m.nome).join(', ')}`,
      modelos: sel,
      data: agora,
      vistoriador,
      itens: modelos.flatMap(itensDoModelo),
      finalizada: false,
      criadaPor: por,
      historico: [{ em: agora, por, acao: 'Vistoria iniciada' }]
    })
    ir(`/vistoria/${id}`)
  }

  return (
    <form className="painel" onSubmit={criar}>
      <div className="painel-titulo"><h2>Nova vistoria</h2></div>
      <p className="sub" style={{ marginBottom: '.75rem' }}>Escolha um ou mais checklists para esta visita.</p>
      <div className="modelos">
        {MODELOS.map(m => (
          <label key={m.id} className={`modelo ${sel.includes(m.id) ? 'marcado' : ''}`}>
            <input type="checkbox" checked={sel.includes(m.id)} onChange={() => alternar(m.id)} />
            <span className="marca-check">{sel.includes(m.id) && <Check size={13} strokeWidth={3} />}</span>
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
