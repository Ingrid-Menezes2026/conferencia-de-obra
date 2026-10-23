import { useState } from 'react'
import { CalendarClock, Camera, Check, ChevronLeft, CircleUser, ClipboardList, FileDown, History, Layers, ListChecks, Lock, MessageSquareText, Plus, Ruler, Trash2, TriangleAlert, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { conformidadeMedicao, db, excluirVistoria, novoId, type Item, type Status, type Vistoria } from '../db'
import { salvarFoto } from '../fotos'
import { resumo } from '../resumo'
import { ir } from '../rota'
import Foto from '../componentes/Foto'
import Assinatura from '../componentes/Assinatura'
import { FormPendencia } from '../componentes/ListaPendencias'
import Projetos from '../componentes/Projetos'
import { dataHora, usuarioAtual } from '../usuario'

type Filtro = 'todos' | 'conferir' | 'nc'

// Toda alteração num item registra quem fez e quando
async function atualizarItem(vid: string, itemId: string, patch: Partial<Item>) {
  await db.vistorias.where('id').equals(vid).modify(v => {
    if (v.finalizada) return
    const it = v.itens.find(i => i.id === itemId)
    if (it) Object.assign(it, patch, { marcadoPor: usuarioAtual(), marcadoEm: Date.now() })
  })
}

export default function VistoriaTela({ id }: { id: string }) {
  const v = useLiveQuery(() => db.vistorias.get(id), [id])
  const obra = useLiveQuery(async () => (v ? db.obras.get(v.obraId) : undefined), [v?.obraId])
  const pendencias = useLiveQuery(() => db.pendencias.where('vistoriaId').equals(id).toArray(), [id])
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [assinando, setAssinando] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [verProjetos, setVerProjetos] = useState(false)

  if (v === undefined) return null
  if (v === null) return <p>Vistoria não encontrada.</p>

  const r = resumo(v.itens)
  const visiveis = v.itens.filter(i => filtro === 'todos' || (filtro === 'nc' ? i.status === 'nc' : i.status === null))
  const secoes = [...new Set(visiveis.map(i => i.secao))]

  async function relatorio(vis: Vistoria) {
    setGerando(true)
    try {
      const { gerarRelatorio } = await import('../relatorio')
      await gerarRelatorio(vis)
    } finally {
      setGerando(false)
    }
  }

  async function finalizar(assinatura: string) {
    const em = Date.now()
    const por = usuarioAtual()
    const dados = {
      assinatura, finalizada: true, finalizadaEm: em, finalizadaPor: por,
      historico: [...(v!.historico ?? []), { em, por, acao: 'Vistoria finalizada e arquivada' }]
    }
    await db.vistorias.update(id, dados)
    setAssinando(false)
    await relatorio({ ...v!, ...dados })
  }

  async function apagar() {
    if (!confirm('Excluir esta vistoria com fotos e pendências?')) return
    const obraId = v!.obraId
    await excluirVistoria(v!)
    ir(`/obra/${obraId}`)
  }

  return (
    <div className="estreito">
      <a href={`#/obra/${v.obraId}`} className="voltar"><ChevronLeft size={18} />{obra?.nome ?? 'Obra'}</a>
      <section className="painel">
        <p className="eyebrow">{v.finalizada ? 'Vistoria arquivada' : 'Vistoria em andamento'}</p>
        <h1>{v.titulo}</h1>
        <span className="linha-info"><CircleUser size={14} />Vistoriador: {v.vistoriador || '—'}</span>
        <span className="linha-info"><CalendarClock size={14} />Iniciada em {dataHora(v.data)} por {v.criadaPor || v.vistoriador || '—'}</span>
        {v.finalizada && (
          <p className="arquivada"><Lock size={16} />Arquivada em {v.finalizadaEm ? dataHora(v.finalizadaEm) : '—'} por {v.finalizadaPor || '—'}. Não pode mais ser alterada.</p>
        )}
        <div className="progresso" title={`${r.total - r.pendentes} de ${r.total}`}>
          <span className="p-ok" style={{ width: `${(r.ok / r.total) * 100}%` }} />
          <span className="p-nc" style={{ width: `${(r.nc / r.total) * 100}%` }} />
          <span className="p-na" style={{ width: `${(r.na / r.total) * 100}%` }} />
        </div>
        <div className="legenda">
          <span><i style={{ background: 'var(--ok)' }} /><b>{r.ok}</b> conformes</span>
          <span><i style={{ background: 'var(--nc)' }} /><b>{r.nc}</b> não conformes</span>
          <span><i style={{ background: 'var(--greige)' }} /><b>{r.na}</b> N/A</span>
          <span><i style={{ background: 'var(--areia)' }} /><b>{r.pendentes}</b> a conferir</span>
        </div>
        <div className="barra-vistoria">
          <button onClick={() => setVerProjetos(true)}><Layers size={17} />Ver projetos</button>
          <button disabled={gerando} onClick={() => relatorio(v)}><FileDown size={17} />{gerando ? 'Gerando…' : v.finalizada ? 'Relatório PDF' : 'Prévia do relatório'}</button>
        </div>
        <div className="filtros">
          {(['todos', 'conferir', 'nc'] as Filtro[]).map(f => (
            <button key={f} className={filtro === f ? 'ativo' : ''} onClick={() => setFiltro(f)}>
              {f === 'todos' ? `Todos (${r.total})` : f === 'conferir' ? `A conferir (${r.pendentes})` : `Não conformes (${r.nc})`}
            </button>
          ))}
        </div>
      </section>

      {secoes.map(s => (
        <section key={s}>
          <h3 className="secao">{s}</h3>
          {visiveis.filter(i => i.secao === s).map(i => (
            <CartaoItem key={i.id} item={i} vistoria={v} temPendencia={!!pendencias?.some(p => p.itemId === i.id)} />
          ))}
        </section>
      ))}
      {visiveis.length === 0 && <div className="vazio"><ListChecks size={30} /><p>Nenhum item neste filtro.</p></div>}

      {!v.finalizada && <NovoItem vistoria={v} />}

      {v.historico && v.historico.length > 0 && (
        <section className="painel">
          <div className="painel-titulo"><History size={18} /><h3>Histórico</h3></div>
          <ul className="historico">
            {v.historico.map((h, i) => <li key={i}><span><b>{h.acao}</b><span className="sub">{dataHora(h.em)} · {h.por}</span></span></li>)}
          </ul>
        </section>
      )}

      {verProjetos && (
        <div className="gaveta" onClick={() => setVerProjetos(false)}>
          <div className="gaveta-conteudo" onClick={e => e.stopPropagation()}>
            <div className="titulo-linha"><h2><Layers size={19} />Projetos da obra</h2><button onClick={() => setVerProjetos(false)}><X size={17} />Fechar</button></div>
            <Projetos obraId={v.obraId} editavel={false} />
          </div>
        </div>
      )}

      {!v.finalizada && (
        <section className="painel">
          {assinando ? (
            <Assinatura onSalvar={finalizar} onCancelar={() => setAssinando(false)} />
          ) : (
            <div className="acoes">
              <button className="perigo" onClick={apagar}><Trash2 size={16} />Excluir</button>
              <button className="primario" onClick={() => setAssinando(true)}><Lock size={16} />Finalizar e arquivar</button>
            </div>
          )}
          {r.pendentes > 0 && assinando && <p className="aviso"><TriangleAlert size={16} />Ainda há {r.pendentes} itens sem conferência. Eles aparecerão como "a conferir" no relatório.</p>}
        </section>
      )}
    </div>
  )
}

const numero = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')))
const fmt = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','))

function CartaoItem({ item, vistoria, temPendencia }: { item: Item; vistoria: Vistoria; temPendencia: boolean }) {
  const [obsAberta, setObsAberta] = useState(!!item.obs)
  const [pendencia, setPendencia] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [proj, setProj] = useState(fmt(item.projetado))
  const [med, setMed] = useState(fmt(item.medido))
  const vid = vistoria.id

  const marcar = (s: Status) => atualizarItem(vid, item.id, { status: item.status === s ? null : s })

  function medir(campo: 'projetado' | 'medido', texto: string) {
    campo === 'projetado' ? setProj(texto) : setMed(texto)
    const n = numero(texto)
    if (n !== null && Number.isNaN(n)) return
    const novo = { ...item, [campo]: n }
    atualizarItem(vid, item.id, { [campo]: n, status: item.status === 'na' ? 'na' : conformidadeMedicao(novo) })
  }

  async function adicionarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = [...(e.target.files ?? [])]
    e.target.value = ''
    if (!arquivos.length) return
    setEnviando(true)
    try {
      const ids: string[] = []
      for (const a of arquivos) ids.push(await salvarFoto(a))
      const atual = (await db.vistorias.get(vid))?.itens.find(i => i.id === item.id)?.fotos ?? []
      await atualizarItem(vid, item.id, { fotos: [...atual, ...ids] })
    } finally {
      setEnviando(false)
    }
  }

  async function excluirFoto(fid: string) {
    if (vistoria.finalizada) return
    await db.fotos.delete(fid)
    await atualizarItem(vid, item.id, { fotos: item.fotos.filter(f => f !== fid) })
  }

  return (
    <div className={`item ${item.status ?? 'pendente'}`}>
      <fieldset disabled={vistoria.finalizada}>
      <p className="item-texto">{item.texto}</p>

      {item.tipo === 'medicao' && (
        <div className="medicao">
          <label>Projeto ({item.unidade})<input inputMode="decimal" value={proj} onChange={e => medir('projetado', e.target.value)} /></label>
          <label>Medido ({item.unidade})<input inputMode="decimal" value={med} onChange={e => medir('medido', e.target.value)} /></label>
          <label>Tolerância ±
            <input inputMode="decimal" value={fmt(item.tolerancia)}
              onChange={e => { const n = numero(e.target.value); if (n === null || !Number.isNaN(n)) atualizarItem(vid, item.id, { tolerancia: n, status: item.status === 'na' ? 'na' : conformidadeMedicao({ ...item, tolerancia: n }) }) }} />
          </label>
          {item.medido != null && item.projetado != null && (
            <span className={`diferenca ${item.status}`}>
              <Ruler size={14} />Diferença: {fmt(Math.round((item.medido - item.projetado) * 100) / 100)} {item.unidade}
            </span>
          )}
        </div>
      )}

      <div className="botoes-status">
        <button className={item.status === 'ok' ? 'b-ok ativo' : 'b-ok'} onClick={() => marcar('ok')}><Check size={16} strokeWidth={2.5} />OK</button>
        <button className={item.status === 'nc' ? 'b-nc ativo' : 'b-nc'} onClick={() => marcar('nc')}><X size={16} strokeWidth={2.5} />Não conforme</button>
        <button className={item.status === 'na' ? 'b-na ativo' : 'b-na'} onClick={() => marcar('na')}>N/A</button>
      </div>

      <div className="item-extras">
        <label className="botao-foto">
          <Camera size={16} />{enviando ? 'Salvando…' : 'Foto'}
          <input type="file" accept="image/*" capture="environment" multiple hidden onChange={adicionarFotos} />
        </label>
        <button className="link" onClick={() => setObsAberta(o => !o)}><MessageSquareText size={16} />Observação</button>
        {item.status === 'nc' && !temPendencia && <button className="link" onClick={() => setPendencia(true)}><TriangleAlert size={16} />Criar pendência</button>}
        {temPendencia && <span className="selo nc"><ClipboardList size={12} />Pendência criada</span>}
      </div>

      {obsAberta && (
        <textarea rows={2} placeholder="Observação" defaultValue={item.obs}
          onBlur={e => e.target.value !== item.obs && atualizarItem(vid, item.id, { obs: e.target.value })} />
      )}
      </fieldset>

      {item.fotos.length > 0 && (
        <div className="fotos">
          {item.fotos.map(f => <Foto key={f} id={f} onExcluir={vistoria.finalizada ? undefined : () => excluirFoto(f)} />)}
        </div>
      )}

      {item.marcadoEm && <p className="carimbo"><CircleUser size={13} />Conferido por {item.marcadoPor || '—'} em {dataHora(item.marcadoEm)}</p>}

      {pendencia && (
        <FormPendencia obraId={vistoria.obraId} vistoriaId={vid} itemId={item.id}
          descricao={`${item.texto}${item.obs ? ` — ${item.obs}` : ''}`} onFechar={() => setPendencia(false)} />
      )}
    </div>
  )
}

function NovoItem({ vistoria }: { vistoria: Vistoria }) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [secao, setSecao] = useState('Itens adicionais')
  const [medicao, setMedicao] = useState(false)
  const [unidade, setUnidade] = useState('cm')

  if (!aberto) return <button className="adicionar" onClick={() => setAberto(true)}><Plus size={17} />Adicionar item próprio</button>

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return
    const item: Item = medicao
      ? { id: novoId(), secao, texto, tipo: 'medicao', status: null, obs: '', fotos: [], unidade, projetado: null, medido: null, tolerancia: 0 }
      : { id: novoId(), secao, texto, tipo: 'check', status: null, obs: '', fotos: [] }
    await db.vistorias.where('id').equals(vistoria.id).modify(v => { v.itens.push(item) })
    setTexto('')
    setAberto(false)
  }

  const secoes = [...new Set([...vistoria.itens.map(i => i.secao), 'Itens adicionais'])]
  return (
    <form className="painel" onSubmit={salvar}>
      <div className="painel-titulo"><h3>Novo item</h3></div>
      <label>O que conferir<input value={texto} onChange={e => setTexto(e.target.value)} autoFocus /></label>
      <label>Seção
        <select value={secao} onChange={e => setSecao(e.target.value)}>
          {secoes.map(s => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className="check"><input type="checkbox" checked={medicao} onChange={e => setMedicao(e.target.checked)} /> É uma medição</label>
      {medicao && <label>Unidade<input value={unidade} onChange={e => setUnidade(e.target.value)} /></label>}
      <div className="acoes">
        <button type="button" onClick={() => setAberto(false)}>Cancelar</button>
        <button className="primario">Adicionar</button>
      </div>
    </form>
  )
}
