import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { conformidadeMedicao, db, excluirVistoria, novoId, type Item, type Status, type Vistoria } from '../db'
import { salvarFoto } from '../fotos'
import { resumo } from '../resumo'
import { ir } from '../rota'
import Foto from '../componentes/Foto'
import Assinatura from '../componentes/Assinatura'
import { FormPendencia } from '../componentes/ListaPendencias'

type Filtro = 'todos' | 'conferir' | 'nc'

async function atualizarItem(vid: string, itemId: string, patch: Partial<Item>) {
  await db.vistorias.where('id').equals(vid).modify(v => {
    const it = v.itens.find(i => i.id === itemId)
    if (it) Object.assign(it, patch)
  })
}

export default function VistoriaTela({ id }: { id: string }) {
  const v = useLiveQuery(() => db.vistorias.get(id), [id])
  const obra = useLiveQuery(async () => (v ? db.obras.get(v.obraId) : undefined), [v?.obraId])
  const pendencias = useLiveQuery(() => db.pendencias.where('vistoriaId').equals(id).toArray(), [id])
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [assinando, setAssinando] = useState(false)
  const [gerando, setGerando] = useState(false)

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
    await db.vistorias.update(id, { assinatura, finalizada: true })
    setAssinando(false)
    await relatorio({ ...v!, assinatura, finalizada: true })
  }

  async function apagar() {
    if (!confirm('Excluir esta vistoria com fotos e pendências?')) return
    const obraId = v!.obraId
    await excluirVistoria(v!)
    ir(`/obra/${obraId}`)
  }

  return (
    <>
      <a href={`#/obra/${v.obraId}`} className="voltar">‹ {obra?.nome ?? 'Obra'}</a>
      <section className="painel">
        <h1>{v.titulo}</h1>
        <p className="sub">{new Date(v.data).toLocaleString('pt-BR')} · {v.vistoriador || 'sem vistoriador'}</p>
        <div className="progresso" title={`${r.total - r.pendentes} de ${r.total}`}>
          <span className="p-ok" style={{ width: `${(r.ok / r.total) * 100}%` }} />
          <span className="p-nc" style={{ width: `${(r.nc / r.total) * 100}%` }} />
          <span className="p-na" style={{ width: `${(r.na / r.total) * 100}%` }} />
        </div>
        <p className="sub">
          {r.ok} conformes · {r.nc} não conformes · {r.na} não se aplica · <b>{r.pendentes} a conferir</b>
        </p>
        <div className="filtros">
          {(['todos', 'conferir', 'nc'] as Filtro[]).map(f => (
            <button key={f} className={filtro === f ? 'ativo' : ''} onClick={() => setFiltro(f)}>
              {f === 'todos' ? 'Todos' : f === 'conferir' ? `A conferir (${r.pendentes})` : `Não conformes (${r.nc})`}
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
      {visiveis.length === 0 && <p className="vazio">Nenhum item neste filtro.</p>}

      <NovoItem vistoria={v} />

      <section className="painel">
        {assinando ? (
          <Assinatura onSalvar={finalizar} onCancelar={() => setAssinando(false)} />
        ) : (
          <div className="acoes">
            <button className="perigo" onClick={apagar}>Excluir vistoria</button>
            {v.finalizada && <button disabled={gerando} onClick={() => relatorio(v)}>{gerando ? 'Gerando…' : 'Baixar relatório PDF'}</button>}
            <button className="primario" onClick={() => setAssinando(true)}>
              {v.finalizada ? 'Assinar de novo' : 'Finalizar vistoria'}
            </button>
          </div>
        )}
        {r.pendentes > 0 && assinando && <p className="aviso">Ainda há {r.pendentes} itens sem conferência. Eles aparecerão como "a conferir" no relatório.</p>}
      </section>
    </>
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
    await db.fotos.delete(fid)
    await atualizarItem(vid, item.id, { fotos: item.fotos.filter(f => f !== fid) })
  }

  return (
    <div className={`item ${item.status ?? 'pendente'}`}>
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
              Diferença: {fmt(Math.round((item.medido - item.projetado) * 100) / 100)} {item.unidade}
            </span>
          )}
        </div>
      )}

      <div className="botoes-status">
        <button className={item.status === 'ok' ? 'b-ok ativo' : 'b-ok'} onClick={() => marcar('ok')}>✓ OK</button>
        <button className={item.status === 'nc' ? 'b-nc ativo' : 'b-nc'} onClick={() => marcar('nc')}>✗ Não conforme</button>
        <button className={item.status === 'na' ? 'b-na ativo' : 'b-na'} onClick={() => marcar('na')}>N/A</button>
      </div>

      <div className="item-extras">
        <label className="botao-foto">
          {enviando ? 'Salvando…' : '📷 Foto'}
          <input type="file" accept="image/*" capture="environment" multiple hidden onChange={adicionarFotos} />
        </label>
        <button className="link" onClick={() => setObsAberta(o => !o)}>📝 Observação</button>
        {item.status === 'nc' && !temPendencia && <button className="link" onClick={() => setPendencia(true)}>⚠ Criar pendência</button>}
        {temPendencia && <span className="selo nc">Pendência criada</span>}
      </div>

      {item.fotos.length > 0 && (
        <div className="fotos">{item.fotos.map(f => <Foto key={f} id={f} onExcluir={() => excluirFoto(f)} />)}</div>
      )}

      {obsAberta && (
        <textarea rows={2} placeholder="Observação" defaultValue={item.obs}
          onBlur={e => e.target.value !== item.obs && atualizarItem(vid, item.id, { obs: e.target.value })} />
      )}

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

  if (!aberto) return <button className="adicionar" onClick={() => setAberto(true)}>+ Adicionar item próprio</button>

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
